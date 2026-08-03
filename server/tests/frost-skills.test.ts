import { describe, it, expect } from 'vitest';
import { canUnlock, SKILL_NODES, totalSpentForRanks, hasKeystone } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const frost = () => SKILL_NODES.filter(n => n.tree === 'frost');
const node = (id: NodeId) => SKILL_NODES.find(n => n.id === id)!;

describe('frost tree shape', () => {
  it('has fourteen nodes, four of them spells', () => {
    expect(frost().length).toBe(14);
    expect(frost().filter(n => n.isSpell).map(n => n.id)).toEqual([
      'frost.ice_bolt', 'frost.ice_ray', 'frost.blizzard', 'frost.frozen_orb',
    ]);
  });

  it('places spells at tiers 1, 4 and 6 like the fire tree', () => {
    expect(node('frost.ice_bolt').tier).toBe(1);
    expect(node('frost.blizzard').tier).toBe(4);
    expect(node('frost.frozen_orb').tier).toBe(6);
  });
});

describe('frost gates', () => {
  it('allows Ice Bolt with nothing owned', () => {
    expect(canUnlock('frost.ice_bolt', new Set())).toBe(true);
  });

  it('blocks tier-2 nodes until Ice Bolt is owned', () => {
    expect(canUnlock('frost.bitter_chill', new Set())).toBe(false);
    expect(canUnlock('frost.bitter_chill', new Set(['frost.ice_bolt']))).toBe(true);
  });

  it('blocks Blizzard until a tier-2 node is owned', () => {
    expect(canUnlock('frost.blizzard', new Set(['frost.ice_bolt']))).toBe(false);
    expect(canUnlock('frost.blizzard', new Set(['frost.ice_bolt', 'frost.ice_lance']))).toBe(true);
  });

  it('accepts any one of the three tier-5 nodes as the Frozen Orb prerequisite', () => {
    const base = ['frost.ice_bolt', 'frost.bitter_chill', 'frost.blizzard'];
    expect(canUnlock('frost.frozen_orb', new Set(base))).toBe(false);
    for (const t5 of ['frost.lingering_winter', 'frost.deepening_cold', 'frost.whiteout']) {
      expect(canUnlock('frost.frozen_orb', new Set([...base, t5]))).toBe(true);
    }
  });

  it('blocks tier-7 nodes until Frozen Orb is owned', () => {
    expect(canUnlock('frost.cold_mastery', new Set(['frost.blizzard']))).toBe(false);
    expect(canUnlock('frost.cold_mastery', new Set(['frost.frozen_orb']))).toBe(true);
  });
});

describe('frost cost budget', () => {
  it('costs 69 points to soft-cap the whole tree', () => {
    const total = frost().reduce(
      (sum, n) => sum + totalSpentForRanks(n, n.stackable ? n.stackable.softCap : 1),
      0,
    );
    expect(total).toBe(69);
  });

  it('gives every stackable node except Glacial Drift a keystone', () => {
    for (const n of frost()) {
      if (!n.stackable) continue;
      const expected = n.id !== 'frost.glacial_drift';
      expect(hasKeystone(n.id, n.stackable.softCap + 1)).toBe(expected);
      expect(hasKeystone(n.id, n.stackable.softCap)).toBe(false);
    }
  });
});

import { SPELL_CONFIG, SPELL_BINDINGS, classOfSpell } from '@arena/shared';

describe('frost spell wiring', () => {
  it('binds all three frost spells to the mage', () => {
    for (const spell of [9, 10, 11] as const) {
      expect(classOfSpell(spell)).toBe('mage');
    }
  });

  it('binds each frost spell to its unlocking node', () => {
    const nodeFor = (s: number) => SPELL_BINDINGS.find(b => b.spell === s)?.node;
    expect(nodeFor(9)).toBe('frost.ice_bolt');
    expect(nodeFor(10)).toBe('frost.blizzard');
    expect(nodeFor(11)).toBe('frost.frozen_orb');
  });

  it('costs less mana and cools faster than Fireball for the opener', () => {
    expect(SPELL_CONFIG[9].manaCost).toBeLessThan(SPELL_CONFIG[1].manaCost);
    expect(SPELL_CONFIG[9].cooldownTicks).toBeLessThan(SPELL_CONFIG[1].cooldownTicks);
  });

  it('prices the capstone like Meteor', () => {
    expect(SPELL_CONFIG[11].manaCost).toBe(SPELL_CONFIG[3].manaCost);
    expect(SPELL_CONFIG[11].cooldownTicks).toBe(SPELL_CONFIG[3].cooldownTicks);
  });
});

describe('Ice Ray node', () => {
  it('is a tier-2 frost spell costing 2', () => {
    const n = node('frost.ice_ray');
    expect(n.tree).toBe('frost');
    expect(n.tier).toBe(2);
    expect(n.cost).toBe(2);
    expect(n.isSpell).toBe(true);
    expect(n.stackable).toBeUndefined();
    expect(n.keystone).toBeUndefined();
  });

  it('takes the frost tree to fourteen nodes and 69 points', () => {
    expect(frost().length).toBe(14);
    const total = frost().reduce(
      (sum, n) => sum + totalSpentForRanks(n, n.stackable ? n.stackable.softCap : 1),
      0,
    );
    expect(total).toBe(69);
  });

  it('requires Ice Bolt and nothing else', () => {
    expect(canUnlock('frost.ice_ray', new Set())).toBe(false);
    expect(canUnlock('frost.ice_ray', new Set(['frost.ice_bolt']))).toBe(true);
  });

  it('satisfies Blizzard as a tier-2 prerequisite', () => {
    expect(canUnlock('frost.blizzard', new Set(['frost.ice_bolt', 'frost.ice_ray']))).toBe(true);
  });

  it('binds to spell 12 on the mage with no default slot', () => {
    const b = SPELL_BINDINGS.find(x => x.spell === 12);
    expect(b?.node).toBe('frost.ice_ray');
    expect(b?.charClass).toBe('mage');
    expect(b?.defaultSlot).toBeUndefined();
  });
});
