import { describe, it, expect } from 'vitest';
import { spawnBlizzard } from '../src/spells/Blizzard.ts';
import { fireWallDamagesPlayer } from '../src/spells/FireWall.ts';
import { BLIZZARD_RADIUS, BLIZZARD_DURATION_TICKS } from '@arena/shared';

const center = { x: 500, y: 500 };

describe('spawnBlizzard', () => {
  it('is a circular zone tagged as a blizzard', () => {
    const b = spawnBlizzard('p1', center, 0);
    expect(b.kind).toBe('blizzard');
    expect(b.shape).toBe('circle');
    expect(b.center).toEqual(center);
    expect(b.radius).toBe(BLIZZARD_RADIUS);
  });

  it('expires after the base duration', () => {
    expect(spawnBlizzard('p1', center, 100).expiresAt).toBe(100 + BLIZZARD_DURATION_TICKS);
  });

  it('scales duration and radius from config', () => {
    const b = spawnBlizzard('p1', center, 0, { durationMultiplier: 2, radiusMultiplier: 1.5 });
    expect(b.expiresAt).toBe(BLIZZARD_DURATION_TICKS * 2);
    expect(b.radius).toBeCloseTo(BLIZZARD_RADIUS * 1.5);
  });
});

describe('blizzard containment', () => {
  it('damages an enemy standing at the centre', () => {
    expect(fireWallDamagesPlayer(spawnBlizzard('p1', center, 0), center, 'p2')).toBe(true);
  });

  it('never damages its own caster', () => {
    expect(fireWallDamagesPlayer(spawnBlizzard('p1', center, 0), center, 'p1')).toBe(false);
  });

  it('does not reach beyond its radius', () => {
    const far = { x: center.x + BLIZZARD_RADIUS + 100, y: center.y };
    expect(fireWallDamagesPlayer(spawnBlizzard('p1', center, 0), far, 'p2')).toBe(false);
  });
});
