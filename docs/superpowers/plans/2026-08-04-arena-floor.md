# Arena Floor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tiled cobblestone arena floor with a single baked 640×640 image — a flagstone field around a sand pit — so the ground stops shimmering and stops repeating.

**Architecture:** A new DOM-free module `client/src/renderer/arenaFloor.ts` exports a pure `bakeArenaFloor(size, opts): Uint8ClampedArray` built from flat fills and low-frequency noise. `AssetLoader` wraps those bytes in a `CanvasTexture`; `Arena.buildFloor` draws it across the whole floor plane with no repeat. Nothing else in the renderer changes.

**Tech Stack:** TypeScript, three.js 0.170, vitest 2.1. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-04-arena-floor-design.md`

## Global Constraints

These apply to every task.

- **Texel scale is exactly `200 / 64` = 3.125 world units.** `ARENA_SIZE` is 2000, so the bake is 640×640. Do not change either number — sprite world sizes derive from this grid via `worldUnitsPerTexel`.
- **No per-texel randomness for placement.** Scattered detail must come from thresholded low-frequency noise (`noise2`), never from a per-texel `hash2` coin flip. A per-texel flip reproduces exactly the grain this change removes. `hash2` is fine for per-*slab* and per-*segment* decisions.
- **No radially symmetric detail inside the pit.** Concentric patterns centred on the pit read as wood grain and turn the arena into a bullseye.
- **Mortar is filled first, slabs inset into it.** Never leave gaps unwritten — the buffer's initial value is black, a far heavier joint than any mortar colour.
- **The bake is deterministic.** No `Math.random()`, no `Date.now()`. Same options must always produce the same bytes.
- **Cosmetic only.** No collision, no gameplay meaning to the sand. No changes to `shared/` or `server/`.
- Test command: `npm run test --workspace=client -- tests/arenaFloor.test.ts`

---

### Task 1: Floor module — primitives, mortar, flagstone field

**Files:**
- Create: `client/src/renderer/arenaFloor.ts`
- Test: `client/tests/arenaFloor.test.ts`

**Interfaces:**
- Consumes: `ARENA_SIZE` from `@arena/shared`.
- Produces: `bakeArenaFloor(size?: number, opts?: FloorOptions): Uint8ClampedArray`, `FLOOR_TEXELS: number` (640), `UNITS_PER_TEXEL: number` (3.125), `SAND_RAMP` / `STONE_RAMP` / `KERB_RAMP` (`readonly string[]` of hex), and `interface FloorOptions { pitRadius?, kerbWidth?, edgeWobble?, mortar? }`. Tasks 2 and 3 extend the same `bakeArenaFloor`; Task 4 consumes it.

- [ ] **Step 1: Write the failing test**

Create `client/tests/arenaFloor.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=client -- tests/arenaFloor.test.ts`
Expected: FAIL — cannot resolve `../src/renderer/arenaFloor`.

- [ ] **Step 3: Write the module**

Create `client/src/renderer/arenaFloor.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=client -- tests/arenaFloor.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Typecheck**

Run: `npm run build --workspace=client`
Expected: no TypeScript errors. (The build also runs vite; a successful bundle is fine.)

- [ ] **Step 6: Commit**

```bash
git add client/src/renderer/arenaFloor.ts client/tests/arenaFloor.test.ts
git commit -m "feat(client): bake the arena flagstone field as one image"
```

---

### Task 2: Sand pit, kerb, and spill

**Files:**
- Modify: `client/src/renderer/arenaFloor.ts`
- Test: `client/tests/arenaFloor.test.ts`

**Interfaces:**
- Consumes: `bakeArenaFloor`, `makeWriter`, `noise2`, `hash2`, `hexToRgb`, `UNITS_PER_TEXEL`, ramps — all from Task 1.
- Produces: no new exports. `bakeArenaFloor` now honours `opts.pitRadius`, `opts.kerbWidth`, `opts.edgeWobble`.

- [ ] **Step 1: Write the failing tests**

Append to `client/tests/arenaFloor.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=client -- tests/arenaFloor.test.ts`
Expected: FAIL — the middle of the arena is flagstone, so `isSand` is false.

- [ ] **Step 3: Add the pit**

In `client/src/renderer/arenaFloor.ts`, add above `bakeArenaFloor`:

```ts
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
```

Then call it from `bakeArenaFloor`, after `paveFlagstones`:

```ts
  paveFlagstones(put, size, mortar);
  carvePit(put, size, mortar, opts);
  return px;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=client -- tests/arenaFloor.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/arenaFloor.ts client/tests/arenaFloor.test.ts
git commit -m "feat(client): carve the sand pit, kerb, and spill into the floor bake"
```

---

### Task 3: Worn ground around the pillars

**Files:**
- Modify: `client/src/renderer/arenaFloor.ts`
- Test: `client/tests/arenaFloor.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–2, plus `PILLARS` from `@arena/shared` (each entry is `{ x: number; y: number; halfSize: number }`).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Append to `client/tests/arenaFloor.test.ts`:

```ts
describe('pillar wear', () => {
  const size = FLOOR_TEXELS;
  const px = bakeArenaFloor(size);

  it('darkens the ground under a pillar that stands on stone', () => {
    // (350, 300) is 955 units from the arena centre — clear of the pit, the
    // kerb, and the sand spill (which ends at 783), so both sample rings land
    // on plain flagstone. The near ring at 45 is inside WEAR_REACH (110); the
    // far ring at 130 is outside it and still clear of the spill and of the
    // next pillar, (400, 750), which is 450 away.
    const px0 = 350, py0 = 300;
    let near = 0, far = 0, n = 0;
    for (let a = 0; a < 32; a++) {
      const ang = (a / 32) * Math.PI * 2;
      near += luminance(texelAtWorld(px, size, px0 + Math.cos(ang) * 45, py0 + Math.sin(ang) * 45));
      far  += luminance(texelAtWorld(px, size, px0 + Math.cos(ang) * 130, py0 + Math.sin(ang) * 130));
      n++;
    }
    expect(far / n - near / n).toBeGreaterThan(3);
  });

  it('adds no grain while doing it', () => {
    expect(grainFraction(px, size)).toBeLessThan(0.03);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=client -- tests/arenaFloor.test.ts`
Expected: FAIL on the first test — near and far luminance are equal, so the difference is ~0.

- [ ] **Step 3: Add the wear pass**

In `client/src/renderer/arenaFloor.ts`, change the import to:

```ts
import { ARENA_SIZE, PILLARS } from '@arena/shared';
```

Add above `bakeArenaFloor`:

```ts
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
```

Call it last in `bakeArenaFloor`:

```ts
  paveFlagstones(put, size, mortar);
  carvePit(put, size, mortar, opts);
  wearAroundPillars(px, size);
  return px;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=client -- tests/arenaFloor.test.ts`
Expected: PASS, 13 tests.

Note: `wearAroundPillars` uses world positions from `PILLARS`, so it only lands correctly when `size === FLOOR_TEXELS`. That is the only size shipped; the smaller sizes in earlier tests exercise geometry, not wear.

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/arenaFloor.ts client/tests/arenaFloor.test.ts
git commit -m "feat(client): wear the ground around the arena pillars"
```

---

### Task 4: Wire the bake into the renderer

**Files:**
- Modify: `client/src/renderer/AssetLoader.ts`
- Modify: `client/src/renderer/Arena.ts:40-48`

**Interfaces:**
- Consumes: `bakeArenaFloor`, `FLOOR_TEXELS` from Task 1.
- Produces: `bakedFloorTexture(): THREE.Texture` exported from `AssetLoader`. `LoadedAssets` keeps its shape — only what fills `textures.floor` changes.

- [ ] **Step 1: Add the texture wrapper**

In `client/src/renderer/AssetLoader.ts`, add the import and the wrapper next to `chunkifyTexture`:

```ts
import { bakeArenaFloor, FLOOR_TEXELS } from './arenaFloor';
```

```ts
/**
 * Bakes the arena floor and wraps it in a CanvasTexture. Clamped, never
 * repeated: the image covers the floor plane exactly once, which is what
 * removes the tiling seam the old 200-unit cobblestone tile had.
 */
export function bakedFloorTexture(): THREE.Texture {
  const size = FLOOR_TEXELS;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(bakeArenaFloor(size), size, size), 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  return tex;
}
```

- [ ] **Step 2: Stop loading the cobblestone photo**

In `AssetLoader.load`, change the destructuring and the returned `floor` entry. Replace:

```ts
    const [floorDiff, stoneDiff, stoneNorm, stoneRough] =
      await Promise.all([
        loadTex('/assets/textures/cobblestone/diffuse.jpg', sRGB),
        loadTex('/assets/textures/castle_stone/diffuse.jpg', sRGB),
        loadTex('/assets/textures/castle_stone/normal.jpg', linear),
        loadTex('/assets/textures/castle_stone/roughness.jpg', linear),
      ]);
```

with:

```ts
    const [stoneDiff, stoneNorm, stoneRough] =
      await Promise.all([
        loadTex('/assets/textures/castle_stone/diffuse.jpg', sRGB),
        loadTex('/assets/textures/castle_stone/normal.jpg', linear),
        loadTex('/assets/textures/castle_stone/roughness.jpg', linear),
      ]);
```

and replace the `floor` entry:

```ts
        // Floor is one baked image covering the whole arena — no photo, no
        // tiling, and no normal/roughness maps (at this scale they read as
        // per-pixel lighting speckle rather than detail).
        floor: {
          map: bakedFloorTexture(),
        },
```

- [ ] **Step 3: Draw it without repeating**

In `client/src/renderer/Arena.ts`, replace `buildFloor` entirely:

```ts
  private buildFloor(tex: TextureSet): void {
    // One baked image covers the whole arena, so this deliberately skips
    // tiledPBR — its texture cloning and repeat wrapping are wrong here.
    const mat = new THREE.MeshStandardMaterial({
      map: tex.map,
      roughness: 1,
      metalness: 0,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA_SIZE / 2, 0, ARENA_SIZE / 2);
    floor.receiveShadow = true;
    this.group.add(floor);
  }
```

- [ ] **Step 4: Verify the whole client suite and the typecheck**

Run: `npm run test --workspace=client`
Expected: PASS, no regressions.

Run: `npm run build --workspace=client`
Expected: no TypeScript errors. In particular, `tiledPBR` must still be used by the wall and pillar builders — if the compiler reports it as unused, something else was changed by mistake.

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/AssetLoader.ts client/src/renderer/Arena.ts
git commit -m "feat(client): draw the baked arena floor instead of tiled cobblestone"
```

---

### Task 5: Verify in the browser (risk gate)

This task has no unit test — it discharges the two risks the spec left open. Do not skip it.

**Files:**
- Modify (temporarily): `client/src/renderer/AssetLoader.ts`

- [ ] **Step 1: Instrument the bake time**

Temporarily wrap the bake in `bakedFloorTexture`:

```ts
  const t0 = performance.now();
  ctx.putImageData(new ImageData(bakeArenaFloor(size), size, size), 0, 0);
  console.log(`[floor] bake ${(performance.now() - t0).toFixed(0)}ms`);
```

- [ ] **Step 2: Run the client and read the number**

Run: `npm run dev:client`, open the app, and start a match.

Expected: the log appears once, during the loading screen. **Gate:** if the bake exceeds 400 ms, stop and report — the spec's fallback is tiled flagstone plus a separate circular mesh for the pit, which costs the authored spill and wear. Under 400 ms, continue.

- [ ] **Step 3: Verify UV orientation against the pillar wear**

The mapping should already be correct, and here is why: `PlaneGeometry` rotated `-π/2` about X maps local +Y to world −Z, and `CanvasTexture` defaults to `flipY: true`, so canvas row 0 maps to world z = 0 — which is exactly where texel row 0 sits in the bake (`wy = ty * UNITS_PER_TEXEL`). Column 0 maps to world x = 0 the same way.

Confirm it rather than trusting it: the pit is centred, so an orientation error is invisible there, but **the worn haloes must sit centred under their pillars**. Walk to the pillar at (350, 300) — the one nearest the arena's origin corner — and check the dirt ring is under the column, not offset or mirrored to the far side.

If it is mirrored, set `tex.flipY = false` in `bakedFloorTexture` and re-check. Do not "fix" it by flipping coordinates inside the bake — the bake's world mapping is what the tests assert.

- [ ] **Step 4: Look at the floor**

Confirm against `docs/superpowers/specs/2026-08-04-arena-floor-design.md`: no visible tiling seam anywhere, mortar reads as warm dark brown rather than black, the kerb is a clean arc, and the sand has no bullseye or wood-grain rings.

- [ ] **Step 5: Remove the instrumentation and confirm a clean tree**

Revert the `performance.now()` logging from Step 1, leaving `bakedFloorTexture` exactly as it was after Task 4.

The instrumentation was never committed, so there is nothing to commit here — reverting it restores the committed state. Verify that:

```bash
git status --porcelain client/src/renderer/AssetLoader.ts
```

Expected: empty output. If it is not empty, the revert was incomplete — diff against `HEAD` and finish it.

Report the measured bake time in your task report: the spec lists it as an open risk and it needs to reach the branch summary.

---

## Notes for the implementer

- `client/public/assets/textures/cobblestone/` becomes unreferenced after Task 4. **Leave it on disk.** Deleting it is a separate decision listed as a follow-up in the spec.
- The reference generator that produced the design's images is `gen-arena.mjs` in the brainstorming session scratchpad. The constants in Task 1 are already tuned to match it; if you want to re-tune, change them in `arenaFloor.ts` and re-run the tests rather than porting from the prototype again.
- If a grain test ever fails after a change, the cause is almost always a per-texel `hash2` call that should have been a thresholded `noise2`.
- Do not try to make the floor cleaner by reducing its colour count. The old grainy floor held only 20 distinct colours; this bake holds 538 and reads clean. Graininess is spatial, not chromatic — it is where values sit relative to their neighbours. Quantizing harder made things worse historically (see the disabled Bayer dither in `pixelation.ts`).
