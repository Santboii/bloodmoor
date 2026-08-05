// Bakes the whole arena floor as a single image. The arena is 2000 world
// units and a texel is 3.125 units, so the entire floor is 640x640 texels —
// small enough to bake once instead of tiling, which is what kills the
// repetition seam and lets the ground be an authored composition.
//
// DOM- and WebGL-free so it stays unit-testable in node, same rule as
// pixelation.ts. The CanvasTexture wrapper lives in AssetLoader.
import { ARENA_SIZE, PILLARS } from '@arena/shared';

/** Unchanged from the tiled floor: one 64-texel tile covered 200 world units.
 *  That is the scale the old tiled floor used, and it is preserved here so
 *  the baked floor keeps its authored visual proportion against the sprites
 *  — sprites are sized from their own separate grid, worldUnitsPerTexel() in
 *  pixelation.ts, and do not derive from this constant. */
export const UNITS_PER_TEXEL = 200 / 64;
export const FLOOR_TEXELS = Math.round(ARENA_SIZE / UNITS_PER_TEXEL);

export const PIT_RADIUS = 700;
export const KERB_WIDTH = 34;
/** Small on purpose: at r700 a large wobble reads as an unsteady line rather
 *  than as erosion. The sand spilled over the kerb is what keeps the drafted
 *  circle from looking machined. */
const EDGE_WOBBLE = 6;
export const SPILL_REACH = 46;
const WEAR_REACH = 110;
const MORTAR = '#4a443a';

const STONE_RAMP = ['#57534c', '#615c53', '#6b665c', '#767065', '#807a6d', '#8a8376'] as const;
const KERB_RAMP = ['#4b463d', '#544e44', '#5d564b'] as const;
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

/** Carves the sand pit, its kerb ring, and the sand spilled over onto the
 *  stone. Runs after paving, overwriting the flagstones it covers. */
function carvePit(put: Put, size: number, mortar: RGB, opts: FloorOptions): void {
  const sand = SAND_RAMP.map(hexToRgb);
  const kerbStones = KERB_RAMP.map(hexToRgb);
  const r0 = opts.pitRadius ?? PIT_RADIUS;
  const kerbW = opts.kerbWidth ?? KERB_WIDTH;
  const wobbleAmp = opts.edgeWobble ?? EDGE_WOBBLE;
  const cx = ARENA_SIZE / 2, cy = ARENA_SIZE / 2;

  for (let ty = 0; ty < size; ty++) for (let tx = 0; tx < size; tx++) {
    const dx = tx * UNITS_PER_TEXEL - cx, dy = ty * UNITS_PER_TEXEL - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > r0 + kerbW + SPILL_REACH + wobbleAmp) continue;

    const ang = Math.atan2(dy, dx);
    // Sampling noise around a circle keeps the wobble continuous where the
    // angle wraps, which a plain noise2(tx,ty) would not.
    const wobble = (noise2(Math.cos(ang) * 60 + 300, Math.sin(ang) * 60 + 300, 22, 31) - 0.5) * wobbleAmp;
    const r = r0 + wobble;

    if (dist < r) {
      // Broad patches plus a one-directional drag term. Nothing radially
      // symmetric: concentric arcs centred here read as wood grain.
      const n1 = noise2(tx, ty, 64, 41), n2 = noise2(tx, ty, 26, 42);
      const drag = noise2(tx * 0.28, ty, 30, 43);
      const wd = Math.hypot(dx + 70, dy - 40); // wear centre pulled off-centre
      const wear = Math.max(0, 1 - wd / (r * 0.7)) * (0.10 + noise2(tx, ty, 90, 44) * 0.12);
      const v = n1 * 0.52 + n2 * 0.33 + drag * 0.15 - wear;
      put(tx, ty, sand[Math.max(0, Math.min(sand.length - 1, Math.floor(v * sand.length)))]);
    } else if (dist < r + kerbW) {
      const turns = ((ang + Math.PI) / (Math.PI * 2)) * 96;
      const band = (dist - r) / kerbW;
      const joint = turns % 1 < 0.1;
      const stone = kerbStones[Math.floor(hash2(Math.floor(turns), 0, 51) * kerbStones.length)];
      put(tx, ty, joint || band > 0.9 ? mortar : stone, band < 0.16 ? 10 : 0);
    } else if (dist < r + kerbW + SPILL_REACH) {
      // Thresholded low-frequency noise so sand banks in tongues. A per-texel
      // coin flip here produced exactly the confetti this change removes.
      const t = (dist - r - kerbW) / SPILL_REACH;
      if (noise2(tx, ty, 11, 61) > 0.30 + t * 0.85) {
        put(tx, ty, sand[1 + Math.floor(noise2(tx, ty, 5, 62) * 3)]);
      }
    }
  }
}

/** Ground worn and dirtied where players circle the pillars. A smooth radial
 *  falloff modulated by low-frequency noise — deliberately not scattered
 *  texels, which would reintroduce speckle. Operates on the buffer directly
 *  because it tints what is already there rather than writing a colour. */
function wearAroundPillars(px: Uint8ClampedArray, size: number): void {
  const reach = Math.ceil(WEAR_REACH / UNITS_PER_TEXEL);
  for (const p of PILLARS) {
    const cx = Math.round(p.x / UNITS_PER_TEXEL), cy = Math.round(p.y / UNITS_PER_TEXEL);
    const y0 = Math.max(0, cy - reach), y1 = Math.min(size - 1, cy + reach);
    const x0 = Math.max(0, cx - reach), x1 = Math.min(size - 1, cx + reach);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const d = Math.hypot(tx * UNITS_PER_TEXEL - p.x, ty * UNITS_PER_TEXEL - p.y);
      if (d > WEAR_REACH) continue;
      const falloff = (1 - d / WEAR_REACH) * (0.45 + noise2(tx, ty, 26, 71) * 0.55);
      const k = 1 - falloff * 0.16;
      const o = (ty * size + tx) * 4;
      px[o] = px[o] * k + 7 * falloff;
      px[o + 1] = px[o + 1] * k + 5 * falloff;
      px[o + 2] = px[o + 2] * k + 2 * falloff;
    }
  }
}

/** `size` crops rather than rescales: paveFlagstones fills whatever buffer
 *  it's given, but carvePit and wearAroundPillars convert texels to world
 *  coordinates via the fixed UNITS_PER_TEXEL grid, so a size below
 *  FLOOR_TEXELS yields the arena's top-left corner at full detail and omits
 *  the pit and pillar wear entirely. */
export function bakeArenaFloor(size: number = FLOOR_TEXELS, opts: FloorOptions = {}) {
  const px = new Uint8ClampedArray(size * size * 4);
  const put = makeWriter(px, size);
  const mortar = hexToRgb(opts.mortar ?? MORTAR);

  // Mortar is the ground the slabs are laid onto. Filling it first is
  // load-bearing: leaving the gaps unwritten leaves them pure black, which
  // reads as a heavy black grid rather than a seam.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, mortar);

  paveFlagstones(put, size, mortar);
  carvePit(put, size, mortar, opts);
  wearAroundPillars(px, size);
  return px;
}
