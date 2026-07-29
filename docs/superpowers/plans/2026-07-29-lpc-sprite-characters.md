# LPC Sprite Characters (Workstream S) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pixelated-3D character models with authentic LPC layered pixel sprites, billboarded inside the existing 3D arena — per spec `docs/superpowers/plans/2026-07-29-pixel-aesthetic-customization-items.md` Workstream S (Revision 2).

**Architecture:** World, netcode, HUD, and effects are untouched. Character rendering swaps the skinned GLB path inside `CharacterMesh` for a `SpriteCharacter`: LPC layer PNGs are composited once per player into per-animation `CanvasTexture`s, drawn on a camera-facing plane whose UVs window one 64×64 frame. Facing quantizes to LPC's 4 directions in screen space. Appearance is fixed per class in this workstream (mage/ranger default looks); customization (B-R) later just changes which layers feed the same compositor.

**Tech Stack:** Three.js r170, canvas 2D compositing, Vitest (pure node — DOM-free helpers only), curl for asset vendoring. **No new npm dependencies.**

## Global Constraints

- Asset source (verified live): `https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets/<path>` — vendored under `client/public/assets/lpc/` preserving relative paths.
- Layer paths in play this workstream (CORRECTED mid-execution against the live
  generator — clothes/hair/legs ship as single base-color sheets that the
  generator recolors at runtime; we replicate color via canvas tinting):
  - body: `body/bodies/{male,female}/{anim}.png` (light skin baked)
  - head: `head/heads/human/{male,female}/{anim}.png`
  - hair: `hair/ponytail/adult/{fg,bg}/{anim}.png` + runtime tint
  - torso: `torso/clothes/longsleeve/longsleeve/{male,female}/{anim}.png` + tint
  - legs: `legs/pants/{male,female}/{anim}.png` + tint
  - hat: `hat/magic/wizard/base/adult/{anim}/base_black.png` (per-color files — vendored under `.../base_black/{anim}.png`)
- Animations vendored/supported: `walk, run, idle, spellcast, shoot, hurt` (frame counts in Task 3's constants; `hurt` is SINGLE-row).
- Frame size 64×64; per-animation files have 4 rows in order **up, left, down, right** (except `hurt`: 1 row).
- Default appearances (from the user-approved previews): mage = male body + wizard hat base_black + longsleeve purple + pants black; ranger = female body + ponytail red (fg+bg) + longsleeve green + pants brown.
- LPC licensing: vendor a `client/public/assets/lpc/CREDITS.csv`; a credits screen must exist before merge.
- All existing tests keep passing (client 26 + growing, server 222). Client tests are pure node — no DOM/WebGL in test files.
- Commit style: lowercase `feat:`/`fix:` subject; every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Work on branch `lpc-sprites` off `main`.

---

### Task 1: Shared appearance manifest (pure, unit-tested)

**Files:**
- Create: `shared/src/appearance.ts`
- Modify: `shared/src/index.ts` (add `export * from './appearance.js';`)
- Test: `server/tests/appearance.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 2, 4, 6):
  - `type LpcLayer = { path: string; z: number; tint?: string }` — `path` is the layer directory relative to the lpc root, WITHOUT the animation segment or file; `z` is draw order (low first); `tint` is a CSS hex applied multiply-style by the compositor (clothes/hair color).
  - `type Appearance = { body: 'male' | 'female'; hairStyle: string | null; hairColor: string; torso: string; torsoColor: string; legsColor: string; hat: string | null; hatColor: string }`
  - `CLASS_DEFAULT_APPEARANCE: Record<CharacterClass, Appearance>`
  - `layersFor(a: Appearance): LpcLayer[]` — resolves an appearance to concrete layer descriptors in z-order.
  - `LPC_ANIMATIONS: Record<LpcAnimation, { frames: number; singleRow: boolean; fps: number }>` with `type LpcAnimation = 'walk' | 'run' | 'idle' | 'spellcast' | 'shoot' | 'hurt'`.

- [ ] **Step 1: Write the failing tests**

```ts
// server/tests/appearance.test.ts
import { describe, it, expect } from 'vitest';
import { CLASS_DEFAULT_APPEARANCE, layersFor, LPC_ANIMATIONS } from '@arena/shared';

describe('layersFor', () => {
  it('resolves the mage default to body, head, torso, legs, hat in z-order', () => {
    const layers = layersFor(CLASS_DEFAULT_APPEARANCE.mage);
    const paths = layers.map(l => l.path);
    expect(paths).toEqual([
      'body/bodies/male',
      'head/heads/human/male',
      'torso/clothes/longsleeve/longsleeve/male',
      'legs/pants/male',
      'hat/magic/wizard/base/adult/base_black',
    ]);
    expect(layers[2].tint).toBe('#8a5fc4'); // purple longsleeve
    expect(layers[4].tint).toBeUndefined(); // hat color baked in file
    const zs = layers.map(l => l.z);
    expect([...zs].sort((a, b) => a - b)).toEqual(zs); // already sorted
  });

  it('resolves the ranger default with hair bg behind the body and fg above the head', () => {
    const layers = layersFor(CLASS_DEFAULT_APPEARANCE.amazon);
    const paths = layers.map(l => l.path);
    expect(paths).toEqual([
      'hair/ponytail/adult/bg',
      'body/bodies/female',
      'head/heads/human/female',
      'hair/ponytail/adult/fg',
      'torso/clothes/longsleeve/longsleeve/female',
      'legs/pants/thin',
    ]);
    expect(layers[0].tint).toBe('#c0503a'); // red hair
    expect(layers[4].tint).toBe('#4d8f4d'); // green longsleeve
  });

  it('animation table matches the LPC universal layout', () => {
    expect(LPC_ANIMATIONS.walk).toEqual({ frames: 9, singleRow: false, fps: 12 });
    expect(LPC_ANIMATIONS.spellcast.frames).toBe(7);
    expect(LPC_ANIMATIONS.shoot.frames).toBe(13);
    expect(LPC_ANIMATIONS.hurt).toEqual({ frames: 6, singleRow: true, fps: 8 });
    expect(LPC_ANIMATIONS.idle.frames).toBe(2);
    expect(LPC_ANIMATIONS.run.frames).toBe(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/appearance.test.ts`
Expected: FAIL — `@arena/shared` has no export `layersFor`.

- [ ] **Step 3: Implement**

```ts
// shared/src/appearance.ts
// LPC sprite appearance manifest. Layer paths mirror the vendored directory
// structure under client/public/assets/lpc/ — the client compositor appends
// '/<animation>.png' (or '.png' variants per Task 2's vendoring layout).
import type { CharacterClass } from './types.js';

export type LpcAnimation = 'walk' | 'run' | 'idle' | 'spellcast' | 'shoot' | 'hurt';

/** Frame counts/rows per the LPC universal sheet layout. hurt is 1-row. */
export const LPC_ANIMATIONS: Record<LpcAnimation, { frames: number; singleRow: boolean; fps: number }> = {
  walk:      { frames: 9,  singleRow: false, fps: 12 },
  run:       { frames: 8,  singleRow: false, fps: 12 },
  idle:      { frames: 2,  singleRow: false, fps: 2 },
  spellcast: { frames: 7,  singleRow: false, fps: 12 },
  shoot:     { frames: 13, singleRow: false, fps: 14 },
  hurt:      { frames: 6,  singleRow: true,  fps: 8 },
};

export type Appearance = {
  body: 'male' | 'female';
  hairStyle: string | null;   // e.g. 'ponytail'
  hairColor: string;          // e.g. 'red'
  torso: string;              // e.g. 'longsleeve'
  torsoColor: string;
  legsColor: string;
  hat: string | null;         // e.g. 'wizard'
  hatColor: string;
};

export type LpcLayer = { path: string; z: number };

export const CLASS_DEFAULT_APPEARANCE: Record<CharacterClass, Appearance> = {
  mage: {
    body: 'male', hairStyle: null, hairColor: 'red',
    torso: 'longsleeve', torsoColor: 'purple', legsColor: 'black',
    hat: 'wizard', hatColor: 'base_black',
  },
  amazon: {
    body: 'female', hairStyle: 'ponytail', hairColor: 'red',
    torso: 'longsleeve', torsoColor: 'green', legsColor: 'brown',
    hat: null, hatColor: 'base_black',
  },
};

/** Color names → tint hex for base-color LPC sheets (multiply tinting). */
export const LPC_TINTS: Record<string, string> = {
  purple: '#8a5fc4', green: '#4d8f4d', black: '#4a4a52', brown: '#7d5a38',
  red: '#c0503a', blue: '#4a6fc4', white: '#f0f0f0',
};

/** Resolve an appearance to concrete layer paths in draw order (low z first). */
export function layersFor(a: Appearance): LpcLayer[] {
  const layers: LpcLayer[] = [];
  if (a.hairStyle) layers.push({ path: `hair/${a.hairStyle}/adult/bg`, z: 0, tint: LPC_TINTS[a.hairColor] });
  layers.push({ path: `body/bodies/${a.body}`, z: 10 });
  layers.push({ path: `head/heads/human/${a.body}`, z: 20 });
  if (a.hairStyle) layers.push({ path: `hair/${a.hairStyle}/adult/fg`, z: 30, tint: LPC_TINTS[a.hairColor] });
  layers.push({ path: `torso/clothes/${a.torso}/${a.torso}/${a.body}`, z: 40, tint: LPC_TINTS[a.torsoColor] });
  // Female-fit pants live under 'thin' upstream, not 'female'.
  layers.push({ path: `legs/pants/${a.body === 'female' ? 'thin' : 'male'}`, z: 50, tint: LPC_TINTS[a.legsColor] });
  if (a.hat) layers.push({ path: `hat/magic/${a.hat}/base/adult/${a.hatColor}`, z: 60 });
  return layers.sort((x, y) => x.z - y.z);
}
```

Add to `shared/src/index.ts`: `export * from './appearance.js';`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/appearance.test.ts` then the full suites: `npx vitest run && npx tsc --noEmit` and `cd ../client && npx tsc --noEmit && npx vitest run`.
Expected: all green (server 225, client 26).

- [ ] **Step 5: Commit**

```bash
git add shared/src/appearance.ts shared/src/index.ts server/tests/appearance.test.ts
git commit -m "feat(shared): LPC appearance manifest and layer resolver

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Vendor LPC sheets + credits

**Files:**
- Create: `scripts/vendor-lpc.mjs`
- Create (downloaded): `client/public/assets/lpc/**.png`, `client/public/assets/lpc/CREDITS.csv`

**Interfaces:**
- Consumes: layer paths from Task 1's `layersFor` for both default appearances.
- Produces: for every layer path P and every animation A in `LPC_ANIMATIONS`, a file at `client/public/assets/lpc/<P>/<A>.png`. The compositor (Task 4) loads exactly `assets/lpc/${layer.path}/${anim}.png`.

**Vendoring layout note (this is the key normalization):** upstream, uncolored
layers (body, head) are `<dir>/<anim>.png` while colored layers are
`<dir>/<anim>/<color>.png`. The script downloads whichever exists and always
SAVES to the normalized `<layer-path-including-color>/<anim>.png` so the
client needs no special cases.

- [ ] **Step 1: Write the vendoring script**

```js
// scripts/vendor-lpc.mjs
// Downloads the LPC layer sheets needed for the two default appearances.
// Usage: node scripts/vendor-lpc.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets';
const OUT = 'client/public/assets/lpc';
const ANIMS = ['walk', 'run', 'idle', 'spellcast', 'shoot', 'hurt'];

// Mirror of shared/src/appearance.ts layersFor() for both defaults —
// kept inline so the script runs without a build step.
const LAYERS = [
  // mage
  'body/bodies/male',
  'head/heads/human/male',
  'torso/clothes/longsleeve/longsleeve/male',
  'legs/pants/male',
  'hat/magic/wizard/base/adult/base_black',   // hat: per-color files upstream
  // ranger
  'hair/ponytail/adult/bg',
  'body/bodies/female',
  'head/heads/human/female',
  'hair/ponytail/adult/fg',
  'torso/clothes/longsleeve/longsleeve/female',
  'legs/pants/thin',   // female-fit pants are 'thin' upstream
];

// A layer path either ends in a color (upstream: <dir>/<anim>/<color>.png)
// or not (upstream: <dir>/<anim>.png). Try color-style first, fall back.
function candidates(layer, anim) {
  const parts = layer.split('/');
  const color = parts[parts.length - 1];
  const dir = parts.slice(0, -1).join('/');
  return [
    `${BASE}/${dir}/${anim}/${color}.png`, // colored layout
    `${BASE}/${layer}/${anim}.png`,        // plain layout
  ];
}

let ok = 0, missing = [];
for (const layer of [...new Set(LAYERS)]) {
  for (const anim of ANIMS) {
    const dest = join(OUT, layer, `${anim}.png`);
    let saved = false;
    for (const url of candidates(layer, anim)) {
      const res = await fetch(url);
      if (res.ok) {
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, Buffer.from(await res.arrayBuffer()));
        ok++; saved = true;
        break;
      }
    }
    if (!saved) missing.push(`${layer}/${anim}`);
  }
}
console.log(`saved ${ok} sheets`);
if (missing.length) {
  console.log('MISSING (needs investigation, not necessarily fatal):');
  for (const m of missing) console.log('  ' + m);
}
```

- [ ] **Step 2: Run it and inspect**

Run: `node scripts/vendor-lpc.mjs`
Expected: `saved 66 sheets` (11 unique layers × 6 animations). Some `hurt`
files may be missing for hats/hair (LPC coverage varies) — record any
missing list verbatim in your report; the compositor treats a missing layer
file for an animation as "skip this layer for that animation", so partial
coverage is acceptable, but the six BODY and HEAD sheets must all exist
(hard failure if not — report BLOCKED).

Sanity: `find client/public/assets/lpc -name '*.png' | wc -l` matches the
saved count, and `file client/public/assets/lpc/body/bodies/male/walk.png`
reports a PNG of 576×256 (9 cols × 64, 4 rows × 64).

- [ ] **Step 3: Credits file**

Download the credits for the whole collection:
```bash
curl -fsSL 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/CREDITS.csv' -o client/public/assets/lpc/CREDITS.csv
```
If that URL 404s, fetch `https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/CREDITS.csv` instead. Verify the file is non-empty CSV text. (Filtering to just our sheets happens in Task 7's credits screen; vendoring the full CSV is fine and safest attribution-wise.)

- [ ] **Step 4: Commit**

```bash
git add scripts/vendor-lpc.mjs client/public/assets/lpc
git commit -m "feat(client): vendor LPC sprite sheets for default class appearances

Art: Liberated Pixel Cup contributors (CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0),
see client/public/assets/lpc/CREDITS.csv

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Frame math + screen-space direction quantization (pure, unit-tested)

**Files:**
- Create: `client/src/renderer/sprites/lpc.ts`
- Test: `client/tests/lpc.test.ts`

**Interfaces:**
- Consumes: `LPC_ANIMATIONS`, `LpcAnimation` from `@arena/shared`.
- Produces (consumed by Tasks 4–5):
  - `FRAME = 64`
  - `type LpcDirection = 0 | 1 | 2 | 3` — row order `up=0, left=1, down=2, right=3`.
  - `frameRect(anim: LpcAnimation, dir: LpcDirection, frame: number): { sx: number; sy: number }` — pixel offset of a frame inside a per-animation sheet (row 0 for single-row anims regardless of dir).
  - `directionFromWorldAngle(worldAngle: number): LpcDirection` — converts the server's world-space facing angle (atan2 of world dx,dy) to a screen direction, compensating for the isometric camera yaw (camera sits at +X+Z, so screen-up is world -X-Z): `screenAngle = worldAngle + PI/4`, then quantized into 4 sectors centered on right/down/left/up.
  - `animationFrame(anim: LpcAnimation, elapsedSec: number, loop: boolean): number` — fps-based frame index; when `loop` is false, clamps at the last frame.

- [ ] **Step 1: Write the failing tests**

```ts
// client/tests/lpc.test.ts
import { describe, it, expect } from 'vitest';
import { FRAME, frameRect, directionFromWorldAngle, animationFrame } from '../src/renderer/sprites/lpc';

describe('frameRect', () => {
  it('indexes rows by direction and columns by frame', () => {
    expect(frameRect('walk', 0, 0)).toEqual({ sx: 0, sy: 0 });          // up row
    expect(frameRect('walk', 2, 3)).toEqual({ sx: 3 * FRAME, sy: 2 * FRAME }); // down row
    expect(frameRect('walk', 3, 8)).toEqual({ sx: 8 * FRAME, sy: 3 * FRAME });
  });

  it('single-row animations always use row 0', () => {
    expect(frameRect('hurt', 2, 4)).toEqual({ sx: 4 * FRAME, sy: 0 });
    expect(frameRect('hurt', 1, 0)).toEqual({ sx: 0, sy: 0 });
  });
});

describe('directionFromWorldAngle', () => {
  // Camera yaw is 45°: world +X+Z is toward the camera (screen down-ish).
  // A player walking screen-right presses D, which the input handler maps to
  // world direction (cos(-45°), sin(-45°)) → world angle -PI/4 → screen right.
  it('maps the four screen-cardinal world angles to LPC rows', () => {
    expect(directionFromWorldAngle(-Math.PI / 4)).toBe(3); // screen right
    expect(directionFromWorldAngle((3 * Math.PI) / 4)).toBe(1); // screen left
    expect(directionFromWorldAngle(Math.PI / 4)).toBe(2); // screen down
    expect(directionFromWorldAngle((-3 * Math.PI) / 4)).toBe(0); // screen up
  });

  it('quantizes in-between angles to the nearest cardinal', () => {
    expect(directionFromWorldAngle(-Math.PI / 4 + 0.3)).toBe(3);
    expect(directionFromWorldAngle(-Math.PI / 4 - 0.3)).toBe(3);
  });
});

describe('animationFrame', () => {
  it('advances at the animation fps and loops', () => {
    // walk: 9 frames at 12 fps → frame 0 at t=0, frame 11*? at t just under 1/12
    expect(animationFrame('walk', 0, true)).toBe(0);
    expect(animationFrame('walk', 1 / 12 + 0.001, true)).toBe(1);
    expect(animationFrame('walk', 9 / 12 + 0.001, true)).toBe(0); // wrapped
  });

  it('clamps at the final frame when not looping', () => {
    expect(animationFrame('hurt', 10, false)).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run tests/lpc.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// client/src/renderer/sprites/lpc.ts
// Pure LPC sheet math — DOM-free so it is unit-testable in node.
import { LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';

export const FRAME = 64;

/** LPC per-animation sheets order rows: up, left, down, right. */
export type LpcDirection = 0 | 1 | 2 | 3;

export function frameRect(anim: LpcAnimation, dir: LpcDirection, frame: number): { sx: number; sy: number } {
  const meta = LPC_ANIMATIONS[anim];
  const row = meta.singleRow ? 0 : dir;
  return { sx: frame * FRAME, sy: row * FRAME };
}

/**
 * World-space facing angle → LPC row, compensating for the fixed isometric
 * camera yaw (45°). Sector centers land on the four screen cardinals.
 */
export function directionFromWorldAngle(worldAngle: number): LpcDirection {
  const screen = worldAngle + Math.PI / 4;
  // Normalize to [0, 2PI) with sector centers at right(0), down(PI/2), ...
  const norm = ((screen % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sector = Math.round(norm / (Math.PI / 2)) % 4; // 0=right,1=down,2=left,3=up
  return ([3, 2, 1, 0] as const)[sector];
}

export function animationFrame(anim: LpcAnimation, elapsedSec: number, loop: boolean): number {
  const meta = LPC_ANIMATIONS[anim];
  const raw = Math.floor(elapsedSec * meta.fps);
  return loop ? raw % meta.frames : Math.min(raw, meta.frames - 1);
}
```

- [ ] **Step 4: Run tests — all client tests + tsc**

Run: `cd client && npx vitest run && npx tsc --noEmit`
Expected: PASS (33 client tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/sprites/lpc.ts client/tests/lpc.test.ts
git commit -m "feat(client): LPC frame math and screen-space direction quantization

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Sprite compositor

**Files:**
- Create: `client/src/renderer/sprites/SpriteCompositor.ts`

**Interfaces:**
- Consumes: `layersFor`, `LPC_ANIMATIONS` from `@arena/shared`; `FRAME` from Task 3.
- Produces (consumed by Task 5):
  - `compositeAppearance(a: Appearance): Promise<Record<LpcAnimation, THREE.CanvasTexture | null>>` — one composited texture per animation (null when no layer had a sheet for it); textures use `NearestFilter`, `generateMipmaps = false`, `colorSpace = SRGBColorSpace`.
  - `disposeComposite(c: Record<LpcAnimation, THREE.CanvasTexture | null>): void`

- [ ] **Step 1: Implement**

```ts
// client/src/renderer/sprites/SpriteCompositor.ts
// Composites the LPC layer sheets for one appearance into a single canvas
// per animation. Runs once per player per appearance — never per frame.
import * as THREE from 'three';
import { Appearance, layersFor, LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';
import { FRAME } from './lpc';

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  let cached = imageCache.get(url);
  if (!cached) {
    cached = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      // Missing sheets (e.g. no hurt variant for a hat) just skip the layer.
      img.onerror = () => resolve(null);
      img.src = url;
    });
    imageCache.set(url, cached);
  }
  return cached;
}

export async function compositeAppearance(
  a: Appearance,
): Promise<Record<LpcAnimation, THREE.CanvasTexture | null>> {
  const layers = layersFor(a);
  const out = {} as Record<LpcAnimation, THREE.CanvasTexture | null>;

  for (const anim of Object.keys(LPC_ANIMATIONS) as LpcAnimation[]) {
    const meta = LPC_ANIMATIONS[anim];
    const images = await Promise.all(
      layers.map(l => loadImage(`/assets/lpc/${l.path}/${anim}.png`)),
    );
    const present = images.filter((i): i is HTMLImageElement => i !== null);
    if (present.length === 0) { out[anim] = null; continue; }

    const rows = meta.singleRow ? 1 : 4;
    const canvas = document.createElement('canvas');
    canvas.width = meta.frames * FRAME;
    canvas.height = rows * FRAME;
    const ctx = canvas.getContext('2d')!;
    images.forEach((img, i) => {
      if (!img) return;
      const tint = layers[i].tint;
      if (!tint) { ctx.drawImage(img, 0, 0); return; }
      // Multiply-tint the base-gray LPC sheet, preserving its alpha.
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const t = tmp.getContext('2d')!;
      t.drawImage(img, 0, 0);
      t.globalCompositeOperation = 'multiply';
      t.fillStyle = tint;
      t.fillRect(0, 0, tmp.width, tmp.height);
      t.globalCompositeOperation = 'destination-in';
      t.drawImage(img, 0, 0);
      ctx.drawImage(tmp, 0, 0);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    out[anim] = tex;
  }
  return out;
}

export function disposeComposite(c: Record<LpcAnimation, THREE.CanvasTexture | null>): void {
  for (const tex of Object.values(c)) tex?.dispose();
}
```

- [ ] **Step 2: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean, 33 pass. (Browser behavior is verified in Task 6's live check.)

- [ ] **Step 3: Commit**

```bash
git add client/src/renderer/sprites/SpriteCompositor.ts
git commit -m "feat(client): LPC layer compositor producing per-animation canvas textures

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: SpriteCharacter billboard + animation state machine

**Files:**
- Create: `client/src/renderer/sprites/SpriteCharacter.ts`

**Interfaces:**
- Consumes: Tasks 3–4; `worldUnitsPerTexel` from `client/src/renderer/pixelation.ts`.
- Produces (consumed by Task 6):
  - `class SpriteCharacter { readonly group: THREE.Group; constructor(appearance: Appearance, charClass: CharacterClass); update(delta: number, speed: number, isCasting: boolean): void; setFacing(worldAngle: number): void; die(): void; dispose(): void }`
  - `group` contains the billboard plane and a blob shadow; caller positions the group.

- [ ] **Step 1: Implement**

```ts
// client/src/renderer/sprites/SpriteCharacter.ts
// A player character as an LPC sprite billboard: one plane whose UVs window
// a 64x64 frame of the composited per-animation texture, plus a blob shadow.
import * as THREE from 'three';
import { Appearance, LPC_ANIMATIONS, LpcAnimation, CharacterClass } from '@arena/shared';
import { worldUnitsPerTexel } from '../pixelation';
import { FRAME, LpcDirection, frameRect, directionFromWorldAngle, animationFrame } from './lpc';
import { compositeAppearance, disposeComposite } from './SpriteCompositor';

// One sprite pixel = one internal render pixel: the billboard is FRAME
// texels tall in world units. LPC bodies occupy ~48px of the 64px frame,
// giving an on-screen character close to the old 50-world-unit models.
const SPRITE_SCALE = 1;

const SHADOW_GEO = new THREE.CircleGeometry(11, 16);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });

export class SpriteCharacter {
  readonly group = new THREE.Group();
  private plane: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private textures: Record<LpcAnimation, THREE.CanvasTexture | null> | null = null;
  private anim: LpcAnimation = 'idle';
  private animElapsed = 0;
  private direction: LpcDirection = 2; // facing screen-down
  private dead = false;
  private castAnim: LpcAnimation;
  private casting = false;
  private lastFrameKey = '';

  constructor(appearance: Appearance, charClass: CharacterClass) {
    this.castAnim = charClass === 'amazon' ? 'shoot' : 'spellcast';

    const size = FRAME * worldUnitsPerTexel() * SPRITE_SCALE;
    this.material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.01 });
    this.material.visible = false; // until textures arrive
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.material);
    // Billboard: face the isometric camera (matches its fixed orientation).
    this.plane.rotation.order = 'YXZ';
    this.plane.rotation.y = Math.PI / 4;
    this.plane.rotation.x = -Math.atan(600 / Math.hypot(200, 200));
    this.plane.position.y = size / 2;
    this.group.add(this.plane);

    const shadow = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.5;
    this.group.add(shadow);

    compositeAppearance(appearance).then(tex => {
      this.textures = tex;
      this.material.visible = true;
      this.applyFrame(true);
    });
  }

  setFacing(worldAngle: number): void {
    if (this.dead) return;
    this.direction = directionFromWorldAngle(worldAngle);
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.anim = 'hurt';
    this.animElapsed = 0;
  }

  update(delta: number, speed: number, isCasting: boolean): void {
    this.animElapsed += delta;
    if (!this.dead) {
      let next: LpcAnimation;
      if (isCasting || (this.casting && this.animElapsed < LPC_ANIMATIONS[this.castAnim].frames / LPC_ANIMATIONS[this.castAnim].fps)) {
        next = this.castAnim;
      } else if (speed > 220) {
        next = 'run';
      } else if (speed > 1.5) {
        next = 'walk';
      } else {
        next = 'idle';
      }
      if (isCasting && !this.casting) this.animElapsed = 0; // restart cast
      this.casting = next === this.castAnim && (isCasting || this.casting);
      if (next !== this.anim && !(this.casting && this.anim === this.castAnim)) {
        this.anim = next;
        this.animElapsed = 0;
      }
    }
    this.applyFrame(false);
  }

  private applyFrame(force: boolean): void {
    if (!this.textures) return;
    const tex = this.textures[this.anim] ?? this.textures.idle ?? this.textures.walk;
    if (!tex) return;
    const meta = LPC_ANIMATIONS[this.anim];
    const loop = this.anim !== 'hurt' && this.anim !== this.castAnim;
    const frame = animationFrame(this.anim, this.animElapsed, loop);
    const key = `${this.anim}:${this.direction}:${frame}`;
    if (!force && key === this.lastFrameKey) return;
    this.lastFrameKey = key;

    if (this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }
    const { sx, sy } = frameRect(this.anim, this.direction, frame);
    const rows = meta.singleRow ? 1 : 4;
    tex.repeat.set(FRAME / (meta.frames * FRAME), FRAME / (rows * FRAME));
    tex.offset.set(sx / (meta.frames * FRAME), 1 - (sy + FRAME) / (rows * FRAME));
  }

  dispose(): void {
    this.plane.geometry.dispose();
    this.material.dispose();
    if (this.textures) disposeComposite(this.textures);
  }
}
```

**Note on texture windowing:** `repeat`/`offset` on the shared texture works
because each `SpriteCharacter` owns its OWN composited `CanvasTexture`s
(per-player compositor output) — two players never share a texture object.

- [ ] **Step 2: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean, 33 pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/renderer/sprites/SpriteCharacter.ts
git commit -m "feat(client): LPC sprite billboard with animation state machine

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: CharacterMesh integration (swap GLB path → sprite)

**Files:**
- Modify: `client/src/renderer/CharacterMesh.ts` (constructor signature and body; keep ring/label/setVisible/updateLabel/dispose/texel-snap; delete the SkeletonUtils/animator path)
- Modify: `client/src/main.ts` (CharacterMesh construction site — pass class instead of GLTF; facing plumbed to sprite)

**Interfaces:**
- Consumes: Task 5's `SpriteCharacter`; `CLASS_DEFAULT_APPEARANCE` from `@arena/shared`.
- Produces: `new CharacterMesh(charClass: CharacterClass, color: number, displayName: string, labelContainer: HTMLElement)` — same public methods as today (`setPosition(x, y, facing?)`, `update(delta, isCasting)`, `die()`, `setVisible(v)`, `updateLabel(camera, rect)`, `dispose(container)`).

- [ ] **Step 1: Rewire CharacterMesh**

Replace the GLB clone/scale/tint block and `CharacterAnimator` with:
- constructor takes `charClass: CharacterClass` (not `gltf: GLTF`), builds `this.sprite = new SpriteCharacter(CLASS_DEFAULT_APPEARANCE[charClass], charClass)` and adds `this.sprite.group` to `this.group`.
- keep the glow ring (`RING_GEOMETRY` + per-instance tinted material — the ring remains the team-color indicator), DOM label, `LABEL_POS` machinery, and the texel-snapped `group.position` logic in `setPosition` exactly as-is.
- in `setPosition`, after the existing smoothing math, forward facing: when `smoothMag > 0.05` call `this.sprite.setFacing(Math.atan2(this.smoothVelZ === 0 ? 0 : this.smoothVelZ, this.smoothVelX))` using the smoothed WORLD velocity vector (`atan2(velZ, velX)` — world angle convention matches the server's `facing`); otherwise if `facing !== undefined` call `this.sprite.setFacing(facing)`. Delete the `group.rotation.y` lines — billboards never rotate.
- `update(delta, isCasting)` → `this.sprite.update(delta, this.velocityMag, isCasting)`.
- `die()` → `this.sprite.die()`.
- `dispose()` additionally calls `this.sprite.dispose()`.
- `TARGET_HEIGHT` stays only for the label offset (keep the label height math unchanged).

- [ ] **Step 2: Update main.ts call site**

In the render loop where meshes are created, replace the `gltf` selection
(`assets.characters.amazon / mage`) with:
```ts
const mesh = new CharacterMesh(player.charClass, PLAYER_COLORS[colorIndex], player.displayName, uiOverlay);
```
(`player.charClass` is already on `PlayerState`.) Leave `assets` texture usage (arena) untouched for now — GLB removal happens in Task 7.

- [ ] **Step 3: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean, 33 pass. If `AssetLoader`'s character types are now unused imports here, remove just the imports this file owns — full AssetLoader cleanup is Task 7.

- [ ] **Step 4: Visual smoke test (controller runs this; skip as implementer, note it)**

Two-tab match: both classes render as LPC sprites, walk animation plays while moving, facing follows screen direction (press D → right-facing row), mage fireball cast plays spellcast, ranger arrows play shoot, death plays hurt once and holds, blob shadows under both, name labels/rings unchanged.

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/CharacterMesh.ts client/src/main.ts
git commit -m "feat(client): render characters as LPC sprite billboards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Retire GLB pipeline + credits screen

**Files:**
- Modify: `client/src/renderer/AssetLoader.ts` (remove GLTF loading + `characters` from `LoadedAssets`; keep textures)
- Modify: `client/src/main.ts` (drop `assets.characters` uses; adjust `LoadedAssets` typing)
- Delete: `client/src/renderer/CharacterAnimator.ts`
- Modify: `client/src/lobby/LobbyUI.ts` (add a "Credits" button on the home screen opening a `px-panel` overlay)
- Create: `client/src/ui/CreditsScreen.ts`

**Interfaces:**
- Produces: `CreditsScreen` fetches `/assets/lpc/CREDITS.csv`, renders artist names + license lines + a link to the LPC collection, in pixel-theme styling; LobbyUI home screen gains an unobtrusive `px-btn` "Credits" that opens it. README gains an "Art credits" section pointing at the CSV.

- [ ] **Step 1: AssetLoader cleanup**

Remove `GLTFLoader` import, `loadGLTF`, the mage/amazon entries from the
`Promise.all`, and the `characters` field from `LoadedAssets`; delete the
character-texture nearest-filter traversal block (no more GLTFs). Delete
`client/src/renderer/CharacterAnimator.ts` (no longer imported). Grep for
stray imports of `CharacterAnimator`/`SkeletonUtils` — must be zero.

- [ ] **Step 2: Credits screen**

```ts
// client/src/ui/CreditsScreen.ts
// LPC art requires attribution (CC-BY-SA / OGA-BY / GPL). Renders the vendored
// CREDITS.csv grouped by license, inside a pixel-theme overlay.
export class CreditsScreen {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = 'position:fixed;inset:0;z-index:500;display:none;background:rgba(14,11,22,0.9);overflow-y:auto;';
    this.el.innerHTML = `
      <div class="px-panel" style="max-width:640px;margin:48px auto;padding:24px">
        <div class="px-title" style="margin-bottom:12px">Art Credits</div>
        <div style="font-family:'VT323',monospace;font-size:18px;line-height:1.5;margin-bottom:12px">
          Character sprites are from the <b>Liberated Pixel Cup</b> collection
          (lpc.opengameart.org), licensed CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0.
        </div>
        <pre id="credits-body" style="font-family:'VT323',monospace;font-size:16px;white-space:pre-wrap;max-height:50vh;overflow-y:auto"></pre>
        <button id="credits-close" class="px-btn" style="margin-top:16px">Close</button>
      </div>`;
    container.appendChild(this.el);
    this.el.querySelector('#credits-close')!.addEventListener('click', () => this.hide());
  }

  async show(): Promise<void> {
    this.el.style.display = 'block';
    const body = this.el.querySelector('#credits-body')!;
    if (!body.textContent) {
      try {
        const csv = await fetch('/assets/lpc/CREDITS.csv').then(r => r.text());
        body.textContent = csv;
      } catch {
        body.textContent = 'See client/public/assets/lpc/CREDITS.csv';
      }
    }
  }

  hide(): void { this.el.style.display = 'none'; }
}
```
Wire in `main.ts` (construct next to the other UIs) and add a small
`px-btn` "Credits" to the LobbyUI home screen (same pattern as the existing
Skills/Switch buttons; new callback `onShowCredits`). README: add
`## Art credits` section (LPC attribution + CSV path).

- [ ] **Step 3: Verify + build**

`cd client && npx tsc --noEmit && npx vitest run && npx vite build` — clean, 33 pass.
Bundle note in report: dropping GLTFLoader should shrink the app chunk; record the new size.

- [ ] **Step 4: Commit**

```bash
git add -A client/src README.md client/dist
git commit -m "feat(client): retire GLB character pipeline, add LPC credits screen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Final verification sweep

- [ ] **Step 1: Full suites both packages** (`client` tsc+vitest+build, `server` tsc+vitest) — expected client 33, server 225, builds clean.
- [ ] **Step 2: Controller visual pass (two-tab match):** the Task 6 Step 4 checklist plus: rejoin mid-match keeps sprites intact; rematch rebuilds sprites; same-class mirror match shows two independent sprites; credits screen opens from lobby and lists artists.
- [ ] **Step 3: Commit any dist refresh; done.**

---

## Self-review notes
- Spec coverage: S1 → Tasks 1–2; S2 → Tasks 3–6; credits requirement → Tasks 2 + 7; GLB retirement → Task 7; acceptance criteria → Tasks 6/8 checklists.
- Type consistency: `Appearance`/`LpcAnimation`/`layersFor` (Task 1) match consumers in Tasks 4–6; `frameRect/animationFrame/directionFromWorldAngle` signatures consistent between Tasks 3 and 5.
- Known judgment calls bounded for implementers: run-vs-walk speed threshold (Task 5, `speed > 220` — current max speed is 200, so run only triggers with future speed buffs; acceptable), blob shadow radius, hurt-animation coverage gaps for hats/hair (explicitly tolerated by the compositor).
- Deliberately deferred to B-R: skin tones, hair styles beyond ponytail, appearance DB column. Deferred to C2-R: weapon layers.
