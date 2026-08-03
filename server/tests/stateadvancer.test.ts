import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { SPELL_CONFIG, MAX_HP, MAX_MANA, MANA_REGEN_PER_TICK, FIREWALL_DAMAGE_PER_TICK, InputFrame, REST_CAST_TICKS, REST_REGEN_FRACTION_PER_SEC, REST_COOLDOWN_TICKS, TICK_RATE } from '@arena/shared';
import { spawnFireWall } from '../src/spells/FireWall.ts';

function twoPlayerState() {
  return makeInitialState([
    { id: 'p1', displayName: 'Alice', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Bob', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
  ]);
}

describe('makeInitialState', () => {
  it('creates state with two players at spawn positions', () => {
    const state = twoPlayerState();
    expect(state.players['p1'].position).toEqual({ x: 200, y: 1000 });
    expect(state.players['p2'].position).toEqual({ x: 1800, y: 1000 });
    expect(state.phase).toBe('dueling');
  });

  it('creates state with full HP, full mana, empty spells', () => {
    const state = twoPlayerState();
    expect(state.players['p1'].hp).toBe(MAX_HP);
    expect(state.players['p1'].mana).toBe(MAX_MANA);
    expect(state.players['p1'].cooldowns).toEqual({});
    expect(state.players['p1'].castingSpell).toBeNull();
    expect(state.projectiles).toHaveLength(0);
    expect(state.fireWalls).toHaveLength(0);
    expect(state.meteors).toHaveLength(0);
  });
});

describe('advanceState — movement', () => {
  it('moves p1 right when move input is {x:1, y:0}', () => {
    const state = twoPlayerState();
    const inputs = {
      p1: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.players['p1'].position.x).toBeGreaterThan(200);
  });
});

describe('advanceState — mana regen', () => {
  it('regens mana by MANA_REGEN_PER_TICK per tick', () => {
    const state = twoPlayerState();
    state.players['p1'].mana = MAX_MANA - 10;
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 400, y: 400 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 400, y: 400 } },
    };
    const next = advanceState(state, inputs);
    expect(next.players['p1'].mana).toBe(MAX_MANA - 10 + MANA_REGEN_PER_TICK);
  });
});

describe('advanceState — fireball cast', () => {
  it('spawns a fireball and deducts mana when p1 casts spell 1', () => {
    const state = twoPlayerState();
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.projectiles.length).toBe(1);
    expect(next.players['p1'].mana).toBe(MAX_MANA - SPELL_CONFIG[1].manaCost);
  });

  it('does not cast when mana is insufficient', () => {
    const state = twoPlayerState();
    state.players['p1'].mana = 0;
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.projectiles.length).toBe(0);
  });
});

describe('advanceState — cooldowns', () => {
  it('sets cooldown after casting fireball and blocks immediate re-cast', () => {
    const state = twoPlayerState();
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.players['p1'].cooldowns[1]).toBeGreaterThan(0);

    // immediate re-cast is blocked by cooldown
    const next2 = advanceState(next, inputs);
    expect(next2.projectiles.length).toBe(next.projectiles.length); // no new fireball added
  });
});

describe('advanceState — win condition', () => {
  it('sets phase to ended and winner when a player reaches 0 hp', () => {
    const state = twoPlayerState();
    state.players['p2'].hp = 1;
    // Place a fireball right on p2
    state.projectiles.push({
      id: 'fb_test',
      ownerId: 'p1',
      type: 'fireball',
      position: { x: 1800, y: 1000 },
      velocity: { x: 400, y: 0 },
    });
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.phase).toBe('ended');
    expect(next.winner).toBe('p1');
  });
});

describe('advanceState — fire wall damage', () => {
  it('stacks damage from two overlapping fire walls', () => {
    const state = twoPlayerState();
    const fw1 = spawnFireWall('p2', { x: 180, y: 1000 }, { x: 220, y: 1000 }, 0);
    const fw2 = spawnFireWall('p2', { x: 180, y: 1000 }, { x: 220, y: 1000 }, 0);
    state.fireWalls.push(fw1, fw2);
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.players['p1'].hp).toBeCloseTo(MAX_HP - FIREWALL_DAMAGE_PER_TICK * 2, 10);
  });
});

describe('advanceState — simultaneous death', () => {
  it('sets winner to null when both players die in the same tick', () => {
    const state = twoPlayerState();
    state.players['p1'].hp = 1;
    state.players['p2'].hp = 1;
    // Two fireballs: p2's fireball hits p1, p1's fireball hits p2
    state.projectiles.push(
      { id: 'fb1', ownerId: 'p2', type: 'fireball', position: { x: 200, y: 1000 }, velocity: { x: 400, y: 0 } },
      { id: 'fb2', ownerId: 'p1', type: 'fireball', position: { x: 1800, y: 1000 }, velocity: { x: -400, y: 0 } },
    );
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.phase).toBe('ended');
    expect(next.winner).toBeNull();
  });
});

describe('advanceState — teleport cast (spell 4)', () => {
  it('sets player position to clamped target and deducts 40 mana', () => {
    const state = twoPlayerState();
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: 1000, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null,       aimTarget: { x: 200,  y: 1000 } },
    };
    const next = advanceState(state, inputs);
    // Target is 800 units away — clamped to TELEPORT_MAX_RANGE (600) even
    // without a skill system, so guests can't teleport across the map.
    expect(next.players['p1'].position).toEqual({ x: 800, y: 1000 });
    expect(next.players['p1'].mana).toBe(MAX_MANA - SPELL_CONFIG[4].manaCost);
  });

  it('resolves pillar collisions at the teleport destination', () => {
    const state = twoPlayerState();
    state.players['p1'].position = { x: 600, y: 1000 };
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: 1000, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null,       aimTarget: { x: 200,  y: 1000 } },
    };
    const next = advanceState(state, inputs);
    // Pillar at (1000,1000) halfSize 28 + player half-size 16 → pushed to 956
    expect(next.players['p1'].position).toEqual({ x: 956, y: 1000 });
  });

  it('clamps teleport target to arena bounds', () => {
    const state = twoPlayerState();

    // Lower-x and upper-y
    const inputs1 = {
      p1: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: -500, y: 9999 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null,       aimTarget: { x: 200,  y: 1000 } },
    };
    const next1 = advanceState(state, inputs1);
    expect(next1.players['p1'].position.x).toBeGreaterThanOrEqual(16);
    expect(next1.players['p1'].position.y).toBeLessThanOrEqual(2000 - 16);

    // Upper-x and lower-y
    const state2 = twoPlayerState();
    const inputs2 = {
      p1: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: 9999, y: -500 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null,       aimTarget: { x: 200,  y: 1000 } },
    };
    const next2 = advanceState(state2, inputs2);
    expect(next2.players['p1'].position.x).toBeLessThanOrEqual(2000 - 16);
    expect(next2.players['p1'].position.y).toBeGreaterThanOrEqual(16);
  });

  it('does not teleport when mana is insufficient', () => {
    const state = twoPlayerState();
    state.players['p1'].mana = 10; // less than 40
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: 1000, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null,       aimTarget: { x: 200,  y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.players['p1'].position).toEqual({ x: 200, y: 1000 }); // unchanged spawn
    expect(next.players['p1'].mana).toBe(10 + MANA_REGEN_PER_TICK);  // regen only, no deduction
  });

  it('sets a 2-second cooldown after a successful teleport', () => {
    const state = twoPlayerState();
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: 1000, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null,       aimTarget: { x: 200,  y: 1000 } },
    };
    const next = advanceState(state, inputs);
    expect(next.players['p1'].cooldowns[4]).toBe(120);
  });
});

import type { NodeId } from '@arena/shared';

describe('advanceState — skill modifiers', () => {
  it('fireball with Volatile Ember has larger radius (hits from further away)', () => {
    const state = twoPlayerState();
    const skills: Record<string, Map<NodeId, number>> = {
      p1: new Map([['fire.fireball', 1], ['fire.volatile_ember', 1]]),
      p2: new Map([['fire.fireball', 1]]),
    };
    // Normal radius is 10, Volatile Ember makes it 13 — place fireball 11 units from p2
    state.projectiles.push({
      id: 'fb_test',
      ownerId: 'p1',
      type: 'fireball',
      position: { x: 1811, y: 1000 },
      velocity: { x: 400, y: 0 },
      radius: 13,
    });
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200,  y: 1000 } },
    };
    const next = advanceState(state, inputs, skills);
    expect(next.players['p2'].hp).toBeLessThan(MAX_HP);
  });

  it('casting fireball when fire.fireball not in skills does nothing', () => {
    const state = twoPlayerState();
    const skills: Record<string, Map<NodeId, number>> = {
      p1: new Map([['utility.teleport', 1]]),
      p2: new Map([['fire.fireball', 1]]),
    };
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs, skills);
    expect(next.projectiles).toHaveLength(0);
  });

  it('Ethereal Form: player is invuln for 30 ticks after teleporting', () => {
    const state = twoPlayerState();
    const skills: Record<string, Map<NodeId, number>> = {
      p1: new Map([['utility.teleport', 1], ['utility.ethereal_form', 1]]),
      p2: new Map([['fire.fireball', 1]]),
    };
    state.projectiles.push({
      id: 'fb_test',
      ownerId: 'p2',
      type: 'fireball',
      position: { x: 1001, y: 1000 },
      velocity: { x: 400, y: 0 },
    });
    const inputs = {
      p1: { move: { x: 0, y: 0 }, castSpell: 4 as const, aimTarget: { x: 1000, y: 400 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs, skills);
    expect(next.players['p1'].hp).toBe(MAX_HP);
  });

  it('applies rank-based modifiers from Map skillSets', () => {
    const state = makeInitialState([
      { id: 'p1', displayName: 'P1', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'P2', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
    ]);
    const skillSets: Record<string, Map<string, number>> = {
      p1: new Map([['fire.fireball', 1], ['fire.seeking_flame', 3]]),
    };
    const inputs: Record<string, InputFrame> = {
      p1: { move: { x: 0, y: 0 }, castSpell: 1, aimTarget: { x: 1800, y: 1000 } },
      p2: { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 200, y: 1000 } },
    };
    const next = advanceState(state, inputs, skillSets);
    expect(next.projectiles.length).toBe(1);
    expect(next.projectiles[0].homing).toBeGreaterThan(0);
  });
});

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 400, y: 400 } });
const bothIdle = () => ({ p1: idle(), p2: idle() });

describe('advanceState — rest', () => {
  it('starts the wind-up and stamps the cooldown on rest input', () => {
    const state = twoPlayerState();
    const next = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBe(REST_CAST_TICKS); // started at tick 0
    expect(next.players['p1'].restCooldownUntil).toBe(REST_COOLDOWN_TICKS);
    expect(next.players['p1'].resting).toBeUndefined();
  });

  it('flips to resting after the wind-up and regens hp and mana per tick', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state.players['p1'].mana = 100;
    state = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    for (let i = 0; i < REST_CAST_TICKS - 1; i++) state = advanceState(state, bothIdle());
    // last processed tick was REST_CAST_TICKS - 1: wind-up not done, no hp regen yet
    expect(state.players['p1'].resting).toBeUndefined();
    expect(state.players['p1'].hp).toBe(100);
    const manaBefore = state.players['p1'].mana;
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].resting).toBe(true);
    expect(state.players['p1'].hp).toBeCloseTo(100 + MAX_HP * REST_REGEN_FRACTION_PER_SEC / TICK_RATE, 5);
    // rest mana regen stacks on top of passive regen
    expect(state.players['p1'].mana).toBeCloseTo(
      manaBefore + MAX_MANA * REST_REGEN_FRACTION_PER_SEC / TICK_RATE + MANA_REGEN_PER_TICK, 5);
  });

  it('clamps at max and clears resting once both pools are full', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = MAX_HP - 1; // mana already full from makeInitialState
    state.players['p1'].resting = true;  // skip the wind-up; resolution is covered above
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].hp).toBe(MAX_HP);
    expect(state.players['p1'].mana).toBe(MAX_MANA);
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('does not start while the cooldown runs', () => {
    const state = twoPlayerState();
    state.players['p1'].restCooldownUntil = 500;
    const next = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('does not start while moving', () => {
    const state = twoPlayerState();
    const next = advanceState(state, { p1: { ...idle(), move: { x: 1, y: 0 }, rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('does not start while dead', () => {
    const state = twoPlayerState();
    state.players['p1'].hp = 0;
    const next = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('a same-frame spell cast wins over rest', () => {
    const state = twoPlayerState();
    const next = advanceState(state, {
      p1: { ...idle(), castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 }, rest: true },
      p2: idle(),
    });
    expect(next.projectiles.length).toBe(1);
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('movement cancels the wind-up', () => {
    let state = twoPlayerState();
    state = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(state.players['p1'].restCastEndTick).toBeDefined();
    state = advanceState(state, { p1: { ...idle(), move: { x: 1, y: 0 } }, p2: idle() });
    expect(state.players['p1'].restCastEndTick).toBeUndefined();
    expect(state.players['p1'].resting).toBeUndefined();
    // interrupt does not refund the cooldown
    expect(state.players['p1'].restCooldownUntil).toBe(REST_COOLDOWN_TICKS);
  });

  it('movement cancels active resting', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state.players['p1'].resting = true;
    state = advanceState(state, { p1: { ...idle(), move: { x: 1, y: 0 } }, p2: idle() });
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('casting a spell cancels resting', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state.players['p1'].resting = true;
    state = advanceState(state, {
      p1: { ...idle(), castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 } },
      p2: idle(),
    });
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('zone damage cancels resting even on a net-healing tick', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state.players['p1'].resting = true;
    // Fire wall crossing p1's spawn — its per-tick damage (0.67) is smaller
    // than rest regen (1.25); the break keys on damage, not net hp change.
    state.fireWalls.push(spawnFireWall('p2', { x: 150, y: 1000 }, { x: 250, y: 1000 }, 0));
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('DoT damage cancels the wind-up', () => {
    let state = twoPlayerState();
    state = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    state.players['p1'].burnUntil = 300;
    state.players['p1'].burnDps = 30;
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('damage landing on the start tick breaks the fresh wind-up', () => {
    const state = twoPlayerState();
    state.players['p1'].hp = 400;
    state.projectiles.push({
      id: 'fb_startbreak',
      ownerId: 'p2',
      type: 'fireball',
      position: { x: 200, y: 1000 },
      velocity: { x: 400, y: 0 },
    });
    const next = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(next.players['p1'].hp).toBeLessThan(400);
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });
});
