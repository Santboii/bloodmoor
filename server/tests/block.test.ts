import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { BLOCK_RERAISE_TICKS, PLAYER_SPEED, DELTA, BLOCK_DAMAGE_REDUCTION, ICEBOLT_DAMAGE_MAX } from '@arena/shared';
import type { InputFrame, NodeId, Vec2 } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1]]);
const RANGER = new Map<NodeId, number>([['archer.power_shot', 1]]);

const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

// A at 600,600 facing east (aim at B); B at 1000,600 shooting west.
function duel() {
  return makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: 'ranger',    spawnPos: { x: 1000, y: 600 } },
  ]);
}
const skills = { A: GLAD, B: RANGER };

function runUntilHit(s: ReturnType<typeof duel>, aInput: () => InputFrame, maxTicks = 120) {
  let cur = s;
  const hp0 = cur.players.A.hp;
  for (let i = 0; i < maxTicks; i++) {
    cur = advanceState(cur, { A: aInput(), B: frame() }, skills);
    if (cur.players.A.hp < hp0) return { state: cur, damage: hp0 - cur.players.A.hp };
  }
  throw new Error('arrow never landed');
}

describe('Block', () => {
  it('resolves the blocking flag from held input', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(true);
    s = advanceState(s, { A: frame({ blocking: false }), B: frame() }, skills);
    expect(s.players.A.blocking).toBeFalsy();
    expect(s.players.A.blockCooldownUntil).toBe(s.tick - 1 + BLOCK_RERAISE_TICKS);
  });

  it('never blocks for a non-gladiator', () => {
    let s = duel();
    s = advanceState(s, { A: frame(), B: frame({ blocking: true, aimTarget: { x: 600, y: 600 } }) }, skills);
    expect(s.players.B.blocking).toBeFalsy();
  });

  it('halves move speed while blocking', () => {
    let s = duel();
    // face east, walk east, blocking
    s = advanceState(s, { A: frame({ blocking: true, move: { x: 1, y: 0 }, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    const step = s.players.A.position.x - 600;
    expect(step).toBeCloseTo(PLAYER_SPEED * DELTA * 0.5, 5);
  });

  it('reduces frontal arrow damage by 60%', () => {
    // Unblocked baseline
    let s1 = duel();
    s1 = advanceState(s1, { A: frame(), B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    const open = runUntilHit(s1, () => frame({ aimTarget: { x: 1000, y: 600 } }));
    // Blocked run
    let s2 = duel();
    s2 = advanceState(s2, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }),
                            B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    const blocked = runUntilHit(s2, () => frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }));
    // Damage rolls 60-90; blocked must be at most 40% of the roll ceiling
    expect(blocked.damage).toBeLessThanOrEqual(90 * 0.4 + 1e-9);
    expect(blocked.damage).toBeLessThan(open.damage);
  });

  it('does not reduce damage from behind', () => {
    let s = duel();
    // A faces WEST (away from B) while blocking; B shoots from the east
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 200, y: 600 } }),
                          B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    const hit = runUntilHit(s, () => frame({ blocking: true, aimTarget: { x: 200, y: 600 } }));
    expect(hit.damage).toBeGreaterThanOrEqual(60);
  });

  it('casting releases the block and starts the re-raise cooldown', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(true);
    s = advanceState(s, { A: frame({ blocking: true, castSpell: 13, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(false);
    expect((s.players.A.blockCooldownUntil ?? 0)).toBeGreaterThan(s.tick);
    // still held next tick, but the cooldown gates the re-raise
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(false);
  });

  it('stun force-releases the block', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    s.players.A.stunUntil = s.tick + 30;
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(false);
    expect((s.players.A.blockCooldownUntil ?? 0)).toBeGreaterThan(s.tick);
  });
});

import { RIPOSTE_STACKS_REQUIRED, RIPOSTE_JAB_STUN_TICKS, SPELL_CONFIG } from '@arena/shared';

describe('Riposte keystone', () => {
  const RIPOSTE_GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 6]]); // past softCap 5
  const rSkills = { A: RIPOSTE_GLAD, B: RANGER };

  function blockOneArrow(s: ReturnType<typeof duel>) {
    let cur = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }),
                                B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, rSkills);
    const hp0 = cur.players.A.hp;
    for (let i = 0; i < 120; i++) {
      cur = advanceState(cur, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, rSkills);
      if (cur.players.A.hp < hp0) return cur;
    }
    throw new Error('arrow never landed');
  }

  it('banks a stack per blocked hit and arms after 3', () => {
    let s = duel();
    for (let n = 1; n <= RIPOSTE_STACKS_REQUIRED; n++) {
      s = blockOneArrow(s);
      // wait out B's arrow cooldown between shots
      for (let i = 0; i < SPELL_CONFIG[5].cooldownTicks; i++) {
        s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, rSkills);
      }
      if (n < RIPOSTE_STACKS_REQUIRED) expect(s.players.A.riposteStacks).toBe(n);
    }
    expect(s.players.A.riposteStacks).toBe(0);
    expect((s.players.A.riposteReadyUntil ?? 0)).toBeGreaterThan(s.tick);
  });

  it('the armed Jab is free, skips cooldown, and stuns 0.5s', () => {
    let s = duel();
    // walk B into jab range and arm riposte manually (unit-arming keeps the test focused)
    s.players.B.position = { x: 660, y: 600 };
    s.players.A.riposteReadyUntil = s.tick + 60;
    s.players.A.cooldowns = { 13: 20 };   // even a cooling jab fires
    const mana0 = s.players.A.mana;
    s = advanceState(s, { A: frame({ castSpell: 13, aimTarget: { x: 1000, y: 600 } }), B: frame() }, rSkills);
    expect(s.players.A.castingSpell).toBe(13);
    expect(s.players.A.mana).toBeGreaterThanOrEqual(mana0); // free (regen may add)
    expect(s.players.A.riposteReadyUntil).toBeUndefined();
    expect((s.players.B.stunUntil ?? 0)).toBeGreaterThanOrEqual(s.tick + RIPOSTE_JAB_STUN_TICKS - 1);
  });
});

// Merge regression: the gladiator/frost merge routes Ice Bolt through the
// same mitigateDamage/bankRiposte path as arrows and spears (I1's sibling —
// this is the discrete projectile, not the beam). block.test.ts had no
// frost coverage at all before this merge.
describe('Block vs Ice Bolt (merge regression)', () => {
  const MAGE = new Map<NodeId, number>([['frost.ice_bolt', 1]]);

  function mageDuel() {
    return makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 1000, y: 600 } },
    ]);
  }

  it('reduces frontal ice bolt damage to at most 40% of the max roll', () => {
    const iceSkills = { A: GLAD, B: MAGE };
    let s = mageDuel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }),
                          B: frame({ castSpell: 9, aimTarget: { x: 600, y: 600 } }) }, iceSkills);
    const hit = runUntilHit(s, () => frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }));
    expect(hit.damage).toBeLessThanOrEqual(ICEBOLT_DAMAGE_MAX * (1 - BLOCK_DAMAGE_REDUCTION) + 1e-9);
  });

  it('banks a riposte stack per blocked ice bolt (bracing rank 6)', () => {
    const RIPOSTE_GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 6]]);
    const rSkills = { A: RIPOSTE_GLAD, B: MAGE };
    let s = mageDuel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }),
                          B: frame({ castSpell: 9, aimTarget: { x: 600, y: 600 } }) }, rSkills);
    const hp0 = s.players.A.hp;
    let landed = false;
    for (let i = 0; i < 120; i++) {
      s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, rSkills);
      if (s.players.A.hp < hp0) { landed = true; break; }
    }
    expect(landed).toBe(true);
    expect(s.players.A.riposteStacks).toBe(1);
  });
});
