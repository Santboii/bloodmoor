import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState, concealedByDust } from '../src/gameloop/StateAdvancer.ts';
import {
  DUST_RADIUS, DUST_DURATION_TICKS, VANISH_TICKS, PLAYER_HALF_SIZE, effectAtRank,
} from '@arena/shared';
import type { InputFrame, NodeId, FireWallState } from '@arena/shared';

const DUST_GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.kick_up_dust', 1]]);
const VANISH_GLAD = new Map<NodeId, number>([
  ['arms.jab', 1], ['bulwark.kick_up_dust', 1], ['bulwark.sandstorm', 4], // rank 4: past the softCap of 3 -> keystone live
]);
const MAGE = new Map<NodeId, number>([['fire.fireball', 1]] as [NodeId, number][]);
const COMBAT_ROLL_RANGER = new Map<NodeId, number>([
  ['archer.power_shot', 1], ['archer_utility.evade', 1], ['archer_utility.combat_roll', 1],
]);

const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

describe('Kick Up Dust (spell 19) — cast', () => {
  it('spawns a self-centered, non-damaging zone sized off the modifiers', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: { x: 1400, y: 600 } },
    ]);
    const skills = { A: DUST_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 19 }), B: frame() }, skills);
    const zone = s.fireWalls.find(fw => fw.kind === 'dust');
    expect(zone).toBeDefined();
    expect(zone!.ownerId).toBe('A');
    expect(zone!.center).toEqual({ x: 600, y: 600 });
    expect(zone!.radius).toBe(DUST_RADIUS);
    expect(zone!.expiresAt - zone!.spawnedAt).toBe(DUST_DURATION_TICKS);
    expect(zone!.noDamage).toBe(true);
  });

  it('Sandstorm ranks up the radius and duration', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: { x: 1400, y: 600 } },
    ]);
    const skills = { A: VANISH_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 19 }), B: frame() }, skills);
    const zone = s.fireWalls.find(fw => fw.kind === 'dust')!;
    const mult = 1 + effectAtRank(0.15, 4);
    expect(zone.radius).toBeCloseTo(DUST_RADIUS * mult, 5);
    expect(zone.expiresAt - zone.spawnedAt).toBe(Math.round(DUST_DURATION_TICKS * mult));
  });

  it('deals no damage to a player standing inside for 2 seconds', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: { x: 650, y: 600 } }, // dist 50, inside DUST_RADIUS
    ]);
    const skills = { A: DUST_GLAD, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 19 }), B: frame() }, skills);
    expect(s.fireWalls.some(fw => fw.kind === 'dust')).toBe(true);
    const hp0 = s.players.B.hp;
    for (let i = 0; i < 120; i++) { // 2s at 60 ticks/sec, well inside the zone's 150-tick life
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.B.hp).toBe(hp0);
  });
});

describe('concealedByDust', () => {
  const dust: FireWallState = {
    id: 'd', kind: 'dust', ownerId: 'X', segments: [], spawnedAt: 0, expiresAt: 100,
    shape: 'circle', center: { x: 0, y: 0 }, radius: 100,
  };

  it('is true when the target is inside and the viewer is outside', () => {
    expect(concealedByDust({ x: 0, y: 0 }, { x: 500, y: 0 }, [dust], 50)).toBe(true);
  });

  it('is false when both the target and viewer are inside', () => {
    expect(concealedByDust({ x: 0, y: 0 }, { x: 10, y: 0 }, [dust], 50)).toBe(false);
  });

  it('is false when the target is outside the zone', () => {
    expect(concealedByDust({ x: 500, y: 0 }, { x: 500, y: 0 }, [dust], 50)).toBe(false);
  });

  it('treats the PLAYER_HALF_SIZE-padded radius as the inside/outside edge', () => {
    const edge = 100 + PLAYER_HALF_SIZE;
    expect(concealedByDust({ x: edge, y: 0 }, { x: 1000, y: 0 }, [dust], 50)).toBe(true);
    expect(concealedByDust({ x: edge + 1, y: 0 }, { x: 1000, y: 0 }, [dust], 50)).toBe(false);
  });

  it('is false once the zone has expired', () => {
    expect(concealedByDust({ x: 0, y: 0 }, { x: 500, y: 0 }, [dust], 100)).toBe(false);
  });
});

describe('Kick Up Dust — homing/auto-target exclusion', () => {
  it('a homing arrow does not redirect toward a target concealed by dust when the shooter is outside it', () => {
    const state = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: { x: 1000, y: 1000 } },
    ]);
    state.fireWalls.push({
      id: 'dust_test', kind: 'dust', ownerId: 'B', segments: [], spawnedAt: 0, expiresAt: 10_000,
      shape: 'circle', center: { x: 1000, y: 1000 }, radius: 120, noDamage: true,
    });
    state.projectiles.push({
      id: 'ar_test', ownerId: 'A', type: 'arrow',
      position: { x: 200, y: 1000 }, velocity: { x: 200, y: 0 }, radius: 8,
      damageMin: 60, damageMax: 90, homing: 1, homingRedirects: 0, homingInterval: 30, redirectCount: 0,
    });
    const idle = frame();
    const next = advanceState(state, { A: idle, B: idle });
    const arrow = next.projectiles.find(p => p.id === 'ar_test');
    expect(arrow).toBeDefined();
    expect(arrow!.redirectCount).toBe(0);
    expect(arrow!.velocity).toEqual({ x: 200, y: 0 }); // still flying straight — no redirect happened
  });

  it('both inside the same dust — concealedByDust is false, so homing still works', () => {
    const state = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'ranger', spawnPos: { x: 1050, y: 1000 } }, // inside the zone too
      { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: { x: 1000, y: 1000 } },
    ]);
    state.fireWalls.push({
      id: 'dust_test', kind: 'dust', ownerId: 'B', segments: [], spawnedAt: 0, expiresAt: 10_000,
      shape: 'circle', center: { x: 1000, y: 1000 }, radius: 120, noDamage: true,
    });
    state.projectiles.push({
      id: 'ar_test', ownerId: 'A', type: 'arrow',
      position: { x: 1050, y: 1000 }, velocity: { x: 0, y: 200 }, radius: 8,
      damageMin: 60, damageMax: 90, homing: 1, homingRedirects: 0, homingInterval: 30, redirectCount: 0,
    });
    const idle = frame();
    const next = advanceState(state, { A: idle, B: idle });
    const arrow = next.projectiles.find(p => p.id === 'ar_test');
    expect(arrow).toBeDefined();
    expect(arrow!.redirectCount).toBe(1);
    const angle = Math.atan2(arrow!.velocity.y, arrow!.velocity.x);
    expect(angle).toBeCloseTo(Math.PI, 1); // aimed back toward B (to the west of A)
  });

  it('combat-roll auto-target skips a concealed player, but fires on an unconcealed one', () => {
    const setup = () => {
      const s = makeInitialState([
        { id: 'A', displayName: 'A', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
        { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: { x: 1000, y: 1000 } },
      ]);
      return s;
    };
    const skills = { A: COMBAT_ROLL_RANGER, B: new Map<NodeId, number>() };
    const evadeInput = frame({ castSpell: 8, aimTarget: { x: 260, y: 1000 } });

    // Concealed: B stands inside a dust zone A is outside of — no arrow.
    const concealed = setup();
    concealed.fireWalls.push({
      id: 'dust_test', kind: 'dust', ownerId: 'B', segments: [], spawnedAt: 0, expiresAt: 10_000,
      shape: 'circle', center: { x: 1000, y: 1000 }, radius: 120, noDamage: true,
    });
    const concealedNext = advanceState(concealed, { A: evadeInput, B: frame() }, skills);
    expect(concealedNext.projectiles.some(p => p.ownerId === 'A')).toBe(false);

    // Control: identical setup, no dust zone — the arrow fires.
    const control = setup();
    const controlNext = advanceState(control, { A: evadeInput, B: frame() }, skills);
    expect(controlNext.projectiles.some(p => p.ownerId === 'A')).toBe(true);
  });
});

describe('Vanish keystone', () => {
  function setup(skills: Map<NodeId, number>) {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: { x: 1400, y: 600 } },
    ]);
    const skillSets = { A: skills, B: MAGE };
    s = advanceState(s, { A: frame({ castSpell: 19 }), B: frame() }, skillSets);
    expect(s.fireWalls.some(fw => fw.kind === 'dust' && fw.ownerId === 'A')).toBe(true);
    return { s, skillSets };
  }

  it('walking out of your own dust sets invisibleUntil ~= tick + VANISH_TICKS', () => {
    let { s, skillSets } = setup(VANISH_GLAD);
    const moveOut = frame({ move: { x: 1, y: 0 } });
    let crossedTick: number | undefined;
    for (let i = 0; i < 100 && crossedTick === undefined; i++) {
      s = advanceState(s, { A: moveOut, B: frame() }, skillSets);
      // s.tick is already the NEXT tick (advanceState returns tick + 1), so the
      // internal tick at which the transition was detected is s.tick - 1.
      if ((s.players.A.invisibleUntil ?? 0) > s.tick) crossedTick = s.tick - 1;
    }
    expect(crossedTick).toBeDefined();
    expect(s.players.A.invisibleUntil).toBe(crossedTick! + VANISH_TICKS);
  });

  it('without the keystone, leaving the dust never sets invisibleUntil', () => {
    let { s, skillSets } = setup(DUST_GLAD);
    const moveOut = frame({ move: { x: 1, y: 0 } });
    for (let i = 0; i < 100; i++) {
      s = advanceState(s, { A: moveOut, B: frame() }, skillSets);
      expect(s.players.A.invisibleUntil ?? 0).toBeLessThanOrEqual(s.tick);
    }
    // Sanity: A actually did travel outside the (unranked) zone's radius over that span.
    const dist = Math.hypot(s.players.A.position.x - 600, s.players.A.position.y - 600);
    expect(dist).toBeGreaterThan(DUST_RADIUS + PLAYER_HALF_SIZE);
  });
});
