import { describe, it, expect } from 'vitest';
import { spawnCaltrops } from '../src/spells/Caltrops.ts';
import { fireWallDamagesPlayer } from '../src/spells/FireWall.ts';
import { buildRangerModifiers } from '../src/skills/RangerModifiers.ts';
import { CALTROPS_RADIUS, CALTROPS_DURATION_TICKS, SECOND_HANDFUL_RADIUS_RATIO } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const M = buildRangerModifiers(new Map<NodeId, number>());
const center = { x: 500, y: 500 };

describe('spawnCaltrops', () => {
  it('is a circular zone tagged as caltrops', () => {
    const z = spawnCaltrops('p1', center, 0, M.caltrops);
    expect(z.kind).toBe('caltrops');
    expect(z.shape).toBe('circle');
    expect(z.center).toEqual(center);
    expect(z.radius).toBe(CALTROPS_RADIUS);
  });

  it('expires after the base duration', () => {
    expect(spawnCaltrops('p1', center, 100, M.caltrops).expiresAt).toBe(100 + CALTROPS_DURATION_TICKS);
  });

  it('takes its radius from the modifiers', () => {
    const wide = buildRangerModifiers(new Map<NodeId, number>([['hunter.wide_scatter', 1]]));
    expect(spawnCaltrops('p1', center, 0, wide.caltrops).radius).toBeCloseTo(CALTROPS_RADIUS * 1.2);
  });

  it('honours the Second Handful half-size ratio', () => {
    const z = spawnCaltrops('p1', center, 0, M.caltrops, SECOND_HANDFUL_RADIUS_RATIO);
    expect(z.radius).toBeCloseTo(CALTROPS_RADIUS * 0.5);
  });
});

describe('caltrops containment', () => {
  it('covers an enemy at the centre', () => {
    expect(fireWallDamagesPlayer(spawnCaltrops('p1', center, 0, M.caltrops), center, 'p2')).toBe(true);
  });

  it('never covers its own caster', () => {
    expect(fireWallDamagesPlayer(spawnCaltrops('p1', center, 0, M.caltrops), center, 'p1')).toBe(false);
  });

  it('does not reach beyond its radius', () => {
    const far = { x: center.x + CALTROPS_RADIUS + 50, y: center.y };
    expect(fireWallDamagesPlayer(spawnCaltrops('p1', center, 0, M.caltrops), far, 'p2')).toBe(false);
  });
});
