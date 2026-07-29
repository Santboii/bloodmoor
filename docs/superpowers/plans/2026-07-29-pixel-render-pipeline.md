# Pixel Aesthetic (Workstream A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give BloodMoor a Core-Keeper-adjacent pixelated look by rendering the existing 3D scene at 360p internal resolution with nearest-neighbor upscaling, texel-snapped motion, chunkified textures, and a pixel-styled UI — per the approved spec `docs/superpowers/plans/2026-07-29-pixel-aesthetic-customization-items.md`, Workstream A.

**Architecture:** The Three.js scene, netcode, and gameplay are untouched. The EffectComposer chain is resized to a fixed internal resolution and its ping-pong buffers use `NearestFilter`, so the final screen pass upscales without smoothing. Camera and character render positions snap to the world-space texel grid to prevent shimmer. Textures are downscaled + posterized at load. UI screens swap their gothic styling for a shared pixel theme kit.

**Tech Stack:** Three.js r170 (already present), Vitest (pure node — no DOM in tests), vanilla DOM/CSS UI. **No new dependencies.**

## Global Constraints

- Internal render height: `360` px (single constant; width derived from aspect).
- Keep bloom (at half internal res) and vignette; keep ACES tone mapping.
- DOM name labels stay crisp (NOT pixelated) — per spec decision.
- All existing tests must keep passing (client 16, server 222) after every task.
- No new npm dependencies. Fonts come from the existing Google Fonts `<link>`.
- Commit style: lowercase `feat:`/`fix:` subjects, body optional, each commit ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run all client commands from `client/` (`npx vitest run`, `npx tsc --noEmit`, `npx vite build`).
- Visual verification = `npm run dev` in `server/` and `client/`, open http://localhost:5173 (auth screen suffices for UI tasks; a solo room + ready won't start a match, so in-arena checks need two tabs — see Task 2 Step 5).

---

### Task 1: Pixelation math helpers (pure, unit-tested)

**Files:**
- Create: `client/src/renderer/pixelation.ts`
- Test: `client/tests/pixelation.test.ts`

**Interfaces:**
- Produces (used by Tasks 2–5):
  - `INTERNAL_HEIGHT: number` (= 360)
  - `FRUSTUM_HALF_HEIGHT: number` (= 380, moved here from Scene.ts)
  - `internalRenderSize(cssWidth: number, cssHeight: number, internalHeight?: number): { width: number; height: number }`
  - `worldUnitsPerTexel(internalHeight?: number): number`
  - `snapToTexel(value: number, texel: number): number`
  - `posterizePixels(data: Uint8ClampedArray, levels: number): void` (in-place, RGB only, alpha untouched)

- [ ] **Step 1: Write the failing tests**

```ts
// client/tests/pixelation.test.ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run tests/pixelation.test.ts`
Expected: FAIL — cannot resolve `../src/renderer/pixelation`.

- [ ] **Step 3: Write the implementation**

```ts
// client/src/renderer/pixelation.ts
// Pixel-look constants and pure helpers. Kept DOM/WebGL-free so they are
// unit-testable in node.

/** Fixed internal render height in pixels — THE pixel-look knob. */
export const INTERNAL_HEIGHT = 360;

/** Orthographic half-height of the camera frustum in world units. */
export const FRUSTUM_HALF_HEIGHT = 380;

/** Internal render-target size for a given CSS canvas size. */
export function internalRenderSize(
  cssWidth: number,
  cssHeight: number,
  internalHeight = INTERNAL_HEIGHT,
): { width: number; height: number } {
  const height = Math.max(1, internalHeight);
  const width = Math.max(1, Math.round((cssWidth / Math.max(1, cssHeight)) * height));
  return { width, height };
}

/**
 * World units covered by one internal pixel vertically. Camera and entity
 * positions snap to multiples of this to avoid sub-texel shimmer.
 */
export function worldUnitsPerTexel(internalHeight = INTERNAL_HEIGHT): number {
  return (2 * FRUSTUM_HALF_HEIGHT) / internalHeight;
}

export function snapToTexel(value: number, texel: number): number {
  return Math.round(value / texel) * texel;
}

/** In-place posterization of RGBA pixel data (RGB only; alpha untouched). */
export function posterizePixels(data: Uint8ClampedArray, levels: number): void {
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run tests/pixelation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/pixelation.ts client/tests/pixelation.test.ts
git commit -m "feat(client): pixelation math helpers for low-res render pipeline

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Low-res render pipeline in Scene.ts

**Files:**
- Modify: `client/src/renderer/Scene.ts` (constructor, `initPostProcessing`, `onResize`, `startRenderLoop`; DELETE the adaptive-quality code: `MAX_DPR`, `qualityDpr`, `frameTimeAvg`, `lastQualityDrop`, `trackQuality`)
- Modify: `client/index.html` (canvas smoothing CSS)

**Interfaces:**
- Consumes: `internalRenderSize`, `INTERNAL_HEIGHT`, `FRUSTUM_HALF_HEIGHT` from Task 1.
- Produces: Scene renders at 360p internally, upscaled nearest to the full canvas. `FRUSTUM` constant in Scene.ts is replaced by `FRUSTUM_HALF_HEIGHT` imported from pixelation.ts (delete the local `const FRUSTUM = 380`, keep `INITIAL_CENTER_X/Z`).

**Why this works:** `EffectComposer.setSize(w, h)` sizes every pass and both ping-pong buffers; the final `OutputPass` has `renderToScreen = true`, so it draws a fullscreen quad into the default framebuffer at the renderer's full canvas size, sampling the internal-res read buffer. With `magFilter: NearestFilter` on the composer's render target (cloned into both ping-pong buffers), that sampling is the nearest-neighbor upscale. Mid-chain passes sample 1:1 so their filtering is irrelevant. Bloom's internal blur targets stay linear (that's desirable — the glow should be soft).

- [ ] **Step 1: Renderer setup — kill AA/DPR, add nearest upscale target**

In `client/src/renderer/Scene.ts`:

Replace the import of the local frustum and add pixelation imports:
```ts
import { internalRenderSize, FRUSTUM_HALF_HEIGHT } from './pixelation';
```
Delete `const FRUSTUM = 380;` and replace every use of `FRUSTUM` with `FRUSTUM_HALF_HEIGHT` (constructor camera setup and `onResize`).

Replace the renderer construction block (currently `antialias: true`, `setPixelRatio(Math.min(window.devicePixelRatio, Scene.MAX_DPR))` plus the comment about DPR caps) with:

```ts
    // Pixel look: the scene renders at INTERNAL_HEIGHT and is upscaled with
    // nearest-neighbor sampling, so AA and HiDPI supersampling are disabled —
    // they would only blur the pixels (and waste fill rate).
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // The canvas buffer is CSS-sized; the browser upscales it to device
    // pixels on HiDPI — keep that upscale crisp too.
    this.renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(this.renderer.domElement);
```

Delete the class fields `private static readonly MAX_DPR`, `qualityDpr`, `frameTimeAvg`, `lastQualityDrop` and the whole `trackQuality` method. Restore `startRenderLoop` to the simple form (no timing):

```ts
  startRenderLoop(onFrame: () => void): void {
    if (this.animFrameId !== 0) return;
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      onFrame();
      // Fall back to bare render before initPostProcessing() is called
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }
```

- [ ] **Step 2: Composer at internal resolution**

Replace `initPostProcessing()` with:

```ts
  /** Call after scene objects are added. Creates EffectComposer pipeline. */
  initPostProcessing(): void {
    const internal = internalRenderSize(window.innerWidth, window.innerHeight);
    // NearestFilter on the composer buffers is what makes the final
    // to-screen pass an unsmoothed pixel upscale.
    const target = new THREE.WebGLRenderTarget(internal.width, internal.height, {
      type: THREE.HalfFloatType,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setSize(internal.width, internal.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(internal.width / 2, internal.height / 2),
        0.5,  // strength
        0.4,  // radius
        0.3,  // threshold
      ),
    );
    this.composer.addPass(new ShaderPass(VignetteShader));
    this.composer.addPass(new OutputPass());
  }
```

And in `onResize`, replace the DPR/setSize block (everything after `updateProjectionMatrix()` up to and including `this._canvasRect = null;`) with:

```ts
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const internal = internalRenderSize(w, h);
    this.composer?.setSize(internal.width, internal.height);
    this._canvasRect = null;
```

- [ ] **Step 3: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean compile, 23 tests pass (16 existing + 7 from Task 1). If `tsc` complains about unused imports (`internalRenderSize` unused until this step is complete, etc.), fix by completing the edits — nothing here should remain unused.

- [ ] **Step 4: index.html canvas hint**

In `client/index.html`, extend the `#canvas-container` rule:

```css
    #canvas-container { position: fixed; inset: 0; }
    #canvas-container canvas { image-rendering: pixelated; }
```

- [ ] **Step 5: Visual smoke test**

With both dev servers running, open two tabs on http://localhost:5173, start a 1v1 (create + join + both ready), and check:
- World renders in visibly chunky pixels; no blurry smoothing at pixel edges.
- Bloom still glows on torches; vignette still darkens corners.
- Name labels are still crisp (DOM, unaffected).
- Mouse aiming still hits where the cursor points (screenToWorld uses CSS coords and the camera — unaffected by internal res, but verify by casting a fireball at a pillar).

Expected known imperfection at this point: slight shimmer/crawl on the floor while moving — that is Task 3's job. Do not fix it here.

- [ ] **Step 6: Commit**

```bash
git add client/src/renderer/Scene.ts client/index.html
git commit -m "feat(client): render at 360p internal with nearest-neighbor upscale

Replaces the DPR/adaptive-quality machinery: internal pixel count is now
fixed and ~20x below native retina, so the quality stepping is obsolete.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Texel-snapped camera and character motion

**Files:**
- Modify: `client/src/renderer/CameraController.ts`
- Modify: `client/src/renderer/CharacterMesh.ts` (`setPosition`)
- Test: `client/tests/CameraController.test.ts` (create)

**Interfaces:**
- Consumes: `snapToTexel`, `worldUnitsPerTexel` from Task 1.
- Produces: camera world position and every character's rendered group position land exactly on the texel grid; smooth-velocity/facing math keeps using RAW positions (snapping only affects what's rendered).

**Why:** at 360p one texel is ~2.1 world units. Sub-texel motion makes edges flicker between pixels ("shimmer"). Snapping the camera AND entities to the same grid means pixels move in whole steps — the Core Keeper crunch.

- [ ] **Step 1: Write the failing test**

```ts
// client/tests/CameraController.test.ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../src/renderer/CameraController';
import { worldUnitsPerTexel } from '../src/renderer/pixelation';

describe('CameraController texel snapping', () => {
  it('camera position lands on the texel grid (minus the fixed iso offset)', () => {
    const cam = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
    const ctl = new CameraController(cam, 1000, 1000);
    // Converge most of the way toward an off-grid target
    for (let i = 0; i < 200; i++) ctl.update(1234.567, 987.654, 1 / 60);
    const texel = worldUnitsPerTexel();
    // camera.position = (snappedX + 200, 600, snappedZ + 200)
    const gridX = (cam.position.x - 200) / texel;
    const gridZ = (cam.position.z - 200) / texel;
    expect(Math.abs(gridX - Math.round(gridX))).toBeLessThan(1e-9);
    expect(Math.abs(gridZ - Math.round(gridZ))).toBeLessThan(1e-9);
  });

  it('still converges to the target', () => {
    const cam = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
    const ctl = new CameraController(cam, 0, 0);
    for (let i = 0; i < 600; i++) ctl.update(500, 300, 1 / 60);
    const texel = worldUnitsPerTexel();
    expect(Math.abs(cam.position.x - 200 - 500)).toBeLessThanOrEqual(texel);
    expect(Math.abs(cam.position.z - 200 - 300)).toBeLessThanOrEqual(texel);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run tests/CameraController.test.ts`
Expected: FAIL on the grid assertion (positions are off-grid today).

- [ ] **Step 3: Implement snapping**

`client/src/renderer/CameraController.ts` — snap the *rendered* target while lerping the raw one:

```ts
import * as THREE from 'three';
import { snapToTexel, worldUnitsPerTexel } from './pixelation';

const LERP_FACTOR = 8;

export class CameraController {
  private currentX: number;
  private currentZ: number;

  constructor(private camera: THREE.OrthographicCamera, startX: number, startZ: number) {
    this.currentX = startX;
    this.currentZ = startZ;
  }

  /**
   * Call each frame. Smoothly moves the isometric camera to track the player.
   * playerX/playerZ are world-space XZ coordinates of the local player.
   */
  update(playerX: number, playerZ: number, delta: number): void {
    const alpha = Math.min(1, LERP_FACTOR * delta);
    this.currentX += (playerX - this.currentX) * alpha;
    this.currentZ += (playerZ - this.currentZ) * alpha;

    // Snap the rendered camera target to the texel grid — sub-texel camera
    // motion makes every edge on screen shimmer at low internal resolution.
    // The lerp above keeps working on raw coordinates so tracking stays smooth.
    const texel = worldUnitsPerTexel();
    const snappedX = snapToTexel(this.currentX, texel);
    const snappedZ = snapToTexel(this.currentZ, texel);

    // Isometric offset: camera sits 200 units "behind" and above the target on XZ
    this.camera.position.set(snappedX + 200, 600, snappedZ + 200);
    this.camera.lookAt(snappedX, 0, snappedZ);
  }
}
```

`client/src/renderer/CharacterMesh.ts` — in `setPosition`, snap only the rendered group position (velocity smoothing and facing keep the raw values). Add to the imports:

```ts
import { snapToTexel, worldUnitsPerTexel } from './pixelation';
```

and replace the final line of `setPosition` (`this.group.position.set(x, 0, y);`) with:

```ts
    // Render on the texel grid; raw x/y stay in prevX/prevZ for velocity.
    const texel = worldUnitsPerTexel();
    this.group.position.set(snapToTexel(x, texel), 0, snapToTexel(y, texel));
```

- [ ] **Step 4: Run all client tests**

Run: `cd client && npx vitest run && npx tsc --noEmit`
Expected: PASS (25 tests).

- [ ] **Step 5: Visual verification**

Two-tab match again: walk diagonally along a wall. The floor and wall edges should no longer crawl/shimmer; motion reads as chunky whole-pixel steps. Character movement should NOT feel jerky (one texel ≈ 2.1 world units; at 200 u/s that's ~95 snaps/second — smoother than the display).

- [ ] **Step 6: Commit**

```bash
git add client/src/renderer/CameraController.ts client/src/renderer/CharacterMesh.ts client/tests/CameraController.test.ts
git commit -m "feat(client): texel-snap camera and character positions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Palette + ordered-dither post pass (toggleable)

**Files:**
- Modify: `client/src/renderer/Scene.ts` (add shader const + pass in `initPostProcessing`)
- Modify: `client/src/renderer/pixelation.ts` (add `PALETTE_LEVELS`, `PALETTE_ENABLED` consts)

**Interfaces:**
- Consumes: composer chain from Task 2.
- Produces: `PALETTE_ENABLED: boolean` (default `true`), `PALETTE_LEVELS: number` (default `32`) exported from pixelation.ts; a `PalettePass` inserted after bloom, before vignette.

- [ ] **Step 1: Add the toggles to pixelation.ts**

```ts
/** Color quantization pass. Set PALETTE_ENABLED = false to disable. */
export const PALETTE_ENABLED = true;
export const PALETTE_LEVELS = 32; // per-channel levels; lower = crunchier
```

- [ ] **Step 2: Add the shader and pass to Scene.ts**

Below `VignetteShader` add:

```ts
// 4x4 Bayer ordered dithering + per-channel quantization. Runs at internal
// resolution, after bloom (so glow is quantized too) and before vignette.
const PaletteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    levels: { value: 32.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float levels;
    varying vec2 vUv;

    const mat4 BAYER = mat4(
       0.0,  8.0,  2.0, 10.0,
      12.0,  4.0, 14.0,  6.0,
       3.0, 11.0,  1.0,  9.0,
      15.0,  7.0, 13.0,  5.0
    );

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
      float threshold = (BAYER[p.x][p.y] + 0.5) / 16.0 - 0.5;
      vec3 dithered = color.rgb + threshold / levels;
      vec3 quantized = floor(dithered * (levels - 1.0) + 0.5) / (levels - 1.0);
      gl_FragColor = vec4(quantized, color.a);
    }
  `,
};
```

In `initPostProcessing`, import `PALETTE_ENABLED, PALETTE_LEVELS` from `./pixelation` and insert between the bloom pass and the vignette pass:

```ts
    if (PALETTE_ENABLED) {
      const palette = new ShaderPass(PaletteShader);
      palette.uniforms.levels.value = PALETTE_LEVELS;
      this.composer.addPass(palette);
    }
```

- [ ] **Step 3: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean, 25 tests pass.

- [ ] **Step 4: Visual verification**

In a match: torch glow and fireball trails should show subtle banding/dither texture; nothing should look posterized to mush. Flip `PALETTE_LEVELS` to 8 temporarily to confirm the pass is actually active (heavy banding), then restore to 32. If 32 is invisible on your display, 16 is an acceptable default — pick by eye and note the choice in the commit body.

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/Scene.ts client/src/renderer/pixelation.ts
git commit -m "feat(client): palette quantization + ordered dither post pass

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Chunky textures (downscale + posterize at load) and flatter lighting

**Files:**
- Modify: `client/src/renderer/AssetLoader.ts`
- Modify: `client/src/renderer/Arena.ts` (`tiledPBR`)

**Interfaces:**
- Consumes: `posterizePixels` from Task 1.
- Produces: `chunkifyTexture(tex: THREE.Texture, size?: number, levels?: number): THREE.Texture` exported from AssetLoader.ts (needs DOM canvas, so it lives here, not in pixelation.ts); all loaded textures nearest-filtered.

- [ ] **Step 1: Add chunkifyTexture + apply in AssetLoader**

In `client/src/renderer/AssetLoader.ts` add:

```ts
import { posterizePixels } from './pixelation';

/**
 * Downscale a texture to a small tile and posterize its colors — turns the
 * PBR photo textures into chunky pixel-art-adjacent tiles. Returns a new
 * CanvasTexture with nearest filtering (the original is disposed).
 */
export function chunkifyTexture(tex: THREE.Texture, size = 64, levels = 8): THREE.Texture {
  const img = tex.image as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true; // averaging down first looks better
  ctx.drawImage(img, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size);
  posterizePixels(pixels.data, levels);
  ctx.putImageData(pixels, 0, 0);

  const out = new THREE.CanvasTexture(canvas);
  out.colorSpace = tex.colorSpace;
  out.wrapS = out.wrapT = THREE.RepeatWrapping;
  out.magFilter = THREE.NearestFilter;
  out.minFilter = THREE.NearestMipmapNearestFilter;
  tex.dispose();
  return out;
}
```

In `AssetLoader.load()`, wrap the diffuse textures and nearest-filter the data maps. Replace the `return { characters..., textures... }` block's texture object with:

```ts
      textures: {
        floor: {
          map: chunkifyTexture(floorDiff),
          normalMap: nearestFilter(floorNorm),
          roughnessMap: nearestFilter(floorRough),
        },
        stone: {
          map: chunkifyTexture(stoneDiff),
          normalMap: nearestFilter(stoneNorm),
          roughnessMap: nearestFilter(stoneRough),
        },
      },
```

and add the small helper next to `chunkifyTexture`:

```ts
function nearestFilter(tex: THREE.Texture): THREE.Texture {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  return tex;
}
```

Also nearest-filter the character model textures so skin/cloth pixels match the world. After the GLTF loads resolve (inside `load()` before `return`), add:

```ts
    // Character textures must not smear under the pixel pipeline either.
    for (const gltf of [mage, amazon]) {
      gltf.scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const mat = m as THREE.MeshStandardMaterial;
          if (mat.map) { mat.map.magFilter = THREE.NearestFilter; mat.map.minFilter = THREE.NearestMipmapNearestFilter; mat.map.needsUpdate = true; }
        }
      });
    }
```

- [ ] **Step 2: Flatten lighting response in Arena.ts**

In `tiledPBR`, after constructing the material, damp the normal map (photo-real bumpiness fights the pixel look):

```ts
  const mat = new THREE.MeshStandardMaterial({
    map: apply(tex.map),
    normalMap: apply(tex.normalMap),
    roughnessMap: apply(tex.roughnessMap),
    roughness: 1,
    metalness: 0,
  });
  mat.normalScale.set(0.4, 0.4);
  return mat;
```

(Adjust the surrounding code so the function returns `mat` — today it returns the constructor expression directly.)

- [ ] **Step 3: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean, 25 tests pass.

- [ ] **Step 4: Visual verification**

Reload the game: floor/walls/pillars should read as chunky repeated tiles with flat-ish colors, not photographic stone. If the floor tiling looks too obviously repetitive at 64px, bump `chunkifyTexture(floorDiff, 96)` — judgment call, note it in the commit.

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/AssetLoader.ts client/src/renderer/Arena.ts
git commit -m "feat(client): chunkified posterized textures, nearest filtering, flatter normals

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Pixel UI theme kit + fonts

**Files:**
- Create: `client/src/ui/pixelTheme.ts`
- Modify: `client/index.html` (font link + base styles)

**Interfaces:**
- Produces (consumed by Tasks 7–9):
  - `injectPixelTheme(): void` — idempotent; appends one `<style id="px-theme">` to `<head>`.
  - CSS classes: `.px-panel`, `.px-btn`, `.px-btn-primary`, `.px-input`, `.px-title`, `.px-label`
  - CSS variables: `--px-bg: #1a1524`, `--px-panel: #241d33`, `--px-border-light: #6d5a8f`, `--px-border-dark: #0e0b16`, `--px-text: #e8dff5`, `--px-accent: #ffb347`, `--px-danger: #e05b5b`, `--px-success: #6fce7e`
  - Fonts: `'Press Start 2P'` (titles/labels, tiny sizes), `'VT323'` (body, readable at 18–20px)

- [ ] **Step 1: Fonts in index.html**

Replace the Google Fonts link (keep Cinzel/Crimson for now — Tasks 7–9 remove their uses, a follow-up can prune the link):

```html
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@700&family=Crimson+Text:ital@0;1&family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
```

And set the body font in the inline style block:

```css
    body { background: #1a1524; color: #e8dff5; font-family: 'VT323', monospace; overflow: hidden; }
```

- [ ] **Step 2: Create the theme kit**

```ts
// client/src/ui/pixelTheme.ts
// Shared pixel-art UI theme. Inject once; every screen builds from these
// classes so the "chunky bordered panel" look stays consistent.

const CSS = `
:root {
  --px-bg: #1a1524;
  --px-panel: #241d33;
  --px-border-light: #6d5a8f;
  --px-border-dark: #0e0b16;
  --px-text: #e8dff5;
  --px-accent: #ffb347;
  --px-danger: #e05b5b;
  --px-success: #6fce7e;
}

/* Chunky raised panel: hard 2px steps, no radius, no blur anywhere. */
.px-panel {
  background: var(--px-panel);
  border: 0;
  border-radius: 0;
  box-shadow:
    0 -2px 0 0 var(--px-border-light),
    0 2px 0 0 var(--px-border-dark),
    -2px 0 0 0 var(--px-border-light),
    2px 0 0 0 var(--px-border-dark),
    inset 0 2px 0 0 rgba(255,255,255,0.06);
  padding: 16px;
  color: var(--px-text);
}

.px-title {
  font-family: 'Press Start 2P', monospace;
  color: var(--px-accent);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 16px;
  text-shadow: 2px 2px 0 var(--px-border-dark);
}

.px-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--px-border-light);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.px-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  text-transform: uppercase;
  color: var(--px-text);
  background: #33294a;
  border: 0;
  border-radius: 0;
  padding: 12px 16px;
  cursor: pointer;
  box-shadow:
    0 -2px 0 0 var(--px-border-light),
    0 2px 0 0 var(--px-border-dark),
    -2px 0 0 0 var(--px-border-light),
    2px 0 0 0 var(--px-border-dark);
}
.px-btn:hover { background: #453766; }
.px-btn:active { transform: translateY(2px); box-shadow:
    0 -2px 0 0 var(--px-border-dark),
    0 2px 0 0 var(--px-border-light),
    -2px 0 0 0 var(--px-border-dark),
    2px 0 0 0 var(--px-border-light); }
.px-btn-primary { background: #a85f1a; color: #ffe9c9; }
.px-btn-primary:hover { background: #c97a26; }

.px-input {
  font-family: 'VT323', monospace;
  font-size: 20px;
  color: var(--px-text);
  background: var(--px-border-dark);
  border: 0;
  border-radius: 0;
  padding: 10px 12px;
  outline: none;
  box-shadow:
    0 -2px 0 0 var(--px-border-dark),
    0 2px 0 0 var(--px-border-light),
    -2px 0 0 0 var(--px-border-dark),
    2px 0 0 0 var(--px-border-light);
}
.px-input:focus { box-shadow:
    0 -2px 0 0 var(--px-accent),
    0 2px 0 0 var(--px-accent),
    -2px 0 0 0 var(--px-accent),
    2px 0 0 0 var(--px-accent); }
`;

export function injectPixelTheme(): void {
  if (document.getElementById('px-theme')) return;
  const style = document.createElement('style');
  style.id = 'px-theme';
  style.textContent = CSS;
  document.head.appendChild(style);
}
```

- [ ] **Step 3: Inject at startup**

In `client/src/main.ts`, near the top (after the imports, before `const container = ...`):

```ts
import { injectPixelTheme } from './ui/pixelTheme';

injectPixelTheme();
```

- [ ] **Step 4: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: clean, 25 tests pass. (No visual change yet — no screen uses the classes.)

- [ ] **Step 5: Commit**

```bash
git add client/src/ui/pixelTheme.ts client/src/main.ts client/index.html
git commit -m "feat(client): pixel UI theme kit and fonts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: HUD + minimap reskin

**Files:**
- Modify: `client/src/hud/HUD.ts` (the `<style>` block in the constructor markup)
- Modify: `client/src/hud/Minimap.ts` (border/background styling only — read the file first; keep its canvas drawing logic untouched)

**Interfaces:**
- Consumes: theme variables/classes from Task 6 (they're global CSS — the HUD's own style block may reference `var(--px-*)`).
- Produces: pixel-styled HUD; no HUD DOM ids/classes consumed by other modules change (`hud-hp`, `hud-mp`, `hud-spells`, `hud-enemies` stay).

- [ ] **Step 1: Restyle the HUD style block**

In `HUD.ts`, replace the CSS rules inside the constructor's `<style>` tag with the pixel versions. Keep every selector name identical; change only the visual properties:

```css
.hud-panel{position:fixed;bottom:0;left:0;right:0;height:72px;background:var(--px-panel);box-shadow:0 -2px 0 0 var(--px-border-light),0 -4px 0 0 var(--px-border-dark);display:flex;align-items:center;justify-content:space-between;padding:0 20px}
.orb{width:80px;height:80px;position:relative;overflow:hidden;margin-bottom:16px;background:var(--px-border-dark);box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);border:none;border-radius:0}
.orb-fill{position:absolute;inset:0;transition:transform .1s;image-rendering:pixelated}
.orb-hp .orb-fill{background:repeating-linear-gradient(0deg,#a02222 0 6px,#c23333 6px 12px)}
.orb-mp .orb-fill{background:repeating-linear-gradient(0deg,#2244a0 0 6px,#3355c2 6px 12px)}
.spells{display:flex;gap:6px}
.spell-slot{width:44px;height:44px;background:#33294a;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);border:none;border-radius:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-text);position:relative;overflow:hidden;cursor:pointer}
.spell-slot.active{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);color:var(--px-accent)}
.spell-slot .cd-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(14,11,22,0.75);transition:height .1s}
.hud-enemies{position:fixed;top:12px;right:140px;display:flex;flex-direction:column;gap:6px;min-width:160px}
.hud-enemy-entry{text-align:center}
.hud-enemy-entry .enemy-name{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);margin-bottom:3px}
.hud-enemy-entry .enemy-hp-track{height:10px;background:var(--px-border-dark);border-radius:0;overflow:hidden;width:160px;box-shadow:0 0 0 2px var(--px-border-dark)}
.hud-enemy-entry .enemy-hp-fill{height:100%;background:repeating-linear-gradient(90deg,#a02222 0 6px,#c23333 6px 12px);border-radius:0;transition:width .1s}
.hud-elim{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Press Start 2P',monospace;font-size:16px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;text-shadow:2px 2px 0 var(--px-border-dark);pointer-events:none;animation:hud-elim-fade 2s forwards}
```
(Keep the existing `@keyframes hud-elim-fade` rule unchanged.)

- [ ] **Step 2: Minimap border**

Read `client/src/hud/Minimap.ts`. Wherever its container/canvas element styling is set (border/border-radius/background), replace with `border:none;border-radius:0;box-shadow:0 0 0 2px var(--px-border-dark),0 0 0 4px var(--px-border-light);image-rendering:pixelated;`. Do not modify its drawing code.

- [ ] **Step 3: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run` — clean, 25 pass.

- [ ] **Step 4: Visual verification**

In a match: bottom panel, orbs (now striped bars-in-boxes), spell slots, enemy HP bar, and minimap all read as hard-edged pixel UI; no rounded corners or serif fonts anywhere in the HUD. Cooldown overlay and active-slot highlight still work (cast a fireball).

- [ ] **Step 5: Commit**

```bash
git add client/src/hud/HUD.ts client/src/hud/Minimap.ts
git commit -m "feat(client): pixel reskin for HUD and minimap

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Auth + Character Select reskin

**Files:**
- Modify: `client/src/auth/AuthUI.ts`
- Modify: `client/src/character/CharacterSelectUI.ts`

**Interfaces:**
- Consumes: `.px-*` classes + variables from Task 6.
- Produces: both screens pixel-styled; all element IDs and callback wiring unchanged.

**Mechanical rules for both files** (these screens use inline `style=` strings and injected style blocks; apply the same transformation everywhere):
1. Font swaps: `'Cinzel', serif` and `'Cinzel Decorative'` → `'Press Start 2P', monospace` (drop font sizes ~40% — Press Start 2P is huge); `'Crimson Text', serif` → `'VT323', monospace` (raise sizes to ≥16px for readability).
2. Every `border-radius` → `0`; every `border: 1px solid ...` → `border:0` plus the 4-way `box-shadow` border from `.px-btn`/`.px-panel` (or literally add `class="px-panel"` / `class="px-btn"` / `class="px-input"` where an element is a plain panel/button/input — prefer the class over copying styles).
3. Background gradients: keep the dark radial page backgrounds but shift hues to the theme (`#1a0a04`-style browns → `--px-bg` purples: `#1a1524`, `#0e0b16`).
4. Buttons: primary action gets `px-btn px-btn-primary`, secondary gets `px-btn`.
5. Do not touch logic, listeners, or ids. The `esc()` escaping in AuthUI stays exactly as is.

- [ ] **Step 1: Reskin AuthUI**

Apply the rules to `showLogin` and `showRegister` markup. The title block becomes:

```html
<h1 class="px-title" style="font-size:28px;margin-bottom:8px">BLOODMOOR</h1>
<p class="px-label" style="margin-bottom:6px">Arena PvP</p>
```
Inputs become `class="px-input" style="width:100%;margin-bottom:12px"`, the sign-in button `class="px-btn px-btn-primary" style="width:100%;margin-bottom:12px"`, the register button `class="px-btn" style="width:100%"`. Remove the per-input focus/blur JS listeners (`.px-input:focus` handles it) — delete the `querySelectorAll('input').forEach(...)` block in both methods.

- [ ] **Step 2: Reskin CharacterSelectUI**

Read the file, then apply the same five rules: character cards → `px-panel` (accent box-shadow when selected/hovered), SELECT buttons → `px-btn px-btn-primary`, DELETE → `px-btn`, class labels → `px-label`, name headings → `px-title` at ~12px, XP bars → square `repeating-linear-gradient` stripes like the HUD HP fill, "Create Character" dashed slots → `border:0` with a dashed `outline: 2px dashed var(--px-border-light)`.

- [ ] **Step 3: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run` — clean, 25 pass.

- [ ] **Step 4: Visual verification**

Reload → sign-out if needed → check the login screen, then sign in and check character select. Everything hard-edged, two pixel fonts only, no regressions in flows (login, register view toggle, select, delete-confirm).

- [ ] **Step 5: Commit**

```bash
git add client/src/auth/AuthUI.ts client/src/character/CharacterSelectUI.ts
git commit -m "feat(client): pixel reskin for auth and character select

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Lobby + Skill Tree reskin (and remove runtime font @imports)

**Files:**
- Modify: `client/src/lobby/LobbyUI.ts`
- Modify: `client/src/skills/SkillTreeUI.ts`

**Interfaces:**
- Consumes: `.px-*` classes + variables from Task 6.
- Produces: both screens pixel-styled; the render-blocking `@import url(...fonts.googleapis...)` lines at the top of `LobbyUI.ts`'s style constant (line ~26) and `SkillTreeUI.ts`'s `STYLES` constant (line ~92) are DELETED (fonts now come solely from index.html).

- [ ] **Step 1: LobbyUI**

Delete the `@import` line from the injected CSS. Apply the five mechanical rules from Task 8 to the lobby stylesheet (`.bm-*` classes): panels (`challenger`, `open lobbies`, `war council` chat, ready screen, result screens, pause overlay) → px-panel treatment; mode-select buttons and READY/CREATE/JOIN/REMATCH buttons → px-btn styling (READY/CREATE primary); chat input → px-input styling; fonts per rule 1. Keep every `.bm-*` class NAME and all ids — JS queries them.

- [ ] **Step 2: SkillTreeUI**

Same transformation on the `STYLES` constant: delete the `@import`, swap fonts, square off nodes/panels/buttons. Skill node circles may stay circular OR become squares — squares fit the theme better; either is acceptable, but if squares, verify the connector-line drawing between nodes still aligns (read how node positions/lines are computed before deciding; if lines anchor to element centers, squares are safe).

- [ ] **Step 3: Verify compile + tests**

Run: `cd client && npx tsc --noEmit && npx vitest run` — clean, 25 pass.

- [ ] **Step 4: Visual verification**

Walk the full loop: lobby home → skills screen (spend nothing, just look) → back → create lobby → ready screen with a second tab → play a round → result screen → rematch countdown view. Every surface pixel-styled; chat, copy-link, rematch flows still function.

- [ ] **Step 5: Commit**

```bash
git add client/src/lobby/LobbyUI.ts client/src/skills/SkillTreeUI.ts
git commit -m "feat(client): pixel reskin for lobby and skill tree, drop runtime font imports

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Final sweep — loading screen, verification, docs

**Files:**
- Modify: `client/src/loading/LoadingScreen.ts` (pixel-style the loading text/spinner with the same five rules)
- Modify: `README.md` (Tech Stack table row: "Rendering | Orthographic isometric camera" → "Rendering | Pixelated 3D — 360p internal render, nearest-neighbor upscale, orthographic isometric camera")

- [ ] **Step 1: Reskin LoadingScreen** (read file, apply the five rules; it is small)

- [ ] **Step 2: Full verification suite**

```bash
cd client && npx tsc --noEmit && npx vitest run && npx vite build
cd ../server && npx tsc --noEmit && npx vitest run
```
Expected: client 25 tests, server 222 tests, both builds clean.

- [ ] **Step 3: Full visual pass (two-tab match)**

Checklist from the spec's acceptance criteria:
- 360p internal render, fullscreen nearest-upscaled; no smoothing.
- No shimmer panning diagonally at walk speed along a wall.
- Bloom on torches, vignette, dither pass all present.
- All 6 UI surfaces (auth, char select, lobby, HUD, skill tree, loading) pixel-styled; no Cinzel/Crimson visible in-game.
- Labels crisp; aiming accurate; spell effects legible at 360p (if arrows are too thin to read, bump their mesh scale ~1.5x in `SpellRenderer` — judgment call, separate commit).

- [ ] **Step 4: Commit + update the dist build**

```bash
cd client && npx vite build
git add client/src/loading/LoadingScreen.ts README.md client/dist
git commit -m "feat(client): pixel loading screen, docs, fresh dist build

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** A1 → Tasks 1–4 (pipeline, snapping, palette/dither, config knob); A2 → Task 5; A3 → Tasks 6–9; acceptance criteria → Task 10 checklist. The spec's "no DPR-driven quality remains" → Task 2 deletes it.
- **Deliberate scope choices:** labels stay DOM-crisp (spec decision); Cinzel/Crimson stay in the index.html link until all uses are gone (pruning the link is a one-line follow-up, noted in Task 6).
- **Type consistency:** `internalRenderSize`/`worldUnitsPerTexel`/`snapToTexel`/`posterizePixels` signatures in Task 1 match every consumer in Tasks 2–5; `FRUSTUM_HALF_HEIGHT` replaces Scene's local `FRUSTUM` (Task 2) and CameraController never needs it directly (uses `worldUnitsPerTexel`).
- **Known judgment calls left to the implementer (explicitly bounded):** `PALETTE_LEVELS` 16 vs 32 (Task 4), floor chunk size 64 vs 96 (Task 5), skill nodes circles vs squares (Task 9), arrow legibility scale (Task 10).
