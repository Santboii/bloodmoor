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
