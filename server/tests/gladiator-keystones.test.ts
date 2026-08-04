import { describe, it, expect, vi } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { PlayerInit } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId, SpellId, Vec2, CharacterClass } from '@arena/shared';
import {
  PLAYER_SPEED, DELTA, TICK_RATE,
  SPEAR_STUN_TICKS, REFLECT_WINDOW_TICKS, BLOCK_MOVE_MULT,
  CONCUSSION_MULT, SEISMIC_SLAM_DAMAGE, MIRROR_GUARD_MULT, JUGGERNAUT_DR_BONUS, JUGGERNAUT_HP_THRESHOLD,
  effectAtRank,
} from '@arena/shared';
import { buildGladiatorModifiers } from '../src/skills/GladiatorModifiers.ts';

function twoPlayers(
  aClass: CharacterClass, bClass: CharacterClass,
  aPos: Vec2 = { x: 600, y: 600 }, bPos: Vec2 = { x: 700, y: 600 },
) {
  const inits: PlayerInit[] = [
    { id: 'A', displayName: 'A', charClass: aClass, spawnPos: aPos },
    { id: 'B', displayName: 'B', charClass: bClass, spawnPos: bPos },
  ];
  return makeInitialState(inits);
}

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });
const cast = (spell: SpellId, aimTarget: Vec2): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: spell, aimTarget });
const moveBlock = (move: Vec2): InputFrame => ({ move, castSpell: null, aimTarget: { x: 0, y: 0 }, blocking: true });

// ---------------------------------------------------------------------------
// Concussion — arms.stunning_blow keystone
// ---------------------------------------------------------------------------
describe('Concussion (stun.concussion)', () => {
  const CONCUSSION_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 4], // rank 4 > softCap 3 -> keystone armed
  ]);

  it('adds +15% Jab damage against a target the attacker themself stunned', () => {
    let s = twoPlayers('gladiator', 'ranger', { x: 600, y: 600 }, { x: 640, y: 600 });
    s.players.B.stunUntil = s.tick + 100;
    s.players.B.stunnedBy = 'A';
    const hpBefore = s.players.B.hp;
    s = advanceState(s, { A: cast(13, { x: 640, y: 600 }), B: idle() }, { A: CONCUSSION_SKILLS, B: new Map() });
    const dmg = hpBefore - s.players.B.hp;
    expect(dmg).toBeGreaterThanOrEqual(75 * CONCUSSION_MULT - 1e-6);
    expect(dmg).toBeLessThanOrEqual(100 * CONCUSSION_MULT + 1e-6);
  });

  it('does NOT boost damage against a target stunned by a different attacker', () => {
    let s = twoPlayers('gladiator', 'ranger', { x: 600, y: 600 }, { x: 640, y: 600 });
    s.players.B.stunUntil = s.tick + 100;
    s.players.B.stunnedBy = 'C'; // someone else's stun
    const hpBefore = s.players.B.hp;
    s = advanceState(s, { A: cast(13, { x: 640, y: 600 }), B: idle() }, { A: CONCUSSION_SKILLS, B: new Map() });
    const dmg = hpBefore - s.players.B.hp;
    expect(dmg).toBeGreaterThanOrEqual(75 - 1e-6);
    expect(dmg).toBeLessThanOrEqual(100 + 1e-6);
  });

  it('regression: stunning_blow at rank 3 (sub-cap) matches the Task-2 spear-stun formula and stays un-keystoned', () => {
    const gm = buildGladiatorModifiers(new Map<NodeId, number>([
      ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 3],
    ]));
    expect(gm.stun.concussion).toBe(false);
    expect(gm.spear.stunTicks).toBe(Math.round(SPEAR_STUN_TICKS * (1 + effectAtRank(0.15, 3))));
  });
});

// ---------------------------------------------------------------------------
// Seismic Slam — arms.crushing_landing keystone
// ---------------------------------------------------------------------------
describe('Seismic Slam (leap.seismicSlam)', () => {
  const SLAM_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.leap', 1], ['arms.crushing_landing', 4],
  ]);
  const NO_SLAM_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.leap', 1], ['arms.crushing_landing', 3],
  ]);
  // A leaps from (600,600) to (670,600); B sits 30u from the landing point,
  // well inside the slam radius, with a clear line of sight.
  const origin = { x: 600, y: 600 };
  const landingAim = { x: 670, y: 600 };
  const bPos = { x: 640, y: 600 };

  function landLeap(skills: Map<NodeId, number>) {
    let s = twoPlayers('gladiator', 'ranger', origin, bPos);
    const sk = { A: skills, B: new Map<NodeId, number>() };
    s = advanceState(s, { A: cast(16, landingAim), B: idle() }, sk);
    for (let i = 0; i < 16; i++) s = advanceState(s, { A: idle(), B: idle() }, sk);
    return s;
  }

  it('deals SEISMIC_SLAM_DAMAGE to enemies in the shockwave, only with the keystone', () => {
    const withKeystone = landLeap(SLAM_SKILLS);
    const withoutKeystone = landLeap(NO_SLAM_SKILLS);
    const dmgWith = 750 - withKeystone.players.B.hp;
    const dmgWithout = 750 - withoutKeystone.players.B.hp;
    expect(dmgWith).toBeCloseTo(SEISMIC_SLAM_DAMAGE, 5);
    expect(dmgWithout).toBe(0);
  });

  it('is blocked by line of sight — a pillar between the landing and the target stops the slam', () => {
    // Landing and target straddle the pillar at (1000,1000); both points sit
    // outside the pillar's own collision buffer so neither is nudged by
    // resolvePlayerPillarCollisions, but the segment between them still
    // crosses the pillar's hitbox.
    const pillarOrigin = { x: 600, y: 994 };
    const pillarLandingAim = { x: 926, y: 994 };
    const pillarBPos = { x: 994, y: 1044 };
    let s = twoPlayers('gladiator', 'ranger', pillarOrigin, pillarBPos);
    const sk = { A: SLAM_SKILLS, B: new Map<NodeId, number>() };
    s = advanceState(s, { A: cast(16, pillarLandingAim), B: idle() }, sk);
    for (let i = 0; i < 16; i++) s = advanceState(s, { A: idle(), B: idle() }, sk);
    expect(s.players.A.position.x).toBeCloseTo(926, 0);
    expect(s.players.A.position.y).toBeCloseTo(994, 0);
    expect(s.players.B.hp).toBe(750); // slam blocked by the pillar
    // The (LoS-exempt) landing slow still lands, confirming the block is
    // specific to the slam damage, not a wholesale landing no-op.
    expect((s.players.B.slowUntil ?? 0)).toBeGreaterThan(s.tick);
  });

  it('regression: crushing_landing at rank 3 (sub-cap) matches the Task-2 landing-slow formula and stays un-keystoned', () => {
    const gm = buildGladiatorModifiers(NO_SLAM_SKILLS);
    expect(gm.leap.seismicSlam).toBe(false);
    expect(gm.leap.slowFactor).toBeCloseTo(Math.max(0.4, 1 - Math.min(0.6, 0.30 * (1 + effectAtRank(0.10, 3)))), 10);
  });
});

// ---------------------------------------------------------------------------
// Unstoppable Guard — bulwark.mobile_guard keystone
// ---------------------------------------------------------------------------
describe('Unstoppable Guard (block.unstoppableGuard)', () => {
  const UG_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.mobile_guard', 4],
  ]);
  const NO_UG_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.mobile_guard', 3],
  ]);

  it('a blocking gladiator with the keystone ignores an active chill entirely', () => {
    let s = twoPlayers('gladiator', 'mage');
    s.players.A.slowUntil = s.tick + 100;
    s.players.A.slowFactor = 0.5;
    const before = s.players.A.position.x;
    s = advanceState(s, { A: moveBlock({ x: 1, y: 0 }), B: idle() }, { A: UG_SKILLS, B: new Map() });
    const gm = buildGladiatorModifiers(UG_SKILLS);
    expect(s.players.A.blocking).toBe(true);
    expect(s.players.A.position.x - before).toBeCloseTo(PLAYER_SPEED * DELTA * gm.block.moveMult, 5);
  });

  it('regression: without the keystone a blocking gladiator is still slowed by an active chill', () => {
    let s = twoPlayers('gladiator', 'mage');
    s.players.A.slowUntil = s.tick + 100;
    s.players.A.slowFactor = 0.5;
    const before = s.players.A.position.x;
    s = advanceState(s, { A: moveBlock({ x: 1, y: 0 }), B: idle() }, { A: NO_UG_SKILLS, B: new Map() });
    const gm = buildGladiatorModifiers(NO_UG_SKILLS);
    expect(s.players.A.position.x - before).toBeCloseTo(PLAYER_SPEED * DELTA * gm.block.moveMult * 0.5, 5);
  });

  it('a true stun still zeroes movement even with the keystone armed', () => {
    let s = twoPlayers('gladiator', 'mage');
    s.players.A.stunUntil = s.tick + 100;
    const before = s.players.A.position.x;
    s = advanceState(s, { A: moveBlock({ x: 1, y: 0 }), B: idle() }, { A: UG_SKILLS, B: new Map() });
    expect(s.players.A.position.x).toBeCloseTo(before, 10);
  });

  it('regression: mobile_guard at rank 3 (sub-cap) matches the Task-2 block-move formula and stays un-keystoned', () => {
    const gm = buildGladiatorModifiers(NO_UG_SKILLS);
    expect(gm.block.unstoppableGuard).toBe(false);
    expect(gm.block.moveMult).toBeCloseTo(Math.min(0.85, BLOCK_MOVE_MULT * (1 + effectAtRank(0.08, 3))), 10);
  });
});

// ---------------------------------------------------------------------------
// Mirror Guard — bulwark.perfect_guard keystone
// ---------------------------------------------------------------------------
describe('Mirror Guard (reflect.mirrorGuard)', () => {
  const RANGER_SKILLS = new Map<NodeId, number>([['archer.power_shot', 1]]);
  const MIRROR_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['bulwark.reflect', 1], ['bulwark.perfect_guard', 4],
  ]);
  const PLAIN_REFLECT_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['bulwark.reflect', 1], ['bulwark.perfect_guard', 3],
  ]);

  function reflectedArrowDamage(defenderSkills: Map<NodeId, number>): number {
    let s = twoPlayers('ranger', 'gladiator', { x: 600, y: 600 }, { x: 700, y: 600 });
    const sk = { A: RANGER_SKILLS, B: defenderSkills };
    // B raises Reflect, A fires an arrow at B.
    s = advanceState(s, { A: idle(), B: cast(15, { x: 600, y: 600 }) }, sk);
    s = advanceState(s, { A: cast(5, { x: 700, y: 600 }), B: idle() }, sk);
    const hpBeforeA = s.players.A.hp;
    for (let i = 0; i < 40; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, sk);
    }
    return hpBeforeA - s.players.A.hp;
  }

  it('a Mirror Guard reflection deals ~1.5x the damage of a plain reflect', () => {
    const mirrored = reflectedArrowDamage(MIRROR_SKILLS);
    const plain = reflectedArrowDamage(PLAIN_REFLECT_SKILLS);
    expect(plain).toBeGreaterThanOrEqual(60 - 1e-6);
    expect(plain).toBeLessThanOrEqual(90 + 1e-6);
    expect(mirrored).toBeGreaterThanOrEqual(60 * MIRROR_GUARD_MULT - 1e-6);
    expect(mirrored).toBeLessThanOrEqual(90 * MIRROR_GUARD_MULT + 1e-6);
    expect(mirrored).toBeGreaterThan(plain);
  });

  it('regression: perfect_guard at rank 3 (sub-cap) matches the Task-2 reflect-window formula and stays un-keystoned', () => {
    const gm = buildGladiatorModifiers(PLAIN_REFLECT_SKILLS);
    expect(gm.reflect.mirrorGuard).toBe(false);
    expect(gm.reflect.windowTicks).toBe(Math.round(REFLECT_WINDOW_TICKS * (1 + effectAtRank(0.15, 3))));
  });
});

// ---------------------------------------------------------------------------
// Juggernaut — bulwark.iron_skin keystone
// ---------------------------------------------------------------------------
describe('Juggernaut (block.juggernaut)', () => {
  const JUG_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.iron_skin', 4],
  ]);
  const NO_JUG_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.iron_skin', 3],
  ]);

  // Deterministic Jab roll (Math.random -> 0 means jabDamage returns exactly
  // damageMin, 75) isolates the DR difference from the attack's own variance.
  function blockedDamageAt(hpFraction: number, skills: Map<NodeId, number>): number {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      let s = twoPlayers('gladiator', 'gladiator', { x: 600, y: 600 }, { x: 660, y: 600 });
      s.players.B.hp = s.players.B.maxHp * hpFraction;
      const hpBefore = s.players.B.hp;
      const sk = { A: JUG_SKILLS, B: skills };
      // B blocks facing A; A jabs B in the same tick.
      s = advanceState(s, {
        A: cast(13, { x: 660, y: 600 }),
        B: moveBlock({ x: 0, y: 0 }),
      }, sk);
      return hpBefore - s.players.B.hp;
    } finally {
      randomSpy.mockRestore();
    }
  }

  it('DR at 20% HP beats DR at full HP for the same deterministic attack', () => {
    const dmgFull = blockedDamageAt(1.0, JUG_SKILLS);
    const dmgLow = blockedDamageAt(JUGGERNAUT_HP_THRESHOLD - 0.1, JUG_SKILLS);
    expect(dmgLow).toBeLessThan(dmgFull);
    const gm = buildGladiatorModifiers(JUG_SKILLS);
    expect(dmgFull).toBeCloseTo(75 * (1 - gm.block.damageReduction), 6);
    expect(dmgLow).toBeCloseTo(75 * (1 - Math.min(0.85, gm.block.damageReduction + JUGGERNAUT_DR_BONUS)), 6);
  });

  it('regression: iron_skin at rank 3 (sub-cap) grants no DR bonus at low HP', () => {
    const dmgFull = blockedDamageAt(1.0, NO_JUG_SKILLS);
    const dmgLow = blockedDamageAt(JUGGERNAUT_HP_THRESHOLD - 0.1, NO_JUG_SKILLS);
    expect(dmgLow).toBeCloseTo(dmgFull, 6);
    const gm = buildGladiatorModifiers(NO_JUG_SKILLS);
    expect(gm.block.juggernaut).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// stunnedBy bookkeeping
// ---------------------------------------------------------------------------
describe('stunnedBy bookkeeping', () => {
  it('a spear stun stamps stunnedBy with the thrower', () => {
    const SPEAR_SKILLS = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
    let s = twoPlayers('gladiator', 'ranger', { x: 600, y: 600 }, { x: 700, y: 600 });
    const sk = { A: SPEAR_SKILLS, B: new Map<NodeId, number>() };
    s = advanceState(s, { A: cast(14, { x: 700, y: 600 }), B: idle() }, sk);
    let hit = false;
    for (let i = 0; i < 30 && !hit; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, sk);
      if ((s.players.B.stunUntil ?? 0) > s.tick) hit = true;
    }
    expect(hit).toBe(true);
    expect(s.players.B.stunnedBy).toBe('A');
  });

  it('clears stunnedBy once stunUntil expires', () => {
    let s = twoPlayers('gladiator', 'ranger');
    s.players.B.stunUntil = s.tick; // already expired as of this tick
    s.players.B.stunnedBy = 'A';
    s = advanceState(s, { A: idle(), B: idle() }, {});
    expect(s.players.B.stunUntil).toBeUndefined();
    expect(s.players.B.stunnedBy).toBeUndefined();
  });
});
