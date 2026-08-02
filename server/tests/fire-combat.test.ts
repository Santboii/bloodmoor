import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { PILLARS, FIREBALL_MAX_LIFETIME_TICKS, MAX_LIVE_EMBERS, ETERNAL_PYRE_MAX_TICKS, EMBER_ARC, EMBER_DAMAGE_RATIO } from '@arena/shared';
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
    expect(ember.damageMax!).toBeCloseTo(120 * EMBER_DAMAGE_RATIO, 5);
    expect(ember.damageMin!).toBeCloseTo(80 * EMBER_DAMAGE_RATIO, 5);
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

describe('Searing Heat crossing', () => {
  /** Wall at x=500 across a clear lane, then a fireball fired through it. */
  function crossOwnWall(searingRank: number, wallOwner: 'a' | 'b' = 'a') {
    let state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.searing_heat', searingRank]]),
      b: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.searing_heat', searingRank]]),
    };
    const wallAt = { x: 500, y: 600 };
    const caster = wallOwner === 'a' ? { a: { ...idle, castSpell: 2 as const, aimTarget: wallAt }, b: idle }
                                     : { a: idle, b: { ...idle, castSpell: 2 as const, aimTarget: wallAt } };
    state = advanceState(state, caster, sets);
    state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: { x: 880, y: 600 } }, b: idle }, sets);
    // The wall sits 300 units downrange at 400 u/s — ~45 ticks to reach it.
    for (let i = 0; i < 120; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      const fb = state.projectiles.find(p => p.type === 'fireball' && (p.emberGen ?? 0) === 0);
      if (fb?.wallEmpowered) return fb;
    }
    return state.projectiles.find(p => p.type === 'fireball' && (p.emberGen ?? 0) === 0);
  }

  it("empowers a fireball crossing the caster's own wall", () => {
    const fb = crossOwnWall(1);
    expect(fb?.wallEmpowered).toBe(true);
    expect(fb!.damageMin!).toBeCloseTo(80 * 1.25, 5);
    expect(fb!.damageMax!).toBeCloseTo(120 * 1.25, 5);
  });

  it('does not empower without Searing Heat', () => {
    expect(crossOwnWall(0)?.wallEmpowered).toBeFalsy();
  });

  it("does not empower off an enemy's wall", () => {
    expect(crossOwnWall(1, 'b')?.wallEmpowered).toBeFalsy();
  });

  it('empowers exactly once, not once per overlapping tick', () => {
    const fb = crossOwnWall(1);
    // A second application would compound to 80 * 1.25^2 = 125.
    expect(fb!.damageMin!).toBeLessThan(80 * 1.25 * 1.1);
  });

  it('Blastfurnace grants a free bounce past the soft cap', () => {
    const plain = crossOwnWall(1);
    const keystone = crossOwnWall(6);
    expect(plain!.bounces ?? 0).toBe(0);
    expect(keystone!.bounces ?? 0).toBe(1);
  });
});

describe('Molten Impact', () => {
  function castMeteor(ranks: [NodeId, number][], ticks: number) {
    let state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.meteor', 1], ...ranks]),
      b: new Map<NodeId, number>(),
    };
    state = advanceState(state, { a: { ...idle, castSpell: 3, aimTarget: { x: 700, y: 600 } }, b: idle }, sets);
    for (let i = 0; i < ticks; i++) state = advanceState(state, { a: idle, b: idle }, sets);
    return state;
  }

  it('spawns no chunks at rank 0', () => {
    expect(castMeteor([], 95).meteors).toHaveLength(0);
  });

  it('spawns the rank-1 chunk count on impact', () => {
    const state = castMeteor([['fire.molten_impact', 1]], 91);
    expect(state.meteors).toHaveLength(3);
    for (const c of state.meteors) expect(c.aoeRadius).toBeLessThan(60);
  });

  it('scales chunk count with rank', () => {
    expect(castMeteor([['fire.molten_impact', 3]], 91).meteors).toHaveLength(5);
  });

  it('chunks do not shatter further', () => {
    expect(castMeteor([['fire.molten_impact', 1]], 140).meteors).toHaveLength(0);
  });

  it('leaves lasting craters only with Ejecta; plain chunks merely smolder', () => {
    // Chunk smolders (0.75s) are gone by t=160; Ejecta craters (3s) are not.
    expect(castMeteor([['fire.molten_impact', 1]], 160).fireWalls).toHaveLength(0);
    expect(castMeteor([['fire.molten_impact', 4]], 160).fireWalls.length).toBeGreaterThan(0);
  });
});

describe('Cataclysm', () => {
  function cast(ranks: [NodeId, number][]) {
    const state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.meteor', 1], ...ranks]),
      b: new Map<NodeId, number>(),
    };
    return advanceState(state, { a: { ...idle, castSpell: 3, aimTarget: { x: 700, y: 600 } }, b: idle }, sets);
  }

  it('casts one meteor at rank 0', () => {
    expect(cast([]).meteors).toHaveLength(1);
  });

  it('adds one scaled-down meteor per rank', () => {
    const state = cast([['fire.cataclysm', 2]]);
    expect(state.meteors).toHaveLength(3);
    const extras = state.meteors.filter(m => (m.damageRatio ?? 1) < 1);
    expect(extras).toHaveLength(2);
    for (const e of extras) expect(e.aoeRadius).toBeLessThan(60);
  });

  it('Extinction makes the final impact full-size and lands it last', () => {
    const state = cast([['fire.cataclysm', 4]]);
    const full = state.meteors.filter(m => (m.damageRatio ?? 1) === 1);
    expect(full).toHaveLength(1);
    expect(full[0].strikeAt).toBe(Math.max(...state.meteors.map(m => m.strikeAt)));
  });
});

describe('Guided Descent in flight', () => {
  it('the meteor lands where the cursor moved, clamped to the steer radius', () => {
    let state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.meteor', 1], ['fire.blind_strike', 1]]),
      b: new Map<NodeId, number>(),
    };
    const castAt = { x: 700, y: 600 };
    state = advanceState(state, { a: { ...idle, castSpell: 3, aimTarget: castAt }, b: idle }, sets);
    const steerTo = { x: 760, y: 600 };
    for (let i = 0; i < 10; i++) {
      state = advanceState(state, { a: { ...idle, aimTarget: steerTo }, b: idle }, sets);
    }
    expect(state.meteors[0].target.x).toBeCloseTo(760, 4);
    expect(state.meteors[0].origin.x).toBeCloseTo(700, 4);
  });

  it('does not steer without the node', () => {
    let state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.meteor', 1]]),
      b: new Map<NodeId, number>(),
    };
    state = advanceState(state, { a: { ...idle, castSpell: 3, aimTarget: { x: 700, y: 600 } }, b: idle }, sets);
    for (let i = 0; i < 10; i++) {
      state = advanceState(state, { a: { ...idle, aimTarget: { x: 760, y: 600 } }, b: idle }, sets);
    }
    expect(state.meteors[0].target.x).toBeCloseTo(700, 4);
  });
});

describe('ember fan geometry', () => {
  /** Embers fan out toward the enemy, not in a full circle. */
  function emberHeadings() {
    let state = clearLaneMages();
    const sets = { a: mageSkills([['fire.volatile_ember', 5]]), b: new Map<NodeId, number>() };
    state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: { x: 700, y: 600 } }, b: idle }, sets);
    for (let i = 0; i < 240; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      const embers = state.projectiles.filter(p => (p.emberGen ?? 0) >= 1);
      if (embers.length) return embers.map(e => Math.atan2(e.velocity.y, e.velocity.x));
    }
    return [];
  }

  it('aims the fan at the enemy instead of spraying in a full circle', () => {
    const headings = emberHeadings();
    expect(headings.length).toBeGreaterThan(1);
    // Enemy b sits at +x from the burst, so every ember starts within the
    // half-arc of straight-ahead. A radial burst would put some at ~180°.
    for (const h of headings) expect(Math.abs(h)).toBeLessThanOrEqual(EMBER_ARC / 2 + 1e-6);
  });

  it('widens the fan with ember count rather than always spanning the cap', () => {
    const spanFor = (rank: number) => {
      let state = clearLaneMages();
      const sets = { a: mageSkills([['fire.volatile_ember', rank]]), b: new Map<NodeId, number>() };
      state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: { x: 700, y: 600 } }, b: idle }, sets);
      for (let i = 0; i < 240; i++) {
        state = advanceState(state, { a: idle, b: idle }, sets);
        const e = state.projectiles.filter(p => (p.emberGen ?? 0) >= 1);
        if (e.length) {
          const hs = e.map(x => Math.atan2(x.velocity.y, x.velocity.x));
          return Math.max(...hs) - Math.min(...hs);
        }
      }
      return 0;
    };
    // Rank 1 is two embers: a narrow pair either side of straight-ahead, not
    // both parked on the arc edges with nothing aimed at the target.
    expect(spanFor(1)).toBeLessThan(EMBER_ARC / 2);
    expect(spanFor(5)).toBeGreaterThan(spanFor(1));
  });
});

describe('meteor ground fire', () => {
  function castAt(ranks: [NodeId, number][], ticks: number) {
    let state = clearLaneMages();
    const sets = {
      a: new Map<NodeId, number>([['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.meteor', 1], ...ranks]),
      b: new Map<NodeId, number>(),
    };
    // Cast directly on b, who never moves — "sitting in the fire".
    state = advanceState(state, { a: { ...idle, castSpell: 3, aimTarget: { ...state.players.b.position } }, b: idle }, sets);
    let hpAtStrike = -1;
    for (let i = 0; i < ticks; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      if (state.tick === 92) hpAtStrike = state.players.b.hp;
    }
    return { state, hpAtStrike };
  }

  it('an impact leaves a brief smolder that burns whoever stands in it', () => {
    const { state, hpAtStrike } = castAt([], 160);
    // The fire VFX at the impact point must be backed by a real zone: the
    // enemy sitting at the impact takes damage AFTER the strike itself.
    expect(hpAtStrike - state.players.b.hp).toBeGreaterThan(10);
    // ...and the smolder is brief — long gone well after expiry.
    expect(state.fireWalls).toHaveLength(0);
  });

  it('smolders burn but Ejecta craters outlive them', () => {
    const { state } = castAt([['fire.molten_impact', 4]], 130);
    // At t~130 smolders (0.75s) are gone or going; craters (3s) remain.
    const longLived = state.fireWalls.filter(f => f.expiresAt - f.spawnedAt > 100);
    expect(longLived.length).toBeGreaterThan(0);
  });

  it('chunks spawn only from the full-size primary, not from shower extras', () => {
    const { state } = castAt([['fire.cataclysm', 3], ['fire.molten_impact', 3]], 92);
    // Primary shatters into 5; the three 60% extras must not shatter too
    // (that would be 20 chunk meteors from one cast).
    expect(state.meteors).toHaveLength(5);
  });

  it('rotates the chunk formation per cast instead of always landing due east', () => {
    const angles: number[] = [];
    for (let run = 0; run < 2; run++) {
      const { state } = castAt([['fire.molten_impact', 1]], 91);
      const chunk = state.meteors[0];
      angles.push(Math.atan2(chunk.target.y - 600, chunk.target.x - 1800));
    }
    expect(angles[0]).not.toBeCloseTo(angles[1], 6);
  });
});
