import { describe, it, expect } from 'vitest';
import { bakeArenaFloor, FLOOR_TEXELS, UNITS_PER_TEXEL } from '../src/renderer/arenaFloor';

/** Fraction of texels that are a local luminance extremum against both
 *  horizontal neighbours. This is the grain metric: the old photo-derived
 *  cobblestone floor measures 19.9%, the bake should be under 3%. */
function grainFraction(px: Uint8ClampedArray, size: number): number {
  const lum = (x: number, y: number) => {
    const o = (y * size + x) * 4;
    return 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
  };
  let extrema = 0, total = 0;
  for (let y = 0; y < size; y++) for (let x = 1; x < size - 1; x++) {
    const c = lum(x, y), l = lum(x - 1, y), r = lum(x + 1, y);
    if ((c > l + 2 && c > r + 2) || (c < l - 2 && c < r - 2)) extrema++;
    total++;
  }
  return extrema / total;
}

describe('bakeArenaFloor', () => {
  it('covers the arena at the authored texel scale', () => {
    expect(UNITS_PER_TEXEL).toBeCloseTo(3.125, 10);
    expect(FLOOR_TEXELS).toBe(640);
  });

  it('returns an opaque RGBA buffer of the requested size', () => {
    const px = bakeArenaFloor(64);
    expect(px.length).toBe(64 * 64 * 4);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
  });

  it('is deterministic', () => {
    const a = bakeArenaFloor(128);
    const b = bakeArenaFloor(128);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('never leaves a texel black (mortar must be filled, not left as a gap)', () => {
    const px = bakeArenaFloor(FLOOR_TEXELS);
    let black = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] === 0 && px[i + 1] === 0 && px[i + 2] === 0) black++;
    }
    expect(black).toBe(0);
  });

  it('is not grainy', () => {
    expect(grainFraction(bakeArenaFloor(FLOOR_TEXELS), FLOOR_TEXELS)).toBeLessThan(0.03);
  });
});
