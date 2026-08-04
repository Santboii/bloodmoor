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

// Merge regression: the merge's own gate — `(p.stunUntil ?? 0) <= tick` on
// the channel path (StateAdvancer.ts ~298) — must actually break a live Ice
// Ray channel. stun.test.ts had no `channel` coverage at all before this.
describe('Stun breaks an Ice Ray channel', () => {
  const ray = (aim = { x: 1600, y: 600 }): InputFrame =>
    ({ move: { x: 0, y: 0 }, castSpell: null, channel: 12, aimTarget: aim });
  const channelSkills = { A: new Map<NodeId, number>([['frost.ice_bolt', 1], ['frost.ice_ray', 1]]) };

  function channelState() {
    return makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'mage',   spawnPos: { x: 200, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'ranger', spawnPos: { x: 500, y: 600 } },
    ]);
  }

  it('a mid-channel stun drops channelSpell next tick and halts the beam', () => {
    let s = channelState();
    s = advanceState(s, { A: ray(), B: idle() }, channelSkills);
    expect(s.players.A.channelSpell).toBe(12);
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp); // beam is landing

    s.players.A.stunUntil = s.tick + 30;
    s = advanceState(s, { A: ray(), B: idle() }, channelSkills);
    expect(s.players.A.channelSpell).toBeUndefined();
    const hpAfterStunTick = s.players.B.hp;

    // Still holding the channel button while stunned: no beam action fires.
    for (let i = 0; i < 10; i++) {
      s = advanceState(s, { A: ray(), B: idle() }, channelSkills);
      expect(s.players.A.channelSpell).toBeUndefined();
    }
    expect(s.players.B.hp).toBe(hpAfterStunTick);
  });
});
