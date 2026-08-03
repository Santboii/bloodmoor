import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame, GameState } from '@arena/shared';
import {
  DEEP_FREEZE_ROOT_TICKS, DEEP_FREEZE_COOLDOWN_TICKS, ABSOLUTE_ZERO_DWELL_TICKS,
  PERMAFROST_LINGER_TICKS, CATACLYSMIC_ORB_RADIUS, BLIZZARD_DURATION_TICKS,
} from '@arena/shared';

const idle = (aim = { x: 0, y: 0 }): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: aim, channel: null });

function frostSkills(extra: [string, number][]): Map<NodeId, number> {
  return new Map<NodeId, number>([
    ['frost.ice_bolt' as NodeId, 1],
    ...extra.map(([id, rank]) => [id as NodeId, rank] as [NodeId, number]),
  ]);
}

/** p1 mage at (200,1000), p2 mage at (1600,1000). */
function baseState(): GameState {
  return makeInitialState([
    { id: 'p1', displayName: 'Frost', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Target', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
  ]);
}

/** Injects a p1-owned ice bolt a few ticks short of p2. */
function boltAboutToHit(state: GameState): GameState {
  state.projectiles.push({
    id: 'test_bolt',
    ownerId: 'p1',
    type: 'icebolt',
    position: { x: 1570, y: 1000 },
    velocity: { x: 480, y: 0 },
    damageMin: 60,
    damageMax: 85,
    piercedIds: [],
  });
  return state;
}

const run = (state: GameState, skills: Record<string, Map<NodeId, number>>, ticks: number) => {
  let s = state;
  for (let i = 0; i < ticks; i++) s = advanceState(s, { p1: idle(), p2: idle() }, skills);
  return s;
};

describe('Flash Freeze', () => {
  // Bitter Chill soft cap is 5, so rank 6 is the first keystone rank.
  const skills = { p1: frostSkills([['frost.bitter_chill', 6]]), p2: new Map<NodeId, number>() };

  it('roots an unchilled target on hit', () => {
    const state = run(boltAboutToHit(baseState()), skills, 4);
    const p2 = state.players['p2'];
    expect(p2.rootUntil).toBeGreaterThan(state.tick);
    expect((p2.rootUntil ?? 0) - state.tick).toBeLessThanOrEqual(DEEP_FREEZE_ROOT_TICKS);
  });

  it('arms the per-target cooldown so a second bolt cannot re-root', () => {
    let state = run(boltAboutToHit(baseState()), skills, 4);
    const firstRoot = state.players['p2'].rootUntil!;
    expect(state.players['p2'].freezeRootReadyAt)
      .toBeGreaterThanOrEqual(state.tick + DEEP_FREEZE_COOLDOWN_TICKS - 8);

    // Let the first root lapse, then land another bolt well inside the ICD.
    // (rootUntil legitimately goes undefined once the root naturally expires
    // — the same tick-0.5 status sweep the ranger's Deep Freeze relies on —
    // so this reads it the same guarded way elemental-effects.test.ts:287 does.)
    state = run(state, skills, DEEP_FREEZE_ROOT_TICKS + 5);
    state = run(boltAboutToHit(state), skills, 4);
    expect(state.players['p2'].rootUntil ?? 0).toBeLessThanOrEqual(firstRoot);
  });

  it('does not root below the keystone rank', () => {
    const capped = { p1: frostSkills([['frost.bitter_chill', 5]]), p2: new Map<NodeId, number>() };
    const state = run(boltAboutToHit(baseState()), capped, 4);
    expect(state.players['p2'].rootUntil ?? 0).toBeLessThanOrEqual(state.tick);
    // The chill itself still lands — only the root is gated.
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
  });
});

describe('Absolute Zero', () => {
  const skills = { p1: frostSkills([['frost.blizzard', 1], ['frost.deepening_cold', 6]]), p2: new Map<NodeId, number>() };

  const blizzardOn = (state: GameState, center: { x: number; y: number }) => {
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center, radius: 90, segments: [], expiresAt: state.tick + BLIZZARD_DURATION_TICKS * 4,
    });
    return state;
  };

  it('does not root before the dwell threshold', () => {
    const state = run(blizzardOn(baseState(), { x: 1600, y: 1000 }), skills, ABSOLUTE_ZERO_DWELL_TICKS - 10);
    expect(state.players['p2'].rootUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });

  it('roots once the target has stood in it long enough', () => {
    const state = run(blizzardOn(baseState(), { x: 1600, y: 1000 }), skills, ABSOLUTE_ZERO_DWELL_TICKS + 5);
    expect(state.players['p2'].rootUntil).toBeGreaterThan(state.tick);
  });

  it('never roots a target standing outside the field', () => {
    const state = run(blizzardOn(baseState(), { x: 400, y: 1000 }), skills, ABSOLUTE_ZERO_DWELL_TICKS + 30);
    expect(state.players['p2'].rootUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });
});

describe('Permafrost', () => {
  const skills = { p1: frostSkills([['frost.blizzard', 1], ['frost.lingering_winter', 6]]), p2: new Map<NodeId, number>() };

  it('leaves a lingering zone when the blizzard expires', () => {
    let state = baseState();
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 1600, y: 1000 }, radius: 90, segments: [], expiresAt: state.tick + 5,
    });
    const hpBefore = state.players['p2'].hp;
    state = run(state, skills, 10);

    const lingering = state.fireWalls.find(fw => fw.id !== 'bz_test');
    expect(lingering).toBeDefined();
    expect(lingering!.expiresAt - state.tick).toBeLessThanOrEqual(PERMAFROST_LINGER_TICKS);

    // Chill continues, damage does not.
    const afterLinger = run(state, skills, 30);
    expect(afterLinger.players['p2'].slowUntil).toBeGreaterThan(afterLinger.tick);
    expect(afterLinger.players['p2'].hp).toBe(hpBefore - (hpBefore - state.players['p2'].hp));
  });
});

describe('Cataclysmic Orb', () => {
  const skills = { p1: frostSkills([['frost.frozen_orb', 1], ['frost.shard_storm', 4]]), p2: new Map<NodeId, number>() };

  it('detonates on expiry and damages a target inside the blast', () => {
    let state = baseState();
    state.frozenOrbs.push({
      id: 'fo_test', ownerId: 'p1',
      position: { x: 1600, y: 1000 }, velocity: { x: 0, y: 0 },
      expiresAt: state.tick + 2, nextVolleyAt: Number.MAX_SAFE_INTEGER,
      shardsPerVolley: 4, damageMin: 25, damageMax: 40, detonateOnExpiry: true,
    });
    const hpBefore = state.players['p2'].hp;
    state = run(state, skills, 5);
    expect(state.players['p2'].hp).toBeLessThan(hpBefore);
  });

  it('spares a target outside the blast radius', () => {
    let state = baseState();
    state.frozenOrbs.push({
      id: 'fo_test', ownerId: 'p1',
      position: { x: 1600 - CATACLYSMIC_ORB_RADIUS - 200, y: 1000 }, velocity: { x: 0, y: 0 },
      expiresAt: state.tick + 2, nextVolleyAt: Number.MAX_SAFE_INTEGER,
      shardsPerVolley: 4, damageMin: 25, damageMax: 40, detonateOnExpiry: true,
    });
    const hpBefore = state.players['p2'].hp;
    state = run(state, skills, 5);
    expect(state.players['p2'].hp).toBe(hpBefore);
  });
});

describe('Impaler', () => {
  // Ice Lance soft cap is 3, so rank 4 is the first keystone rank — unlimited
  // pierce plus +8% damage for every enemy already pierced.
  const skills = { p1: frostSkills([['frost.ice_lance', 4]]), p2: new Map<NodeId, number>() };

  /** Fixed damage band so the roll is deterministic. */
  const fixedBolt = (piercedIds: string[]) => ({
    id: 'test_bolt', ownerId: 'p1', type: 'icebolt' as const,
    position: { x: 1600, y: 1000 }, velocity: { x: 0, y: 0 },
    damageMin: 60, damageMax: 60, impaler: true, piercedIds,
  });

  it('deals more damage the more enemies it has already pierced', () => {
    let freshState = baseState();
    freshState.projectiles.push(fixedBolt([]));
    freshState = advanceState(freshState, { p1: idle(), p2: idle() }, skills);
    const freshLoss = 750 - freshState.players['p2'].hp; // MAX_HP is 750

    let veteranState = baseState();
    veteranState.projectiles.push(fixedBolt(['ghost1', 'ghost2']));
    veteranState = advanceState(veteranState, { p1: idle(), p2: idle() }, skills);
    const veteranLoss = 750 - veteranState.players['p2'].hp;

    expect(veteranLoss).toBeGreaterThan(freshLoss);
    expect(veteranLoss).toBeCloseTo(freshLoss * (1 + 2 * 0.08), 5);
  });

  it('does not inflate damage on a bolt without the keystone', () => {
    const noKeystone = { p1: frostSkills([['frost.ice_lance', 1]]), p2: new Map<NodeId, number>() };
    let state = baseState();
    // pierce carried but impaler not set — Ice Lance below rank 4.
    state.projectiles.push({ ...fixedBolt(['ghost1', 'ghost2']), impaler: false });
    state = advanceState(state, { p1: idle(), p2: idle() }, noKeystone);
    expect(750 - state.players['p2'].hp).toBeCloseTo(60, 5);
  });
});

describe('Rimeheart', () => {
  // Frostbite soft cap is 3, so rank 4 is the first keystone rank — the
  // Frostbite damage bonus now applies to Blizzard too, not just Ice Bolt.
  const withRimeheart = { p1: frostSkills([['frost.blizzard', 1], ['frost.frostbite', 4]]), p2: new Map<NodeId, number>() };
  const withoutRimeheart = { p1: frostSkills([['frost.blizzard', 1]]), p2: new Map<NodeId, number>() };

  const blizzardOn = (state: GameState) => {
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 1600, y: 1000 }, radius: 90, segments: [], expiresAt: state.tick + BLIZZARD_DURATION_TICKS,
    });
    return state;
  };

  it('deepens Blizzard damage against an already-chilled target', () => {
    // First tick: target enters unchilled, no Rimeheart bonus is possible yet.
    let withState = run(blizzardOn(baseState()), withRimeheart, 2);
    let withoutState = run(blizzardOn(baseState()), withoutRimeheart, 2);
    const withHpBefore = withState.players['p2'].hp;
    const withoutHpBefore = withoutState.players['p2'].hp;

    // Second tick: target is now chilled from the first tick, so Rimeheart's
    // bonus (which scales with the target's live slow) should kick in.
    withState = advanceState(withState, { p1: idle(), p2: idle() }, withRimeheart);
    withoutState = advanceState(withoutState, { p1: idle(), p2: idle() }, withoutRimeheart);
    const withLoss = withHpBefore - withState.players['p2'].hp;
    const withoutLoss = withoutHpBefore - withoutState.players['p2'].hp;

    expect(withLoss).toBeGreaterThan(withoutLoss);
  });
});
