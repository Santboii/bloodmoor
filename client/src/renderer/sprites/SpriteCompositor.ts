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
      // Tint the base LPC sheet, preserving its alpha. Skin is a pure
      // multiply (tint hexes tuned for it); fabric/hair adds a screen pass
      // that restores the highlight ramp multiply crushes — without it,
      // fitted clothes lose the shading that conveys body shape.
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const t = tmp.getContext('2d')!;
      t.drawImage(img, 0, 0);
      t.globalCompositeOperation = 'multiply';
      t.fillStyle = tint;
      t.fillRect(0, 0, tmp.width, tmp.height);
      if (layers[i].tintMode === 'fabric') {
        t.globalCompositeOperation = 'screen';
        t.fillStyle = '#464646';
        t.fillRect(0, 0, tmp.width, tmp.height);
      }
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
