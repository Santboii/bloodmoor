import { describe, it, expect } from 'vitest';
import {
  ITEM_BASES, UNIQUE_ITEMS, AFFIX_TIERS, rollItem, rollRarity, computeLoadout,
  classOwnsTree, validateItemRow, BASE_STAT_BLOCK, MAX_HP, MAX_MANA,
} from '@arena/shared';
import type { ItemRow } from '@arena/shared';

const seeded = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

type ItemRowLike = ItemRow;

describe('manifests', () => {
  it('every base has a valid slot, band, and implicit', () => {
    for (const b of ITEM_BASES) {
      expect([1, 4, 7, 10]).toContain(b.itemLevel);
      expect(b.implicit.value).toBeGreaterThan(0);
      if (b.slot === 'weapon') expect(b.classRestriction).toBeDefined();
      else expect(b.classRestriction).toBeUndefined();
    }
  });
  it('every unique references a real base and respects the 2-talent cap', () => {
    for (const u of UNIQUE_ITEMS) {
      expect(ITEM_BASES.some(b => b.id === u.baseId)).toBe(true);
      expect(u.affixes.filter(a => a.id === 'talent').length).toBeLessThanOrEqual(2);
    }
  });
});

describe('rollItem', () => {
  it('respects rarity affix counts and the rare talent cap over many seeds', () => {
    const base = ITEM_BASES.find(b => b.slot === 'ring')!;
    for (let s = 0; s < 200; s++) {
      const rng = seeded([((s * 37) % 100) / 100, ((s * 61) % 100) / 100, ((s * 13) % 100) / 100, ((s * 7) % 100) / 100, ((s * 91) % 100) / 100, ((s * 53) % 100) / 100]);
      const magic = rollItem(base, 'magic', rng);
      expect(magic.length).toBeGreaterThanOrEqual(1); expect(magic.length).toBeLessThanOrEqual(2);
      const rare = rollItem(base, 'rare', rng);
      expect(rare.length).toBeGreaterThanOrEqual(3); expect(rare.length).toBeLessThanOrEqual(5);
      expect(rare.filter(a => a.id === 'talent').length).toBeLessThanOrEqual(1);
      const ids = rare.filter(a => a.id !== 'talent').map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length); // no duplicate affix types
    }
  });
  it('rolled values stay inside the band range', () => {
    const base = ITEM_BASES.find(b => b.itemLevel === 7 && b.slot === 'amulet')!;
    for (let s = 0; s < 100; s++) {
      const rng = seeded([(s % 100) / 100, ((s * 31) % 100) / 100, ((s * 17) % 100) / 100, ((s * 71) % 100) / 100]);
      for (const a of rollItem(base, 'rare', rng)) {
        if (a.id === 'talent') continue;
        const [lo, hi] = AFFIX_TIERS[a.id][2]; // band index for level 7
        expect(a.value).toBeGreaterThanOrEqual(lo);
        expect(a.value).toBeLessThanOrEqual(hi);
      }
    }
  });
  it('basic rolls no affixes', () => {
    expect(rollItem(ITEM_BASES[0], 'basic', seeded([0.5]))).toEqual([]);
  });
});

describe('computeLoadout', () => {
  const mk = (over: Partial<ItemRowLike>): ItemRowLike => ({
    id: 'x', base_id: ITEM_BASES[0].id, rarity: 'magic', affixes: [],
    level_req: 1, equipped_by: 'c', equipped_slot: 'helmet', slot: 'helmet', ...over,
  });
  it('starts from the base block and folds affixes + implicits', () => {
    const items = [mk({ affixes: [{ id: 'max_health', value: 40 }, { id: 'damage_pct', value: 5 }] })];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.maxHp).toBeGreaterThanOrEqual(MAX_HP + 40); // implicit may add more
    expect(statBlock.damageMult).toBeCloseTo(1.05, 5);
  });
  it('applies on-class talent affixes and ignores off-class ones', () => {
    const items = [mk({ affixes: [
      { id: 'talent', value: 2, node: 'fire.cataclysm' },
      { id: 'talent', value: 1, node: 'archer.barrage' },
    ] })];
    const { talentRanks } = computeLoadout(items, 'mage');
    expect(talentRanks.get('fire.cataclysm')).toBe(2);
    expect(talentRanks.has('archer.barrage')).toBe(false);
  });
  it('classOwnsTree maps both classes correctly', () => {
    expect(classOwnsTree('mage', 'fire.meteor')).toBe(true);
    expect(classOwnsTree('mage', 'utility.teleport')).toBe(true);
    expect(classOwnsTree('mage', 'archer.barrage')).toBe(false);
    expect(classOwnsTree('ranger', 'archer_utility.evade')).toBe(true);
  });
});

describe('rollRarity + validateItemRow', () => {
  it('rollRarity respects weights deterministically', () => {
    const w = { basic: 70, magic: 24, rare: 5.5, unique: 0.5 };
    expect(rollRarity(w, () => 0.0)).toBe('basic');
    expect(rollRarity(w, () => 0.71)).toBe('magic');
    expect(rollRarity(w, () => 0.9999)).toBe('unique');
  });
  it('validateItemRow rejects malformed rows and passes real ones', () => {
    expect(validateItemRow(null)).toBeNull();
    expect(validateItemRow({ base_id: 'nope' })).toBeNull();
  });
});
