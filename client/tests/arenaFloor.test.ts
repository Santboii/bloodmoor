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

import {
  PIT_RADIUS, KERB_WIDTH, SPILL_REACH, SAND_RAMP,
} from '../src/renderer/arenaFloor';

/** Reads one texel by world position, in the bake's own coordinates:
 *  texel (tx,ty) sits at world (tx * UNITS_PER_TEXEL, ty * UNITS_PER_TEXEL). */
function texelAtWorld(px: Uint8ClampedArray, size: number, wx: number, wy: number) {
  const tx = Math.floor(wx / UNITS_PER_TEXEL), ty = Math.floor(wy / UNITS_PER_TEXEL);
  const o = (ty * size + tx) * 4;
  return [px[o], px[o + 1], px[o + 2]] as const;
}

const isSand = (c: readonly number[]) =>
  SAND_RAMP.some(h => {
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    return c[0] === r && c[1] === g && c[2] === b;
  });

const luminance = (c: readonly number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

describe('the sand pit', () => {
  const size = FLOOR_TEXELS;
  const px = bakeArenaFloor(size);
  const centre = 1000;

  it('fills the middle of the arena with sand', () => {
    expect(isSand(texelAtWorld(px, size, centre, centre))).toBe(true);
    expect(isSand(texelAtWorld(px, size, centre + 400, centre))).toBe(true);
  });

  it('leaves the corners as stone', () => {
    expect(isSand(texelAtWorld(px, size, 120, 120))).toBe(false);
    expect(isSand(texelAtWorld(px, size, 1880, 1880))).toBe(false);
  });

  it('stops all sand before the spill reach ends', () => {
    const limit = PIT_RADIUS + KERB_WIDTH + SPILL_REACH;
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const d = limit + 20;
      const c = texelAtWorld(px, size, centre + Math.cos(ang) * d, centre + Math.sin(ang) * d);
      expect(isSand(c)).toBe(false);
    }
  });

  it('rings the pit with a kerb darker than the flagstone outside it', () => {
    let kerb = 0, field = 0;
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const kd = PIT_RADIUS + KERB_WIDTH / 2;
      const fd = PIT_RADIUS + KERB_WIDTH + SPILL_REACH + 90;
      kerb += luminance(texelAtWorld(px, size, centre + Math.cos(ang) * kd, centre + Math.sin(ang) * kd));
      field += luminance(texelAtWorld(px, size, centre + Math.cos(ang) * fd, centre + Math.sin(ang) * fd));
    }
    expect(field / 64 - kerb / 64).toBeGreaterThan(15);
  });

  it('honours a custom pit radius', () => {
    const small = bakeArenaFloor(size, { pitRadius: 300 });
    expect(isSand(texelAtWorld(small, size, centre, centre))).toBe(true);
    expect(isSand(texelAtWorld(small, size, centre + 500, centre))).toBe(false);
  });

  it('is still not grainy with the pit carved', () => {
    expect(grainFraction(px, size)).toBeLessThan(0.03);
  });
});
