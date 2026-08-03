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

/** UTC calendar day string, matching vendorStockFor's expected 'YYYY-MM-DD'
 * format and vendor_purchases.utc_day. */
export function utcDayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The vendor's two clock readings taken from ONE instant, so a request can
 * never straddle an hour or day boundary mid-flight. Injected into
 * getVendorView/buyVendorSlot rather than read inside them, which keeps
 * both testable without fake timers. */
export type VendorClock = { hour: number; utcDay: string };

export function vendorClockNow(nowMs: number = Date.now()): VendorClock {
  return { hour: utcHourIndex(nowMs), utcDay: new Date(nowMs).toISOString().slice(0, 10) };
}

const ITEM_ROW_COLUMNS = 'id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, unique_id';

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
 * new migration to this task. */
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

export type VendorSlotView = VendorSlot & {
  purchased: boolean;
  /** True when this slot's base is class-restricted and the account
   * currently has no character of that class — see the class-filter note
   * on getVendorView below. Purely informational; the slot stays
   * purchasable (the account may roll that class later, or is buying for a
   * future character). */
  crossClass: boolean;
};

export type VendorViewResult = { slots: VendorSlotView[]; purchasesRemaining: number };

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
  if (todayErr) console.error('getVendorView: daily allowance read failed:', todayErr.message);
  const purchasesRemaining = Math.max(0, VENDOR_DAILY_PURCHASE_LIMIT - (todayRows?.length ?? 0));

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
 * one the client saw -> daily allowance -> not already bought -> debit gold
 * (buyer's own JWT, so spend_gold's auth.uid() is the buyer) -> reserve the
 * offer -> grant the item. Everything that can reject does so BEFORE the
 * debit, so the only compensation path is the item insert failing.
 *
 * The slot is reserved BEFORE the item is granted (rather than after) so a
 * mid-flight failure has only one failure mode to compensate: if the item
 * insert fails, both the reservation and the gold are rolled back; if the
 * reservation itself fails (e.g. a concurrent duplicate-offer race losing to
 * the table's unique constraint), only the gold needs refunding since no
 * item was ever granted. Refunds are the two-step read-then-write in
 * refundGold — see its docstring for the consistency tradeoff. */
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

  const { data: todayRows, error: todayErr } = await service
    .from('vendor_purchases')
    .select('instance_key')
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

  const { error: debitErr } = await buyer.rpc('spend_gold', { p_amount: slot.price });
  if (debitErr) return { ok: false, status: 402, error: debitErr.message };

  const { error: reserveErr } = await service
    .from('vendor_purchases')
    .insert({ user_id: userId, utc_day: clock.utcDay, slot_index: slotIndex, instance_key: instanceKey });
  if (reserveErr) {
    console.error('buyVendorSlot: vendor_purchases insert failed after debit — refunding:', reserveErr.message);
    await refundGold(service, userId, slot.price);
    return { ok: false, status: 500, error: 'purchase failed, gold refunded' };
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
    await service.from('vendor_purchases').delete().eq('user_id', userId).eq('instance_key', instanceKey);
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
