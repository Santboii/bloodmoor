import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

const LIGHTNING_DURATION = 0.08;
const LIGHT_DURATION = 0.12;
const RING_DURATION = 0.15;
const TOTAL_DURATION = 0.2;
const RING_MAX_RADIUS = 35;
const LIGHTNING_COUNT_MIN = 4;
const LIGHTNING_COUNT_MAX = 6;

const ringGeometry = new THREE.TorusGeometry(1, 0.3, 4, 32);

// Adding/removing a PointLight changes the scene's light count, which
// invalidates the shader program cache for every standard material in the
// scene — a visible hitch mid-combat. Instead keep a small fixed pool of
// lights permanently in the scene at intensity 0 and only animate intensity.
const LIGHT_POOL_SIZE = 2;
const lightPool: { light: THREE.PointLight; inUse: boolean }[] = [];

function ensureLightPool(scene: THREE.Scene): void {
  for (const entry of lightPool) {
    if (entry.light.parent !== scene) scene.add(entry.light);
  }
  while (lightPool.length < LIGHT_POOL_SIZE) {
    const light = new THREE.PointLight(0xffeebb, 0, 120);
    scene.add(light);
    lightPool.push({ light, inUse: false });
  }
}

function acquireLight(): THREE.PointLight | null {
  const entry = lightPool.find(e => !e.inUse);
  if (!entry) return null; // all busy — the flash just goes lightless
  entry.inUse = true;
  return entry.light;
}

function releaseLight(light: THREE.PointLight): void {
  light.intensity = 0;
  const entry = lightPool.find(e => e.light === light);
  if (entry) entry.inUse = false;
}

export class TeleportEffect {
  done = false;
  private elapsed = 0;
  private lightningLines: THREE.Line[] = [];
  private ringMesh: THREE.Mesh;
  private pointLight: THREE.PointLight | null;
  private lightningDisposed = false;
  private lightDisposed = false;
  private ringDisposed = false;

  constructor(
    private scene: THREE.Scene,
    x: number,
    z: number,
    particles: ParticleSystem,
  ) {
    const y = 2;

    particles.emitTeleportSparks(x, y, z);

    const count = LIGHTNING_COUNT_MIN + Math.floor(Math.random() * (LIGHTNING_COUNT_MAX - LIGHTNING_COUNT_MIN + 1));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = 15 + Math.random() * 25;
      const midLen = length * (0.3 + Math.random() * 0.4);
      const fork = (Math.random() - 0.5) * 12;

      const points = [
        new THREE.Vector3(x, y + Math.random() * 6, z),
        new THREE.Vector3(
          x + Math.cos(angle) * midLen + fork,
          y + 3 + Math.random() * 8,
          z + Math.sin(angle) * midLen + fork,
        ),
        new THREE.Vector3(
          x + Math.cos(angle) * length,
          y + Math.random() * 5,
          z + Math.sin(angle) * length,
        ),
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.6,
      });
      // THREE.Line draws the full polyline; LineSegments would consume the
      // points pairwise and silently drop the second half of each bolt.
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.lightningLines.push(line);
    }

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.ringMesh = new THREE.Mesh(ringGeometry, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.set(x, 1, z);
    this.ringMesh.scale.setScalar(0.01);
    this.scene.add(this.ringMesh);

    ensureLightPool(scene);
    this.pointLight = acquireLight();
    if (this.pointLight) {
      this.pointLight.position.set(x, 20, z);
      this.pointLight.intensity = 1;
    }
  }

  update(delta: number): void {
    if (this.done) return;
    this.elapsed += delta;

    if (!this.lightningDisposed && this.elapsed >= LIGHTNING_DURATION) {
      for (const line of this.lightningLines) {
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.LineBasicMaterial).dispose();
      }
      this.lightningLines.length = 0;
      this.lightningDisposed = true;
    }

    if (!this.lightDisposed && this.pointLight) {
      if (this.elapsed >= LIGHT_DURATION) {
        releaseLight(this.pointLight);
        this.pointLight = null;
        this.lightDisposed = true;
      } else {
        this.pointLight.intensity = 1 * (1 - this.elapsed / LIGHT_DURATION);
      }
    }

    if (!this.ringDisposed) {
      if (this.elapsed >= RING_DURATION) {
        this.scene.remove(this.ringMesh);
        (this.ringMesh.material as THREE.MeshBasicMaterial).dispose();
        this.ringDisposed = true;
      } else {
        const t = this.elapsed / RING_DURATION;
        this.ringMesh.scale.setScalar(RING_MAX_RADIUS * t);
        (this.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
      }
    }

    if (this.elapsed >= TOTAL_DURATION) {
      this.done = true;
    }
  }

  dispose(): void {
    if (!this.lightningDisposed) {
      for (const line of this.lightningLines) {
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.LineBasicMaterial).dispose();
      }
      this.lightningLines.length = 0;
    }
    if (!this.lightDisposed && this.pointLight) {
      releaseLight(this.pointLight);
      this.pointLight = null;
    }
    if (!this.ringDisposed) {
      this.scene.remove(this.ringMesh);
      (this.ringMesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.done = true;
  }
}
