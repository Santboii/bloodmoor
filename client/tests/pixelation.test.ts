import { describe, it, expect } from 'vitest';
import {
  INTERNAL_HEIGHT, FRUSTUM_HALF_HEIGHT,
  internalRenderSize, worldUnitsPerTexel, snapToTexel, posterizePixels,
} from '../src/renderer/pixelation';

describe('internalRenderSize', () => {
  it('keeps the fixed internal height and derives width from aspect', () => {
    expect(internalRenderSize(1920, 1080)).toEqual({ width: 640, height: 360 });
    expect(internalRenderSize(1728, 872)).toEqual({ width: 713, height: 360 });
  });

  it('never returns dimensions below 1', () => {
    expect(internalRenderSize(1, 10000).width).toBe(1);
  });

  it('honors an explicit internal height', () => {
    expect(internalRenderSize(1920, 1080, 270)).toEqual({ width: 480, height: 270 });
  });
});

describe('worldUnitsPerTexel', () => {
  it('divides the camera frustum world height by the internal pixel height', () => {
    // frustum world height = 2 * FRUSTUM_HALF_HEIGHT = 760 world units
    expect(worldUnitsPerTexel()).toBeCloseTo((2 * FRUSTUM_HALF_HEIGHT) / INTERNAL_HEIGHT, 10);
    expect(worldUnitsPerTexel(380)).toBeCloseTo(2, 10);
  });
});

describe('snapToTexel', () => {
  it('rounds to the nearest texel multiple', () => {
    expect(snapToTexel(10.4, 2)).toBe(10);
    expect(snapToTexel(11.1, 2)).toBe(12);
    expect(snapToTexel(-3.2, 2)).toBe(-4);
    expect(snapToTexel(0, 2)).toBe(0);
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
