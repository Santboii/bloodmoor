import { describe, it, expect } from 'vitest';
import { spawnFireWall, spawnFireCrater, fireWallDamagesPlayer, buildWallSegments } from '../src/spells/FireWall.ts';
import { FIREWALL_DURATION_TICKS, FIREWALL_MAX_LENGTH } from '@arena/shared';
import { wallDamagePerTick, wallLengthScale, advanceWall } from '../src/spells/FireWall.ts';
import { FIREWALL_DAMAGE_PER_TICK, FIREWALL_DAMAGE_START, FIREWALL_DAMAGE_END, WALL_GROWTH_RATIO } from '@arena/shared';
import type { FireWallState } from '@arena/shared';

describe('buildWallSegments', () => {
  it('returns a single segment when path is clear of pillars', () => {
    // 180-unit line at y=250, well clear of all pillars, under FIREWALL_MAX_LENGTH
    const segs = buildWallSegments({ x: 200, y: 250 }, { x: 380, y: 250 });
    expect(segs.length).toBe(1);
    expect(segs[0].x1).toBeCloseTo(200);
    expect(segs[0].x2).toBeCloseTo(380);
  });

  it('splits the wall when a pillar is in the path', () => {
    // 200-unit line through pillar at 400,750 (pillar halfSize=28, spans x=372–428)
    const segs = buildWallSegments({ x: 320, y: 750 }, { x: 520, y: 750 });
    expect(segs.length).toBe(2);
  });

  it('clamps wall length to FIREWALL_MAX_LENGTH (200)', () => {
    const segs = buildWallSegments({ x: 100, y: 100 }, { x: 900, y: 100 });
    const totalLen = segs.reduce((acc, s) => {
      const dx = s.x2 - s.x1; const dy = s.y2 - s.y1;
      return acc + Math.sqrt(dx * dx + dy * dy);
    }, 0);
    expect(totalLen).toBeLessThanOrEqual(FIREWALL_MAX_LENGTH + 0.01);
  });
});

describe('spawnFireWall', () => {
  it('sets expiresAt to current tick + FIREWALL_DURATION_TICKS', () => {
    const fw = spawnFireWall('p1', { x: 200, y: 250 }, { x: 400, y: 250 }, 100);
    expect(fw.expiresAt).toBe(100 + FIREWALL_DURATION_TICKS);
    expect(fw.ownerId).toBe('p1');
  });
});

describe('fireWallDamagesPlayer', () => {
  it('returns true when player is on a fire wall segment', () => {
    // Wall at y=250 (clear of pillars), player standing on it
    const fw = spawnFireWall('p1', { x: 100, y: 250 }, { x: 300, y: 250 }, 0);
    expect(fireWallDamagesPlayer(fw, { x: 200, y: 250 }, 'p2')).toBe(true);
  });

  it('returns false when player is far from the wall', () => {
    const fw = spawnFireWall('p1', { x: 100, y: 100 }, { x: 300, y: 100 }, 0);
    expect(fireWallDamagesPlayer(fw, { x: 400, y: 600 }, 'p2')).toBe(false);
  });
});

// ── Fire rework: wall age riders ────────────────────────────────────────────

describe('wall age riders', () => {
  const wall = (over: Partial<FireWallState> = {}): FireWallState => ({
    id: 'fw_1', ownerId: 'a', segments: [], spawnedAt: 0, expiresAt: 100, ...over,
  });

  it('uses the flat rate without the ramp', () => {
    expect(wallDamagePerTick(wall(), 50)).toBeCloseTo(FIREWALL_DAMAGE_PER_TICK, 6);
  });

  it('ramps from start to end across the wall life', () => {
    const w = wall({ ramp: true });
    expect(wallDamagePerTick(w, 0)).toBeCloseTo(FIREWALL_DAMAGE_START, 6);
    expect(wallDamagePerTick(w, 100)).toBeCloseTo(FIREWALL_DAMAGE_END, 6);
    // Mean over a full-length wall is exactly today's flat rate.
    expect(wallDamagePerTick(w, 50)).toBeCloseTo(FIREWALL_DAMAGE_PER_TICK, 6);
  });

  it('clamps the ramp outside the wall life', () => {
    const w = wall({ ramp: true });
    expect(wallDamagePerTick(w, -10)).toBeCloseTo(FIREWALL_DAMAGE_START, 6);
    expect(wallDamagePerTick(w, 500)).toBeCloseTo(FIREWALL_DAMAGE_END, 6);
  });

  it('grows only with the growth rider', () => {
    expect(wallLengthScale(wall(), 50)).toBe(1);
    expect(wallLengthScale(wall({ growth: true }), 0)).toBeCloseTo(1, 6);
    expect(wallLengthScale(wall({ growth: true }), 100)).toBeCloseTo(1 + WALL_GROWTH_RATIO, 6);
  });
});

describe('advanceWall', () => {
  it('leaves a static wall alone', () => {
    const fw = spawnFireWall('a', { x: 900, y: 600 }, { x: 1100, y: 600 }, 0);
    expect(advanceWall(fw, 10).segments).toEqual(fw.segments);
  });

  it('rotates a Firestorm wall around its midpoint', () => {
    const fw = spawnFireWall('a', { x: 900, y: 600 }, { x: 1100, y: 600 }, 0, { firestorm: true });
    const spun = advanceWall(fw, 1);
    expect(spun.angle!).toBeGreaterThan(fw.angle!);
    expect(spun.origin).toEqual(fw.origin);
  });

  it('rebuilds segments so pillar occlusion stays correct as it turns', () => {
    const fw = spawnFireWall('a', { x: 900, y: 600 }, { x: 1100, y: 600 }, 0, { firestorm: true });
    let spun = fw;
    for (let t = 1; t <= 60; t++) spun = advanceWall(spun, t);
    expect(spun.segments).not.toEqual(fw.segments);
    expect(spun.segments.length).toBeGreaterThan(0);
  });

  it('extends a growing wall', () => {
    const fw = spawnFireWall('a', { x: 900, y: 600 }, { x: 1100, y: 600 }, 0, { growth: true });
    const span = (segs: typeof fw.segments) => segs.reduce((n, g) => n + Math.hypot(g.x2 - g.x1, g.y2 - g.y1), 0);
    expect(span(advanceWall(fw, 200).segments)).toBeGreaterThan(span(fw.segments));
  });
});

describe('zone kind', () => {
  it('stamps spawnFireWall zones as firewall', () => {
    const fw = spawnFireWall('p1', { x: 0, y: 0 }, { x: 100, y: 0 }, 0);
    expect(fw.kind).toBe('firewall');
  });

  it('stamps craters as crater, not firewall', () => {
    const crater = spawnFireCrater('p1', { x: 50, y: 50 }, 40, 0, 180);
    expect(crater.kind).toBe('crater');
    expect(crater.shape).toBe('circle');
  });
});
