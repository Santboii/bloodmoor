import { describe, it, expect } from 'vitest';
import { canUnlock, SKILL_NODES, totalSpentForRanks, hasKeystone } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const frost = () => SKILL_NODES.filter(n => n.tree === 'frost');
const node = (id: NodeId) => SKILL_NODES.find(n => n.id === id)!;

describe('frost tree shape', () => {
  it('has thirteen nodes, three of them spells', () => {
    expect(frost().length).toBe(13);
    expect(frost().filter(n => n.isSpell).map(n => n.id)).toEqual([
      'frost.ice_bolt', 'frost.blizzard', 'frost.frozen_orb',
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
  it('costs 67 points to soft-cap the whole tree', () => {
    const total = frost().reduce(
      (sum, n) => sum + totalSpentForRanks(n, n.stackable ? n.stackable.softCap : 1),
      0,
    );
    expect(total).toBe(67);
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
