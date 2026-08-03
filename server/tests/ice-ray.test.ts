import { describe, it, expect } from 'vitest';
import {
  iceRayRamp, pointToSegmentDist, TICK_RATE,
  ICE_RAY_RAMP_TICKS, ICE_RAY_DAMAGE_MIN_PER_SEC, ICE_RAY_DAMAGE_MAX_PER_SEC,
  ICE_RAY_MANA_MIN_PER_SEC, ICE_RAY_MANA_MAX_PER_SEC,
  ICE_RAY_HALF_WIDTH_MIN, ICE_RAY_HALF_WIDTH_MAX,
} from '@arena/shared';

describe('iceRayRamp', () => {
  it('starts at the minimum on the first tick', () => {
    const r = iceRayRamp(0);
    expect(r.damagePerTick).toBeCloseTo(ICE_RAY_DAMAGE_MIN_PER_SEC / TICK_RATE);
    expect(r.manaPerTick).toBeCloseTo(ICE_RAY_MANA_MIN_PER_SEC / TICK_RATE);
    expect(r.halfWidth).toBeCloseTo(ICE_RAY_HALF_WIDTH_MIN);
  });

  it('reaches the maximum exactly at the ramp length', () => {
    const r = iceRayRamp(ICE_RAY_RAMP_TICKS);
    expect(r.damagePerTick).toBeCloseTo(ICE_RAY_DAMAGE_MAX_PER_SEC / TICK_RATE);
    expect(r.manaPerTick).toBeCloseTo(ICE_RAY_MANA_MAX_PER_SEC / TICK_RATE);
    expect(r.halfWidth).toBeCloseTo(ICE_RAY_HALF_WIDTH_MAX);
  });

  it('sits halfway at half the ramp', () => {
    const r = iceRayRamp(ICE_RAY_RAMP_TICKS / 2);
    const mid = (ICE_RAY_DAMAGE_MIN_PER_SEC + ICE_RAY_DAMAGE_MAX_PER_SEC) / 2 / TICK_RATE;
    expect(r.damagePerTick).toBeCloseTo(mid);
  });

  it('clamps past the ramp instead of climbing forever', () => {
    const atMax = iceRayRamp(ICE_RAY_RAMP_TICKS);
    const wayPast = iceRayRamp(ICE_RAY_RAMP_TICKS * 50);
    expect(wayPast.damagePerTick).toBeCloseTo(atMax.damagePerTick);
    expect(wayPast.halfWidth).toBeCloseTo(atMax.halfWidth);
  });

  it('clamps negative ticks to the minimum', () => {
    expect(iceRayRamp(-10).halfWidth).toBeCloseTo(ICE_RAY_HALF_WIDTH_MIN);
  });

  it('ramps damage, mana and width monotonically', () => {
    let prev = iceRayRamp(0);
    for (let t = 1; t <= ICE_RAY_RAMP_TICKS; t += 10) {
      const cur = iceRayRamp(t);
      expect(cur.damagePerTick).toBeGreaterThanOrEqual(prev.damagePerTick);
      expect(cur.manaPerTick).toBeGreaterThanOrEqual(prev.manaPerTick);
      expect(cur.halfWidth).toBeGreaterThanOrEqual(prev.halfWidth);
      prev = cur;
    }
  });
});

describe('pointToSegmentDist (lifted to shared)', () => {
  const seg = { x1: 0, y1: 0, x2: 100, y2: 0 };

  it('is zero on the segment', () => {
    expect(pointToSegmentDist({ x: 50, y: 0 }, seg)).toBeCloseTo(0);
  });

  it('measures perpendicular distance beside the segment', () => {
    expect(pointToSegmentDist({ x: 50, y: 30 }, seg)).toBeCloseTo(30);
  });

  it('measures to the nearest endpoint past the end', () => {
    expect(pointToSegmentDist({ x: 130, y: 0 }, seg)).toBeCloseTo(30);
  });

  it('handles a zero-length segment', () => {
    expect(pointToSegmentDist({ x: 3, y: 4 }, { x1: 0, y1: 0, x2: 0, y2: 0 })).toBeCloseTo(5);
  });
});
