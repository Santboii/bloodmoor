import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import {
  FLURRY_HITS, FLURRY_HIT_INTERVAL_TICKS, FLURRY_HIT_DAMAGE_MIN, FLURRY_HIT_DAMAGE_MAX,
  FLURRY_MOVE_MULT, BLOODSONG_STUN_TICKS, PLAYER_SPEED, DELTA, PILLARS,
} from '@arena/shared';
import type { InputFrame, NodeId, Vec2 } from '@arena/shared';

const FLURRY_GLAD = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_flurry', 1]]);
const BLOODSONG_GLAD = new Map<NodeId, number>([
  ['arms.jab', 1], ['arms.spear_flurry', 1], ['arms.extended_flurry', 4],
]);
const RIPOSTE_GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 6]]);
const RANGER = new Map<NodeId, number>([['archer.power_shot', 1]]);

const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

// A at 600,600; B placed by the caller.
function duel(bPos: Vec2 = { x: 650, y: 600 }, bClass: 'ranger' | 'gladiator' = 'ranger') {
  return makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: bClass, spawnPos: bPos },
  ]);
}

function runTicks(
  s: ReturnType<typeof duel>,
  skills: Record<string, Map<NodeId, number>>,
  n: number,
  aInput: () => InputFrame,
  bInput: () => InputFrame = frame,
) {
  let cur = s;
  for (let i = 0; i < n; i++) {
    cur = advanceState(cur, { A: aInput(), B: bInput() }, skills);
  }
  return cur;
}

describe('Spear Flurry (spell 20)', () => {
  it('lands FLURRY_HITS hits over ~1s on a stationary target', () => {
    let s = duel({ x: 650, y: 600 });
    const skills = { A: FLURRY_GLAD, B: RANGER };
    const hp0 = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    s = runTicks(s, skills, FLURRY_HITS * FLURRY_HIT_INTERVAL_TICKS + 5,
      () => frame({ aimTarget: { x: 650, y: 600 } }));
    const dealt = hp0 - s.players.B.hp;
    expect(dealt).toBeGreaterThanOrEqual(FLURRY_HITS * FLURRY_HIT_DAMAGE_MIN);
    expect(dealt).toBeLessThanOrEqual(FLURRY_HITS * FLURRY_HIT_DAMAGE_MAX);
    expect(s.players.A.flurryUntil).toBeUndefined();
  });

  it('does not hit a target behind a pillar', () => {
    const pillar = PILLARS[0]; // {x:350, y:300}
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: pillar.x - 40, y: pillar.y } },
      { id: 'B', displayName: 'B', charClass: 'ranger', spawnPos: { x: pillar.x + 40, y: pillar.y } },
    ]);
    const skills = { A: FLURRY_GLAD, B: RANGER };
    const hp0 = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: { x: pillar.x + 40, y: pillar.y } }), B: frame() }, skills);
    s = runTicks(s, skills, FLURRY_HITS * FLURRY_HIT_INTERVAL_TICKS + 5,
      () => frame({ aimTarget: { x: pillar.x + 40, y: pillar.y } }));
    expect(s.players.B.hp).toBe(hp0);
  });

  it('cannot cast Jab mid-burst — mana is not spent', () => {
    let s = duel({ x: 900, y: 600 }); // far enough that Jab could never land anyway
    const skills = { A: FLURRY_GLAD, B: RANGER };
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: { x: 900, y: 600 } }), B: frame() }, skills);
    const manaBeforeAttempt = s.players.A.mana;
    s = advanceState(s, { A: frame({ castSpell: 13, aimTarget: { x: 900, y: 600 } }), B: frame() }, skills);
    // Only natural regen may have moved mana — no Jab cost (10) was deducted.
    expect(s.players.A.mana).toBeGreaterThan(manaBeforeAttempt - 1e-6);
    expect(s.players.A.castingSpell).not.toBe(13);
  });

  it('cannot raise Block mid-burst', () => {
    let s = duel();
    const skills = { A: FLURRY_GLAD, B: RANGER };
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBeFalsy();
  });

  it('halves move speed while bursting', () => {
    let s = duel();
    const skills = { A: FLURRY_GLAD, B: RANGER };
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    const x0 = s.players.A.position.x;
    s = advanceState(s, { A: frame({ move: { x: 1, y: 0 }, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    const step = s.players.A.position.x - x0;
    expect(step).toBeCloseTo(PLAYER_SPEED * DELTA * FLURRY_MOVE_MULT, 5);
  });

  it('a stun after the second hit cancels the remaining burst', () => {
    let s = duel({ x: 650, y: 600 });
    const skills = { A: FLURRY_GLAD, B: RANGER };
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    let landed = 0;
    let lastHp = s.players.B.hp;
    for (let i = 0; i < FLURRY_HITS * FLURRY_HIT_INTERVAL_TICKS + 5; i++) {
      s = advanceState(s, { A: frame({ aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
      if (s.players.B.hp < lastHp) {
        landed++;
        lastHp = s.players.B.hp;
        if (landed === 2) {
          s.players.A.stunUntil = s.tick + 30;
        }
      }
    }
    expect(landed).toBe(2);
    expect(s.players.A.flurryUntil).toBeUndefined();
    expect(s.players.A.flurryHits).toBeUndefined();
  });

  it('Bloodsong: landing every hit on one target stuns them for 0.5s', () => {
    let s = duel({ x: 650, y: 600 });
    const skills = { A: BLOODSONG_GLAD, B: RANGER };
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
    // extended_flurry rank 4 -> 5 base + 3 = 8 hits, 8*12 = 96 ticks.
    let burstEndTick = -1;
    for (let i = 0; i < 8 * FLURRY_HIT_INTERVAL_TICKS + 5; i++) {
      s = advanceState(s, { A: frame({ aimTarget: { x: 650, y: 600 } }), B: frame() }, skills);
      if (burstEndTick === -1 && s.players.A.flurryUntil === undefined) burstEndTick = s.tick;
    }
    expect(burstEndTick).toBeGreaterThan(0);
    // stunUntil is stamped as (burst-end tick - 1) + BLOODSONG_STUN_TICKS —
    // the local tick the clearing branch ran on, one before the output tick.
    expect(s.players.B.stunUntil).toBe(burstEndTick - 1 + BLOODSONG_STUN_TICKS);
    expect(s.players.B.stunnedBy).toBe('A');
    expect(s.players.A.flurryUntil).toBeUndefined();
  });

  it('blocked flurry banks a riposte stack per blocked hit', () => {
    let s = duel({ x: 650, y: 600 }, 'gladiator');
    const skills = { A: FLURRY_GLAD, B: RIPOSTE_GLAD };
    s = advanceState(s, {
      A: frame({ castSpell: 20, aimTarget: { x: 650, y: 600 } }),
      B: frame({ blocking: true, aimTarget: { x: 600, y: 600 } }), // B faces A
    }, skills);
    expect(s.players.B.blocking).toBe(true);
    expect(s.players.B.riposteStacks).toBe(1);
  });
});
