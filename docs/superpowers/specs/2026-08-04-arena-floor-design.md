# Arena Floor — Design

**Date:** 2026-08-04
**Status:** Approved
**Replaces:** the tiled cobblestone floor from `5a173ca` / `97634f9`.

## 0. Problem

The floor is a photograph (`/assets/textures/cobblestone/diffuse.jpg`) crushed to a 64×64 tile by `chunkifyTexture` and posterized to 12 levels, then tiled once per 200 world units with `NearestFilter`.

Three distinct defects, all visible at native resolution:

1. **Grain.** Gravel and moss between the cobbles survive the downsample as per-texel speckle. Posterizing hardens the speckle into confetti rather than smoothing it, and nearest magnification blows each fleck up to roughly five device pixels. This is not a resolution problem — it is noise faithfully preserved and then enlarged.
2. **Repetition.** The camera shows 660 world units of height, so a 200-unit tile repeats 3.3× per screen. The seam bands horizontally.
3. **No composition.** The ground is uniform everywhere, so it gives the player nothing to orient by.

## 1. Approach: bake the whole floor once

A texel today is `200 / 64` = 3.125 world units, and that scale is preserved exactly. The arena is 2000 units, so **the entire floor is `2000 / 3.125` = 640×640 texels** — small enough to bake as a single image instead of a repeating tile.

This dissolves defect 2 by construction and makes defect 3 addressable: the floor becomes an authored composition with real positions for the pit, kerb, spill, and wear. Defect 1 is addressed by generating the image procedurally from flat fills and low-frequency noise, so there is no per-texel noise to preserve.

Rejected alternatives:

- **Denoise the existing photo** (median + palette ramp). Removes the grain but leaves cobbles too small to read as structure, and makes the tile seam *more* obvious by removing the noise that hid it.
- **Tiled procedural flagstone + a separate circular mesh for the pit.** Cheaper to bake and the fallback if §6 measurement goes badly, but it cannot express sand spilled over the kerb, wear around pillars, or any variation that crosses the tile boundary.

## 2. Composition

Centre `(1000, 1000)`, matching the arena centre.

| Element | Value |
|---|---|
| Pit radius | **700** |
| Kerb width | **34** (outer edge 734) |
| Edge wobble | **6** (drafted circle, not eroded) |
| Sand spill | up to **46** units past the kerb |
| Mortar | `#4a443a` |

Pillar radii from the centre are 650 (×2), 743 (×2), 750, 790 (×2) and 955 (×2), plus the pillar at the centre itself. At r 700 the two 650-pillars stand just inside the sand near the rim and the rest sit out on stone, so the columns frame the pit. The centre pillar stands in the middle of the sand as a stake to fight around.

Where a kerb crosses a pillar the collision is not a defect: the pillar is a solid `BoxGeometry(56, 80, 56)` sitting on the floor, so it hides the texels beneath it and reads as a column embedded in the pit wall.

**Edge is drafted, not eroded.** At r 700 an irregular outline reads as an unsteady line rather than as erosion. The sand spilled over the kerb is what keeps the drafted circle from looking machined.

### Materials

- **Flagstone field.** Greedy masonry pack on an 8-texel unit grid: row heights of 2 or 3 units, slab widths of 2–5 units, staggered row starts, per-edge wobble of ±1 texel. Slab value comes from low-frequency noise sampled at the slab centre (so value drifts in patches instead of jumping per slab) plus a small per-slab jitter, quantized to a 6-entry warm stone ramp. One-texel highlight on the top edge, one-texel shadow on the bottom. 13% of slabs get a wandering one-texel crack; 16% get a chipped corner.
- **Sand.** Two octaves of value noise (lattice 64 and 26 texels) plus a directional drag term, quantized to a 5-entry warm ramp. Wear toward the middle is offset from centre and noise-modulated.
- **Kerb.** 96 blocks around the ring, three-entry darker ramp, joints at block boundaries, highlight on the inner band.
- **Spill.** Thresholded low-frequency noise, so sand banks in tongues.
- **Pillar wear.** Smooth radial falloff (110-unit reach) modulated by low-frequency noise, darkening and warming the ground beneath.

**Fewer colours does not mean cleaner.** The current floor holds only 20 distinct colours and is still the grainy one; the bake holds 538 and reads clean. Graininess is spatial, not chromatic — it is where values sit relative to their neighbours, not how many exist. Quantizing harder is not a fix and made things worse historically (see the disabled Bayer dither in `pixelation.ts`).

**Nothing may use per-texel randomness for placement.** Both the spill and the pillar wear were first written as per-texel coin flips and produced exactly the confetti this work exists to remove. Any later "scatter some detail" addition must threshold low-frequency noise instead. This is the single most important constraint in this document.

**No radially symmetric detail inside the pit.** Concentric rake arcs were tried and cut: centred on the pit they read as wood grain and turned the arena into a hypnotic bullseye. Drag marks run in one direction.

### Mortar is a fill, not a gap

Slabs are inset into their cells. The mortar colour must be **filled across the whole buffer first**, with slabs then drawn inset into it. Leaving the gaps unwritten leaves them at the buffer's initial value — pure black, a far heavier joint than any grout colour. The prototype had this bug: `GROUT` only ever reached chipped corners and kerb joints, so the floor read against black mortar and lightening the constant appeared to do nothing. Rendered, `#4a443a` mortar sits at 112,97,85 against a darkest slab of 117,108,104.

## 3. Module boundaries

**New: `client/src/renderer/arenaFloor.ts`** — DOM- and WebGL-free, following the precedent set by `pixelation.ts` ("kept DOM/WebGL-free so they are unit-testable in node").

```ts
export interface FloorOptions { pitRadius?: number; kerbWidth?: number; edgeWobble?: number; mortar?: string; }
/** Bakes the whole arena floor. Deterministic: same options always produce the same bytes. */
export function bakeArenaFloor(size: number, opts?: FloorOptions): Uint8ClampedArray;
```

Pure function, RGBA out, no randomness beyond the seeded integer hash. Every tuning value in §2 is a named constant in this module.

**Changed: `AssetLoader`** — gains a `bakedFloorTexture()` alongside `chunkifyTexture`, which wraps the bytes in a canvas and returns a `CanvasTexture` with `SRGBColorSpace`, `NearestFilter` / `NearestMipmapNearestFilter`, and `ClampToEdgeWrapping` (the texture covers the plane exactly; it must never repeat). Stops loading `cobblestone/diffuse.jpg`. `castle_stone` loading is untouched — walls and pillars still use it.

**Changed: `Arena.buildFloor`** — builds its own `MeshStandardMaterial` (`map` only, `roughness: 1`, `metalness: 0`) instead of going through `tiledPBR`, whose texture cloning and repeat wrapping are now wrong for this mesh. `receiveShadow` stays true. Everything else in `Arena` is untouched.

`TextureSet` keeps its shape; only what fills `textures.floor` changes.

**UV orientation must be verified, not assumed.** `PlaneGeometry` rotated `-π/2` about X maps local +Y to world −Z, and `CanvasTexture` defaults to `flipY: true`. The composition is nearly centro-symmetric, so an orientation error is invisible in the pit and detectable only in pillar wear alignment. Confirm against pillar wear before calling it done.

## 4. Scope

Purely cosmetic. No collision, no movement cost, no gameplay meaning to the sand. `PILLARS` and `ARENA_SIZE` are read, never changed. No server, shared, or wire changes.

The cobblestone texture files become unreferenced. Leaving them on disk is deliberate — deletion is a separate decision, noted as a follow-up rather than folded into this change.

## 5. Tests

`client/tests/arenaFloor.test.ts`, against `bakeArenaFloor` directly (no renderer harness needed):

- **Determinism.** Two bakes with identical options produce byte-identical output.
- **Shape.** Output length is `size * size * 4`; alpha is 255 everywhere.
- **No black mortar (regression).** No texel is `(0,0,0)`. This is a direct guard on the §2 bug — it would have failed against the prototype.
- **Low high-frequency energy (the grain test).** The fraction of texels that are a local luminance extremum against both horizontal neighbours (±2 tolerance) must stay **below 3%**. Measured: the current cobblestone floor is **19.9%**, the bake is **0.7%**. This is the one assertion that actually encodes "not grainy", and it is the test that would catch a regression like the per-texel spill.
- **Composition.** The centre texel is within the sand ramp; a corner texel is not; a ring of kerb-coloured texels exists at r ≈ 700; no sand appears beyond r = 780.

## 6. Risks

- **Bake cost is unmeasured in the browser.** ~150 ms in Node; it runs once during the existing loading screen, so it should be invisible. This must be measured before the approach is committed to. If it is bad, the fallback is the tiled-flagstone-plus-pit-mesh variant from §1, which costs the authored spill and wear.
- **Memory.** 640×640 RGBA is 1.6 MB, ~2.1 MB with mipmaps. Against the three PBR textures already loaded this is not a regression, but it is new resident memory.
- **Texel scale is load-bearing.** 3.125 units/texel is preserved exactly so the floor keeps its authored proportion against sprites sized from `worldUnitsPerTexel`. Changing the bake size without changing `ARENA_SIZE` breaks that relationship.

## 7. Follow-ups (not in scope)

- Delete `client/public/assets/textures/cobblestone/` once this ships and nothing references it.
- Blood staining in the sand as a match progresses — the bake is static, so this needs a separate decal or a second pass.
