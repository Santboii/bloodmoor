// server/tests/reflect.test.ts
import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.reflect', 1]]);
const RANGER = new Map<NodeId, number>([['archer.power_shot', 1]]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });
const skills = { A: GLAD, B: RANGER };

function duel() {
  return makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: 'ranger',    spawnPos: { x: 1000, y: 600 } },
  ]);
}

describe('Reflect (spell 14)', () => {
  it('sets the reflect window on cast and it expires', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ castSpell: 15, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect((s.players.A.reflectUntil ?? 0)).toBeGreaterThan(s.tick);
    for (let i = 0; i < 61; i++) s = advanceState(s, { A: frame(), B: frame() }, skills);
    expect(s.players.A.reflectUntil).toBeUndefined();
  });

  it('flips an incoming arrow back at the shooter, who takes the damage', () => {
    let s = duel();
    // B fires at A
    s = advanceState(s, { A: frame(), B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    // A reflects while the arrow is inbound
    s = advanceState(s, { A: frame({ castSpell: 15, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    let reflected = false;
    for (let i = 0; i < 180; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
      if (s.projectiles.some(p => p.type === 'arrow' && p.ownerId === 'A')) reflected = true;
      if (s.players.B.hp < s.players.B.maxHp) break;
    }
    expect(reflected).toBe(true);
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);   // shooter got hit
    expect(s.players.A.hp).toBe(s.players.A.maxHp);           // reflector untouched
  });

  // Merge regression: the gladiator/frost merge's ownership flip at the
  // reflect branch (StateAdvancer.ts ~951) must fire for Ice Bolt the same
  // way it does for arrows/spears — reflect.test.ts had no frost coverage
  // at all before this merge.
  it('flips an incoming ice bolt back at the mage who cast it, who takes the damage', () => {
    const MAGE = new Map<NodeId, number>([['frost.ice_bolt', 1]]);
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1000, y: 600 } },
    ]);
    const sk = { A: GLAD, B: MAGE };
    // B (mage) casts Ice Bolt at A
    s = advanceState(s, { A: frame(), B: frame({ castSpell: 9, aimTarget: { x: 600, y: 600 } }) }, sk);
    // A reflects while the bolt is inbound
    s = advanceState(s, { A: frame({ castSpell: 15, aimTarget: { x: 1000, y: 600 } }), B: frame() }, sk);
    let reflected = false;
    for (let i = 0; i < 180; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, sk);
      if (s.projectiles.some(p => p.type === 'icebolt' && p.ownerId === 'A')) reflected = true;
      if (s.players.B.hp < s.players.B.maxHp) break;
    }
    expect(reflected).toBe(true);
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);   // caster got hit
    expect(s.players.A.hp).toBe(s.players.A.maxHp);           // reflector untouched
  });

  it('a reflected spear still carries its stun', () => {
    const GLAD_B = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'gladiator', spawnPos: { x: 1000, y: 600 } },
    ]);
    const sk = { A: GLAD, B: GLAD_B };
    s = advanceState(s, { A: frame(), B: frame({ castSpell: 14, aimTarget: { x: 600, y: 600 } }) }, sk);
    s = advanceState(s, { A: frame({ castSpell: 15, aimTarget: { x: 1000, y: 600 } }), B: frame() }, sk);
    for (let i = 0; i < 180 && s.players.B.hp === s.players.B.maxHp; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, sk);
    }
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);
    expect((s.players.B.stunUntil ?? 0)).toBeGreaterThan(0);
  });
});
