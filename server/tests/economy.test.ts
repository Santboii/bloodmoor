import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  GOLD_PER_MATCH, GOLD_WIN_BONUS, LOOTBOX_WIN_CHANCE, LOOTBOX_PRICES,
  SELL_PRICES, sellPriceFor, vendorBuyPrice, levelToBand,
  vendorStockFor, rollLootboxItem, rollMatchDropItem,
  fnv1aHash, mulberry32, seededRng,
  UNIQUE_ITEMS,
} from '@arena/shared';
import type { ItemRarity } from '@arena/shared';

describe('gold/lootbox constants', () => {
  it('match economy spec values', () => {
    expect(GOLD_PER_MATCH).toBe(25);
    expect(GOLD_WIN_BONUS).toBe(35);
    expect(LOOTBOX_WIN_CHANCE).toBe(0.15);
    expect(LOOTBOX_PRICES).toEqual({ basic: 150, premium: 500 });
  });
});

describe('SELL_PRICES / sellPriceFor / vendorBuyPrice', () => {
  // Exact-value contract test: this table is canonical per the economy
  // Phase 2 plan's Global Constraints — Task 2's SQL sell_price function is
  // drift-tested against these literals, so pin them, not a self-reference.
  it('matches the canonical sell-price table exactly', () => {
    expect(SELL_PRICES).toEqual({
      basic:  [5, 10, 15, 25],
      magic:  [25, 40, 60, 90],
      rare:   [100, 150, 220, 320],
      unique: [400, 550, 750, 1000],
    });
  });

  it('looks up exact band prices', () => {
    expect(sellPriceFor('basic', 1)).toBe(5);
    expect(sellPriceFor('magic', 4)).toBe(40);
    expect(sellPriceFor('rare', 10)).toBe(320);
  });

  it('rounds bespoke unique levels down to the nearest band', () => {
    expect(sellPriceFor('unique', 7)).toBe(750); // band index 2
    expect(sellPriceFor('unique', 8)).toBe(750); // still band 7, rounds down
    expect(sellPriceFor('unique', 5)).toBe(550); // band 4
    expect(sellPriceFor('unique', 0)).toBe(400); // floor at band 1
  });

  it('vendorBuyPrice equals 4x the canonical sell price', () => {
    expect(vendorBuyPrice('basic', 1)).toBe(20);
    expect(vendorBuyPrice('magic', 4)).toBe(160);
    expect(vendorBuyPrice('rare', 7)).toBe(880);
    expect(vendorBuyPrice('unique', 10)).toBe(4000);
  });

  it('vendorBuyPrice is always 4x sell, for every rarity and band', () => {
    const rarities: ItemRarity[] = ['basic', 'magic', 'rare', 'unique'];
    for (const rarity of rarities) {
      for (const level of [1, 4, 7, 10]) {
        expect(vendorBuyPrice(rarity, level)).toBe(sellPriceFor(rarity, level) * 4);
      }
    }
  });
});

describe('levelToBand', () => {
  it('maps character level to the correct item-level band', () => {
    expect(levelToBand(1)).toBe(1);
    expect(levelToBand(3)).toBe(1);
    expect(levelToBand(4)).toBe(4);
    expect(levelToBand(6)).toBe(4);
    expect(levelToBand(7)).toBe(7);
    expect(levelToBand(9)).toBe(7);
    expect(levelToBand(10)).toBe(10);
    expect(levelToBand(50)).toBe(10);
  });
});

describe('vendorStockFor', () => {
  it('is byte-identical for the same user+day+level', () => {
    const a = vendorStockFor('user1', '2026-07-28', 5);
    const b = vendorStockFor('user1', '2026-07-28', 5);
    expect(a).toEqual(b);
  });

  it('differs for a different day', () => {
    const a = vendorStockFor('user1', '2026-07-28', 5);
    const b = vendorStockFor('user1', '2026-07-29', 5);
    expect(a).not.toEqual(b);
  });

  it('differs for a different user', () => {
    const a = vendorStockFor('user1', '2026-07-28', 5);
    const b = vendorStockFor('user2', '2026-07-28', 5);
    expect(a).not.toEqual(b);
  });

  it('produces exactly 6 slots, each basic or magic, priced at 4x sell', () => {
    const stock = vendorStockFor('userX', '2026-07-28', 8);
    expect(stock.length).toBe(6);
    for (const slot of stock) {
      expect(['basic', 'magic']).toContain(slot.rarity);
      expect(slot.price).toBe(vendorBuyPrice(slot.rarity, slot.base.itemLevel));
      if (slot.rarity === 'basic') expect(slot.affixes).toEqual([]);
    }
  });

  it('picks bases within ±1 band-step of the level band (mid band)', () => {
    // level 5 -> band 4 (index 1); allowed bands: 1, 4, 7
    const stock = vendorStockFor('userY', '2026-07-28', 5);
    for (const slot of stock) {
      expect([1, 4, 7]).toContain(slot.base.itemLevel);
    }
  });

  it('does not go below band 1 at the lowest band', () => {
    const stock = vendorStockFor('userZ', '2026-07-28', 2); // band 1, allowed [1, 4]
    for (const slot of stock) {
      expect([1, 4]).toContain(slot.base.itemLevel);
    }
  });

  it('does not go above band 10 at the highest band', () => {
    const stock = vendorStockFor('userW', '2026-07-28', 12); // band 10, allowed [7, 10]
    for (const slot of stock) {
      expect([7, 10]).toContain(slot.base.itemLevel);
    }
  });

  it('rolls roughly 50/50 basic/magic over many seeds (weighted, not skewed)', () => {
    let magicCount = 0;
    let total = 0;
    for (let day = 0; day < 100; day++) {
      const stock = vendorStockFor('userBalance', `2026-01-${String(day + 1).padStart(2, '0')}`, 8);
      for (const slot of stock) {
        total++;
        if (slot.rarity === 'magic') magicCount++;
      }
    }
    expect(magicCount / total).toBeGreaterThan(0.35);
    expect(magicCount / total).toBeLessThan(0.65);
  });
});

describe('rollLootboxItem / rollMatchDropItem', () => {
  const weights: Record<ItemRarity, number> = { basic: 70, magic: 24, rare: 5.5, unique: 0.5 };

  it('respects rarity weights deterministically', () => {
    const basicRoll = rollLootboxItem('basic', weights, 8, () => 0.0);
    expect(basicRoll.rarity).toBe('basic');
    expect(basicRoll.affixes).toEqual([]);

    const magicRoll = rollLootboxItem('basic', weights, 8, () => 0.71);
    expect(magicRoll.rarity).toBe('magic');
  });

  it('downgrades unique to rare when the account has no eligible unique at all', () => {
    // maxCharLevel 0 (an account with no characters) — every unique requires
    // at least level 1, so the unique roll has nothing to pick and falls back.
    const result = rollLootboxItem('premium', weights, 0, () => 0.9999);
    expect(result.rarity).toBe('rare');
  });
  it('rolls a level-1 unique for a low-level account', () => {
    const result = rollLootboxItem('premium', weights, 2, () => 0.9999);
    expect(result.rarity).toBe('unique');
  });

  it('rolls an eligible unique deterministically when maxCharLevel qualifies', () => {
    // A constant 0.9999 lands rollRarity on 'unique' and then selects the
    // last eligible entry — the_quiet_hour, the final manifest item. This is
    // one of the few places manifest order is load-bearing: re-sorting
    // UNIQUE_ITEMS means updating this id.
    const expected = UNIQUE_ITEMS.find(u => u.id === 'the_quiet_hour')!;
    const result = rollMatchDropItem(weights, 10, () => 0.9999);
    expect(result.rarity).toBe('unique');
    expect(result.affixes).toEqual(expected.affixes);
    expect(result.base.id).toBe(expected.baseId);
    expect(result.levelReq).toBe(expected.levelReq);
  });

  it('reports which unique a unique roll picked', () => {
    const weights = { basic: 0, magic: 0, rare: 0, unique: 1 };
    const result = rollLootboxItem('premium', weights, 10, mulberry32(7));
    expect(result.rarity).toBe('unique');
    expect(result.uniqueId).toBeDefined();
    const manifest = UNIQUE_ITEMS.find(u => u.id === result.uniqueId)!;
    expect(manifest).toBeDefined();
    expect(result.base.id).toBe(manifest.baseId);
    expect(result.affixes).toEqual(manifest.affixes);
    expect(result.levelReq).toBe(manifest.levelReq);
  });
  it('leaves uniqueId unset on a non-unique roll', () => {
    const weights = { basic: 1, magic: 0, rare: 0, unique: 0 };
    expect(rollLootboxItem('basic', weights, 10, mulberry32(3)).uniqueId).toBeUndefined();
  });

  it('is pure under an injected rng — same seed sequence yields identical output', () => {
    const a = rollMatchDropItem(weights, 8, mulberry32(fnv1aHash('purity-seed')));
    const b = rollMatchDropItem(weights, 8, mulberry32(fnv1aHash('purity-seed')));
    expect(a).toEqual(b);
  });

  it('seededRng composes fnv1aHash + mulberry32 deterministically', () => {
    const a = seededRng('user1', '2026-07-28');
    const b = mulberry32(fnv1aHash('user1:2026-07-28'));
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});

describe('sell_price SQL / SELL_PRICES shape-guard contract', () => {
  it('matches the migration\'s CASE table exactly, so the two can never silently drift', () => {
    const migrationUrl = new URL(
      '../../supabase/migrations/20260731040000_economy.sql',
      import.meta.url,
    );
    const sql = readFileSync(migrationUrl, 'utf8');

    // Each rarity's WHEN clause is a fixed-shape nested CASE over the four
    // bands, band10 down to band1(else), in that literal source order.
    const clauseRe =
      /when '(\w+)'\s+then case when p_level_req >= 10 then (\d+)\s+when p_level_req >= 7 then (\d+)\s+when p_level_req >= 4 then (\d+)\s+else (\d+)\s+end/g;

    const sqlPrices: Record<string, [number, number, number, number]> = {};
    for (const m of sql.matchAll(clauseRe)) {
      const [, rarity, band10, band7, band4, band1] = m;
      sqlPrices[rarity] = [Number(band1), Number(band4), Number(band7), Number(band10)];
    }

    expect(Object.keys(sqlPrices).sort(), 'expected one WHEN clause per rarity in sell_price')
      .toEqual(Object.keys(SELL_PRICES).sort());

    expect(sqlPrices).toEqual(SELL_PRICES);
  });
});
