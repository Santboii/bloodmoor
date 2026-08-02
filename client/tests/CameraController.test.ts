import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../src/renderer/CameraController';

describe('CameraController tracking', () => {
  it('converges smoothly onto an off-grid target (no texel snapping)', () => {
    const cam = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
    const ctl = new CameraController(cam, 1000, 1000);
    for (let i = 0; i < 600; i++) ctl.update(1234.567, 987.654, 1 / 60);
    // camera.position = (targetX + 200, 600, targetZ + 200)
    expect(cam.position.x - 200).toBeCloseTo(1234.567, 3);
    expect(cam.position.z - 200).toBeCloseTo(987.654, 3);
  });

  it('keeps the fixed isometric offset while converging', () => {
    const cam = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
    const ctl = new CameraController(cam, 0, 0);
    for (let i = 0; i < 600; i++) ctl.update(500, 300, 1 / 60);
    expect(cam.position.y).toBe(600);
    expect(cam.position.x - cam.position.z).toBeCloseTo(500 - 300, 6);
  });
});
