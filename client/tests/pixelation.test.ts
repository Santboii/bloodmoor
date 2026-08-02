import { describe, it, expect } from 'vitest';
import {
  INTERNAL_HEIGHT, FRUSTUM_HALF_HEIGHT,
  worldUnitsPerTexel, posterizePixels,
} from '../src/renderer/pixelation';

describe('worldUnitsPerTexel', () => {
  it('divides the camera frustum world height by the asset-grid height', () => {
    expect(worldUnitsPerTexel()).toBeCloseTo((2 * FRUSTUM_HALF_HEIGHT) / INTERNAL_HEIGHT, 10);
    expect(worldUnitsPerTexel(660)).toBeCloseTo(1, 10);
  });
});

describe('posterizePixels', () => {
  it('quantizes RGB channels to N levels and leaves alpha alone', () => {
    const data = new Uint8ClampedArray([200, 100, 30, 128]);
    posterizePixels(data, 4); // levels: 0, 85, 170, 255
    expect(Array.from(data)).toEqual([170, 85, 0, 128]);
  });

  it('preserves pure black and white', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    posterizePixels(data, 8);
    expect(Array.from(data)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });

  it('clamps degenerate level counts instead of corrupting pixels', () => {
    const data = new Uint8ClampedArray([200, 100, 30, 128]);
    posterizePixels(data, 1); // clamped to 2 levels: 0 or 255
    expect(Array.from(data)).toEqual([255, 0, 0, 128]);
  });
});
