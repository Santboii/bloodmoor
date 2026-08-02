import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { PILLARS, FIREBALL_MAX_LIFETIME_TICKS, MAX_LIVE_EMBERS, ETERNAL_PYRE_MAX_TICKS } from '@arena/shared';
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

describe("Hunter's Ember", () => {
  const pillar = PILLARS[0];
  const from = { x: pillar.x - 300, y: pillar.y };
  const aim = { x: pillar.x, y: pillar.y };

  it('returns for one more pass instead of dying', () => {
    const state = run([['fire.seeking_flame', 6]], 60, aim, from);
    const fb = state.projectiles.find(p => p.type === 'fireball');
    expect(fb).toBeDefined();
    expect(fb!.loopback).toBe(false);
    expect(fb!.velocity.x).toBeLessThan(0);
  });

  it('spends the return pass exactly once, then dies', () => {
    const state = run([['fire.seeking_flame', 6]], 60 * 10, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });

  it('does not return below the keystone', () => {
    const state = run([['fire.seeking_flame', 5]], 60, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });

  it('does not grant the Ricochet damage rider', () => {
    const state = run([['fire.seeking_flame', 6]], 60, aim, from);
    expect(state.projectiles.find(p => p.type === 'fireball')!.bounceCount).toBe(0);
  });
});

describe('Rolling Doom', () => {
  /** Hellfire past soft cap; fire through the enemy on a clear lane. */
  function throughEnemy(hellfireRank: number, ticks: number) {
    let state = clearLaneMages();
    const sets = { a: mageSkills([['fire.hellfire', hellfireRank]]), b: new Map<NodeId, number>() };
    const beyond = { x: 1500, y: 600 };
    state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: beyond }, b: idle }, sets);
    let passedThrough = false;
    for (let i = 0; i < ticks; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      const fb = state.projectiles.find(p => p.type === 'fireball');
      if (fb && fb.position.x > state.players.b.position.x + 40) passedThrough = true;
    }
    return { passedThrough, hp: state.players.b.hp };
  }

  // Hellfire slows the fireball hard (~240 u/s at rank 4), so 700 units takes
  // ~175 ticks — a shorter window would make the negative case pass vacuously.
  it('plows through the target past the soft cap', () => {
    const r = throughEnemy(4, 300);
    expect(r.passedThrough).toBe(true);
    expect(r.hp).toBeLessThan(750);
  });

  it('detonates on the target at the soft cap', () => {
    const r = throughEnemy(3, 300);
    expect(r.passedThrough).toBe(false);
    expect(r.hp).toBeLessThan(750); // it did connect — it just did not continue
  });
});

describe('Eternal Pyre', () => {
  /** Drop a wall directly on player b, who never moves — so it stays contested. */
  function wallOnPlayerB(enduringRank: number) {
    let state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.enduring_flames', enduringRank]]),
      b: new Map<NodeId, number>(),
    };
    const onB = { ...state.players.b.position };
    state = advanceState(state, { a: { ...idle, castSpell: 2, aimTarget: onB }, b: idle }, sets);
    return { state, sets, spawned: state.fireWalls[0] };
  }

  it('holds a contested wall past its natural expiry', () => {
    let { state, sets, spawned } = wallOnPlayerB(6);
    expect(spawned.eternalPyre).toBe(true);
    const natural = spawned.expiresAt;
    for (let i = 0; i < natural + 30; i++) state = advanceState(state, { a: idle, b: idle }, sets);
    expect(state.tick).toBeGreaterThan(natural);
    expect(state.fireWalls[0]?.expiresAt ?? 0).toBeGreaterThan(natural);
  });

  it('never extends past the absolute ceiling', () => {
    let { state, sets, spawned } = wallOnPlayerB(6);
    for (let i = 0; i < ETERNAL_PYRE_MAX_TICKS + 180; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      if (state.fireWalls.length === 0) break;
    }
    expect(state.fireWalls).toHaveLength(0);
    expect(state.tick).toBeLessThanOrEqual(spawned.spawnedAt + ETERNAL_PYRE_MAX_TICKS + 2);
  });

  it('expires normally below the keystone', () => {
    let { state, sets, spawned } = wallOnPlayerB(5);
    expect(spawned.eternalPyre).toBeFalsy();
    for (let i = 0; i < spawned.expiresAt + 5; i++) state = advanceState(state, { a: idle, b: idle }, sets);
    expect(state.fireWalls).toHaveLength(0);
  });
});

describe('Enduring Flames ramp', () => {
  it('a fresh wall burns cooler than an old one', () => {
    let state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.enduring_flames', 1]]),
      b: new Map<NodeId, number>(),
    };
    state = advanceState(state, { a: { ...idle, castSpell: 2, aimTarget: { ...state.players.b.position } }, b: idle }, sets);
    const hp: number[] = [];
    let prev = state.players.b.hp;
    for (let i = 0; i < 200; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      hp.push(prev - state.players.b.hp);
      prev = state.players.b.hp;
    }
    const early = hp.slice(0, 40).reduce((a, c) => a + c, 0);
    const late = hp.slice(-40).reduce((a, c) => a + c, 0);
    expect(late).toBeGreaterThan(early);
  });
});
