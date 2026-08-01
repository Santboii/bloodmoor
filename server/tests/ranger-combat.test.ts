import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame } from '@arena/shared';
import { ARROW_SPEED, DELTA, RAIN_DELAY_TICKS, RAIN_DAMAGE_PER_TICK, EXPOSED_DAMAGE_MULT, effectAtRank } from '@arena/shared';

describe('Ranger combat integration', () => {
  const rangerSkills = new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ['archer.guided' as NodeId, 1],
    ['archer.multishot' as NodeId, 1],
  ]);

  it('Power Shot spawns an arrow projectile', () => {
    const state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const inputs: Record<string, InputFrame> = {
      p1: { move: { x: 0, y: 0 }, castSpell: 5, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } },
    };
    const next = advanceState(state, inputs, { p1: rangerSkills, p2: new Map() });
    const arrows = next.projectiles.filter(p => p.type === 'arrow');
    expect(arrows).toHaveLength(1);
    expect(arrows[0].ownerId).toBe('p1');
  });

  it('Multi-shot spawns 3 arrow projectiles', () => {
    const state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const inputs: Record<string, InputFrame> = {
      p1: { move: { x: 0, y: 0 }, castSpell: 6, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } },
    };
    const next = advanceState(state, inputs, { p1: rangerSkills, p2: new Map() });
    const arrows = next.projectiles.filter(p => p.type === 'arrow');
    expect(arrows).toHaveLength(3);
  });

  it('Rain of Arrows creates a rain state', () => {
    const skills = new Map<NodeId, number>([
      ...rangerSkills,
      ['archer.homing' as NodeId, 1],
      ['archer.rain_of_arrows' as NodeId, 1],
    ]);
    const state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const inputs: Record<string, InputFrame> = {
      p1: { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1000, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } },
    };
    const next = advanceState(state, inputs, { p1: skills, p2: new Map() });
    expect(next.rainOfArrows).toHaveLength(1);
    expect(next.rainOfArrows[0].ownerId).toBe('p1');
  });

  it('Evade moves the player and grants invulnerability', () => {
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer_utility.evade' as NodeId, 1],
    ]);
    const state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 500, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const inputs: Record<string, InputFrame> = {
      p1: { move: { x: 0, y: 0 }, castSpell: 8, aimTarget: { x: 800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } },
    };
    const next = advanceState(state, inputs, { p1: skills, p2: new Map() });
    expect(next.players['p1'].position.x).toBeGreaterThan(500);
    expect(next.players['p1'].invulnUntil).toBeGreaterThan(0);
  });

  it('Second Wind: two evade charges, refilling on the cooldown', () => {
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer_utility.evade' as NodeId, 1],
      ['archer_utility.shadowstep' as NodeId, 1],
      ['archer_utility.acrobatics' as NodeId, 4],   // keystone rank
    ]);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 500, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    const evade: InputFrame = { move: { x: 0, y: 0 }, castSpell: 8, aimTarget: { x: 900, y: 1000 } };
    const sk = { p1: skills, p2: new Map<NodeId, number>() };

    state = advanceState(state, { p1: idle, p2: idle }, sk);
    expect(state.players['p1'].evadeCharges).toBe(2);      // stamped lazily

    state = advanceState(state, { p1: evade, p2: idle }, sk);
    expect(state.players['p1'].evadeCharges).toBe(1);
    const cdAfterFirst = state.players['p1'].cooldowns[8]!;
    expect(cdAfterFirst).toBeGreaterThan(0);

    // Wait out the dash (9 ticks), then cast again immediately — the second
    // charge works even though the refill timer is still running.
    for (let i = 0; i < 10; i++) state = advanceState(state, { p1: idle, p2: idle }, sk);
    state = advanceState(state, { p1: evade, p2: idle }, sk);
    expect(state.players['p1'].evadeCharges).toBe(0);
    const cdAfterSecond = state.players['p1'].cooldowns[8]!;
    // The refill timer kept counting down through the second cast rather
    // than being restarted by it.
    expect(cdAfterSecond).toBeLessThan(cdAfterFirst);

    // Third cast is blocked at zero charges (dash finished, mana is plenty).
    for (let i = 0; i < 10; i++) state = advanceState(state, { p1: idle, p2: idle }, sk);
    const posBefore = { ...state.players['p1'].position };
    state = advanceState(state, { p1: evade, p2: idle }, sk);
    expect(state.players['p1'].evadeCharges).toBe(0);
    expect(state.players['p1'].position).toEqual(posBefore);

    // When the refill timer elapses, a charge comes back and the timer restarts
    // (still one charge missing).
    for (let i = 0; i < 90; i++) state = advanceState(state, { p1: idle, p2: idle }, sk);
    expect(state.players['p1'].evadeCharges).toBe(1);
    expect(state.players['p1'].cooldowns[8]).toBeGreaterThan(0);
  });

  it('Ranger cannot cast Fireball (spell 1)', () => {
    const state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const inputs: Record<string, InputFrame> = {
      p1: { move: { x: 0, y: 0 }, castSpell: 1, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } },
    };
    const next = advanceState(state, inputs, { p1: rangerSkills, p2: new Map() });
    expect(next.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });

  it('Echo Volley: barrage past cap fires a delayed half-damage second volley', () => {
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer.multishot' as NodeId, 1],
      ['archer.barrage' as NodeId, 6],   // keystone rank
    ]);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 6, aimTarget: { x: 1800, y: 1000 } };
    state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
    const firstVolley = state.projectiles.filter(p => p.type === 'arrow').length;
    expect(state.echoVolleys).toHaveLength(1);

    for (let i = 0; i < 14; i++) state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
    expect(state.echoVolleys).toHaveLength(1);              // not due yet
    expect(state.projectiles.filter(p => p.type === 'arrow').length).toBe(firstVolley);

    state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
    const arrows = state.projectiles.filter(p => p.type === 'arrow');
    expect(arrows.length).toBe(firstVolley * 2);           // echo doubled the volley
    expect(state.echoVolleys).toHaveLength(0);             // consumed
    const echoArrow = arrows[arrows.length - 1];
    expect(echoArrow.damageMin).toBe(20);                  // 40 × 0.5
    expect(echoArrow.damageMax).toBe(30);                  // 60 × 0.5
  });

  it('Exposed: rain zone ticks hit 15% harder with piercing_rain past cap', () => {
    const mk = (piercingRank: number) => {
      const skills = new Map<NodeId, number>([
        ['archer.power_shot' as NodeId, 1],
        ['archer.rain_of_arrows' as NodeId, 1],
        ['archer.piercing_rain' as NodeId, piercingRank],
      ]);
      let state = makeInitialState([
        { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
        { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
      ]);
      const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
      const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1600, y: 1000 } };
      state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
      for (let i = 0; i < 60; i++) state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
      return state.players['p2'].hp;
    };
    const hpAtCap = mk(3);
    const hpPastCap = mk(4);
    // Past-cap zone: slightly higher damageMultiplier AND the 1.15 Exposed
    // multiplier — meaningfully more damage than the rank-3 zone.
    const dmgAtCap = 750 - hpAtCap;
    const dmgPastCap = 750 - hpPastCap;
    expect(dmgPastCap).toBeGreaterThan(dmgAtCap * 1.12);
  });

  it('Stormcall: rain zone drifts toward the enemy with sustained_rain past cap', () => {
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer.rain_of_arrows' as NodeId, 1],
      ['archer.sustained_rain' as NodeId, 6],   // keystone rank
    ]);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1000, y: 1000 } };
    state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
    // Let the zone spawn, then drift for 30 ticks.
    for (let i = 0; i < 75; i++) state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
    const zone = state.fireWalls.find(fw => fw.id.startsWith('rain_zone_'));
    expect(zone).toBeDefined();
    expect(zone!.center!.x).toBeGreaterThan(1000);   // moved toward p2 at x=1800
  });

  it('Twin Storm: casting also marks a half-size zone on the enemy', () => {
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer.rain_of_arrows' as NodeId, 1],
      ['archer.wide_rain' as NodeId, 6],   // keystone rank
    ]);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1000, y: 1000 } };
    state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
    expect(state.rainOfArrows).toHaveLength(2);
    const [primary, twin] = state.rainOfArrows;
    expect(twin.target).toEqual({ x: 1800, y: 1000 });     // enemy position at cast
    expect(twin.radius).toBeCloseTo(primary.radius / 2, 5);
  });

  it('overlapping same-owner rain zones tick a target at most once per tick', () => {
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer.rain_of_arrows' as NodeId, 1],
    ]);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
    ]);
    // Two already-detonated zones stacked on p2.
    state.fireWalls.push(
      { id: 'rain_zone_a', ownerId: 'p1', segments: [], expiresAt: 10_000, shape: 'circle', center: { x: 1600, y: 1000 }, radius: 70 },
      { id: 'rain_zone_b', ownerId: 'p1', segments: [], expiresAt: 10_000, shape: 'circle', center: { x: 1600, y: 1000 }, radius: 70 },
    );
    const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    const before = state.players['p2'].hp;
    state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
    const lost = before - state.players['p2'].hp;
    expect(lost).toBeCloseTo(45 / 60, 5);   // one RAIN_DAMAGE_PER_TICK, not two
  });

  it('Exposed sees this tick\'s Stormcall-drifted zone, not last tick\'s (regression)', () => {
    // fireWalls must be expiry-filtered and Stormcall-drifted BEFORE the
    // arrow-hit section reads it, or exposedMultiplier judges "in zone" off
    // a one-tick-stale position. Set up a zone that starts just outside the
    // Exposed radius (dist 87 > threshold 86.5) and drifts by exactly one
    // unit this tick (STORMCALL_DRIFT_SPEED * DELTA === 1) to land just
    // inside it (dist 86 < 86.5) — both distances are exact integers, so
    // there's no floating-point ambiguity about which side of the line
    // they're on. An arrow already sitting on the target must land with the
    // 1.15x Exposed bonus applied THIS tick.
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer.rain_of_arrows' as NodeId, 1],
      ['archer.sustained_rain' as NodeId, 6],   // Stormcall keystone (drift)
      ['archer.piercing_rain' as NodeId, 4],    // Exposed keystone (past cap)
    ]);
    const state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
    ]);
    state.fireWalls.push({
      id: 'rain_zone_test', ownerId: 'p1', segments: [], expiresAt: 10_000,
      shape: 'circle', center: { x: 1513, y: 1000 }, radius: 70.5,
    });
    state.projectiles.push({
      id: 'ar_test', ownerId: 'p1', type: 'arrow',
      position: { x: 1600, y: 1000 }, velocity: { x: 0, y: 0 }, radius: 8,
      damageMin: 100, damageMax: 100, homing: 0, homingRedirects: 0, homingInterval: 0, redirectCount: 0,
    });
    const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    const before = state.players['p2'].hp;
    const next = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
    const lost = before - next.players['p2'].hp;

    const zone = next.fireWalls.find(fw => fw.id === 'rain_zone_test');
    expect(zone!.center).toEqual({ x: 1514, y: 1000 });   // drifted the expected one unit

    // arrow (100 dmg, fixed via damageMin===damageMax) + this tick's rain
    // zone tick — both must carry the 1.15x Exposed bonus, since both read
    // the same already-drifted zone position.
    const rainDamageMultiplier = 1 + effectAtRank(0.25, 4);
    const expectedArrow = 100 * EXPOSED_DAMAGE_MULT;
    const expectedZoneTick = RAIN_DAMAGE_PER_TICK * rainDamageMultiplier * EXPOSED_DAMAGE_MULT;
    expect(lost).toBeCloseTo(expectedArrow + expectedZoneTick, 5);
  });

  it('Predator clamps a teleport-driven enemy velocity spike to PLAYER_SPEED (regression)', () => {
    // Predator derives enemy velocity from a single-tick position delta.
    // A teleport can move a player up to TELEPORT_MAX_RANGE (600) in one
    // tick, which unclamped reads as a 600 * TICK_RATE = 36,000 units/sec
    // "velocity" — 180x PLAYER_SPEED. Left unclamped, the lead point lands
    // far outside the 2000x2000 arena and the whole redirect is wasted.
    const state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 500, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1300, y: 1000 } },
    ]);
    // A predator arrow already in flight, one tick from its redirect.
    state.projectiles.push({
      id: 'ar_predator_test', ownerId: 'p1', type: 'arrow',
      position: { x: 500, y: 1000 }, velocity: { x: 560, y: 0 }, radius: 6,
      damageMin: 60, damageMax: 90,
      homing: 1, homingRedirects: 0, homingInterval: 30, redirectCount: 0,
      predator: true,
    });
    const inputs: Record<string, InputFrame> = {
      p1: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } },
      p2: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: 1300, y: 400 } },   // teleport straight up, dist === TELEPORT_MAX_RANGE
    };
    const next = advanceState(state, inputs);
    expect(next.players['p2'].position).toEqual({ x: 1300, y: 400 });

    const arrow = next.projectiles.find(p => p.id === 'ar_predator_test')!;
    expect(arrow.redirectCount).toBe(1);   // confirms the redirect actually fired
    const angle = Math.atan2(arrow.velocity.y, arrow.velocity.x) * 180 / Math.PI;
    // A clamped (magnitude PLAYER_SPEED=200) lead lands the redirect angle
    // near -50°. An unclamped 36,000 units/sec "velocity" swings it to
    // ~-89° (dominated entirely by the runaway y component). Assert it
    // lands in the clamped range, comfortably short of the unclamped one.
    expect(angle).toBeGreaterThan(-70);
    expect(angle).toBeLessThan(-30);
  });
});
