import { describe, it, expect } from 'vitest';
import { auraAnchorY, isMoving } from '../src/renderer/SpellRenderer';
import { aurasForGear } from '@arena/shared';

describe('auraAnchorY', () => {
  it('orders feet below chest below head', () => {
    const h = 100;
    expect(auraAnchorY('feet', h)).toBeLessThan(auraAnchorY('chest', h));
    expect(auraAnchorY('chest', h)).toBeLessThan(auraAnchorY('head', h));
  });
  it('keeps every anchor inside the sprite', () => {
    const h = 100;
    for (const a of ['feet', 'chest', 'head'] as const) {
      expect(auraAnchorY(a, h)).toBeGreaterThanOrEqual(0);
      expect(auraAnchorY(a, h)).toBeLessThanOrEqual(h);
    }
  });
});

describe('isMoving', () => {
  it('is false with no previous sample', () => {
    expect(isMoving(undefined, { x: 10, y: 10 })).toBe(false);
  });
  it('is false for sub-threshold jitter', () => {
    expect(isMoving({ x: 10, y: 10 }, { x: 10.01, y: 10 })).toBe(false);
  });
  it('is true for a real step', () => {
    expect(isMoving({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(true);
  });
});

describe('aura selection from gear', () => {
  it('picks the two loudest uniques a player is wearing', () => {
    const auras = aurasForGear({
      weapon: { base: 'gnarled_staff', unique: 'cinderfall' },        // 7
      amulet: { base: 'moon_amulet', unique: 'the_quiet_hour' },      // 10
      ring1: { base: 'bone_ring', unique: 'hunters_eye' },            // 1
    });
    expect(auras.map(a => a.unique.id)).toEqual(['the_quiet_hour', 'cinderfall']);
    expect(auras[0].aura.style).toBe('orbit');
  });
});
