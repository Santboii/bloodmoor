// Bakes the whole arena floor as a single image. The arena is 2000 world
// units and a texel is 3.125 units, so the entire floor is 640x640 texels —
// small enough to bake once instead of tiling, which is what kills the
// repetition seam and lets the ground be an authored composition.
//
// DOM- and WebGL-free so it stays unit-testable in node, same rule as
// pixelation.ts. The CanvasTexture wrapper lives in AssetLoader.
import { ARENA_SIZE } from '@arena/shared';

/** Unchanged from the tiled floor: one 64-texel tile covered 200 world units.
 *  Sprite world sizes derive from this grid — do not drift from it. */
export const UNITS_PER_TEXEL = 200 / 64;
export const FLOOR_TEXELS = Math.round(ARENA_SIZE / UNITS_PER_TEXEL);

export const PIT_RADIUS = 700;
export const KERB_WIDTH = 34;
/** Small on purpose: at r700 a large wobble reads as an unsteady line rather
 *  than as erosion. The sand spilled over the kerb is what keeps the drafted
 *  circle from looking machined. */
export const EDGE_WOBBLE = 6;
export const SPILL_REACH = 46;
export const WEAR_REACH = 110;
export const MORTAR = '#4a443a';

export const STONE_RAMP = ['#57534c', '#615c53', '#6b665c', '#767065', '#807a6d', '#8a8376'] as const;
export const KERB_RAMP = ['#4b463d', '#544e44', '#5d564b'] as const;
export const SAND_RAMP = ['#7f7053', '#8a7b5d', '#948566', '#9e8f70', '#a89979'] as const;

export interface FloorOptions {
  pitRadius?: number;
  kerbWidth?: number;
  edgeWobble?: number;
  mortar?: string;
}

type RGB = readonly [number, number, number];
type Put = (x: number, y: number, c: RGB, shade?: number) => void;

export function hexToRgb(hex: string): RGB {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Deterministic hash in [0,1). The bake must be reproducible, so there is no
 *  Math.random anywhere in this module. */
function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695040) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smoothstep = (a: number): number => a * a * (3 - 2 * a);

/** Bilinear value noise on a lattice of `cell` texels. Every piece of
 *  scattered detail in this module thresholds this, never a per-texel hash —
 *  a per-texel coin flip produces precisely the speckle we are removing. */
function noise2(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = smoothstep(x / cell - gx), fy = smoothstep(y / cell - gy);
  const g = (i: number, j: number) => hash2(gx + i, gy + j, seed);
  return (g(0, 0) * (1 - fx) + g(1, 0) * fx) * (1 - fy)
       + (g(0, 1) * (1 - fx) + g(1, 1) * fx) * fy;
}

function makeWriter(px: Uint8ClampedArray, size: number): Put {
  return (x, y, c, shade = 0) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const o = (y * size + x) * 4;
    px[o] = c[0] + shade;
    px[o + 1] = c[1] + shade;
    px[o + 2] = c[2] + shade;
    px[o + 3] = 255;
  };
}

/** Greedy masonry pack on an 8-texel unit grid. Slab value comes from
 *  low-frequency noise sampled at the slab centre, so tone drifts in patches
 *  instead of jumping per slab. */
const UNIT = 8;

function paveFlagstones(put: Put, size: number, mortar: RGB): void {
  const stone = STONE_RAMP.map(hexToRgb);
  let y = 0, row = 0;
  while (y < size) {
    const rowH = (hash2(row, 0, 91) < 0.45 ? 2 : 3) * UNIT;
    let x = -Math.floor(hash2(row, 1, 92) * 3) * UNIT; // stagger row starts
    let col = 0;
    while (x < size) {
      const w = (2 + Math.floor(hash2(row, col, 93) * 4)) * UNIT;
      const wob = (seed: number) => Math.floor(hash2(row, col, seed) * 3) - 1;
      const x0 = x + 2 + wob(1), x1 = x + w - 1 + wob(2);
      const y0 = y + 2 + wob(3), y1 = y + rowH - 1 + wob(4);

      const drift = noise2(x + w / 2, y + rowH / 2, 90, 7);
      const jitter = (hash2(row, col, 95) - 0.5) * 1.2;
      const idx = Math.max(0, Math.min(stone.length - 1,
        Math.round(drift * (stone.length - 1) + jitter)));
      const base = stone[idx];

      for (let sy = y0; sy <= y1; sy++) {
        const shade = sy === y0 ? 12 : sy === y1 ? -10 : 0;
        for (let sx = x0; sx <= x1; sx++) put(sx, sy, base, shade);
      }

      if (hash2(row, col, 96) < 0.13) { // a crack wandering down the slab
        let cx = x0 + Math.floor(hash2(row, col, 97) * (x1 - x0));
        for (let sy = y0; sy <= y1; sy++) {
          put(cx, sy, base, -22);
          if (hash2(cx, sy, 98) < 0.35) cx += hash2(cx, sy, 99) < 0.5 ? -1 : 1;
          cx = Math.max(x0, Math.min(x1, cx));
        }
      }

      if (hash2(row, col, 100) < 0.16) { // chipped corner
        const n = 2 + Math.floor(hash2(row, col, 101) * 3);
        const cornerX = hash2(row, col, 102) < 0.5 ? x0 : x1;
        const cornerY = hash2(row, col, 103) < 0.5 ? y0 : y1;
        for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
          put(cornerX + (cornerX === x0 ? i : -i),
              cornerY + (cornerY === y0 ? j : -j), mortar, 6);
        }
      }

      x += w; col++;
    }
    y += rowH; row++;
  }
}

export function bakeArenaFloor(size: number = FLOOR_TEXELS, opts: FloorOptions = {}): Uint8ClampedArray {
  const px = new Uint8ClampedArray(size * size * 4);
  const put = makeWriter(px, size);
  const mortar = hexToRgb(opts.mortar ?? MORTAR);

  // Mortar is the ground the slabs are laid onto. Filling it first is
  // load-bearing: leaving the gaps unwritten leaves them pure black, which
  // reads as a heavy black grid rather than a seam.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, mortar);

  paveFlagstones(put, size, mortar);
  return px;
}
