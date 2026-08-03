import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId } from '@arena/shared';

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });

function stunnedState(stunTicks: number) {
  const s = makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'mage',   spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: 'ranger', spawnPos: { x: 900, y: 600 } },
  ]);
  s.players.A.stunUntil = s.tick + stunTicks;
  return s;
}

describe('True stun', () => {
  it('zeroes movement while stunned', () => {
    let s = stunnedState(10);
    const before = { ...s.players.A.position };
    s = advanceState(s, { A: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } }, B: idle() });
    expect(s.players.A.position).toEqual(before);
  });

  it('rejects casts while stunned — no mana spent, no cooldown', () => {
    let s = stunnedState(10);
    s = advanceState(s, { A: { move: { x: 0, y: 0 }, castSpell: 1, aimTarget: { x: 900, y: 600 } }, B: idle() },
      { A: new Map([['fire.fireball', 1]] as [NodeId, number][]) });
    expect(s.players.A.castingSpell).toBeNull();
    expect(s.players.A.mana).toBe(s.players.A.maxMana);
    expect(s.projectiles).toHaveLength(0);
  });

  it('expires on its own and clears the field', () => {
    let s = stunnedState(2);
    s = advanceState(s, { A: idle(), B: idle() });
    s = advanceState(s, { A: idle(), B: idle() });
    s = advanceState(s, { A: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } }, B: idle() });
    expect(s.players.A.stunUntil).toBeUndefined();
    expect(s.players.A.position.x).toBeGreaterThan(600);
  });
});
