import * as THREE from 'three';
import { posterizePixels } from './pixelation';

export interface TextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
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

    const [floorDiff, floorNorm, floorRough, stoneDiff, stoneNorm, stoneRough] =
      await Promise.all([
        loadTex('/assets/textures/cobblestone/diffuse.jpg', sRGB),
        loadTex('/assets/textures/cobblestone/normal.jpg', linear),
        loadTex('/assets/textures/cobblestone/roughness.jpg', linear),
        loadTex('/assets/textures/castle_stone/diffuse.jpg', sRGB),
        loadTex('/assets/textures/castle_stone/normal.jpg', linear),
        loadTex('/assets/textures/castle_stone/roughness.jpg', linear),
      ]);

    return {
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
    };
  }
}
