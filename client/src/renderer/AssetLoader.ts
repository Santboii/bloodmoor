import * as THREE from 'three';
import { posterizePixels } from './pixelation';
import { bakeArenaFloor, FLOOR_TEXELS } from './arenaFloor';

export interface TextureSet {
  map: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}

export interface LoadedAssets {
  textures: { floor: TextureSet; stone: TextureSet };
}

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
  // Re-wrap: bakeArenaFloor's declared return type is the bare
  // Uint8ClampedArray (ArrayBufferLike-backed), but ImageData's constructor
  // requires the ArrayBuffer-backed generic — TS 5.7+ typed array generics.
  const pixels = new Uint8ClampedArray(bakeArenaFloor(size));
  ctx.putImageData(new ImageData(pixels, size, size), 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  return tex;
}

function nearestFilter(tex: THREE.Texture): THREE.Texture {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  return tex;
}

export class AssetLoader {
  static async load(): Promise<LoadedAssets> {
    const texLoader = new THREE.TextureLoader();

    const loadTex = (url: string, colorSpace: THREE.ColorSpace): Promise<THREE.Texture> =>
      new Promise((res, rej) =>
        texLoader.load(url, (t) => { t.colorSpace = colorSpace; res(t); }, undefined, rej),
      );

    const sRGB = THREE.SRGBColorSpace;
    const linear = THREE.LinearSRGBColorSpace;

    const [stoneDiff, stoneNorm, stoneRough] =
      await Promise.all([
        loadTex('/assets/textures/castle_stone/diffuse.jpg', sRGB),
        loadTex('/assets/textures/castle_stone/normal.jpg', linear),
        loadTex('/assets/textures/castle_stone/roughness.jpg', linear),
      ]);

    return {
      textures: {
        // Floor is one baked image covering the whole arena — no photo, no
        // tiling, and no normal/roughness maps (at this scale they read as
        // per-pixel lighting speckle rather than detail).
        floor: {
          map: bakedFloorTexture(),
        },
        stone: {
          map: chunkifyTexture(stoneDiff),
          normalMap: nearestFilter(stoneNorm),
          roughnessMap: nearestFilter(stoneRough),
        },
      },
    };
  }
}
