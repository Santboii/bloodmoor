import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { PlayerInit } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId, SpellId, Vec2 } from '@arena/shared';

export const GLAD_SKILLS = new Map<NodeId, number>([
  ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.leap', 1], ['bulwark.bracing', 1], ['bulwark.reflect', 1],
]);

export function twoPlayers(aPos: Vec2 = { x: 600, y: 600 }, bPos: Vec2 = { x: 700, y: 600 }) {
  const inits: PlayerInit[] = [
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: aPos },
    { id: 'B', displayName: 'B', charClass: 'ranger',    spawnPos: bPos },
  ];
  return makeInitialState(inits);
}

export const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });
export const cast = (spell: SpellId, aimTarget: Vec2): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: spell, aimTarget });

describe('Gladiator cast gating', () => {
  it('lets a skilled gladiator cast Jab (mana is spent)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(12, { x: 700, y: 600 }), B: idle() }, { A: GLAD_SKILLS, B: new Map([['archer.power_shot', 1]] as [NodeId, number][]) });
    expect(s.players.A.mana).toBeLessThan(s.players.A.maxMana);
    expect(s.players.A.castingSpell).toBe(12);
  });

  it('blocks gladiator spells for guests (no skill set)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(12, { x: 700, y: 600 }), B: idle() }, {}); // no skillSets at all
    expect(s.players.A.castingSpell).toBeNull();
    expect(s.players.A.mana).toBe(s.players.A.maxMana);
  });

  it('blocks gladiator spells for a mage skill set (class map is class-keyed, not inferred)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(12, { x: 700, y: 600 }), B: idle() },
      { A: new Map([['fire.fireball', 1]] as [NodeId, number][]) });
    expect(s.players.A.castingSpell).toBeNull();
  });
});
