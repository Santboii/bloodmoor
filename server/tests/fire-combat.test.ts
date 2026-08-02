import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { PILLARS, FIREBALL_MAX_LIFETIME_TICKS, MAX_LIVE_EMBERS } from '@arena/shared';
import type { NodeId, InputFrame } from '@arena/shared';

const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };

/** Matches the PlayerInit shape used by stateadvancer.test.ts. */
function twoMages() {
  return makeInitialState([
    { id: 'a', displayName: 'Alice', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'b', displayName: 'Bob', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
  ]);
}

/** Two mages on an unobstructed lane — the default spawns at y=1000 have the
 *  centre pillar exactly between them, so a straight shot never arrives. */
function clearLaneMages() {
  return makeInitialState([
    { id: 'a', displayName: 'Alice', charClass: 'mage', spawnPos: { x: 200, y: 600 } },
    { id: 'b', displayName: 'Bob', charClass: 'mage', spawnPos: { x: 900, y: 600 } },
  ]);
}

const mageSkills = (ranks: [NodeId, number][]) =>
  new Map<NodeId, number>([['fire.fireball', 1], ...ranks]);

function run(ranks: [NodeId, number][], ticks: number, aim: { x: number; y: number }, from: { x: number; y: number }) {
  let state = twoMages();
  state = { ...state, players: { ...state.players, a: { ...state.players.a, position: { ...from } } } };
  const sets = { a: mageSkills(ranks), b: new Map<NodeId, number>() };
  state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: aim }, b: idle }, sets);
  for (let i = 0; i < ticks; i++) state = advanceState(state, { a: idle, b: idle }, sets);
  return state;
}

/** Peak concurrent ember count over `ticks` — embers that fly straight into
 *  the pillar the parent detonated on die within a few ticks, so counting
 *  survivors at the end would measure attrition rather than the burst. */
function peakEmbers(ranks: [NodeId, number][], ticks: number, aim: { x: number; y: number }, from: { x: number; y: number }, gen = 1) {
  let state = twoMages();
  state = { ...state, players: { ...state.players, a: { ...state.players.a, position: { ...from } } } };
  const sets = { a: mageSkills(ranks), b: new Map<NodeId, number>() };
  state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: aim }, b: idle }, sets);
  let peak = 0;
  for (let i = 0; i < ticks; i++) {
    state = advanceState(state, { a: idle, b: idle }, sets);
    peak = Math.max(peak, state.projectiles.filter(p => (p.emberGen ?? 0) >= gen).length);
  }
  return peak;
}

/** Projectile list on the first tick embers exist — the parent needs ~45
 *  ticks to cross the gap before it detonates. */
function firstEmberTick(ranks: [NodeId, number][], aim: { x: number; y: number }, from: { x: number; y: number }) {
  let state = twoMages();
  state = { ...state, players: { ...state.players, a: { ...state.players.a, position: { ...from } } } };
  const sets = { a: mageSkills(ranks), b: new Map<NodeId, number>() };
  state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: aim }, b: idle }, sets);
  for (let i = 0; i < 240; i++) {
    state = advanceState(state, { a: idle, b: idle }, sets);
    const embers = state.projectiles.filter(p => (p.emberGen ?? 0) >= 1);
    if (embers.length) return embers;
  }
  return [];
}

describe('Ricochet', () => {
  const pillar = PILLARS[0];
  const from = { x: pillar.x - 300, y: pillar.y };
  const aim = { x: pillar.x, y: pillar.y };

  it('detonates on a pillar without Ricochet', () => {
    const state = run([], 60, aim, from);
    expect(state.projectiles).toHaveLength(0);
  });

  it('survives the pillar and reverses direction with Ricochet', () => {
    const state = run([['fire.pyroclasm', 1]], 60, aim, from);
    const fb = state.projectiles.find(p => p.type === 'fireball');
    expect(fb).toBeDefined();
    expect(fb!.velocity.x).toBeLessThan(0);
    expect(fb!.bounceCount).toBeGreaterThanOrEqual(1);
  });

  it('dies once the bounce budget is spent', () => {
    const state = run([['fire.pyroclasm', 1]], 60 * 8, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });

  it('Perpetual Flame still dies at the hard lifetime ceiling', () => {
    const state = run([['fire.pyroclasm', 4]], FIREBALL_MAX_LIFETIME_TICKS + 30, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });

  it('Perpetual Flame is still alive well past a plain Ricochet budget', () => {
    const state = run([['fire.pyroclasm', 4]], 60 * 3, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball').length).toBeGreaterThan(0);
  });
});

describe('Volatile Ember', () => {
  const pillar = PILLARS[0];
  const from = { x: pillar.x - 300, y: pillar.y };
  const aim = { x: pillar.x, y: pillar.y };

  it('spawns no embers at rank 0', () => {
    const state = run([], 60, aim, from);
    expect(state.projectiles).toHaveLength(0);
  });

  it('bursts into the rank-1 ember count on detonation', () => {
    expect(peakEmbers([['fire.volatile_ember', 1]], 60, aim, from)).toBe(2);
  });

  it('scales ember count with rank', () => {
    expect(peakEmbers([['fire.volatile_ember', 5]], 60, aim, from)).toBe(6);
  });

  it('embers home toward the enemy', () => {
    const embers = firstEmberTick([['fire.volatile_ember', 1]], aim, from);
    expect(embers.length).toBeGreaterThan(0);
    for (const e of embers) expect(e.homing).toBeGreaterThan(0);
  });

  it('does not chain without the keystone', () => {
    expect(peakEmbers([['fire.volatile_ember', 5]], 60 * 4, aim, from, 2)).toBe(0);
  });

  it('embers hit for a fraction of the parent fireball', () => {
    const ember = firstEmberTick([['fire.volatile_ember', 1]], aim, from)[0];
    expect(ember.damageMax!).toBeCloseTo(120 * 0.2, 5);
    expect(ember.damageMin!).toBeCloseTo(80 * 0.2, 5);
  });
});

describe('Chain Reaction', () => {
  /** Fire straight at player b so embers get a live target to hit — chaining
   *  requires a direct hit, which a pillar detonation never produces. The
   *  default spawns sit either side of the centre pillar at (1000, 1000), so
   *  this uses a clear lane at y=600 instead. */
  function atEnemy(ranks: [NodeId, number][], ticks: number) {
    let state = clearLaneMages();
    const sets = { a: mageSkills(ranks), b: new Map<NodeId, number>() };
    const target = { ...state.players.b.position };
    state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: target }, b: idle }, sets);
    let peakGen2 = 0;
    for (let i = 0; i < ticks; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      peakGen2 = Math.max(peakGen2, state.projectiles.filter(p => (p.emberGen ?? 0) >= 2).length);
    }
    return peakGen2;
  }

  it('chains a second generation past the soft cap', () => {
    expect(atEnemy([['fire.volatile_ember', 6], ['fire.seeking_flame', 3]], 300)).toBeGreaterThan(0);
  });

  it('does not chain at the soft cap', () => {
    expect(atEnemy([['fire.volatile_ember', 5], ['fire.seeking_flame', 3]], 300)).toBe(0);
  });

  it('never exceeds the live ember cap', () => {
    let state = clearLaneMages();
    const sets = { a: mageSkills([['fire.volatile_ember', 6], ['fire.seeking_flame', 3]]), b: new Map<NodeId, number>() };
    const target = { ...state.players.b.position };
    state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: target }, b: idle }, sets);
    for (let i = 0; i < 300; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      const embers = state.projectiles.filter(p => p.ownerId === 'a' && (p.emberGen ?? 0) >= 1);
      expect(embers.length).toBeLessThanOrEqual(MAX_LIVE_EMBERS);
    }
  });
});
