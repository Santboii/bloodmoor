import { describe, it, expect } from 'vitest';
import {
  iceRayRamp, pointToSegmentDist, TICK_RATE,
  ICE_RAY_RAMP_TICKS, ICE_RAY_DAMAGE_MIN_PER_SEC, ICE_RAY_DAMAGE_MAX_PER_SEC,
  ICE_RAY_MANA_MIN_PER_SEC, ICE_RAY_MANA_MAX_PER_SEC,
  ICE_RAY_HALF_WIDTH_START, ICE_RAY_HALF_WIDTH_FULL,
} from '@arena/shared';

describe('iceRayRamp', () => {
  it('starts wide on the first tick', () => {
    const r = iceRayRamp(0);
    expect(r.damagePerTick).toBeCloseTo(ICE_RAY_DAMAGE_MIN_PER_SEC / TICK_RATE);
    expect(r.manaPerTick).toBeCloseTo(ICE_RAY_MANA_MIN_PER_SEC / TICK_RATE);
    expect(r.halfWidth).toBeCloseTo(ICE_RAY_HALF_WIDTH_START);
  });

  it('tightens to the full-power width exactly at the ramp length', () => {
    const r = iceRayRamp(ICE_RAY_RAMP_TICKS);
    expect(r.damagePerTick).toBeCloseTo(ICE_RAY_DAMAGE_MAX_PER_SEC / TICK_RATE);
    expect(r.manaPerTick).toBeCloseTo(ICE_RAY_MANA_MAX_PER_SEC / TICK_RATE);
    expect(r.halfWidth).toBeCloseTo(ICE_RAY_HALF_WIDTH_FULL);
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

  it('clamps negative ticks to the starting width', () => {
    expect(iceRayRamp(-10).halfWidth).toBeCloseTo(ICE_RAY_HALF_WIDTH_START);
  });

  it('ramps damage and mana up while width narrows monotonically', () => {
    let prev = iceRayRamp(0);
    for (let t = 1; t <= ICE_RAY_RAMP_TICKS; t += 10) {
      const cur = iceRayRamp(t);
      expect(cur.damagePerTick).toBeGreaterThanOrEqual(prev.damagePerTick);
      expect(cur.manaPerTick).toBeGreaterThanOrEqual(prev.manaPerTick);
      expect(cur.halfWidth).toBeLessThanOrEqual(prev.halfWidth);
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

import { iceRayEnd, iceRayHitsPlayer } from '../src/spells/IceRay.ts';
import { ICE_RAY_MAX_RANGE, PLAYER_HALF_SIZE, ARENA_SIZE } from '@arena/shared';

describe('iceRayEnd', () => {
  it('reaches max range down an empty lane', () => {
    const from = { x: 100, y: 1200 };
    const end = iceRayEnd(from, { x: 900, y: 1200 });
    expect(end.x - from.x).toBeCloseTo(ICE_RAY_MAX_RANGE, 0);
    expect(end.y).toBeCloseTo(from.y);
  });

  it('stops short at a pillar', () => {
    // A pillar sits at (1000, 1000). Fire along y=1000 from the left.
    const from = { x: 500, y: 1000 };
    const end = iceRayEnd(from, { x: 1500, y: 1000 });
    expect(end.x).toBeLessThan(1000);
    expect(end.x).toBeGreaterThan(900);
  });

  it('never leaves the arena', () => {
    const end = iceRayEnd({ x: 1900, y: 1900 }, { x: 3000, y: 3000 });
    expect(end.x).toBeLessThanOrEqual(ARENA_SIZE);
    expect(end.y).toBeLessThanOrEqual(ARENA_SIZE);
  });

  it('does not divide by zero when aim equals position', () => {
    const from = { x: 400, y: 400 };
    expect(() => iceRayEnd(from, { ...from })).not.toThrow();
  });
});

describe('iceRayHitsPlayer', () => {
  const from = { x: 0, y: 1000 };
  const end = { x: 700, y: 1000 };

  it('hits a target on the beam', () => {
    expect(iceRayHitsPlayer(from, end, { x: 300, y: 1000 }, 6)).toBe(true);
  });

  it('misses a target outside the band', () => {
    expect(iceRayHitsPlayer(from, end, { x: 300, y: 1000 + PLAYER_HALF_SIZE + 40 }, 6)).toBe(false);
  });

  it('catches that same target once the band widens', () => {
    expect(iceRayHitsPlayer(from, end, { x: 300, y: 1000 + PLAYER_HALF_SIZE + 15 }, 20)).toBe(true);
  });

  it('misses a target beyond the end of the beam', () => {
    expect(iceRayHitsPlayer(from, end, { x: 900, y: 1000 }, 20)).toBe(false);
  });
});
