import { describe, it, expect } from 'vitest';
import { SKILL_NODES, GATES, canUnlock, effectAtRank, LEAP_RANGE, BLOCK_RERAISE_TICKS,
         LEAP_DURATION_TICKS, SPELL_CONFIG } from '@arena/shared';
import type { NodeId } from '@arena/shared';
import { buildGladiatorModifiers } from '../src/skills/GladiatorModifiers.ts';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame } from '@arena/shared';

const skills = (e: [string, number][]) => new Map(e as [NodeId, number][]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

describe('Footwork tree', () => {
  it('re-homes leap and crushing landing; arms 9 / bulwark 9 / gladiator_utility 4', () => {
    const byId = new Map(SKILL_NODES.map(n => [n.id, n]));
    expect(byId.get('arms.leap' as NodeId)).toMatchObject({ tree: 'gladiator_utility', tier: 1, cost: 1 });
    expect(byId.get('arms.crushing_landing' as NodeId)).toMatchObject({ tree: 'gladiator_utility', tier: 2, cost: 2 });
    expect(SKILL_NODES.filter(n => n.tree === 'arms')).toHaveLength(9);
    expect(SKILL_NODES.filter(n => n.tree === 'bulwark')).toHaveLength(9);
    expect(SKILL_NODES.filter(n => n.tree === 'gladiator_utility')).toHaveLength(4);
  });

  it('gates: leap is ungated; flurry no longer needs leap; momentum is Acrobatics-shaped', () => {
    expect(canUnlock('arms.leap' as NodeId, new Map())).toBe(true);
    const flurryPath = skills([['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 1]]);
    expect(canUnlock('arms.spear_flurry' as NodeId, flurryPath)).toBe(true);
    expect(canUnlock('gladiator_utility.momentum' as NodeId, skills([['arms.leap', 1]]))).toBe(false);
    expect(canUnlock('gladiator_utility.momentum' as NodeId, skills([['arms.leap', 1], ['gladiator_utility.soaring_reach', 1]]))).toBe(true);
  });

  it('modifiers: soaring reach range, momentum cooldown, skirmisher keystone', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.leap', 1],
      ['gladiator_utility.soaring_reach', 3], ['gladiator_utility.momentum', 4]]));
    expect(m.leap.range).toBeCloseTo(LEAP_RANGE * (1 + effectAtRank(0.08, 3)));
    expect(m.leap.cooldownMultiplier).toBeCloseTo(1 - effectAtRank(0.10, 4));
    expect(m.leap.skirmisher).toBe(true);
    const base = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.leap', 1]]));
    expect(base.leap.cooldownMultiplier).toBe(1);
    expect(base.leap.skirmisher).toBe(false);
  });

  it('momentum shortens the stamped leap cooldown', () => {
    const sk = { A: skills([['arms.jab', 1], ['arms.leap', 1], ['gladiator_utility.soaring_reach', 1], ['gladiator_utility.momentum', 3]]) };
    let s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } }]);
    s = advanceState(s, { A: frame({ castSpell: 16, aimTarget: { x: 900, y: 600 } }) }, sk);
    expect(s.players.A.cooldowns[16]!).toBeLessThan(SPELL_CONFIG[16].cooldownTicks);
  });

  it('skirmisher: landing a leap clears the block re-raise gate', () => {
    const sk = { A: skills([['arms.jab', 1], ['arms.leap', 1], ['gladiator_utility.soaring_reach', 1], ['gladiator_utility.momentum', 4]]) };
    let s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } }]);
    s.players.A.blockCooldownUntil = s.tick + 300;   // mid re-raise
    s = advanceState(s, { A: frame({ castSpell: 16, aimTarget: { x: 900, y: 600 } }) }, sk);
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: frame() }, sk);
    expect(s.players.A.blockCooldownUntil).toBeUndefined();
    // control: without the keystone the gate persists
    const sk2 = { A: skills([['arms.jab', 1], ['arms.leap', 1]]) };
    let s2 = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } }]);
    s2.players.A.blockCooldownUntil = s2.tick + 300;
    s2 = advanceState(s2, { A: frame({ castSpell: 16, aimTarget: { x: 900, y: 600 } }) }, sk2);
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s2 = advanceState(s2, { A: frame() }, sk2);
    expect((s2.players.A.blockCooldownUntil ?? 0)).toBeGreaterThan(s2.tick);
  });

  it('regression: crushing landing pre-cap behavior unchanged', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.leap', 1], ['arms.crushing_landing', 3]]));
    expect(m.leap.slowFactor).toBeCloseTo(Math.max(0.4, 1 - Math.min(0.6, 0.30 * (1 + effectAtRank(0.10, 3)))));
    expect(m.leap.seismicSlam).toBe(false);
  });
});
