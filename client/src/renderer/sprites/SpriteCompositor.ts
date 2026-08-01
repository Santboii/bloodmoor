// Composites the LPC layer sheets for one appearance into a single canvas
// per animation. Runs once per player per appearance — never per frame.
import * as THREE from 'three';
import { Appearance, GearLayerFallback, GearVisuals, layersForLoadout, LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';
import { donorFrameMap, FRAME } from './lpc';
import { tintSheet } from './tint';

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
  gear: GearVisuals = {},
): Promise<Record<LpcAnimation, THREE.CanvasTexture | null>> {
  const layers = layersForLoadout(a, gear);
  const out = {} as Record<LpcAnimation, THREE.CanvasTexture | null>;

  for (const anim of Object.keys(LPC_ANIMATIONS) as LpcAnimation[]) {
    const meta = LPC_ANIMATIONS[anim];
    const images = await Promise.all(
      layers.map(l => loadImage(`/assets/lpc/${l.path}/${anim}.png`)),
    );
    // Fallback: a layer with no sheet of its own for this animation (e.g. no
    // weapon ships `run` art) borrows frames from a donor animation's sheet
    // — see GearLayerFallback. Guard against drawing a 1-row donor into a
    // 4-row canvas (or vice versa) by only borrowing when the row shape
    // matches; a mismatched or absent fallback resolves to a missing layer,
    // same as no sheet at all.
    const fallbacks: (GearLayerFallback | undefined)[] = layers.map((l, i) =>
      images[i] === null ? l.fallbacks?.[anim] : undefined);
    const fallbackImages: (HTMLImageElement | null)[] = await Promise.all(
      fallbacks.map((fb, i) => {
        if (!fb || LPC_ANIMATIONS[fb.from].singleRow !== meta.singleRow) return Promise.resolve(null);
        return loadImage(`/assets/lpc/${fb.path ?? layers[i].path}/${fb.from}.png`);
      }),
    );
    const present = images.filter((i): i is HTMLImageElement => i !== null);
    if (present.length === 0 && fallbackImages.every(f => f === null)) { out[anim] = null; continue; }

    const rows = meta.singleRow ? 1 : 4;
    const canvas = document.createElement('canvas');
    canvas.width = meta.frames * FRAME;
    canvas.height = rows * FRAME;
    const ctx = canvas.getContext('2d')!;
    images.forEach((img, i) => {
      let source: HTMLImageElement | HTMLCanvasElement | null = img;
      let tint = layers[i].tint;
      let tintMode = layers[i].tintMode;
      const fb = fallbacks[i];
      if (!source && fb && fallbackImages[i]) {
        const donorMeta = LPC_ANIMATIONS[fb.from];
        const frameMap = donorFrameMap(meta.frames, donorMeta.frames, fb.mode);
        const stand = document.createElement('canvas');
        stand.width = canvas.width; stand.height = canvas.height;
        const sctx = stand.getContext('2d')!;
        for (let f = 0; f < meta.frames; f++) {
          sctx.drawImage(fallbackImages[i]!, frameMap[f] * FRAME, 0, FRAME, rows * FRAME, f * FRAME, 0, FRAME, rows * FRAME);
        }
        source = stand;
        if (fb.tint) { tint = fb.tint; tintMode = fb.tintMode; }
      }
      if (!source) return;
      if (!tint) { ctx.drawImage(source, 0, 0); return; }
      ctx.drawImage(tintSheet(source, canvas.width, canvas.height, tint, tintMode), 0, 0);
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
