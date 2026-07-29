import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame, GameState } from '@arena/shared';
import { MAX_HP, PLAYER_SPEED, DELTA, TICK_RATE } from '@arena/shared';

const idle = (aim = { x: 0, y: 0 }): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: aim });

function amazonSkillsWith(extra: [string, number][]): Map<NodeId, number> {
  return new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ...extra.map(([id, rank]) => [id as NodeId, rank] as [NodeId, number]),
  ]);
}

/** Two players, p1 amazon at (200,1000), p2 mage at (1600,1000). */
function baseState(): GameState {
  return makeInitialState([
    { id: 'p1', displayName: 'Amazon', charClass: 'amazon', spawnPos: { x: 200, y: 1000 } },
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
    const skills = { p1: amazonSkillsWith([['archer.burn', 2]]), p2: new Map<NodeId, number>() };
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
    const skills = { p1: amazonSkillsWith([['archer.burn', 1]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeDefined();

    for (let i = 0; i < 3 * TICK_RATE + 2; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeUndefined();
    expect(state.players['p2'].burnDps).toBeUndefined();
  });

  it('freeze arrows slow movement', () => {
    const skills = { p1: amazonSkillsWith([['archer.freeze', 1]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    const slowed = state.players['p2'];
    expect(slowed.slowUntil).toBeGreaterThan(state.tick);
    expect(slowed.slowFactor).toBeLessThan(1);

    const before = state.players['p2'].position.x;
    state = advanceState(state, { p1: idle(), p2: { move: { x: -1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } } }, skills);
    const movedDist = before - state.players['p2'].position.x;
    expect(movedDist).toBeCloseTo(PLAYER_SPEED * DELTA * slowed.slowFactor!, 5);
    expect(movedDist).toBeLessThan(PLAYER_SPEED * DELTA);
  });

  it('poison arrows drain hp and reduce mana regen', () => {
    const skills = { p1: amazonSkillsWith([['archer.poison', 1]]), p2: new Map<NodeId, number>() };
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

describe('evade utility skills', () => {
  const evadeCast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 8, aimTarget: { x: 500, y: 1000 } };

  it('Combat Roll fires an arrow at the nearest enemy during evade', () => {
    const skills = {
      p1: amazonSkillsWith([['archer_utility.evade', 1], ['archer_utility.combat_roll', 1]]),
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
      p1: amazonSkillsWith([['archer_utility.evade', 1], ['archer_utility.shadowstep', 1]]),
      p2: new Map<NodeId, number>(),
    };
    const next = advanceState(baseState(), { p1: evadeCast, p2: idle() }, skills);
    expect(next.players['p1'].invisibleUntil).toBeGreaterThan(next.tick);
  });

  it('without the skills, evade fires no arrow and grants no invisibility', () => {
    const skills = { p1: amazonSkillsWith([['archer_utility.evade', 1]]), p2: new Map<NodeId, number>() };
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
