import { describe, it, expect } from 'vitest';
import {
  ITEM_BASES, UNIQUE_ITEMS, AFFIX_TIERS, rollItem, rollRarity, computeLoadout,
  classOwnsTree, validateItemRow, uniqueForRow, BASE_STAT_BLOCK, MAX_HP, MAX_MANA, mulberry32,
  SKILL_NODES, ITEM_LEVEL_BANDS, affixLabel, isDrawback,
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
  it('ships fourteen uniques, three new per band', () => {
    expect(UNIQUE_ITEMS).toHaveLength(14);
    const byBand = (lvl: number) => UNIQUE_ITEMS.filter(u => u.levelReq === lvl).length;
    expect(byBand(1)).toBe(3);
    expect(byBand(4)).toBe(3);
    expect(byBand(7)).toBe(5);  // 3 new + emberheart + windrunner_band
    expect(byBand(10)).toBe(3);
  });
  it('unique ids are distinct', () => {
    const ids = UNIQUE_ITEMS.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every talent affix on a unique names a real skill node', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) {
        if (a.id !== 'talent') continue;
        expect(a.node, `${u.id}`).toBeDefined();
        expect(SKILL_NODES.some(n => n.id === a.node), `${u.id} -> ${a.node}`).toBe(true);
      }
    }
  });
  it('every unique carries flavor text and a level requirement in a real band', () => {
    for (const u of UNIQUE_ITEMS) {
      expect(u.flavor.length, u.id).toBeGreaterThan(0);
      expect([1, 4, 7, 10], u.id).toContain(u.levelReq);
    }
  });
  it('aura colors are 0-1 rgb triples and every unique has an aura', () => {
    for (const u of UNIQUE_ITEMS) {
      expect(u.aura, u.id).toBeDefined();
      expect(u.aura!.color, u.id).toHaveLength(3);
      for (const c of u.aura!.color) {
        expect(c, u.id).toBeGreaterThanOrEqual(0);
        expect(c, u.id).toBeLessThanOrEqual(1);
      }
    }
  });
  it('lpcTint only sits on bases that have an lpc manifest', () => {
    for (const u of UNIQUE_ITEMS) {
      if (!u.lpcTint) continue;
      const base = ITEM_BASES.find(b => b.id === u.baseId)!;
      expect(base.lpc, `${u.id} on ${u.baseId}`).toBeDefined();
    }
  });
  // Drift guard: a unique is rare-tier numbers plus a talent payload, not a
  // stat item that outclasses its own rarity. Upside is held to 1.5x the top
  // of its band's rare range. Drawbacks get a looser 2.5x bound on purpose —
  // a unique buys its power with an outsized cost, and a drawback capped at
  // the same multiple as the upside would not be felt.
  it('unique upside stays within 1.5x its band top, drawbacks within 2.5x', () => {
    for (const u of UNIQUE_ITEMS) {
      const bandIndex = ITEM_LEVEL_BANDS.indexOf(u.levelReq as (typeof ITEM_LEVEL_BANDS)[number]);
      expect(bandIndex, u.id).toBeGreaterThanOrEqual(0);
      for (const a of u.affixes) {
        if (a.id === 'talent') continue;
        const [, hi] = AFFIX_TIERS[a.id][bandIndex];
        const ceiling = hi * (a.value < 0 ? 2.5 : 1.5);
        expect(Math.abs(a.value), `${u.id} ${a.id}`).toBeLessThanOrEqual(ceiling);
      }
    }
  });
  it('the two uniques sharing moon_amulet are distinguishable by unique_id', () => {
    const onMoon = UNIQUE_ITEMS.filter(u => u.baseId === 'moon_amulet');
    expect(onMoon.length).toBe(2);
    for (const u of onMoon) {
      expect(uniqueForRow({ base_id: 'moon_amulet', unique_id: u.id })?.id).toBe(u.id);
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
    const base = ITEM_BASES.find(b => b.id === 'leather_cap')!;
    expect(rollItem(base, 'basic', seeded([0.5]))).toEqual([]);
  });

  it('move_speed_pct never rolls on non-leggings bases, but does roll on leggings, over 300 seeded rare rolls', () => {
    const nonLeggings = [
      ITEM_BASES.find(b => b.slot === 'ring')!,
      ITEM_BASES.find(b => b.slot === 'amulet')!,
      ITEM_BASES.find(b => b.slot === 'helmet')!,
    ];
    const leggings = ITEM_BASES.find(b => b.slot === 'leggings')!;
    let leggingsRolledMoveSpeed = false;
    for (let s = 1; s <= 300; s++) {
      for (const base of nonLeggings) {
        const affixes = rollItem(base, 'rare', mulberry32(s));
        expect(affixes.some(a => a.id === 'move_speed_pct')).toBe(false);
      }
      if (rollItem(leggings, 'rare', mulberry32(s)).some(a => a.id === 'move_speed_pct')) {
        leggingsRolledMoveSpeed = true;
      }
    }
    expect(leggingsRolledMoveSpeed).toBe(true);
  });
});

describe('computeLoadout', () => {
  // leather_cap's implicit is max_health, which doesn't collide with the
  // damage_pct affix under test below — anchored by id, not array position,
  // since catalog ordering is not a contract.
  const mk = (over: Partial<ItemRowLike>): ItemRowLike => ({
    id: 'x', base_id: 'leather_cap', rarity: 'magic', affixes: [],
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
  it('caps moveSpeedMult at 1.15 even when stacked move_speed_pct affixes would multiply past it', () => {
    // Best-in-catalog bands (weapon 8% L10, 4x accessory 6% L7, 2x ring 3%
    // L4) multiply out to ~1.02 * 1.06^4 * 1.03^2 ≈ 1.45 uncapped — the
    // spec's stated "~+15% across a full loadout" intent, so the clamp
    // must actually bind here, not just sit above realistic rolls.
    const items = [
      mk({ base_id: 'archmage_staff', slot: 'weapon', equipped_slot: 'weapon', affixes: [{ id: 'move_speed_pct', value: 8 }] }),
      mk({ base_id: 'iron_helm', slot: 'helmet', equipped_slot: 'helmet', affixes: [{ id: 'move_speed_pct', value: 6 }] }),
      mk({ base_id: 'scale_mail', slot: 'armor', equipped_slot: 'armor', affixes: [{ id: 'move_speed_pct', value: 6 }] }),
      mk({ base_id: 'mail_leggings', slot: 'leggings', equipped_slot: 'leggings', affixes: [{ id: 'move_speed_pct', value: 6 }] }),
      mk({ base_id: 'moon_amulet', slot: 'amulet', equipped_slot: 'amulet', affixes: [{ id: 'move_speed_pct', value: 6 }] }),
      mk({ base_id: 'silver_ring', slot: 'ring', equipped_slot: 'ring1', affixes: [{ id: 'move_speed_pct', value: 3 }] }),
      mk({ base_id: 'silver_ring', slot: 'ring', equipped_slot: 'ring2', affixes: [{ id: 'move_speed_pct', value: 3 }] }),
    ];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.moveSpeedMult).toBe(1.15);
  });
  it('floors maxHp and maxMana when drawback affixes would drive them under', () => {
    const items = [mk({ affixes: [{ id: 'max_health', value: -900 }, { id: 'max_mana', value: -900 }] })];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.maxHp).toBe(100);
    expect(statBlock.maxMana).toBe(50);
  });
  it('floors moveSpeedMult at 0.75 under stacked negative move_speed_pct', () => {
    const items = [
      mk({ base_id: 'mail_leggings', slot: 'leggings', equipped_slot: 'leggings', affixes: [{ id: 'move_speed_pct', value: -20 }] }),
      mk({ base_id: 'iron_helm', slot: 'helmet', equipped_slot: 'helmet', affixes: [{ id: 'move_speed_pct', value: -20 }] }),
      mk({ base_id: 'scale_mail', slot: 'armor', equipped_slot: 'armor', affixes: [{ id: 'move_speed_pct', value: -20 }] }),
    ];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.moveSpeedMult).toBe(0.75);
  });
  it('floors manaRegenMult at 0 rather than letting it go negative', () => {
    const items = [mk({ affixes: [{ id: 'mana_regen_pct', value: -150 }] })];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.manaRegenMult).toBe(0);
  });
  it('leaves an ordinary positive loadout untouched by the floors', () => {
    const items = [mk({ affixes: [{ id: 'max_health', value: 40 }] })];
    const { statBlock } = computeLoadout(items, 'mage');
    expect(statBlock.maxHp).toBeGreaterThan(700);
    expect(statBlock.moveSpeedMult).toBe(1);
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

describe('uniqueForRow', () => {
  const uniqueRow = (over: Partial<ItemRow> = {}): ItemRow => ({
    id: 'u1', base_id: 'moon_amulet', rarity: 'unique', affixes: [],
    level_req: 7, equipped_by: null, equipped_slot: null, slot: 'amulet', ...over,
  });

  it('resolves by unique_id', () => {
    expect(uniqueForRow(uniqueRow({ unique_id: 'emberheart' }))?.id).toBe('emberheart');
  });
  it('returns undefined when unique_id names a unique that does not sit on this base', () => {
    expect(uniqueForRow(uniqueRow({ base_id: 'bone_ring', unique_id: 'emberheart' }))).toBeUndefined();
  });
  it('returns undefined for an unknown unique_id', () => {
    expect(uniqueForRow(uniqueRow({ unique_id: 'no_such_unique' }))).toBeUndefined();
  });
  it('falls back to a base_id match for legacy rows granted before the column existed', () => {
    expect(uniqueForRow(uniqueRow())?.id).toBe('emberheart');
  });
});

describe('affixLabel', () => {
  it('prefixes positive values with +', () => {
    expect(affixLabel({ id: 'max_health', value: 40 })).toBe('+40 Max Health');
    expect(affixLabel({ id: 'damage_pct', value: 8 })).toBe('+8% Damage');
  });
  it('renders negative values with a single minus sign, never +-', () => {
    expect(affixLabel({ id: 'max_health', value: -35 })).toBe('-35 Max Health');
    expect(affixLabel({ id: 'damage_pct', value: -6 })).toBe('-6% Damage');
    expect(affixLabel({ id: 'max_health', value: -35 })).not.toContain('+-');
  });
  it('labels talent affixes by rank', () => {
    expect(affixLabel({ id: 'talent', value: 2, node: 'fire.cataclysm' })).toBe('+2 Talent Rank');
  });
  it('isDrawback marks only negative values', () => {
    expect(isDrawback({ id: 'max_health', value: -35 })).toBe(true);
    expect(isDrawback({ id: 'max_health', value: 35 })).toBe(false);
    expect(isDrawback({ id: 'talent', value: 2, node: 'fire.cataclysm' })).toBe(false);
  });
  it('every shipped unique drawback renders without a doubled sign', () => {
    for (const u of UNIQUE_ITEMS) {
      for (const a of u.affixes) expect(affixLabel(a), u.id).not.toContain('+-');
    }
  });
});

describe('validateItemRow unique_id', () => {
  const raw = (over: Record<string, unknown> = {}) => ({
    id: 'r1', base_id: 'moon_amulet', rarity: 'unique', affixes: [],
    level_req: 7, equipped_by: null, equipped_slot: null, slot: 'amulet', ...over,
  });

  it('accepts a row with no unique_id at all', () => {
    expect(validateItemRow(raw())).not.toBeNull();
  });
  it('accepts null unique_id', () => {
    expect(validateItemRow(raw({ unique_id: null }))?.unique_id).toBeNull();
  });
  it('accepts a valid unique_id and passes it through', () => {
    expect(validateItemRow(raw({ unique_id: 'emberheart' }))?.unique_id).toBe('emberheart');
  });
  it('rejects an unknown unique_id', () => {
    expect(validateItemRow(raw({ unique_id: 'no_such_unique' }))).toBeNull();
  });
  it('rejects a unique_id whose manifest base disagrees with the row base', () => {
    expect(validateItemRow(raw({ base_id: 'bone_ring', slot: 'ring', unique_id: 'emberheart' }))).toBeNull();
  });
});
