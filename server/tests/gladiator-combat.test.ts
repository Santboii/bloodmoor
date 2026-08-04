import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { PlayerInit } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId, SpellId, Vec2 } from '@arena/shared';
import { LEAP_RANGE, LEAP_DURATION_TICKS, LEAP_SLOW_TICKS,
  SPELL_CONFIG, RIPOSTE_STACKS_REQUIRED, RIPOSTE_JAB_STUN_TICKS } from '@arena/shared';
import { buildGladiatorModifiers } from '../src/skills/GladiatorModifiers.ts';

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
    s = advanceState(s, { A: cast(13, { x: 700, y: 600 }), B: idle() }, { A: GLAD_SKILLS, B: new Map([['archer.power_shot', 1]] as [NodeId, number][]) });
    expect(s.players.A.mana).toBeLessThan(s.players.A.maxMana);
    expect(s.players.A.castingSpell).toBe(13);
  });

  it('blocks gladiator spells for guests (no skill set)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(13, { x: 700, y: 600 }), B: idle() }, {}); // no skillSets at all
    expect(s.players.A.castingSpell).toBeNull();
    expect(s.players.A.mana).toBe(s.players.A.maxMana);
  });

  it('blocks gladiator spells for a mage skill set (class map is class-keyed, not inferred)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(13, { x: 700, y: 600 }), B: idle() },
      { A: new Map([['fire.fireball', 1]] as [NodeId, number][]) });
    expect(s.players.A.castingSpell).toBeNull();
  });
});

describe('Leap (spell 15)', () => {
  const LEAP_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 1], ['arms.leap', 1],
  ]);

  it('dashes to the aim point with i-frames, clamped to range', () => {
    let s = twoPlayers({ x: 600, y: 600 }, { x: 1600, y: 1000 });
    s = advanceState(s, { A: cast(16, { x: 1600, y: 600 }), B: idle() }, { A: LEAP_SKILLS, B: new Map() });
    expect((s.players.A.invulnUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.A.evadeTarget!.x).toBeCloseTo(600 + LEAP_RANGE, 5); // clamped from 1000 asked
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: idle(), B: idle() }, { A: LEAP_SKILLS, B: new Map() });
    expect(s.players.A.position.x).toBeCloseTo(600 + LEAP_RANGE, 0);
    expect(s.players.A.evadeTarget).toBeUndefined();
    expect(s.players.A.dashDurationTicks).toBeUndefined();
  });

  it('slows enemies near the landing point when the dash ends — not at cast', () => {
    let s = twoPlayers({ x: 600, y: 600 }, { x: 960, y: 600 }); // B ~60u from the 400-range landing
    const sk = { A: LEAP_SKILLS, B: new Map<NodeId, number>() };
    s = advanceState(s, { A: cast(16, { x: 1000, y: 600 }), B: idle() }, sk);
    expect(s.players.B.slowUntil).toBeUndefined();               // airborne: no slow yet
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: idle(), B: idle() }, sk);
    expect((s.players.B.slowUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.B.slowFactor).toBeCloseTo(0.7, 1);
  });

  it('Space-equivalent: leap is the registered mobility spell', () => {
    // shared-level assertion lives in gladiator-skills.test.ts (MOBILITY_SPELLS)
  });

  it('does not slow enemies on landing if the leaper died mid-flight (DoT pierces i-frames)', () => {
    let s = twoPlayers({ x: 600, y: 600 }, { x: 960, y: 600 }); // B ~60u from the 400-range landing
    const sk = { A: LEAP_SKILLS, B: new Map<NodeId, number>() };
    s = advanceState(s, { A: cast(16, { x: 1000, y: 600 }), B: idle() }, sk);
    expect(s.players.A.evadeTarget).toBeDefined(); // airborne, mid-dash
    // Simulate a DoT tick killing the leaper mid-flight — leap i-frames stop
    // projectiles but not DoTs, so this is reachable in normal play.
    s.players.A.hp = 0;
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: idle(), B: idle() }, sk);
    expect(s.players.A.evadeTarget).toBeUndefined(); // dash still completes on schedule
    expect(s.players.B.slowUntil).toBeUndefined();
  });
});

describe('Full-kit integration: gladiator vs ranger', () => {
  // All 10 gladiator nodes; Heavy Thrust and Bracing pushed past their rank-5
  // soft cap to arm both keystones (Executioner, Riposte). Everything else
  // rank 1 — enough to unlock its spell/passive.
  const FULL_GLAD_SKILLS = new Map<NodeId, number>([
    ...GLAD_SKILLS,
    ['arms.heavy_thrust' as NodeId, 6],
    ['arms.stunning_blow' as NodeId, 1],
    ['arms.crushing_landing' as NodeId, 1],
    ['bulwark.bracing' as NodeId, 6],
    ['bulwark.mobile_guard' as NodeId, 1],
    ['bulwark.perfect_guard' as NodeId, 1],
  ]);
  const RANGER_SKILLS = new Map<NodeId, number>([['archer.power_shot' as NodeId, 1]]);
  const skills = { A: FULL_GLAD_SKILLS, B: RANGER_SKILLS };
  const blockFrame = (aimTarget: Vec2): InputFrame =>
    ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget, blocking: true });

  it('drives leap, Executioner Jab, Spear stun, Block, and Riposte through one scripted match', () => {
    const gm = buildGladiatorModifiers(FULL_GLAD_SKILLS);
    expect(gm.jab.executioner).toBe(true);
    expect(gm.block.riposte).toBe(true);

    // --- Beat 1: Leap in -> landing slow applied to the ranger. ---
    let s = twoPlayers({ x: 600, y: 600 }, { x: 960, y: 600 }); // B ~60u from the 400-range landing
    s = advanceState(s, { A: cast(16, { x: 1000, y: 600 }), B: idle() }, skills);
    expect(s.players.B.slowUntil).toBeUndefined(); // airborne: no slow yet
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: idle(), B: idle() }, skills);
    expect((s.players.B.slowUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.B.slowFactor).toBeLessThan(1);
    expect(s.players.A.evadeTarget).toBeUndefined();
    expect(s.players.A.dashDurationTicks).toBeUndefined();

    // --- Beat 2: Jab the slowed ranger -> Executioner bonus verified. ---
    const unslowedMaxRoll = 100 * gm.jab.damageMultiplier; // statMult 1, no gear
    const hpBeforeJab = s.players.B.hp;
    s = advanceState(s, { A: cast(13, { x: s.players.B.position.x, y: s.players.B.position.y }), B: idle() }, skills);
    const slowedDamage = hpBeforeJab - s.players.B.hp;
    expect(slowedDamage).toBeGreaterThan(0);
    // Even the WORST-case Executioner roll (min base damage) beats the BEST-case
    // unslowed roll — 75*1.5 > 100*1 — so this holds regardless of the random draw.
    expect(slowedDamage).toBeGreaterThan(unslowedMaxRoll);

    // Control: the identical jab against an unslowed target, from a fresh state,
    // shows what an unslowed hit actually rolls — confirming the gap above is
    // the Executioner bonus, not some other multiplier.
    let control = twoPlayers({ x: 600, y: 600 }, { x: 640, y: 600 });
    const hpBeforeControl = control.players.B.hp;
    control = advanceState(control, { A: cast(13, { x: 640, y: 600 }), B: idle() }, skills);
    const unslowedDamage = hpBeforeControl - control.players.B.hp;
    expect(unslowedDamage).toBeGreaterThanOrEqual(75 * gm.jab.damageMultiplier - 1e-9);
    expect(unslowedDamage).toBeLessThanOrEqual(unslowedMaxRoll + 1e-9);
    expect(slowedDamage).toBeGreaterThan(unslowedDamage);

    // --- Beat 3: Spear throw -> ranger stunned; ranger's cast attempt is rejected. ---
    const hpBeforeSpear = s.players.B.hp;
    s = advanceState(s, {
      A: cast(14, { x: s.players.B.position.x, y: s.players.B.position.y }),
      B: idle(),
    }, skills);
    let stunned = false;
    for (let i = 0; i < 30 && !stunned; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, skills);
      if ((s.players.B.stunUntil ?? 0) > s.tick) stunned = true;
    }
    expect(stunned).toBe(true);
    expect(s.players.B.hp).toBeLessThan(hpBeforeSpear);

    const manaBeforeRejectedCast = s.players.B.mana;
    const projectileCountBeforeRejectedCast = s.projectiles.length;
    s = advanceState(s, {
      A: idle(),
      B: cast(5, { x: s.players.A.position.x, y: s.players.A.position.y }),
    }, skills);
    expect(s.players.B.castingSpell).toBeNull();
    // Mana only moved by passive regen (~0.3/tick) — the cast never got past the stun gate.
    expect(s.players.B.mana).toBeGreaterThanOrEqual(manaBeforeRejectedCast);
    expect(s.players.B.mana).toBeLessThan(manaBeforeRejectedCast + 1); // regen << 20 mana cost
    expect(s.projectiles.filter(p => p.type === 'arrow' && p.ownerId === 'B').length).toBe(0);
    expect(s.projectiles.length).toBe(projectileCountBeforeRejectedCast);

    // --- Beat 4 + 5: ranger recovers and shoots; gladiator blocks facing the
    // ranger for >=60% DR per hit; three blocked hits arm Riposte. ---
    while ((s.players.B.stunUntil ?? 0) > s.tick) {
      s = advanceState(s, { A: idle(), B: idle() }, skills);
    }
    const dr = gm.block.damageReduction;
    expect(dr).toBeGreaterThanOrEqual(0.6);
    const arrowCooldown = SPELL_CONFIG[5].cooldownTicks;

    for (let hitNum = 1; hitNum <= RIPOSTE_STACKS_REQUIRED; hitNum++) {
      const blockAim = { x: s.players.B.position.x, y: s.players.B.position.y };
      const shootAim = { x: s.players.A.position.x, y: s.players.A.position.y };
      s = advanceState(s, { A: blockFrame(blockAim), B: cast(5, shootAim) }, skills);
      const hpBeforeArrow = s.players.A.hp;
      let hit = false;
      for (let i = 0; i < 60 && !hit; i++) {
        s = advanceState(s, { A: blockFrame(blockAim), B: idle() }, skills);
        if (s.players.A.hp < hpBeforeArrow) hit = true;
      }
      expect(hit).toBe(true);
      const damage = hpBeforeArrow - s.players.A.hp;
      // Raw arrow roll is [60,90]; Block must cut at least 60% off it.
      expect(damage).toBeLessThanOrEqual(90 * (1 - dr) + 1e-6);
      expect(damage).toBeGreaterThanOrEqual(60 * (1 - dr) - 1e-6);
      expect(damage).toBeLessThanOrEqual(90 * 0.4 + 1e-6);

      if (hitNum < RIPOSTE_STACKS_REQUIRED) {
        expect(s.players.A.riposteStacks).toBe(hitNum);
        // wait out B's arrow cooldown between shots
        for (let i = 0; i < arrowCooldown; i++) {
          s = advanceState(s, { A: blockFrame(blockAim), B: idle() }, skills);
        }
      }
    }
    expect(s.players.A.riposteStacks).toBe(0);
    expect((s.players.A.riposteReadyUntil ?? 0)).toBeGreaterThan(s.tick);

    // --- Beat 6: armed free Jab while spell-12's cooldown is nonzero. ---
    s.players.A.cooldowns = { ...s.players.A.cooldowns, 12: 20 };
    const manaBeforeFreeJab = s.players.A.mana;
    const freeJabAim = { x: s.players.B.position.x, y: s.players.B.position.y };
    const jabLandedOnTick = s.tick; // advanceState stamps stunUntil off THIS tick, not the post-call one
    s = advanceState(s, { A: cast(13, freeJabAim), B: idle() }, skills);
    expect(s.players.A.castingSpell).toBe(13);
    expect(s.players.A.mana).toBeGreaterThanOrEqual(manaBeforeFreeJab); // free — regen may add, never spent
    expect(s.players.A.riposteReadyUntil).toBeUndefined();
    // Deterministic: stunUntil = the tick the jab was processed on + RIPOSTE_JAB_STUN_TICKS.
    expect(s.players.B.stunUntil).toBe(jabLandedOnTick + RIPOSTE_JAB_STUN_TICKS);
  });
});
