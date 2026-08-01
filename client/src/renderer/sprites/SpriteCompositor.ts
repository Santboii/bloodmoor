// Composites the LPC layer sheets for one appearance into a single canvas
// per animation. Runs once per player per appearance — never per frame.
import * as THREE from 'three';
import { Appearance, GearVisuals, layersForLoadout, LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';
import { FRAME } from './lpc';
import { tintSheet } from './tint';
import { attachmentSources, drawAttachedWeapon, hasAttachment } from './weaponAttach';

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
    // A weapon only uses its own sheet for the animations that show it being
    // used; otherwise its resting sprite is attached to the hand, which keeps
    // it in the grip instead of sweeping it through the pose.
    const images = await Promise.all(
      layers.map(l => (l.weapon && !l.weaponNativeAnims?.includes(anim)
        ? Promise.resolve(null)
        : loadImage(`/assets/lpc/${l.path}/${anim}.png`))),
    );
    // A weapon layer with no sheet for this animation gets its resting sprite
    // attached to the character's hand instead. Upstream ships no `run` art
    // for any weapon and `idle` for only one, so this is the general case,
    // not an edge case.
    const attaching = layers.map((l, i) =>
      images[i] === null && hasAttachment(l.weapon) ? l : null);
    const attachSources = await Promise.all(
      attaching.map(l => (l
        ? Promise.all(attachmentSources(l.weapon!).map(p => loadImage(`/assets/lpc/${p}.png`)))
        : Promise.resolve([] as (HTMLImageElement | null)[]))),
    );
    const present = images.filter((i): i is HTMLImageElement => i !== null);
    const anyAttachment = attachSources.some(s => s.some(Boolean));
    if (present.length === 0 && !anyAttachment) { out[anim] = null; continue; }

    const rows = meta.singleRow ? 1 : 4;
    const canvas = document.createElement('canvas');
    canvas.width = meta.frames * FRAME;
    canvas.height = rows * FRAME;
    const ctx = canvas.getContext('2d')!;
    images.forEach((img, i) => {
      const layer = layers[i];
      let source: HTMLImageElement | HTMLCanvasElement | null = img;

      if (!source && attaching[i]) {
        // Attachment paints straight into a scratch sheet of the same shape,
        // which then goes through the normal tint-and-draw path below.
        const stand = document.createElement('canvas');
        stand.width = canvas.width; stand.height = canvas.height;
        const drew = drawAttachedWeapon(stand.getContext('2d')!, {
          weaponId: layer.weapon!,
          role: layer.weaponRole === 'front' ? 'front' : 'behind',
          body: a.body,
          anim,
          sources: attachSources[i],
        });
        if (drew) source = stand;
      }

      if (!source) return;
      const { tint, tintMode } = layer;
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
