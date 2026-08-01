import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame } from '@arena/shared';
import { ARROW_SPEED, DELTA, RAIN_DELAY_TICKS } from '@arena/shared';

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
});
