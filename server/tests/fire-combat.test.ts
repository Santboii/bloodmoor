import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { PILLARS, FIREBALL_MAX_LIFETIME_TICKS } from '@arena/shared';
import type { NodeId, InputFrame } from '@arena/shared';

const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };

/** Matches the PlayerInit shape used by stateadvancer.test.ts. */
function twoMages() {
  return makeInitialState([
    { id: 'a', displayName: 'Alice', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'b', displayName: 'Bob', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
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
