// Phase 2 economy: pricing, staggered hourly vendor stock, and
// lootbox/match-drop rolls. Composes with items.ts's roll engine (rollItem,
// rollRarity, ITEM_BASES, UNIQUE_ITEMS) rather than duplicating any of it.
import type { ItemBase, ItemRarity, RolledAffix } from './items.js';
import { ITEM_BASES, ITEM_LEVEL_BANDS, UNIQUE_ITEMS, rollItem, rollRarity, rollUnique } from './items.js';

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
// callers (vendorStockFor) pass a UTC hour index as a number.

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

/** Deterministic rng for a user + arbitrary discriminator (today: a vendor
 * instance key) — same inputs always produce the same sequence, so
 * byte-identical downstream output. */
export function seededRng(userId: string, discriminator: string): () => number {
  return mulberry32(fnv1aHash(`${userId}:${discriminator}`));
}

export const VENDOR_SLOT_COUNT = 6;
/** Hours a single vendor slot stays on the shelf. Equal to
 * VENDOR_SLOT_COUNT so that exactly one of the six slots turns over each
 * hour — change one and the stagger stops being uniform. */
export const VENDOR_SLOT_LIFETIME_HOURS = 6;
/** Vendor purchases allowed per account per UTC day. Rotation buys variety,
 * not supply: this is deliberately unchanged from the pre-rotation
 * one-buy-per-slot-per-day budget. */
export const VENDOR_DAILY_PURCHASE_LIMIT = 6;

export const MS_PER_HOUR = 3_600_000;

/** Whole UTC hours since the epoch — the vendor's clock. Takes `nowMs` as a
 * parameter rather than reading the clock so this module stays pure (see
 * the note on seededRng); callers pass Date.now(). */
export function utcHourIndex(nowMs: number): number {
  return Math.floor(nowMs / MS_PER_HOUR);
}

/** Which instance of `slotIndex` is on the shelf at `hour`. The -slotIndex
 * offset is what staggers the six slots: slot i rolls over exactly when
 * hour % 6 === i, so one slot (and only one) turns over every hour. */
export function slotGeneration(slotIndex: number, hour: number): number {
  return Math.floor((hour - slotIndex) / VENDOR_SLOT_LIFETIME_HOURS);
}

/** First hour at which `generation` of `slotIndex` is no longer on offer. */
export function slotExpiryHour(slotIndex: number, generation: number): number {
  return (generation + 1) * VENDOR_SLOT_LIFETIME_HOURS + slotIndex;
}

/** Identifies exactly one item offer. Doubles as the rng seed suffix (so
 * key and item can never disagree) and as vendor_purchases' primary key.
 * `band` is the item-level band, not the raw character level — the shelf
 * reshuffles on band crossings only, not on every level-up. */
export function vendorInstanceKey(slotIndex: number, generation: number, band: number): string {
  return `${slotIndex}:${generation}:${band}`;
}

export type VendorSlot = {
  slotIndex: number;
  /** See vendorInstanceKey — identifies this exact offer. */
  instanceKey: string;
  /** Epoch ms at which this slot rotates. Derived from the caller-supplied
   * hour via slotExpiryHour, so no clock is read here. */
  expiresAt: number;
  base: ItemBase;
  rarity: 'basic' | 'magic';
  affixes: RolledAffix[];
  price: number;
};

/** Deterministic vendor stock at a given UTC hour: 6 slots, each basic or
 * magic (~50/50), bases drawn from bands within ±1 band-step of the
 * account's max character level's band.
 *
 * Each slot has its OWN rng stream keyed by its own generation, which is
 * what lets the six rotate independently on staggered 6-hour lives (one
 * turning over each hour) rather than all swapping together. Same
 * (userId, hour, maxCharLevel) ⇒ byte-identical output; the seed is
 * `${userId}:${instanceKey}` so a slot's advertised identity and its rolled
 * contents can never drift apart. */
export function vendorStockFor(userId: string, hour: number, maxCharLevel: number): VendorSlot[] {
  const band = levelToBand(maxCharLevel);
  const centerIdx = ITEM_LEVEL_BANDS.indexOf(band);
  const eligibleBands = new Set(
    [centerIdx - 1, centerIdx, centerIdx + 1]
      .filter(i => i >= 0 && i < ITEM_LEVEL_BANDS.length)
      .map(i => ITEM_LEVEL_BANDS[i]),
  );
  const eligibleBases = ITEM_BASES.filter(b => eligibleBands.has(b.itemLevel));

  const slots: VendorSlot[] = [];
  for (let slotIndex = 0; slotIndex < VENDOR_SLOT_COUNT; slotIndex++) {
    const generation = slotGeneration(slotIndex, hour);
    const instanceKey = vendorInstanceKey(slotIndex, generation, band);
    const rng = seededRng(userId, instanceKey);
    const rarity: 'basic' | 'magic' = rng() < 0.5 ? 'basic' : 'magic';
    const base = eligibleBases[Math.floor(rng() * eligibleBases.length)];
    const affixes = rarity === 'magic' ? rollItem(base, 'magic', rng) : [];
    slots.push({
      slotIndex,
      instanceKey,
      expiresAt: slotExpiryHour(slotIndex, generation) * MS_PER_HOUR,
      base,
      rarity,
      affixes,
      price: vendorBuyPrice(rarity, base.itemLevel),
    });
  }
  return slots;
}

export type DropResult = {
  base: ItemBase; rarity: ItemRarity; affixes: RolledAffix[]; levelReq: number;
  /** Set only on a unique roll — persisted to items.unique_id so the row
   * keeps its identity through future balance tuning. */
  uniqueId?: string;
};

/** Relative weight of an at-band unique versus a lower-band one in a unique
 * drop roll. Uniform picking would hand a level-10 player a level-1 ring
 * most of the time, which reads as a bad drop for the rarest outcome in the
 * table; the tail keeps older uniques obtainable. */
export const UNIQUE_BAND_WEIGHT = { atBand: 8, belowBand: 1 } as const;

/** Shared rarity/base/affix roll used by both lootbox opens and match-end
 * drops. Unique rolls are restricted to UNIQUE_ITEMS eligible for
 * maxCharLevel (levelReq <= maxCharLevel); if none qualify, the rarity
 * downgrades to rare and rolls normally instead. */
function rollDropItem(weights: Record<ItemRarity, number>, maxCharLevel: number, rng: () => number): DropResult {
  const rolledRarity = rollRarity(weights, rng);

  if (rolledRarity === 'unique') {
    const eligibleUniques = UNIQUE_ITEMS.filter(u => u.levelReq <= maxCharLevel);
    if (eligibleUniques.length > 0) {
      const band = levelToBand(maxCharLevel);
      const weightOf = (u: (typeof eligibleUniques)[number]) =>
        u.levelReq === band ? UNIQUE_BAND_WEIGHT.atBand : UNIQUE_BAND_WEIGHT.belowBand;
      const total = eligibleUniques.reduce((sum, u) => sum + weightOf(u), 0);
      let pick = rng() * total;
      let unique = eligibleUniques[eligibleUniques.length - 1];
      for (const u of eligibleUniques) {
        pick -= weightOf(u);
        if (pick < 0) { unique = u; break; }
      }
      const base = ITEM_BASES.find(b => b.id === unique.baseId)!;
      return { base, rarity: 'unique', affixes: rollUnique(unique, rng), levelReq: unique.levelReq, uniqueId: unique.id };
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
