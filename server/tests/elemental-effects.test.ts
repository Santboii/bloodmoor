import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame, GameState } from '@arena/shared';
import { MAX_HP, PLAYER_SPEED, DELTA, TICK_RATE } from '@arena/shared';

const idle = (aim = { x: 0, y: 0 }): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: aim, channel: null });

function rangerSkillsWith(extra: [string, number][]): Map<NodeId, number> {
  return new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ...extra.map(([id, rank]) => [id as NodeId, rank] as [NodeId, number]),
  ]);
}

/** Two players, p1 ranger at (200,1000), p2 mage at (1600,1000). */
function baseState(): GameState {
  return makeInitialState([
    { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
  ]);
}

/** Injects a p1-owned arrow one tick away from p2 and advances until it hits. */
function stateWithArrowAboutToHit(state: GameState): GameState {
  state.projectiles.push({
    id: 'test_arrow',
    ownerId: 'p1',
    type: 'arrow',
    position: { x: 1570, y: 1000 },
    velocity: { x: 560, y: 0 },
    damageMin: 60,
    damageMax: 90,
  });
  return state;
}

describe('elemental arrow effects', () => {
  it('burn arrows apply a damage-over-time effect', () => {
    const skills = { p1: rangerSkillsWith([['archer.burn', 2]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());

    // Arrow travels ~9.3/tick from 30 units out; run a few ticks to connect.
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    const afterHit = state.players['p2'];
    expect(afterHit.hp).toBeLessThan(MAX_HP);
    expect(afterHit.burnUntil).toBeGreaterThan(state.tick);
    expect(afterHit.burnDps).toBeGreaterThan(10); // 10 base + rank bonus

    const hpAfterHit = afterHit.hp;
    state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].hp).toBeCloseTo(hpAfterHit - afterHit.burnDps! / TICK_RATE, 5);
  });

  it('burn expires after its duration', () => {
    const skills = { p1: rangerSkillsWith([['archer.burn', 1]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeDefined();

    for (let i = 0; i < 3 * TICK_RATE + 2; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeUndefined();
    expect(state.players['p2'].burnDps).toBeUndefined();
  });

  it('freeze arrows slow movement', () => {
    const skills = { p1: rangerSkillsWith([['archer.freeze', 1]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    const slowed = state.players['p2'];
    expect(slowed.slowUntil).toBeGreaterThan(state.tick);
    expect(slowed.slowFactor).toBeLessThan(1);

    const before = state.players['p2'].position.x;
    state = advanceState(state, { p1: idle(), p2: { move: { x: -1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, channel: null } }, skills);
    const movedDist = before - state.players['p2'].position.x;
    expect(movedDist).toBeCloseTo(PLAYER_SPEED * DELTA * slowed.slowFactor!, 5);
    expect(movedDist).toBeLessThan(PLAYER_SPEED * DELTA);
  });

  it('poison arrows drain hp and reduce mana regen', () => {
    const skills = { p1: rangerSkillsWith([['archer.poison', 1]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    state.players['p2'].mana = 100; // below cap so regen is observable
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    const poisoned = state.players['p2'];
    expect(poisoned.poisonUntil).toBeGreaterThan(state.tick);
    expect(poisoned.poisonDps).toBeGreaterThan(0);
    expect(poisoned.poisonManaReduction).toBeGreaterThan(0);

    const hpBefore = poisoned.hp;
    const manaBefore = poisoned.mana;
    state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const p2 = state.players['p2'];
    expect(p2.hp).toBeCloseTo(hpBefore - poisoned.poisonDps! / TICK_RATE, 5);
    const fullRegen = 18 / TICK_RATE;
    expect(p2.mana - manaBefore).toBeCloseTo(fullRegen * (1 - poisoned.poisonManaReduction!), 5);
  });
});

describe('rain zone element application', () => {
  it('a freeze ranger\'s rain zone slows players standing in it', () => {
    const skills = {
      p1: rangerSkillsWith([['archer.rain_of_arrows', 1], ['archer.freeze', 2]]),
      p2: new Map<NodeId, number>(),
    };
    let state = baseState();
    // Rain centered on p2; zone spawns after RAIN_DELAY_TICKS, then ticks damage.
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1600, y: 1000 }, channel: null };
    state = advanceState(state, { p1: cast, p2: idle() }, skills);
    for (let i = 0; i < 50; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].hp).toBeLessThan(MAX_HP);          // zone damaged them
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect(state.players['p2'].slowFactor).toBeLessThan(1);
  });

  it('a burn ranger\'s rain zone applies burn', () => {
    const skills = {
      p1: rangerSkillsWith([['archer.rain_of_arrows', 1], ['archer.burn', 1]]),
      p2: new Map<NodeId, number>(),
    };
    let state = baseState();
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1600, y: 1000 }, channel: null };
    state = advanceState(state, { p1: cast, p2: idle() }, skills);
    for (let i = 0; i < 50; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);
  });
});

describe('evade utility skills', () => {
  const evadeCast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 8, aimTarget: { x: 500, y: 1000 }, channel: null };

  it('Combat Roll fires an arrow at the nearest enemy during evade', () => {
    const skills = {
      p1: rangerSkillsWith([['archer_utility.evade', 1], ['archer_utility.combat_roll', 1]]),
      p2: new Map<NodeId, number>(),
    };
    const next = advanceState(baseState(), { p1: evadeCast, p2: idle() }, skills);
    const arrows = next.projectiles.filter(p => p.type === 'arrow');
    expect(arrows).toHaveLength(1);
    expect(arrows[0].ownerId).toBe('p1');
    // Aimed at p2 (to the right of p1)
    expect(arrows[0].velocity.x).toBeGreaterThan(0);
  });

  it('Shadowstep grants invisibility after evading and blocks homing targeting', () => {
    const skills = {
      p1: rangerSkillsWith([['archer_utility.evade', 1], ['archer_utility.shadowstep', 1]]),
      p2: new Map<NodeId, number>(),
    };
    const next = advanceState(baseState(), { p1: evadeCast, p2: idle() }, skills);
    expect(next.players['p1'].invisibleUntil).toBeGreaterThan(next.tick);
  });

  it('without the skills, evade fires no arrow and grants no invisibility', () => {
    const skills = { p1: rangerSkillsWith([['archer_utility.evade', 1]]), p2: new Map<NodeId, number>() };
    const next = advanceState(baseState(), { p1: evadeCast, p2: idle() }, skills);
    expect(next.projectiles).toHaveLength(0);
    expect(next.players['p1'].invisibleUntil).toBeUndefined();
  });
});

describe('fireball blast line of sight and split grace', () => {
  it('blast damage is blocked by pillars', () => {
    // Pillar at (1000, 250). Fireball detonates on its left face; p2 hides
    // just past the right face, within blast range but without line of sight.
    const state = makeInitialState([
      { id: 'p1', displayName: 'A', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'B', charClass: 'mage', spawnPos: { x: 1050, y: 250 } },
    ]);
    state.projectiles.push({
      id: 'fb_test', ownerId: 'p1', type: 'fireball',
      position: { x: 965, y: 250 }, velocity: { x: 400, y: 0 },
    });
    const next = advanceState(state, { p1: idle(), p2: idle() });
    expect(next.projectiles).toHaveLength(0); // detonated on the pillar
    expect(next.players['p2'].hp).toBe(MAX_HP); // no damage through the wall
  });

  it('blast damage still applies with clear line of sight', () => {
    const state = makeInitialState([
      { id: 'p1', displayName: 'A', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'B', charClass: 'mage', spawnPos: { x: 950, y: 290 } },
    ]);
    state.projectiles.push({
      id: 'fb_test', ownerId: 'p1', type: 'fireball',
      position: { x: 965, y: 250 }, velocity: { x: 400, y: 0 },
    });
    const next = advanceState(state, { p1: idle(), p2: idle() });
    expect(next.players['p2'].hp).toBeLessThan(MAX_HP);
  });

  it('split children get a spawn grace instead of instantly re-detonating', () => {
    const state = makeInitialState([
      { id: 'p1', displayName: 'A', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'B', charClass: 'mage', spawnPos: { x: 950, y: 290 } },
    ]);
    state.projectiles.push({
      id: 'fb_test', ownerId: 'p1', type: 'fireball',
      position: { x: 965, y: 250 }, velocity: { x: 400, y: 0 }, split: 1,
    });
    let next = advanceState(state, { p1: idle(), p2: idle() });
    // Parent detonated against the pillar; children survive under grace
    // rather than detonating on the same obstacle.
    expect(next.projectiles.length).toBe(3);
    const hpAfterParentBlast = next.players['p2'].hp;
    expect(hpAfterParentBlast).toBeLessThan(MAX_HP);

    // No stacked blasts hit p2 while the children fly out / die in the pillar.
    for (let i = 0; i < 12; i++) next = advanceState(next, { p1: idle(), p2: idle() });
    expect(next.players['p2'].hp).toBe(hpAfterParentBlast);
  });
});

describe('Ignite keystone', () => {
  it('an arrow hitting a burning target detonates for 40 and re-applies burn', () => {
    const skills = { p1: rangerSkillsWith([['archer.burn', 4]]), p2: new Map<NodeId, number>() };  // keystone rank
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);   // burning now
    const hpAfterFirst = state.players['p2'].hp;

    // Second deterministic arrow: fixed 80 damage so the ignite burst is provable.
    state.projectiles.push({
      id: 'test_arrow_2', ownerId: 'p1', type: 'arrow',
      position: { x: 1570, y: 1000 }, velocity: { x: 560, y: 0 },
      damageMin: 80, damageMax: 80,
    });
    const tickBefore = state.tick;
    let hpBefore = state.players['p2'].hp;
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const burnDps = state.players['p2'].burnDps!;
    const ticksElapsed = state.tick - tickBefore;
    const lost = hpBefore - state.players['p2'].hp;
    // 80 arrow + 40 ignite + burn DoT over the elapsed ticks (±1 tick of DoT slack)
    expect(lost).toBeGreaterThanOrEqual(120);
    expect(lost).toBeLessThanOrEqual(120 + burnDps * (ticksElapsed / TICK_RATE) + burnDps / TICK_RATE);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);   // re-applied by the same hit
  });

  it('caps the burst at one detonation per owner per target per tick, even with two arrows landing together', () => {
    const skills = { p1: rangerSkillsWith([['archer.burn', 4]]), p2: new Map<NodeId, number>() };  // keystone rank
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);   // burning now

    // Two deterministic same-owner arrows landing on the same tick — a
    // stand-in for Multi-shot / Barrage / Echo Volley firing several arrows
    // in one salvo. Both fixed at 80 damage so the burst cap is provable.
    state.projectiles.push(
      {
        id: 'test_arrow_2', ownerId: 'p1', type: 'arrow',
        position: { x: 1570, y: 1000 }, velocity: { x: 560, y: 0 },
        damageMin: 80, damageMax: 80,
      },
      {
        id: 'test_arrow_3', ownerId: 'p1', type: 'arrow',
        position: { x: 1570, y: 1000 }, velocity: { x: 560, y: 0 },
        damageMin: 80, damageMax: 80,
      },
    );
    const tickBefore = state.tick;
    let hpBefore = state.players['p2'].hp;
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const burnDps = state.players['p2'].burnDps!;
    const ticksElapsed = state.tick - tickBefore;
    const lost = hpBefore - state.players['p2'].hp;
    // 2 * 80 arrow damage + exactly ONE 40 ignite burst + burn DoT over the
    // elapsed ticks (±1 tick of DoT slack). A double-firing burst would push
    // this to 240+, well past the upper bound.
    expect(lost).toBeGreaterThanOrEqual(200);
    expect(lost).toBeLessThanOrEqual(200 + burnDps * (ticksElapsed / TICK_RATE) + burnDps / TICK_RATE);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);   // re-applied by the same hit
  });
});

describe('Deep Freeze keystone', () => {
  const dfSkills = { p1: rangerSkillsWith([['archer.freeze', 4]]), p2: new Map<NodeId, number>() };

  it('first freeze roots the target; the root expires; the 6s ICD blocks re-roots', () => {
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, dfSkills);
    const p2 = state.players['p2'];
    expect(p2.rootUntil).toBeGreaterThan(state.tick);
    expect(p2.freezeRootReadyAt).toBeGreaterThan(state.tick + 5 * TICK_RATE);

    // Rooted: movement input does nothing.
    const x0 = state.players['p2'].position.x;
    state = advanceState(state, { p1: idle(), p2: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, channel: null } }, dfSkills);
    expect(state.players['p2'].position.x).toBe(x0);

    // After the root expires (0.4s) they can move again, though still slowed.
    for (let i = 0; i < 30; i++) state = advanceState(state, { p1: idle(), p2: idle() }, dfSkills);
    const x1 = state.players['p2'].position.x;
    state = advanceState(state, { p1: idle(), p2: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, channel: null } }, dfSkills);
    expect(state.players['p2'].position.x).toBeGreaterThan(x1);

    // A second freeze inside the ICD refreshes the slow but not the root.
    state.projectiles.push({
      id: 'test_arrow_2', ownerId: 'p1', type: 'arrow',
      position: { x: state.players['p2'].position.x - 30, y: 1000 }, velocity: { x: 560, y: 0 },
      damageMin: 60, damageMax: 90,
    });
    for (let i = 0; i < 6; i++) state = advanceState(state, { p1: idle(), p2: idle() }, dfSkills);
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect((state.players['p2'].rootUntil ?? 0) <= state.tick).toBe(true);
  });
});

describe('Withering Venom keystone', () => {
  it('poison past cap drains flat mana on top of the regen cut', () => {
    const skills = { p1: rangerSkillsWith([['archer.poison', 4]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const p2 = state.players['p2'];
    expect(p2.poisonManaDrain).toBe(10);

    // One poisoned tick: regen is cut AND 10/s drains.
    state.players['p2'].mana = 200;
    const reduction = p2.poisonManaReduction!;
    state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const expected = 200 + (18 / TICK_RATE) * (1 - reduction) - 10 / TICK_RATE;
    expect(state.players['p2'].mana).toBeCloseTo(expected, 5);
  });

  it('the drain stops when poison expires', () => {
    const skills = { p1: rangerSkillsWith([['archer.poison', 4]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    for (let i = 0; i < 5 * TICK_RATE + 2; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].poisonManaDrain).toBeUndefined();
  });
});
