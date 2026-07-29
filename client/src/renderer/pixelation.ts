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

/** Color quantization pass. Set PALETTE_ENABLED = false to disable. */
export const PALETTE_ENABLED = true;
export const PALETTE_LEVELS = 32; // per-channel levels; lower = crunchier

/** In-place posterization of RGBA pixel data (RGB only; alpha untouched). */
export function posterizePixels(data: Uint8ClampedArray, levels: number): void {
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }
}
