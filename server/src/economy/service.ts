// Game-server economy service: vendor stock/purchase, lootbox opens, and the
// match-reward gold/drop roll consumed by settleMatchEnd in index.ts. Pure
// glue over shared/src/economy.ts's roll functions and the Task 2 DB layer
// (spend_gold, credit_match_result v2, vendor_purchases, drop_tables) — no
// economy math lives here that isn't already in shared.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  LOOTBOX_WIN_CHANCE, LOOTBOX_PRICES,
  vendorStockFor, rollLootboxItem, rollMatchDropItem,
  normalizeCharacterClass, validateItemRow,
  VENDOR_DAILY_PURCHASE_LIMIT, VENDOR_SLOT_COUNT, utcHourIndex,
} from '@arena/shared';
import type { LootboxTier, VendorSlot, ItemRow, ItemRarity, CharacterClass } from '@arena/shared';

/** Per-request client authenticated as the calling user (their own JWT as
 * the Authorization header) — used only where an RPC's auth.uid() must
 * resolve to the buyer (spend_gold). Built fresh per request, never reused
 * or cached: the anon key + Authorization header pair is the standard
 * Supabase pattern for a user-scoped PostgREST client, distinct from
 * server/src/supabase.ts's singleton service-role client used everywhere
 * else in this module. Env vars are read lazily (not at module load, unlike
 * server/src/supabase.ts's singleton) so importing this module — e.g. from
 * tests that only exercise the other exports with mocked clients — doesn't
 * require SUPABASE_ANON_KEY to be set. */
export function buyerClient(accessToken: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** The vendor's two clock readings taken from ONE instant, so a request can
 * never straddle an hour or day boundary mid-flight. Injected into
 * getVendorView/buyVendorSlot rather than read inside them, which keeps
 * both testable without fake timers. */
export type VendorClock = { hour: number; utcDay: string };

export function vendorClockNow(nowMs: number = Date.now()): VendorClock {
  // 'YYYY-MM-DD', matching vendor_purchases.utc_day.
  return { hour: utcHourIndex(nowMs), utcDay: new Date(nowMs).toISOString().slice(0, 10) };
}

const ITEM_ROW_COLUMNS = 'id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, unique_id';

/** Postgres unique_violation. https://www.postgresql.org/docs/current/errcodes-appendix.html */
const UNIQUE_VIOLATION = '23505';

/** Name of the migration's (user_id, utc_day, daily_seq) unique constraint —
 * the DB-level backstop for the 6-buys-per-day cap. Matched against the
 * reserve-insert error's message below to tell "a concurrent buyer won the
 * same daily_seq" (expected, retryable) apart from any other unique
 * violation (e.g. the (user_id, instance_key) primary key, a different and
 * genuinely unexpected race). Exported for the drift test that pins it
 * against 20260803000000_vendor_rotation.sql. */
export const DAILY_SEQ_UNIQUE_CONSTRAINT = 'vendor_purchases_user_day_seq_key';

/** Postgres spells a unique_violation as `... unique constraint "<name>"`.
 * Matching the quoted form rather than the bare name means a *different*
 * constraint whose name merely contains ours (or a stray occurrence of the
 * name elsewhere in the message) can't be mistaken for the daily_seq race. */
function isDailySeqViolation(err: { code?: string; message: string }): boolean {
  return err.code === UNIQUE_VIOLATION && err.message.includes(`constraint "${DAILY_SEQ_UNIQUE_CONSTRAINT}"`);
}

/** Hard ceiling on reservation attempts in buyVendorSlot. One per possible
 * seq is already more than enough — each lost race removes a value from the
 * free set — so this only bounds a pathological interleave. */
const RESERVE_ATTEMPT_BUDGET = VENDOR_DAILY_PURCHASE_LIMIT;

/** The smallest daily_seq in 0..VENDOR_DAILY_PURCHASE_LIMIT-1 that today's
 * rows don't already occupy, or null when all of them are taken (the account
 * is genuinely at its cap).
 *
 * Deliberately "smallest unused" rather than `rows.length` or
 * `max(daily_seq) + 1`. `rows.length` collides the moment the sequence has a
 * HOLE in it — which the release path in buyVendorSlot can create by deleting
 * a reserved row whose item insert failed — and would then keep colliding on
 * every subsequent buy, wedging the account below its cap for the rest of the
 * UTC day. `max + 1` heals the wedge but permanently burns the deleted row's
 * position, silently costing the account a purchase. Reusing the hole does
 * neither, and shrinks the free set on every lost race so the retry loop
 * below converges. */
export function nextDailySeq(rows: { daily_seq: number }[] | null | undefined): number | null {
  const taken = new Set((rows ?? []).map(r => r.daily_seq));
  for (let seq = 0; seq < VENDOR_DAILY_PURCHASE_LIMIT; seq++) {
    if (!taken.has(seq)) return seq;
  }
  return null;
}

export type AccountCharSummary = { maxLevel: number; ownedClasses: Set<CharacterClass> };

/** "Account's max character level" = max(level) over the account's
 * characters, service-role read (per Task 3 ambiguity resolution). Accounts
 * with no characters yet fall back to level 1 (lowest band) rather than 0 —
 * there is no lower band to target. */
export async function loadAccountCharSummary(service: SupabaseClient, userId: string): Promise<AccountCharSummary> {
  const { data, error } = await service.from('characters').select('class, level').eq('user_id', userId);
  if (error) {
    console.error('loadAccountCharSummary: characters read failed:', error.message);
    return { maxLevel: 1, ownedClasses: new Set() };
  }
  const rows = (data ?? []) as { class: string; level: number }[];
  if (rows.length === 0) return { maxLevel: 1, ownedClasses: new Set() };
  return {
    maxLevel: Math.max(...rows.map(r => r.level)),
    ownedClasses: new Set(rows.map(r => normalizeCharacterClass(r.class))),
  };
}

async function loadDropWeights(service: SupabaseClient, context: string): Promise<Record<ItemRarity, number> | null> {
  const { data, error } = await service.from('drop_tables').select('weights').eq('context', context).maybeSingle();
  if (error) { console.error(`loadDropWeights(${context}) failed:`, error.message); return null; }
  if (!data) { console.error(`loadDropWeights(${context}): no drop_tables row for this context`); return null; }
  return data.weights as Record<ItemRarity, number>;
}

/** Two-step (read-then-write), not atomic — service role has no "credit
 * gold" RPC (only spend_gold, which debits the caller's own auth.uid() and
 * can't be aimed at an arbitrary account from a service-role context). Only
 * used on the refund-after-debit-failure path below, which is already rare
 * and logged loudly; a concurrent buy racing this read-modify-write could
 * still lose an update, which is the documented tradeoff for not adding a
 * new migration to this task. Kept off the ordinary concurrent-buy path on
 * purpose: buyVendorSlot resolves a lost daily_seq race BEFORE debiting, so
 * this only ever fires when something genuinely broke after the debit (a
 * failed item insert / a missing drop table), never on a routine race. */
async function refundGold(service: SupabaseClient, userId: string, amount: number): Promise<void> {
  const { data, error } = await service.from('profiles').select('gold').eq('user_id', userId).single();
  if (error || !data) {
    console.error(`refundGold: could not read gold for ${userId} — MANUAL REFUND of ${amount} required:`, error?.message);
    return;
  }
  const { error: updateErr } = await service.from('profiles').update({ gold: data.gold + amount }).eq('user_id', userId);
  if (updateErr) {
    console.error(`refundGold: update failed for ${userId} — MANUAL REFUND of ${amount} required:`, updateErr.message);
  }
}

/** Hands a reserved offer (and the daily_seq it holds) back, so a purchase
 * that dies after the reservation doesn't leave the slot showing SOLD or
 * burn one of the account's six daily buys. A failure here is loud but not
 * fatal: the row simply survives until the UTC day rolls over. */
async function releaseReservation(service: SupabaseClient, userId: string, instanceKey: string): Promise<void> {
  const { error } = await service
    .from('vendor_purchases')
    .delete()
    .eq('user_id', userId)
    .eq('instance_key', instanceKey);
  if (error) {
    console.error(`releaseReservation: could not release ${instanceKey} for ${userId} — slot stays reserved until tomorrow:`, error.message);
  }
}

export type VendorSlotView = VendorSlot & {
  purchased: boolean;
  /** True when this slot's base is class-restricted and the account
   * currently has no character of that class — see the class-filter note
   * on getVendorView below. Purely informational; the slot stays
   * purchasable (the account may roll that class later, or is buying for a
   * future character). */
  crossClass: boolean;
};

export type VendorViewResult = { slots: VendorSlotView[]; purchasesRemaining: number | null };

/** Deferred Task 1 finding: an unfiltered vendor slot can show a weapon
 * restricted to a class the account doesn't currently have (e.g. a bow for
 * a mage-only account) — real but minor, since items are account-owned
 * shared stash and the account could roll that class later. Resolved here
 * by ANNOTATING affected slots (crossClass: true) rather than substituting
 * or filtering them: substitution would need extra rng draws that aren't
 * part of vendorStockFor's seeded sequence (perturbing determinism for no
 * strong benefit), and filtering would incorrectly block a legitimate
 * "buy now for a character I'll roll later" purchase. Slot indexing and
 * vendorStockFor's determinism are untouched — this only adds a read-only
 * flag for the client to render a hint/badge.
 */
export async function getVendorView(
  service: SupabaseClient, userId: string, clock: VendorClock,
): Promise<VendorViewResult> {
  const { maxLevel, ownedClasses } = await loadAccountCharSummary(service, userId);
  const stock = vendorStockFor(userId, clock.hour, maxLevel);

  // Purchases against the offers CURRENTLY on the shelf. Keyed by
  // instance_key rather than utc_day: a 6-hour slot can straddle midnight
  // UTC, so a live offer's purchase row may carry yesterday's day.
  const { data: purchases, error } = await service
    .from('vendor_purchases')
    .select('instance_key')
    .eq('user_id', userId)
    .in('instance_key', stock.map(s => s.instanceKey));
  if (error) console.error('getVendorView: vendor_purchases read failed:', error.message);
  const purchasedKeys = new Set((purchases ?? []).map((r: { instance_key: string }) => r.instance_key));

  // Today's purchases, for the daily allowance. Capped at
  // VENDOR_DAILY_PURCHASE_LIMIT rows, so selecting them is cheaper than a
  // separate count query and keeps one code path for both reads.
  const { data: todayRows, error: todayErr } = await service
    .from('vendor_purchases')
    .select('instance_key')
    .eq('user_id', userId)
    .eq('utc_day', clock.utcDay);
  // A failed read must not report a false-good allowance (undercounting
  // today's purchases would otherwise read as "more buys available" than
  // actually remain) — null signals "unknown" rather than defaulting to 0
  // rows read. buyVendorSlot is the real enforcement point and separately
  // 500s on this same failure; this value is display-only.
  if (todayErr) console.error('getVendorView: daily allowance read failed:', todayErr.message);
  const purchasesRemaining = todayErr
    ? null
    : Math.max(0, VENDOR_DAILY_PURCHASE_LIMIT - (todayRows?.length ?? 0));

  return {
    slots: stock.map(slot => ({
      ...slot,
      purchased: purchasedKeys.has(slot.instanceKey),
      crossClass: slot.base.classRestriction != null && !ownedClasses.has(slot.base.classRestriction),
    })),
    purchasesRemaining,
  };
}

export type VendorBuyResult = { ok: true; item: ItemRow } | { ok: false; status: number; error: string };

/** Buy one vendor offer. Order: validate -> confirm the offer is still the
 * one the client saw -> daily allowance -> not already bought -> reserve the
 * offer -> debit gold (buyer's own JWT, so spend_gold's auth.uid() is the
 * buyer) -> grant the item.
 *
 * The reservation is taken BEFORE the debit, which is what makes the
 * daily_seq race cheap to resolve. daily_seq is "which of today's at most 6
 * purchases this is"; the migration's unique (user_id, utc_day, daily_seq)
 * constraint is the DB-level backstop that makes a 7th same-day row
 * physically impossible. Two buys fired concurrently by one account (the
 * client's double-submit guard is per SLOT, so two different slots really do
 * race) can pick the same free seq; the loser takes a unique_violation. That
 * is a lost race on sequence assignment, NOT the cap — the account may be
 * nowhere near 6 — so it re-reads today's rows, takes the next free seq and
 * retries. Because the loser's re-read now sees the winner's row, the free
 * set strictly shrinks and the loop converges: it ends either in a
 * successful insert or in "every seq 0..5 is taken", which IS the cap and
 * returns 429. Not one gram of gold has moved at that point, so a lost race
 * costs nothing and needs no compensation.
 *
 * That leaves exactly two post-reservation failures:
 *   - spend_gold fails (e.g. insufficient gold): release the reservation, no
 *     gold moved, 402.
 *   - the item insert fails: release the reservation AND refund the gold
 *     (the two-step read-then-write in refundGold — see its docstring for the
 *     consistency tradeoff). This is the only path that can leave gold
 *     debited without an item, and it is the only one that calls refundGold. */
export async function buyVendorSlot(
  service: SupabaseClient,
  buyer: SupabaseClient,
  userId: string,
  clock: VendorClock,
  slotIndex: unknown,
  instanceKey: unknown,
): Promise<VendorBuyResult> {
  if (typeof slotIndex !== 'number' || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= VENDOR_SLOT_COUNT) {
    return { ok: false, status: 400, error: 'invalid slotIndex' };
  }
  if (typeof instanceKey !== 'string' || instanceKey.length === 0) {
    return { ok: false, status: 400, error: 'invalid instanceKey' };
  }

  const { maxLevel } = await loadAccountCharSummary(service, userId);
  const slot = vendorStockFor(userId, clock.hour, maxLevel)[slotIndex];

  // Substitution guard. The client bought a specific offer; if the shelf
  // has reseeded since it rendered — hourly rotation, a level-band change,
  // a tab left open — this index now holds something else, and granting it
  // would charge the displayed price for a different item. Reject before
  // any gold moves and let the client refetch. This is the authoritative
  // check; the client's own expiry guard only narrows the window.
  if (slot.instanceKey !== instanceKey) {
    return { ok: false, status: 409, error: 'stock changed' };
  }

  // daily_seq (not instance_key) because this read serves double duty: the
  // cheap allowance check just below, and the seq the reservation claims.
  const { data: todayRows, error: todayErr } = await service
    .from('vendor_purchases')
    .select('daily_seq')
    .eq('user_id', userId)
    .eq('utc_day', clock.utcDay);
  if (todayErr) {
    console.error('buyVendorSlot: daily allowance read failed:', todayErr.message);
    return { ok: false, status: 500, error: 'internal error' };
  }
  if ((todayRows?.length ?? 0) >= VENDOR_DAILY_PURCHASE_LIMIT) {
    return { ok: false, status: 429, error: 'daily purchase limit reached' };
  }

  const { data: existing, error: existingErr } = await service
    .from('vendor_purchases')
    .select('instance_key')
    .eq('user_id', userId)
    .eq('instance_key', instanceKey)
    .maybeSingle();
  if (existingErr) {
    console.error('buyVendorSlot: purchase check failed:', existingErr.message);
    return { ok: false, status: 500, error: 'internal error' };
  }
  if (existing) return { ok: false, status: 400, error: 'slot already purchased' };

  // Claim a daily_seq. Every attempt costs at most one extra round trip and
  // happens before any gold moves, so losing the race is free.
  let seqRows = (todayRows ?? []) as { daily_seq: number }[];
  let reserved = false;
  for (let attempt = 0; attempt < RESERVE_ATTEMPT_BUDGET; attempt++) {
    const dailySeq = nextDailySeq(seqRows);
    // Every seq 0..5 is spoken for: this is the cap, reached by concurrent
    // buyers between the allowance read above and now. No gold has moved.
    if (dailySeq === null) return { ok: false, status: 429, error: 'daily purchase limit reached' };

    const { error: reserveErr } = await service
      .from('vendor_purchases')
      .insert({ user_id: userId, utc_day: clock.utcDay, slot_index: slotIndex, instance_key: instanceKey, daily_seq: dailySeq });
    if (!reserveErr) { reserved = true; break; }

    if (isDailySeqViolation(reserveErr)) {
      // A concurrent buy for this same account took the seq first. Re-read
      // today's rows — which now include the winner's — and try the next
      // free one. The free set is strictly smaller each time round, so this
      // terminates well inside the budget.
      const { data: rereadRows, error: rereadErr } = await service
        .from('vendor_purchases')
        .select('daily_seq')
        .eq('user_id', userId)
        .eq('utc_day', clock.utcDay);
      if (rereadErr) {
        console.error('buyVendorSlot: daily_seq re-read failed after a lost race:', rereadErr.message);
        return { ok: false, status: 500, error: 'internal error' };
      }
      seqRows = (rereadRows ?? []) as { daily_seq: number }[];
      continue;
    }

    // Anything else — including a unique_violation on the (user_id,
    // instance_key) primary key, which is a different race (the same offer
    // double-bought) and not retryable — is genuinely unexpected. Nothing
    // has been debited, so there is nothing to compensate.
    console.error('buyVendorSlot: vendor_purchases reserve insert failed:', reserveErr.message);
    return { ok: false, status: 500, error: 'purchase failed' };
  }
  if (!reserved) {
    // Unreachable in practice: with at most 6 seqs and the free set shrinking
    // on every lost race, the loop exits via a successful insert or via
    // nextDailySeq returning null long before the budget runs out. Only a
    // pathological interleave (rows being released concurrently) gets here.
    // Report it as the cap: no gold moved, and the client's refetch will show
    // the account's true allowance either way.
    console.error(`buyVendorSlot: exhausted ${RESERVE_ATTEMPT_BUDGET} daily_seq reservation attempts for ${userId}`);
    return { ok: false, status: 429, error: 'daily purchase limit reached' };
  }

  const { error: debitErr } = await buyer.rpc('spend_gold', { p_amount: slot.price });
  if (debitErr) {
    // The reservation was taken on credit and the debit didn't land — give
    // the offer (and the daily_seq) straight back. No gold moved.
    await releaseReservation(service, userId, instanceKey);
    return { ok: false, status: 402, error: debitErr.message };
  }

  const { data: itemRow, error: itemErr } = await service
    .from('items')
    .insert({
      user_id: userId,
      base_id: slot.base.id,
      rarity: slot.rarity,
      affixes: slot.affixes,
      level_req: slot.base.itemLevel,
      slot: slot.base.slot,
      class_restriction: slot.base.classRestriction ?? null,
      source: 'vendor',
      unique_id: null,
    })
    .select(ITEM_ROW_COLUMNS)
    .single();

  if (itemErr || !itemRow) {
    console.error('buyVendorSlot: item insert failed after debit — refunding and releasing slot:', itemErr?.message);
    await releaseReservation(service, userId, instanceKey);
    await refundGold(service, userId, slot.price);
    return { ok: false, status: 500, error: 'purchase failed, gold refunded' };
  }

  return { ok: true, item: itemRow as unknown as ItemRow };
}

export type LootboxOpenResult = { ok: true; item: ItemRow } | { ok: false; status: number; error: string };

/** Open a loot box: validate tier -> debit price (buyer's own JWT) -> roll
 * against the live drop_tables weights for that tier -> grant the item.
 * Same refund-on-failure rule as buyVendorSlot for anything that fails
 * after the debit. */
export async function openLootbox(
  service: SupabaseClient,
  buyer: SupabaseClient,
  userId: string,
  tier: unknown,
): Promise<LootboxOpenResult> {
  if (tier !== 'basic' && tier !== 'premium') {
    return { ok: false, status: 400, error: 'invalid tier' };
  }
  const validTier = tier as LootboxTier;
  const price = LOOTBOX_PRICES[validTier];

  const { error: debitErr } = await buyer.rpc('spend_gold', { p_amount: price });
  if (debitErr) return { ok: false, status: 402, error: debitErr.message };

  const weights = await loadDropWeights(service, `lootbox_${validTier}`);
  if (!weights) {
    console.error(`openLootbox: lootbox_${validTier} weights unavailable after debit — refunding`);
    await refundGold(service, userId, price);
    return { ok: false, status: 500, error: 'lootbox open failed, gold refunded' };
  }

  const { maxLevel } = await loadAccountCharSummary(service, userId);
  const roll = rollLootboxItem(validTier, weights, maxLevel);

  const { data: itemRow, error: itemErr } = await service
    .from('items')
    .insert({
      user_id: userId,
      base_id: roll.base.id,
      rarity: roll.rarity,
      affixes: roll.affixes,
      level_req: roll.levelReq,
      slot: roll.base.slot,
      class_restriction: roll.base.classRestriction ?? null,
      source: 'lootbox',
      unique_id: roll.uniqueId ?? null,
    })
    .select(ITEM_ROW_COLUMNS)
    .single();

  if (itemErr || !itemRow) {
    console.error('openLootbox: item insert failed after debit — refunding:', itemErr?.message);
    await refundGold(service, userId, price);
    return { ok: false, status: 500, error: 'lootbox open failed, gold refunded' };
  }

  return { ok: true, item: itemRow as unknown as ItemRow };
}

/** Match-win drop roll for settleMatchEnd: LOOTBOX_WIN_CHANCE gate, then (on
 * success) a free roll against the live `match_drop` weights, granted
 * straight to the account's stash with source='drop'. Returns null on the
 * chance-miss (the common case) as well as on any failure — a missing drop
 * table row or a failed insert should never block match settlement, so
 * failures here are logged and swallowed rather than surfaced to the
 * caller. rng defaults to Math.random but is injectable so both the
 * win-chance gate and the downstream roll are deterministic in tests. */
export async function maybeRollMatchDrop(
  service: SupabaseClient,
  userId: string,
  rng: () => number = Math.random,
): Promise<ItemRow | null> {
  if (rng() >= LOOTBOX_WIN_CHANCE) return null;

  const weights = await loadDropWeights(service, 'match_drop');
  if (!weights) {
    console.error('maybeRollMatchDrop: match_drop weights unavailable, skipping drop');
    return null;
  }

  const { maxLevel } = await loadAccountCharSummary(service, userId);
  const roll = rollMatchDropItem(weights, maxLevel, rng);

  const { data: itemRow, error } = await service
    .from('items')
    .insert({
      user_id: userId,
      base_id: roll.base.id,
      rarity: roll.rarity,
      affixes: roll.affixes,
      level_req: roll.levelReq,
      slot: roll.base.slot,
      class_restriction: roll.base.classRestriction ?? null,
      source: 'drop',
      unique_id: roll.uniqueId ?? null,
    })
    .select(ITEM_ROW_COLUMNS)
    .single();

  if (error || !itemRow) {
    console.error('maybeRollMatchDrop: item insert failed, skipping drop:', error?.message);
    return null;
  }

  const validated = validateItemRow(itemRow);
  if (!validated) {
    console.error('maybeRollMatchDrop: inserted item failed validateItemRow, skipping drop:', itemRow);
    return null;
  }
  return validated;
}
