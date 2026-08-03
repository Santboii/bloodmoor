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
  slotIndex: number;
  purchased: boolean;
  /** True when this slot's base is class-restricted and the account
   * currently has no character of that class — see the class-filter note
   * on getVendorView below. Purely informational; the slot stays
   * purchasable (the account may roll that class later, or is buying for a
   * future character — see design note in the Task 3 brief). */
  crossClass: boolean;
};

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
export async function getVendorView(service: SupabaseClient, userId: string, utcDay: string): Promise<VendorSlotView[]> {
  const { maxLevel, ownedClasses } = await loadAccountCharSummary(service, userId);
  const stock = vendorStockFor(userId, utcDay, maxLevel);

  const { data: purchases, error } = await service
    .from('vendor_purchases')
    .select('slot_index')
    .eq('user_id', userId)
    .eq('utc_day', utcDay);
  if (error) console.error('getVendorView: vendor_purchases read failed:', error.message);
  const purchasedSlots = new Set((purchases ?? []).map((r: { slot_index: number }) => r.slot_index));

  return stock.map((slot, slotIndex) => ({
    ...slot,
    slotIndex,
    purchased: purchasedSlots.has(slotIndex),
    crossClass: slot.base.classRestriction != null && !ownedClasses.has(slot.base.classRestriction),
  }));
}

export type VendorBuyResult = { ok: true; item: ItemRow } | { ok: false; status: number; error: string };

/** Buy one of today's 6 vendor slots. Order: validate -> check not already
 * purchased -> debit gold (buyer's own JWT, so spend_gold's auth.uid() is
 * the buyer) -> reserve the slot (vendor_purchases insert) -> grant the item.
 * The slot is reserved BEFORE the item is granted (rather than after) so a
 * mid-flight failure has only one failure mode to compensate: if the item
 * insert fails, both the reservation and the gold are rolled back; if the
 * reservation itself fails (e.g. a concurrent duplicate-slot race losing to
 * the table's unique constraint), only the gold needs refunding since no
 * item was ever granted. Refunds are the two-step read-then-write in
 * refundGold — see its docstring for the consistency tradeoff. */
export async function buyVendorSlot(
  service: SupabaseClient,
  buyer: SupabaseClient,
  userId: string,
  slotIndex: unknown,
): Promise<VendorBuyResult> {
  if (typeof slotIndex !== 'number' || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 5) {
    return { ok: false, status: 400, error: 'invalid slotIndex' };
  }

  const utcDay = utcDayString();
  const { maxLevel } = await loadAccountCharSummary(service, userId);
  const stock = vendorStockFor(userId, utcDay, maxLevel);
  const slot = stock[slotIndex];

  const { data: existing, error: existingErr } = await service
    .from('vendor_purchases')
    .select('slot_index')
    .eq('user_id', userId)
    .eq('utc_day', utcDay)
    .eq('slot_index', slotIndex)
    .maybeSingle();
  if (existingErr) {
    console.error('buyVendorSlot: purchase check failed:', existingErr.message);
    return { ok: false, status: 500, error: 'internal error' };
  }
  if (existing) return { ok: false, status: 400, error: 'slot already purchased today' };

  const { error: debitErr } = await buyer.rpc('spend_gold', { p_amount: slot.price });
  if (debitErr) return { ok: false, status: 402, error: debitErr.message };

  const { error: reserveErr } = await service
    .from('vendor_purchases')
    .insert({ user_id: userId, utc_day: utcDay, slot_index: slotIndex });
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
    await service.from('vendor_purchases').delete().eq('user_id', userId).eq('utc_day', utcDay).eq('slot_index', slotIndex);
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
