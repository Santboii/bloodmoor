import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { buildRangerModifiers } from '../src/skills/RangerModifiers.ts';
import type { NodeId, InputFrame, ItemRow } from '@arena/shared';
import { MAX_HP, MAX_MANA, computeLoadout, deriveElement } from '@arena/shared';

const idle = (aim = { x: 0, y: 0 }): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: aim });

// bone_ring's implicit is max_mana — inert for every other stat under test
// below, so it never collides with the affix being exercised.
const mkItem = (over: Partial<ItemRow>): ItemRow => ({
  id: 'item1', base_id: 'bone_ring', rarity: 'magic', affixes: [],
  level_req: 1, equipped_by: 'char1', equipped_slot: 'ring1', slot: 'ring',
  ...over,
});

describe('StatBlock stamping (makeInitialState)', () => {
  it('a +40 max_health item spawns the player at hp 790 / maxHp 790', () => {
    const item = mkItem({ affixes: [{ id: 'max_health', value: 40 }] });
    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, items: [item] },
    ]);
    expect(state.players.p1.maxHp).toBe(MAX_HP + 40);
    expect(state.players.p1.hp).toBe(MAX_HP + 40);
  });

  it('a guest (no items) spawns at the 750/500 baseline', () => {
    const state = makeInitialState([
      { id: 'g1', displayName: 'Guest', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    ]);
    expect(state.players.g1.maxHp).toBe(MAX_HP);
    expect(state.players.g1.maxMana).toBe(MAX_MANA);
    expect(state.players.g1.hp).toBe(MAX_HP);
    expect(state.players.g1.mana).toBe(MAX_MANA);
    expect(state.players.g1.statMults).toEqual({ damage: 1, cooldown: 1, moveSpeed: 1, manaRegen: 1 });
  });
});

describe('statMults consumption in the tick loop', () => {
  it('manaRegenMult 1.2 regens mana 20% faster than a baseline player', () => {
    const item = mkItem({ affixes: [{ id: 'mana_regen_pct', value: 20 }] });
    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, items: [item] },
      { id: 'p2', displayName: 'P2', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    state.players.p1.mana = 0;
    state.players.p2.mana = 0;
    const next = advanceState(state, { p1: idle(), p2: idle() });
    expect(next.players.p1.mana).toBeCloseTo(next.players.p2.mana * 1.2, 5);
  });

  it('cooldownMult 0.9 sets fireball cooldown to round(30 * 0.9)', () => {
    const item = mkItem({ affixes: [{ id: 'cast_speed_pct', value: 10 }] });
    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, items: [item] },
      { id: 'p2', displayName: 'P2', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 } },
      p2: idle(),
    };
    const next = advanceState(state, inputs);
    expect(next.players.p1.cooldowns[1]).toBe(Math.round(30 * 0.9));
  });

  it('damageMult 1.1 scales a fireball hit\'s damage by the attacker\'s multiplier', () => {
    const item = mkItem({ affixes: [{ id: 'damage_pct', value: 10 }] });
    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, items: [item] },
      { id: 'p2', displayName: 'P2', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    // damageMin === damageMax makes fireballDamage() deterministic (floor of
    // a value in [min, min+1) is always min); the projectile is placed one
    // tick's travel short of p2 so it lands exactly on p2 (distance 0, no
    // blast falloff) after the single advanceState call below.
    state.projectiles.push({
      id: 'fb_test', ownerId: 'p1', type: 'fireball',
      position: { x: 1800 - 400 / 60, y: 1000 }, velocity: { x: 400, y: 0 },
      damageMin: 100, damageMax: 100,
    });
    const next = advanceState(state, { p1: idle(), p2: idle() });
    expect(next.players.p2.hp).toBeCloseTo(MAX_HP - 100 * 1.1, 5);
  });

  it('moveSpeedMult 1.06 makes per-tick position delta 6% larger', () => {
    const item = mkItem({ affixes: [{ id: 'move_speed_pct', value: 6 }] });
    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, items: [item] },
      { id: 'p2', displayName: 'P2', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    ]);
    const move = { x: 1, y: 0 };
    const next = advanceState(state, {
      p1: { move, castSpell: null, aimTarget: { x: 1800, y: 1000 } },
      p2: { move, castSpell: null, aimTarget: { x: 1800, y: 1000 } },
    });
    const d1 = next.players.p1.position.x - 200;
    const d2 = next.players.p2.position.x - 200;
    expect(d1).toBeCloseTo(d2 * 1.06, 5);
  });
});

describe('effective ranks — tree + item talent merge', () => {
  it('item +2 fire.cataclysm on a mage with tree rank 3 computes Meteor radius at effective rank 5', () => {
    const item = mkItem({ affixes: [{ id: 'talent', value: 2, node: 'fire.cataclysm' as NodeId }] });
    const { talentRanks } = computeLoadout([item], 'mage');
    const treeRanks = new Map<NodeId, number>([['fire.meteor', 1], ['fire.cataclysm', 3]]);
    const merged = new Map(treeRanks);
    for (const [node, rank] of talentRanks) merged.set(node, (merged.get(node) ?? 0) + rank);
    expect(merged.get('fire.cataclysm')).toBe(5);

    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'P2', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 3, aimTarget: { x: 1000, y: 1000 } };

    const treeOnly = advanceState(state, { p1: cast, p2: idle() }, { p1: treeRanks, p2: new Map() });
    const withItem = advanceState(state, { p1: cast, p2: idle() }, { p1: merged, p2: new Map() });

    expect(withItem.meteors[0].aoeRadius).toBeGreaterThan(treeOnly.meteors[0].aoeRadius);
    expect(withItem.meteors[0].aoeRadius).toBeCloseTo(60 * (1 + 0.15 * Math.pow(5, 0.7)), 5);
  });

  it('an item can grant fire.meteor to a mage whose tree has not unlocked it (oskill) — cast gate opens', () => {
    const item = mkItem({ affixes: [{ id: 'talent', value: 1, node: 'fire.meteor' as NodeId }] });
    const { talentRanks } = computeLoadout([item], 'mage');
    const treeRanks = new Map<NodeId, number>(); // no fire.meteor node owned
    const merged = new Map(treeRanks);
    for (const [node, rank] of talentRanks) merged.set(node, (merged.get(node) ?? 0) + rank);
    expect(merged.has('fire.meteor')).toBe(true);

    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'P2', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 3, aimTarget: { x: 1000, y: 1000 } };

    const withoutItem = advanceState(state, { p1: cast, p2: idle() }, { p1: treeRanks, p2: new Map() });
    expect(withoutItem.meteors).toHaveLength(0);

    const withItem = advanceState(state, { p1: cast, p2: idle() }, { p1: merged, p2: new Map() });
    expect(withItem.meteors).toHaveLength(1);
  });

  it('element conflict: tree burn rank 2 + item freeze rank 3 → freeze wins (higher effective rank)', () => {
    const item = mkItem({ affixes: [{ id: 'talent', value: 3, node: 'archer.freeze' as NodeId }] });
    const { talentRanks } = computeLoadout([item], 'ranger');
    const treeRanks = new Map<NodeId, number>([['archer.power_shot', 1], ['archer.burn', 2]]);
    const merged = new Map(treeRanks);
    for (const [node, rank] of talentRanks) merged.set(node, (merged.get(node) ?? 0) + rank);

    const mods = buildRangerModifiers(merged);
    expect(mods.element).toBe('freeze');
  });

  it('integration: the merged freeze element slows on arrow hit instead of burning', () => {
    const item = mkItem({ affixes: [{ id: 'talent', value: 3, node: 'archer.freeze' as NodeId }] });
    const { talentRanks } = computeLoadout([item], 'ranger');
    const treeRanks = new Map<NodeId, number>([['archer.power_shot', 1], ['archer.burn', 2]]);
    const merged = new Map(treeRanks);
    for (const [node, rank] of talentRanks) merged.set(node, (merged.get(node) ?? 0) + rank);

    let state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
    ]);
    state.projectiles.push({
      id: 'test_arrow', ownerId: 'p1', type: 'arrow',
      position: { x: 1570, y: 1000 }, velocity: { x: 560, y: 0 },
      damageMin: 60, damageMax: 90,
    });
    const skills = { p1: merged, p2: new Map<NodeId, number>() };
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players.p2.slowUntil).toBeGreaterThan(state.tick);
    expect(state.players.p2.burnUntil).toBeUndefined();
  });
});

describe('deriveElement', () => {
  it('returns none when all ranks are zero/absent', () => {
    expect(deriveElement(new Map())).toBe('none');
  });

  it('picks the single owned element', () => {
    expect(deriveElement(new Map([['archer.poison' as NodeId, 4]]))).toBe('poison');
  });

  it('breaks ties burn > freeze > poison', () => {
    expect(deriveElement(new Map([
      ['archer.burn' as NodeId, 3], ['archer.freeze' as NodeId, 3], ['archer.poison' as NodeId, 3],
    ]))).toBe('burn');
    expect(deriveElement(new Map([
      ['archer.freeze' as NodeId, 3], ['archer.poison' as NodeId, 3],
    ]))).toBe('freeze');
  });

  it('a strictly higher rank outranks a lower-rank tiebreak favorite', () => {
    expect(deriveElement(new Map([
      ['archer.burn' as NodeId, 2], ['archer.freeze' as NodeId, 3],
    ]))).toBe('freeze');
  });
});
