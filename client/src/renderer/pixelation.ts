// Asset-scale constants and pure helpers. Kept DOM/WebGL-free so they are
// unit-testable in node.
//
// The low-res render pipeline is gone — the scene renders at native
// resolution and the pixel look comes from the assets themselves
// (NearestFilter sprites, posterized tiles). What remains here is the legacy
// 360p texel grid as a world-scale anchor, plus the asset posterizer.

/** The texel grid pixel-art assets were authored against: world scale is
 * defined as if the screen were 360 internal pixels tall. */
export const INTERNAL_HEIGHT = 360;

/** Orthographic half-height of the camera frustum in world units. */
export const FRUSTUM_HALF_HEIGHT = 330;

/** HiDPI cap shared by the renderer and particle point-size scaling — the
 * two must agree or ember sizes drift from the drawing buffer. */
export const MAX_PIXEL_RATIO = 2;

/** World units covered by one texel of the asset grid. Sprite world sizes
 * are derived from this so art keeps its authored proportions. */
export function worldUnitsPerTexel(internalHeight = INTERNAL_HEIGHT): number {
  return (2 * FRUSTUM_HALF_HEIGHT) / internalHeight;
}

/** Color quantization pass. Set PALETTE_ENABLED = false to disable. */
// Disabled: the Bayer dither read as grain rather than pixel-art cohesion.
export const PALETTE_ENABLED = false;
export const PALETTE_LEVELS = 32; // per-channel levels; lower = crunchier

/** In-place posterization of RGBA pixel data (RGB only; alpha untouched). */
export function posterizePixels(data: Uint8ClampedArray, levels: number): void {
  levels = Math.max(2, Math.floor(levels));
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
}
