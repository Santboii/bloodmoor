import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../src/renderer/CameraController';
import { worldUnitsPerTexel } from '../src/renderer/pixelation';

describe('CameraController texel snapping', () => {
  it('camera position lands on the texel grid (minus the fixed iso offset)', () => {
    const cam = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
    const ctl = new CameraController(cam, 1000, 1000);
    // Converge most of the way toward an off-grid target
    for (let i = 0; i < 200; i++) ctl.update(1234.567, 987.654, 1 / 60);
    const texel = worldUnitsPerTexel();
    // camera.position = (snappedX + 200, 600, snappedZ + 200)
    const gridX = (cam.position.x - 200) / texel;
    const gridZ = (cam.position.z - 200) / texel;
    expect(Math.abs(gridX - Math.round(gridX))).toBeLessThan(1e-9);
    expect(Math.abs(gridZ - Math.round(gridZ))).toBeLessThan(1e-9);
  });

  it('still converges to the target', () => {
    const cam = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
    const ctl = new CameraController(cam, 0, 0);
    for (let i = 0; i < 600; i++) ctl.update(500, 300, 1 / 60);
    const texel = worldUnitsPerTexel();
    expect(Math.abs(cam.position.x - 200 - 500)).toBeLessThanOrEqual(texel);
    expect(Math.abs(cam.position.z - 200 - 300)).toBeLessThanOrEqual(texel);
  });
});
