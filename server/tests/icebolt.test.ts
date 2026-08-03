import { describe, it, expect } from 'vitest';
import { spawnIceBolt, advanceIceBolt, isIceBoltExpired, iceBoltHitsPlayer, iceBoltDamage } from '../src/spells/IceBolt.ts';
import { ICEBOLT_SPEED, ARENA_SIZE } from '@arena/shared';

const from = { x: 100, y: 100 };

describe('spawnIceBolt', () => {
  it('travels toward the target at ICEBOLT_SPEED', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(p.type).toBe('icebolt');
    expect(p.velocity.x).toBeCloseTo(ICEBOLT_SPEED);
    expect(p.velocity.y).toBeCloseTo(0);
  });

  it('is faster than a fireball', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    const speed = Math.hypot(p.velocity.x, p.velocity.y);
    expect(speed).toBeGreaterThan(400);
  });

  it('carries pierce and splinter counts through from config', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 }, { pierce: 2, splinters: 3 });
    expect(p.pierce).toBe(2);
    expect(p.split).toBe(3);
  });
});

describe('advanceIceBolt', () => {
  it('moves along its velocity and does not curve', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    const next = advanceIceBolt(p);
    expect(next.position.x).toBeGreaterThan(p.position.x);
    expect(next.velocity).toEqual(p.velocity);
  });
});

describe('isIceBoltExpired', () => {
  it('expires outside the arena', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(isIceBoltExpired({ ...p, position: { x: -5, y: 100 } })).toBe(true);
    expect(isIceBoltExpired({ ...p, position: { x: ARENA_SIZE + 5, y: 100 } })).toBe(true);
  });

  it('does not expire mid-arena', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(isIceBoltExpired({ ...p, position: { x: 900, y: 900 } })).toBe(false);
  });
});

describe('iceBoltHitsPlayer', () => {
  it('never hits its own caster', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(iceBoltHitsPlayer(p, from, 'p1')).toBe(false);
  });

  it('hits an enemy standing on it', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(iceBoltHitsPlayer(p, from, 'p2')).toBe(true);
  });

  it('does not hit an enemy it has already pierced', () => {
    const p = { ...spawnIceBolt('p1', from, { x: 200, y: 100 }), piercedIds: ['p2'] };
    expect(iceBoltHitsPlayer(p, from, 'p2')).toBe(false);
  });
});

describe('iceBoltDamage', () => {
  it('rolls inside the 60-85 band', () => {
    for (let i = 0; i < 200; i++) {
      const d = iceBoltDamage();
      expect(d).toBeGreaterThanOrEqual(60);
      expect(d).toBeLessThanOrEqual(85);
    }
  });
});
