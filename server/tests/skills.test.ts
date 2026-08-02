import { describe, it, expect } from 'vitest';
import { canUnlock, SKILL_NODES, effectAtRank, rankUpCost, totalSpentForRanks, isStackable, DIMINISHING_POWER, countAtRank, hasKeystone } from '@arena/shared';

describe('canUnlock', () => {
  it('allows unlocking a tier-I spell with no prerequisites', () => {
    expect(canUnlock('fire.fireball', new Set())).toBe(true);
    expect(canUnlock('utility.teleport', new Set())).toBe(true);
  });

  it('blocks a tier-II node when its required spell is not owned', () => {
    expect(canUnlock('fire.volatile_ember', new Set())).toBe(false);
    expect(canUnlock('fire.seeking_flame', new Set())).toBe(false);
  });

  it('allows a tier-II node when its required spell is owned', () => {
    const owned = new Set(['fire.fireball']);
    expect(canUnlock('fire.volatile_ember', owned)).toBe(true);
  });

  it('blocks Fire Wall when no tier-II fire node is owned', () => {
    const owned = new Set(['fire.fireball']);
    expect(canUnlock('fire.fire_wall', owned)).toBe(false);
  });

  it('allows Fire Wall when at least one tier-II fire node is owned', () => {
    const owned = new Set(['fire.fireball', 'fire.volatile_ember']);
    expect(canUnlock('fire.fire_wall', owned)).toBe(true);
  });

  it('blocks Meteor when no tier-V fire node is owned', () => {
    const owned = new Set(['fire.fireball', 'fire.volatile_ember', 'fire.fire_wall']);
    expect(canUnlock('fire.meteor', owned)).toBe(false);
  });

  it('allows Meteor when at least one tier-V fire node is owned', () => {
    const owned = new Set(['fire.fireball', 'fire.volatile_ember', 'fire.fire_wall', 'fire.enduring_flames']);
    expect(canUnlock('fire.meteor', owned)).toBe(true);
  });

  it('returns all 13 fire nodes + 4 utility nodes in SKILL_NODES', () => {
    const fire = SKILL_NODES.filter(n => n.tree === 'fire');
    const util = SKILL_NODES.filter(n => n.tree === 'utility');
    expect(fire).toHaveLength(13);
    expect(util).toHaveLength(4);
  });
});

describe('scaling helpers', () => {
  it('effectAtRank returns baseEffect at rank 1', () => {
    expect(effectAtRank(25, 1)).toBeCloseTo(25, 5);
  });

  it('effectAtRank applies diminishing power curve', () => {
    expect(effectAtRank(25, 2)).toBeCloseTo(25 * Math.pow(2, DIMINISHING_POWER), 5);
    expect(effectAtRank(25, 5)).toBeCloseTo(25 * Math.pow(5, DIMINISHING_POWER), 5);
  });

  it('effectAtRank returns 0 for rank 0', () => {
    expect(effectAtRank(25, 0)).toBe(0);
  });

  it('rankUpCost returns base cost for ranks up to soft cap', () => {
    const node = SKILL_NODES.find(n => n.id === 'fire.seeking_flame')!;
    expect(rankUpCost(node, 0)).toBe(1);
    expect(rankUpCost(node, 1)).toBe(1);
    expect(rankUpCost(node, 4)).toBe(1);
  });

  it('rankUpCost ramps past soft cap', () => {
    const node = SKILL_NODES.find(n => n.id === 'fire.seeking_flame')!;
    expect(rankUpCost(node, 5)).toBe(2);
    expect(rankUpCost(node, 6)).toBe(3);
    expect(rankUpCost(node, 7)).toBe(4);
  });

  it('rankUpCost for binary node returns cost at rank 0, Infinity at rank 1', () => {
    const node = SKILL_NODES.find(n => n.id === 'utility.ethereal_form')!;
    expect(rankUpCost(node, 0)).toBe(2);
    expect(rankUpCost(node, 1)).toBe(Infinity);
  });

  it('totalSpentForRanks computes cumulative cost', () => {
    const node = SKILL_NODES.find(n => n.id === 'fire.seeking_flame')!;
    expect(totalSpentForRanks(node, 0)).toBe(0);
    expect(totalSpentForRanks(node, 1)).toBe(1);
    expect(totalSpentForRanks(node, 5)).toBe(5);
    expect(totalSpentForRanks(node, 6)).toBe(7);
    expect(totalSpentForRanks(node, 7)).toBe(10);
  });

  it('isStackable returns true for stackable nodes, false for binary', () => {
    expect(isStackable(SKILL_NODES.find(n => n.id === 'fire.seeking_flame')!)).toBe(true);
    expect(isStackable(SKILL_NODES.find(n => n.id === 'utility.ethereal_form')!)).toBe(false);
    expect(isStackable(SKILL_NODES.find(n => n.id === 'fire.fireball')!)).toBe(false);
  });
});

import { buildSpellModifiers } from '../src/skills/SpellModifiers.ts';
import { FIREBALL_SPEED, FIREBALL_RADIUS, effectAtRank } from '@arena/shared';

describe('buildSpellModifiers', () => {
  it('returns base values when no skills are owned', () => {
    const m = buildSpellModifiers(new Map());
    expect(m.fireball.speed).toBe(FIREBALL_SPEED);
    expect(m.fireball.radius).toBe(FIREBALL_RADIUS);
    expect(m.fireball.damageMin).toBe(80);
    expect(m.fireball.damageMax).toBe(120);
    expect(m.fireball.homingStrength).toBe(0);
    expect(m.fireball.embers).toBe(0);
    expect(m.fireball.bounces).toBe(0);
    expect(m.firewall.durationMultiplier).toBe(1);
    expect(m.firewall.damageMultiplier).toBe(1);
    expect(m.meteor.chunks).toBe(0);
    expect(m.meteor.showerCount).toBe(0);
    expect(m.meteor.steerRadius).toBe(0);
    expect(m.teleport.maxRange).toBe(600);
    expect(m.teleport.etherealForm).toBe(false);
    expect(m.teleport.phantomStep).toBe(false);
  });

  it('applies Volatile Ember rank 1: two embers, no radius change', () => {
    const m = buildSpellModifiers(new Map([['fire.fireball', 1], ['fire.volatile_ember', 1]]));
    expect(m.fireball.embers).toBe(2);
    expect(m.fireball.radius).toBe(FIREBALL_RADIUS);
    expect(m.fireball.blastRadius).toBe(FIREBALL_RADIUS);
  });

  it('applies Volatile Ember rank 5: six embers', () => {
    const m = buildSpellModifiers(new Map([['fire.fireball', 1], ['fire.volatile_ember', 5]]));
    expect(m.fireball.embers).toBe(6);
    expect(m.fireball.blastRadius).toBe(FIREBALL_RADIUS);
  });

  it('applies Hellfire rank 1: +50% radius AND blast radius, +30% damage, -15% speed', () => {
    const m = buildSpellModifiers(new Map([['fire.fireball', 1], ['fire.hellfire', 1]]));
    const e = effectAtRank(1.0, 1);
    expect(m.fireball.radius).toBeCloseTo(FIREBALL_RADIUS * (1 + 0.5 * e), 5);
    expect(m.fireball.blastRadius).toBeCloseTo(FIREBALL_RADIUS * (1 + 0.5 * e), 5);
    expect(m.fireball.damageMin).toBeCloseTo(80 * (1 + 0.3 * e), 5);
    expect(m.fireball.damageMax).toBeCloseTo(120 * (1 + 0.3 * e), 5);
    expect(m.fireball.speed).toBeCloseTo(FIREBALL_SPEED * (1 - 0.15 * e), 5);
  });

  it('Hellfire alone drives radius; Volatile Ember only adds embers', () => {
    const m = buildSpellModifiers(new Map([
      ['fire.fireball', 1], ['fire.volatile_ember', 3], ['fire.hellfire', 2],
    ]));
    const hfBonus = 1 + 0.5 * effectAtRank(1.0, 2);
    expect(m.fireball.radius).toBeCloseTo(FIREBALL_RADIUS * hfBonus, 5);
    expect(m.fireball.blastRadius).toBeCloseTo(FIREBALL_RADIUS * hfBonus, 5);
    expect(m.fireball.embers).toBe(4);
  });

  it('applies Seeking Flame rank 3: accelerating homing strength', () => {
    const m = buildSpellModifiers(new Map([['fire.fireball', 1], ['fire.seeking_flame', 3]]));
    expect(m.fireball.homingStrength).toBeCloseTo(12 * Math.pow(3, 1.65), 5);
  });

  it('applies Ricochet rank 2: three bounces, strictly more than rank 1', () => {
    const r1 = buildSpellModifiers(new Map([['fire.fireball', 1], ['fire.pyroclasm', 1]]));
    const r2 = buildSpellModifiers(new Map([['fire.fireball', 1], ['fire.pyroclasm', 2]]));
    expect(r1.fireball.bounces).toBe(2);
    expect(r2.fireball.bounces).toBe(3);
    // Regression guard: the old floor(effectAtRank(1, rank)) curve made rank 2
    // identical to rank 1, so the second point bought nothing.
    expect(r2.fireball.bounces).toBeGreaterThan(r1.fireball.bounces);
  });

  it('applies Enduring Flames rank 4: duration multiplier', () => {
    const m = buildSpellModifiers(new Map([
      ['fire.fireball', 1], ['fire.volatile_ember', 1], ['fire.fire_wall', 1], ['fire.enduring_flames', 4],
    ]));
    expect(m.firewall.durationMultiplier).toBeCloseTo(1 + effectAtRank(0.10, 4), 5);
  });

  it('applies Searing Heat rank 2: damage multiplier', () => {
    const m = buildSpellModifiers(new Map([
      ['fire.fireball', 1], ['fire.volatile_ember', 1], ['fire.fire_wall', 1], ['fire.searing_heat', 2],
    ]));
    expect(m.firewall.damageMultiplier).toBeCloseTo(1 + effectAtRank(0.08, 2), 5);
  });

  it('applies Phase Shift rank 3: teleport range', () => {
    const m = buildSpellModifiers(new Map([['utility.teleport', 1], ['utility.phase_shift', 3]]));
    expect(m.teleport.maxRange).toBeCloseTo(600 * (1 + effectAtRank(0.08, 3)), 5);
  });

  it('Guided Descent rank 1 grants the smallest steer radius', () => {
    const m = buildSpellModifiers(new Map([
      ['fire.fireball', 1], ['fire.volatile_ember', 1], ['fire.fire_wall', 1],
      ['fire.enduring_flames', 1], ['fire.meteor', 1], ['fire.blind_strike', 1],
    ]));
    expect(m.meteor.steerRadius).toBe(80);
    expect(m.meteor.fallingStar).toBe(false);
  });

  it('Molten Impact rank 1 shatters into three chunks', () => {
    const m = buildSpellModifiers(new Map([
      ['fire.fireball', 1], ['fire.volatile_ember', 1], ['fire.fire_wall', 1],
      ['fire.enduring_flames', 1], ['fire.meteor', 1], ['fire.molten_impact', 1],
    ]));
    expect(m.meteor.chunks).toBe(3);
    expect(m.meteor.ejecta).toBe(false);
  });

  it('binary nodes still work: Ethereal Form and Phantom Step', () => {
    const m = buildSpellModifiers(new Map([
      ['utility.teleport', 1], ['utility.ethereal_form', 1], ['utility.phantom_step', 1],
    ]));
    expect(m.teleport.etherealForm).toBe(true);
    expect(m.teleport.phantomStep).toBe(true);
  });
});

// ── Fire rework ─────────────────────────────────────────────────────────────

describe('fire count curves', () => {
  it('gives every rank a distinct count — no dead ranks', () => {
    expect(countAtRank('fire.pyroclasm', 1)).toBe(2);
    expect(countAtRank('fire.pyroclasm', 2)).toBe(3);
    expect(countAtRank('fire.pyroclasm', 3)).toBe(4);
    expect(countAtRank('fire.volatile_ember', 1)).toBe(2);
    expect(countAtRank('fire.volatile_ember', 5)).toBe(6);
    expect(countAtRank('fire.molten_impact', 1)).toBe(3);
    expect(countAtRank('fire.cataclysm', 3)).toBe(3);
  });

  it('returns 0 at rank 0 and clamps supercharged ranks to the last entry', () => {
    expect(countAtRank('fire.pyroclasm', 0)).toBe(0);
    expect(countAtRank('fire.pyroclasm', 4)).toBe(4);
    expect(countAtRank('fire.pyroclasm', 9)).toBe(4);
  });
});

describe('fire node data', () => {
  const byId = (id: string) => SKILL_NODES.find(n => n.id === id)!;

  it('keeps all thirteen fire node ids intact', () => {
    const ids = SKILL_NODES.filter(n => n.tree === 'fire').map(n => n.id).sort();
    expect(ids).toEqual([
      'fire.blind_strike', 'fire.cataclysm', 'fire.enduring_flames', 'fire.fire_wall',
      'fire.fireball', 'fire.hellfire', 'fire.inferno_expanse', 'fire.meteor',
      'fire.molten_impact', 'fire.pyroclasm', 'fire.searing_heat', 'fire.seeking_flame',
      'fire.volatile_ember',
    ]);
  });

  it('gives every stackable fire node a keystone', () => {
    const stackable = SKILL_NODES.filter(n => n.tree === 'fire' && n.stackable);
    expect(stackable).toHaveLength(10);
    for (const n of stackable) expect(n.keystone, n.id).toBeDefined();
  });

  it('makes the two tier-7 behavior nodes stackable', () => {
    expect(byId('fire.molten_impact').stackable).toEqual({ softCap: 3, baseEffect: 1 });
    expect(byId('fire.blind_strike').stackable).toEqual({ softCap: 3, baseEffect: 1 });
  });

  it('prices Cataclysm at 2 points', () => {
    expect(byId('fire.cataclysm').cost).toBe(2);
  });

  it('matches the spec keystone reach costs', () => {
    expect(totalSpentForRanks(byId('fire.volatile_ember'), 6)).toBe(7);
    expect(totalSpentForRanks(byId('fire.pyroclasm'), 4)).toBe(9);
    expect(totalSpentForRanks(byId('fire.searing_heat'), 6)).toBe(13);
    expect(totalSpentForRanks(byId('fire.cataclysm'), 4)).toBe(9);
  });

  it('triggers keystones only past soft cap', () => {
    expect(hasKeystone('fire.pyroclasm', 3)).toBe(false);
    expect(hasKeystone('fire.pyroclasm', 4)).toBe(true);
  });
});
