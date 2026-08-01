// Composites the LPC layer sheets for one appearance into a single canvas
// per animation. Runs once per player per appearance — never per frame.
import * as THREE from 'three';
import { Appearance, GearVisuals, layersForLoadout, LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';
import { FRAME } from './lpc';
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
    // Idle fallback: a layer with no idle sheet (weapons) borrows its walk
    // sheet's frame 0 — the LPC standing pose — for both idle frames.
    const idleFallback: (HTMLImageElement | null)[] = await Promise.all(
      layers.map((l, i) => (anim === 'idle' && images[i] === null)
        ? loadImage(`/assets/lpc/${l.path}/walk.png`)
        : Promise.resolve(null)),
    );
    const present = images.filter((i): i is HTMLImageElement => i !== null);
    if (present.length === 0 && idleFallback.every(f => f === null)) { out[anim] = null; continue; }

    const rows = meta.singleRow ? 1 : 4;
    const canvas = document.createElement('canvas');
    canvas.width = meta.frames * FRAME;
    canvas.height = rows * FRAME;
    const ctx = canvas.getContext('2d')!;
    images.forEach((img, i) => {
      let source: HTMLImageElement | HTMLCanvasElement | null = img;
      if (!source && idleFallback[i]) {
        const stand = document.createElement('canvas');
        stand.width = canvas.width; stand.height = canvas.height;
        const sctx = stand.getContext('2d')!;
        for (let f = 0; f < meta.frames; f++) {
          // walk frame 0 of each direction row → every idle frame column
          sctx.drawImage(idleFallback[i]!, 0, 0, FRAME, rows * FRAME, f * FRAME, 0, FRAME, rows * FRAME);
        }
        source = stand;
      }
      if (!source) return;
      const tint = layers[i].tint;
      if (!tint) { ctx.drawImage(source, 0, 0); return; }
      ctx.drawImage(tintSheet(source, canvas.width, canvas.height, tint, layers[i].tintMode), 0, 0);
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
