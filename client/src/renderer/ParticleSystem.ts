import * as THREE from 'three';
import { Segment } from '@arena/shared';
import type { AuraStyle } from '@arena/shared';
import { INTERNAL_HEIGHT, MAX_PIXEL_RATIO } from './pixelation';

const POOL_SIZE = 4096;
const SOFT_CAP = Math.floor(POOL_SIZE * 0.9);

// Auras yield to spells: they stop emitting at half the pool, well below the
// SOFT_CAP the spell emitters respect, so a Meteor and Rain exchange never
// loses particles to jewelry.
export const AURA_SOFT_CAP = Math.floor(POOL_SIZE * 0.5);

// HDR fire ember: >1.0 channels survive into the half-float composer buffer,
// so trails and bursts feed the bloom pass like the fireball core does.
// Unique-item auras override these per emit with their own 0-1 manifest
// colors, so ambient jewelry glow stays out of the bloom pass — deliberate:
// a ring should not read as a light source the way a fireball does.
const DEFAULT_COLOR_R = 1.05;
const DEFAULT_COLOR_G = 0.4;
const DEFAULT_COLOR_B = 0.05;

export class ParticleSystem {
  private posX = new Float32Array(POOL_SIZE);
  private posY = new Float32Array(POOL_SIZE);
  private posZ = new Float32Array(POOL_SIZE);
  private velX = new Float32Array(POOL_SIZE);
  private velY = new Float32Array(POOL_SIZE);
  private velZ = new Float32Array(POOL_SIZE);
  private life = new Float32Array(POOL_SIZE);
  private maxLife = new Float32Array(POOL_SIZE);
  private particleSize = new Float32Array(POOL_SIZE);
  private gravityScale = new Float32Array(POOL_SIZE);
  private colorR = new Float32Array(POOL_SIZE);
  private colorG = new Float32Array(POOL_SIZE);
  private colorB = new Float32Array(POOL_SIZE);
  private activeCount = 0;

  private positionBuffer: Float32Array;
  private sizeBuffer: Float32Array;
  private colorBuffer: Float32Array;
  private posAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private geometry: THREE.BufferGeometry;
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;

  // gl_PointSize is in device pixels, but particle sizes are authored in the
  // legacy 360p grid (INTERNAL_HEIGHT). Scale by the drawing-buffer height so
  // particles keep their intended screen proportion at native resolution.
  // No-op without a window: the emitters are unit-tested in the node
  // environment, where the uniform keeps its default 1 and only the scale
  // (not the emission maths under test) is absent.
  private onResize = () => {
    if (typeof window === 'undefined') return;
    this.material.uniforms.uSizeScale.value =
      (window.innerHeight * Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)) / INTERNAL_HEIGHT;
  };

  constructor(private scene: THREE.Scene) {
    this.positionBuffer = new Float32Array(POOL_SIZE * 3);
    this.sizeBuffer = new Float32Array(POOL_SIZE);
    this.colorBuffer = new Float32Array(POOL_SIZE * 3);

    this.geometry = new THREE.BufferGeometry();

    this.posAttr = new THREE.BufferAttribute(this.positionBuffer, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.posAttr);

    this.sizeAttr = new THREE.BufferAttribute(this.sizeBuffer, 1);
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('size', this.sizeAttr);

    this.colorAttr = new THREE.BufferAttribute(this.colorBuffer, 3);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('particleColor', this.colorAttr);

    this.geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSizeScale: { value: 1 },
      },
      vertexShader: `
        uniform float uSizeScale;
        attribute float size;
        attribute vec3 particleColor;
        varying vec3 vColor;
        void main() {
          vColor = particleColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uSizeScale;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          // Additive blending sums overlapping embers, so a dense trail
          // saturates to white regardless of per-particle color — the 0.4
          // scale caps the stacked energy while keeping the plume's size.
          float alpha = (1.0 - dist * 2.0) * 0.4;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.material = material;
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.onResize();
    if (typeof window !== 'undefined') window.addEventListener('resize', this.onResize);
  }

  emitTrail(x: number, y: number, z: number, dirX: number, dirZ: number, radius = 10): void {
    if (this.activeCount >= SOFT_CAP) return;
    const scale = radius / 10;
    const count = Math.min(14, Math.floor((4 + Math.floor(Math.random() * 3)) * scale));
    const spread = 8 * scale;
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      this.spawn(
        x + (Math.random() - 0.5) * spread,
        y + (Math.random() - 0.5) * spread,
        z + (Math.random() - 0.5) * spread,
        -dirX * (40 + Math.random() * 30) * scale + (Math.random() - 0.5) * 30,
        (10 + Math.random() * 20) * scale,
        -dirZ * (40 + Math.random() * 30) * scale + (Math.random() - 0.5) * 30,
        0.4 + Math.random() * 0.2,
        (16 + Math.random() * 7) * scale,
      );
    }
  }

  emitExplosion(x: number, y: number, z: number, radius = 10): void {
    const scale = radius / 10;
    const count = Math.min(200, Math.floor((40 + Math.floor(Math.random() * 21)) * scale));
    const spread = 6 * scale;
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      const theta = Math.random() * Math.PI * 2;
      const speed = (60 + Math.random() * 120) * scale;
      this.spawn(
        x + (Math.random() - 0.5) * spread,
        y + (Math.random() - 0.5) * spread,
        z + (Math.random() - 0.5) * spread,
        Math.cos(theta) * speed,
        (20 + Math.random() * 80) * scale,
        Math.sin(theta) * speed,
        0.5 + Math.random() * 0.3,
        (Math.random() > 0.5 ? 16 : 10) * Math.min(scale, 3),
      );
    }
  }

  emitWall(segments: Segment[]): void {
    if (this.activeCount >= SOFT_CAP) return;
    for (const seg of segments) {
      for (let i = 0; i < 3; i++) {
        if (this.activeCount >= POOL_SIZE) return;
        const t = Math.random();
        this.spawn(
          seg.x1 + (seg.x2 - seg.x1) * t + (Math.random() - 0.5) * 4,
          1,
          seg.y1 + (seg.y2 - seg.y1) * t + (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 15,
          40 + Math.random() * 40,
          (Math.random() - 0.5) * 15,
          0.4 + Math.random() * 0.3,
          14 + Math.random() * 10,
        );
      }
    }
  }

  emitMeteorTrail(x: number, y: number, z: number): void {
    if (this.activeCount >= SOFT_CAP) return;
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      const theta = Math.random() * Math.PI * 2;
      const spread = 8 + Math.random() * 8;
      this.spawn(
        x + (Math.random() - 0.5) * 6,
        y + (Math.random() - 0.5) * 6,
        z + (Math.random() - 0.5) * 6,
        Math.cos(theta) * spread,
        20 + Math.random() * 20,
        Math.sin(theta) * spread,
        0.2 + Math.random() * 0.1,
        8 + Math.random() * 6,
      );
    }
  }

  emitCrater(x: number, z: number, radius: number): void {
    if (this.activeCount >= SOFT_CAP) return;
    const count = Math.max(4, Math.round(radius / 10));
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      this.spawn(
        x + Math.cos(theta) * r,
        1,
        z + Math.sin(theta) * r,
        (Math.random() - 0.5) * 10,
        30 + Math.random() * 30,
        (Math.random() - 0.5) * 10,
        0.3 + Math.random() * 0.3,
        10 + Math.random() * 8,
      );
    }
  }

  emitMeteorImpact(x: number, y: number, z: number): void {
    if (this.activeCount >= SOFT_CAP) return;
    const count = 50 + Math.floor(Math.random() * 21);
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      const theta = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.spawn(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        z + (Math.random() - 0.5) * 10,
        Math.cos(theta) * speed,
        30 + Math.random() * 100,
        Math.sin(theta) * speed,
        0.5 + Math.random() * 0.3,
        Math.random() > 0.5 ? 18 : 12,
      );
    }
  }

  emitRainImpact(x: number, y: number, z: number, radius: number): void {
    if (this.activeCount >= SOFT_CAP) return;
    const count = 30 + Math.floor(Math.random() * 15);
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      const theta = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const speed = 15 + Math.random() * 30;
      const idx = this.activeCount;
      this.spawn(
        x + Math.cos(theta) * dist,
        y + 2,
        z + Math.sin(theta) * dist,
        Math.cos(theta) * speed,
        30 + Math.random() * 50,
        Math.sin(theta) * speed,
        0.3 + Math.random() * 0.2,
        6 + Math.random() * 4,
      );
      this.colorR[idx] = 0.7;
      this.colorG[idx] = 0.6;
      this.colorB[idx] = 0.45;
    }
  }

  emitRainZone(x: number, z: number, radius: number): void {
    if (this.activeCount >= SOFT_CAP) return;
    const count = Math.max(2, Math.round(radius / 20));
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const idx = this.activeCount;
      this.spawn(
        x + Math.cos(theta) * r,
        1,
        z + Math.sin(theta) * r,
        (Math.random() - 0.5) * 8,
        15 + Math.random() * 15,
        (Math.random() - 0.5) * 8,
        0.25 + Math.random() * 0.15,
        5 + Math.random() * 4,
      );
      this.colorR[idx] = 0.7;
      this.colorG[idx] = 0.6;
      this.colorB[idx] = 0.45;
    }
  }

  emitTeleportSparks(x: number, y: number, z: number): void {
    const count = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= POOL_SIZE) return;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 40 + Math.random() * 60;
      const idx = this.activeCount;
      this.spawn(
        x + (Math.random() - 0.5) * 4,
        y + (Math.random() - 0.5) * 4,
        z + (Math.random() - 0.5) * 4,
        Math.cos(theta) * Math.sin(phi) * speed,
        Math.cos(phi) * speed * 0.4 + 10,
        Math.sin(theta) * Math.sin(phi) * speed,
        0.12 + Math.random() * 0.04,
        7 + Math.random() * 4,
      );
      this.colorR[idx] = 1.0;
      this.colorG[idx] = 0.84 + Math.random() * 0.16;
      this.colorB[idx] = 0.4 + Math.random() * 0.6;
    }
  }

  private spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    life: number, size: number,
    gravity = 1,
  ): void {
    const i = this.activeCount++;
    this.posX[i] = x; this.posY[i] = y; this.posZ[i] = z;
    this.velX[i] = vx; this.velY[i] = vy; this.velZ[i] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.particleSize[i] = size;
    this.gravityScale[i] = gravity;
    this.colorR[i] = DEFAULT_COLOR_R;
    this.colorG[i] = DEFAULT_COLOR_G;
    this.colorB[i] = DEFAULT_COLOR_B;
  }

  update(delta: number): void {
    let i = 0;
    while (i < this.activeCount) {
      this.life[i] -= delta;
      if (this.life[i] <= 0) {
        const last = this.activeCount - 1;
        this.posX[i] = this.posX[last]; this.posY[i] = this.posY[last]; this.posZ[i] = this.posZ[last];
        this.velX[i] = this.velX[last]; this.velY[i] = this.velY[last]; this.velZ[i] = this.velZ[last];
        this.life[i] = this.life[last]; this.maxLife[i] = this.maxLife[last];
        this.particleSize[i] = this.particleSize[last];
        this.gravityScale[i] = this.gravityScale[last];
        this.colorR[i] = this.colorR[last]; this.colorG[i] = this.colorG[last]; this.colorB[i] = this.colorB[last];
        this.activeCount--;
        continue;
      }
      this.velY[i] -= 80 * this.gravityScale[i] * delta;
      this.posX[i] += this.velX[i] * delta;
      this.posY[i] += this.velY[i] * delta;
      this.posZ[i] += this.velZ[i] * delta;

      const t = i * 3;
      this.positionBuffer[t]     = this.posX[i];
      this.positionBuffer[t + 1] = this.posY[i];
      this.positionBuffer[t + 2] = this.posZ[i];
      this.colorBuffer[t]     = this.colorR[i];
      this.colorBuffer[t + 1] = this.colorG[i];
      this.colorBuffer[t + 2] = this.colorB[i];
      this.sizeBuffer[i] = this.particleSize[i] * (this.life[i] / this.maxLife[i]);
      i++;
    }

    this.geometry.setDrawRange(0, this.activeCount);
    // Upload only the live slice — without a range, every frame re-uploads
    // all 4096 slots (~112 KB) even when a handful of particles are alive.
    // Ranges are cleared automatically after each upload.
    if (this.activeCount > 0) {
      this.posAttr.addUpdateRange(0, this.activeCount * 3);
      this.colorAttr.addUpdateRange(0, this.activeCount * 3);
      this.sizeAttr.addUpdateRange(0, this.activeCount);
      this.posAttr.needsUpdate = true;
      this.sizeAttr.needsUpdate = true;
      this.colorAttr.needsUpdate = true;
    }
  }

  /** Live particle count — a seam for tests, which cannot inspect the GPU
   * buffers meaningfully. */
  activeParticles(): number {
    return this.activeCount;
  }

  /** Continuous ambient emission for a unique item's aura. Called at 30Hz by
   * SpellRenderer, which supplies the world anchor point, an animation phase
   * for the rotating styles, and whether the wearer is moving. */
  emitAura(
    style: AuraStyle,
    color: readonly [number, number, number],
    x: number, y: number, z: number,
    opts: { intensity?: number; motes?: number; phase?: number; moving?: boolean } = {},
  ): void {
    if (this.activeCount >= AURA_SOFT_CAP) return;
    const intensity = opts.intensity ?? 1;
    const phase = opts.phase ?? 0;

    const put = (
      px: number, py: number, pz: number,
      vx: number, vy: number, vz: number,
      life: number, size: number, gravity: number,
    ): void => {
      if (this.activeCount >= POOL_SIZE) return;
      const idx = this.activeCount;
      this.spawn(px, py, pz, vx, vy, vz, life, size, gravity);
      this.colorR[idx] = color[0];
      this.colorG[idx] = color[1];
      this.colorB[idx] = color[2];
    };

    switch (style) {
      case 'embers': {
        const count = intensity >= 1.3 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          put(
            x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 8, z + (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 6, 10 + Math.random() * 10, (Math.random() - 0.5) * 6,
            0.8 + Math.random() * 0.4, (4 + Math.random() * 3) * intensity, -0.05,
          );
        }
        break;
      }
      case 'frost':
        put(
          x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 10, z + (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 10, -3, (Math.random() - 0.5) * 10,
          0.9 + Math.random() * 0.3, (3 + Math.random() * 3) * intensity, 0.08,
        );
        break;
      case 'orbit': {
        const motes = opts.motes ?? 1;
        const radius = 14;
        for (let i = 0; i < motes; i++) {
          const angle = phase * 1.6 + (i * Math.PI * 2) / motes;
          put(
            x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius,
            0, 2, 0,
            0.25, (4 + Math.random() * 2) * intensity, 0,
          );
        }
        break;
      }
      case 'drip':
        put(
          x + (Math.random() - 0.5) * 8, y, z + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4,
          0.5 + Math.random() * 0.2, (3 + Math.random() * 3) * intensity, 1,
        );
        break;
      case 'wisp':
        if (!opts.moving) return;
        put(
          x + (Math.random() - 0.5) * 8, y + Math.random() * 4, z + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4, 4 + Math.random() * 4, (Math.random() - 0.5) * 4,
          0.45 + Math.random() * 0.2, (4 + Math.random() * 3) * intensity, 0.1,
        );
        break;
    }
  }

  dispose(): void {
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.onResize);
    this.scene.remove(this.points);
    this.geometry.dispose();
    (this.points.material as THREE.ShaderMaterial).dispose();
  }
}
