import { describe, it, expect } from 'vitest';
import { buildGladiatorModifiers } from '../src/skills/GladiatorModifiers.ts';
import { SPEAR_STUN_TICKS, REFLECT_WINDOW_TICKS, LEAP_RANGE, BLOCK_DAMAGE_REDUCTION, BLOCK_MOVE_MULT, effectAtRank } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const skills = (entries: [string, number][]) => new Map(entries as [NodeId, number][]);

describe('buildGladiatorModifiers', () => {
  it('returns base values with only the starter node', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1]]));
    expect(m.jab).toEqual({ damageMin: 75, damageMax: 100, damageMultiplier: 1, executioner: false });
    expect(m.spear.stunTicks).toBe(SPEAR_STUN_TICKS);
    expect(m.reflect.windowTicks).toBe(REFLECT_WINDOW_TICKS);
    expect(m.leap.range).toBe(LEAP_RANGE);
    expect(m.leap.slowFactor).toBeCloseTo(0.7);
    expect(m.block).toEqual({ damageReduction: BLOCK_DAMAGE_REDUCTION, moveMult: BLOCK_MOVE_MULT, riposte: false });
  });

  it('scales jab damage with Heavy Thrust and flags the keystone past softCap', () => {
    const at5 = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.heavy_thrust', 5]]));
    expect(at5.jab.damageMultiplier).toBeCloseTo(1 + effectAtRank(0.08, 5));
    expect(at5.jab.executioner).toBe(false);
    const at6 = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.heavy_thrust', 6]]));
    expect(at6.jab.executioner).toBe(true);
  });

  it('caps block DR at 0.75 and flags Riposte past softCap', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1], ['bulwark.bracing', 6]]));
    expect(m.block.damageReduction).toBeLessThanOrEqual(0.75);
    expect(m.block.damageReduction).toBeGreaterThan(BLOCK_DAMAGE_REDUCTION);
    expect(m.block.riposte).toBe(true);
  });

  it('extends stun, reflect window, and landing slow with ranks', () => {
    const m = buildGladiatorModifiers(skills([
      ['arms.jab', 1], ['arms.stunning_blow', 3], ['bulwark.perfect_guard', 3], ['arms.crushing_landing', 3],
    ]));
    expect(m.spear.stunTicks).toBe(Math.round(SPEAR_STUN_TICKS * (1 + effectAtRank(0.15, 3))));
    expect(m.reflect.windowTicks).toBe(Math.round(REFLECT_WINDOW_TICKS * (1 + effectAtRank(0.15, 3))));
    expect(m.leap.slowFactor).toBeLessThan(0.7);
    expect(m.leap.slowFactor).toBeGreaterThanOrEqual(0.4);
  });
});
