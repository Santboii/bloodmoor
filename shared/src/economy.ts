// Phase 2 economy: pricing, deterministic daily vendor stock, and
// lootbox/match-drop rolls. Composes with items.ts's roll engine (rollItem,
// rollRarity, ITEM_BASES, UNIQUE_ITEMS) rather than duplicating any of it.
import type { ItemBase, ItemRarity, RolledAffix } from './items.js';
import { ITEM_BASES, ITEM_LEVEL_BANDS, UNIQUE_ITEMS, rollItem, rollRarity } from './items.js';

export const GOLD_PER_MATCH = 25;
export const GOLD_WIN_BONUS = 35;
export const LOOTBOX_WIN_CHANCE = 0.15;

export const LOOTBOX_PRICES = { basic: 150, premium: 500 } as const;
export type LootboxTier = keyof typeof LOOTBOX_PRICES;

/** Sell price per rarity, indexed by item-level band [1, 4, 7, 10]. Vendor
 * buy price is a flat 4x markup over these (vendorBuyPrice below). Canonical
 * table from the economy Phase 2 plan's Global Constraints — Task 2's SQL
 * sell_price function is drift-tested against these exact values, so they
 * must not be tuned here without updating that contract too. */
export const SELL_PRICES: Record<ItemRarity, [number, number, number, number]> = {
  basic:  [5, 10, 15, 25],
  magic:  [25, 40, 60, 90],
  rare:   [100, 150, 220, 320],
  unique: [400, 550, 750, 1000],
};

/** Band index for a (possibly bespoke, e.g. a unique's levelReq) level —
 * rounds down to the nearest defined band rather than requiring an exact
 * [1, 4, 7, 10] match. */
function bandIndexForLevel(level: number): number {
  let idx = 0;
  for (let i = 0; i < ITEM_LEVEL_BANDS.length; i++) {
    if (ITEM_LEVEL_BANDS[i] <= level) idx = i;
  }
  return idx;
}

export function sellPriceFor(rarity: ItemRarity, levelReq: number): number {
  return SELL_PRICES[rarity][bandIndexForLevel(levelReq)];
}

export function vendorBuyPrice(rarity: ItemRarity, levelReq: number): number {
  return sellPriceFor(rarity, levelReq) * 4;
}

/** Character level → item-level band: 1-3 → 1, 4-6 → 4, 7-9 → 7, 10+ → 10. */
export function levelToBand(level: number): ItemBase['itemLevel'] {
  if (level >= 10) return 10;
  if (level >= 7) return 7;
  if (level >= 4) return 4;
  return 1;
}

// --- Deterministic PRNG: mulberry32 seeded from a string hash (FNV-1a). ---
// Pure by construction — no Date.now()/new Date() anywhere in this module;
// callers (vendorStockFor) pass utcDay as a plain 'YYYY-MM-DD' string.

/** FNV-1a 32-bit string hash — deterministic, exported for test coverage of
 * the seeding scheme itself. */
export function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Standard mulberry32 PRNG — same seed always yields the same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic rng for a user+day pair — same inputs always produce the
 * same rng sequence, so byte-identical downstream output. */
export function seededRng(userId: string, utcDay: string): () => number {
  return mulberry32(fnv1aHash(`${userId}:${utcDay}`));
}

export type VendorSlot = { base: ItemBase; rarity: 'basic' | 'magic'; affixes: RolledAffix[]; price: number };

/** Deterministic daily vendor stock: 6 slots, each basic or magic (~50/50),
 * bases drawn from bands within ±1 band-step of the account's max character
 * level's band. Same (userId, utcDay, maxCharLevel) ⇒ byte-identical output;
 * a different utcDay reseeds the rng and (almost certainly) changes it. */
export function vendorStockFor(userId: string, utcDay: string, maxCharLevel: number): VendorSlot[] {
  const rng = seededRng(userId, utcDay);
  const centerIdx = ITEM_LEVEL_BANDS.indexOf(levelToBand(maxCharLevel));
  const eligibleBands = new Set(
    [centerIdx - 1, centerIdx, centerIdx + 1]
      .filter(i => i >= 0 && i < ITEM_LEVEL_BANDS.length)
      .map(i => ITEM_LEVEL_BANDS[i]),
  );
  const eligibleBases = ITEM_BASES.filter(b => eligibleBands.has(b.itemLevel));

  const slots: VendorSlot[] = [];
  for (let i = 0; i < 6; i++) {
    const rarity: 'basic' | 'magic' = rng() < 0.5 ? 'basic' : 'magic';
    const base = eligibleBases[Math.floor(rng() * eligibleBases.length)];
    const affixes = rarity === 'magic' ? rollItem(base, 'magic', rng) : [];
    slots.push({ base, rarity, affixes, price: vendorBuyPrice(rarity, base.itemLevel) });
  }
  return slots;
}

export type DropResult = {
  base: ItemBase; rarity: ItemRarity; affixes: RolledAffix[]; levelReq: number;
  /** Set only on a unique roll — persisted to items.unique_id so the row
   * keeps its identity through future balance tuning. */
  uniqueId?: string;
};

/** Shared rarity/base/affix roll used by both lootbox opens and match-end
 * drops. Unique rolls are restricted to UNIQUE_ITEMS eligible for
 * maxCharLevel (levelReq <= maxCharLevel); if none qualify, the rarity
 * downgrades to rare and rolls normally instead. */
function rollDropItem(weights: Record<ItemRarity, number>, maxCharLevel: number, rng: () => number): DropResult {
  const rolledRarity = rollRarity(weights, rng);

  if (rolledRarity === 'unique') {
    const eligibleUniques = UNIQUE_ITEMS.filter(u => u.levelReq <= maxCharLevel);
    if (eligibleUniques.length > 0) {
      const unique = eligibleUniques[Math.floor(rng() * eligibleUniques.length)];
      const base = ITEM_BASES.find(b => b.id === unique.baseId)!;
      return { base, rarity: 'unique', affixes: unique.affixes, levelReq: unique.levelReq, uniqueId: unique.id };
    }
  }
  const rarity: ItemRarity = rolledRarity === 'unique' ? 'rare' : rolledRarity;

  // Deliberate: drops use the exact band only (no +/-1 relaxation) — unlike
  // vendorStockFor, which relaxes +/-1 for browsable variety.
  const band = levelToBand(maxCharLevel);
  const eligibleBases = ITEM_BASES.filter(b => b.itemLevel === band);
  const base = eligibleBases[Math.floor(rng() * eligibleBases.length)];
  return { base, rarity, affixes: rollItem(base, rarity, rng), levelReq: base.itemLevel };
}

export function rollLootboxItem(
  tier: LootboxTier,
  weights: Record<ItemRarity, number>,
  maxCharLevel: number,
  rng: () => number = Math.random,
): DropResult {
  // tier gates the caller-supplied weights (basic vs. premium boxes get
  // different distributions) — the roll mechanics themselves are the same
  // for every tier, so it isn't otherwise consulted here.
  void tier;
  return rollDropItem(weights, maxCharLevel, rng);
}

export function rollMatchDropItem(
  weights: Record<ItemRarity, number>,
  maxCharLevel: number,
  rng: () => number = Math.random,
): ReturnType<typeof rollLootboxItem> {
  return rollDropItem(weights, maxCharLevel, rng);
}
