import * as THREE from 'three';
import type { GameState, PlayerState } from '@arena/shared';

const POOL_SIZE = 256;
const SOFT_CAP = Math.floor(POOL_SIZE * 0.9);
const RESTING_RATE = 20; // motes/sec per resting player
const WINDUP_RATE = 12;  // motes/sec per winding-up player
const AURA_COLOR = new THREE.Color(0x7ad97a);

/** Which aura a player shows this frame — null suppresses (dead, invisible,
 *  idle). Wind-up wins over resting defensively; the server never sets both. */
export function auraPhaseFor(p: PlayerState, tick: number): 'windup' | 'resting' | null {
  if (p.hp <= 0) return null;
  if ((p.invisibleUntil ?? 0) > tick) return null;
  if (p.restCastEndTick !== undefined && p.restCastEndTick > tick) return 'windup';
  if (p.resting) return 'resting';
  return null;
}

/** Green healing motes around resting/winding-up characters. Self-contained
 *  mini ParticleSystem (no gravity — motes rise); shares nothing with the
 *  spell particle pool so the parallel renderer work can't collide with it. */
export class RestAuraRenderer {
  private posX = new Float32Array(POOL_SIZE);
  private posY = new Float32Array(POOL_SIZE);
  private posZ = new Float32Array(POOL_SIZE);
  private velX = new Float32Array(POOL_SIZE);
  private velY = new Float32Array(POOL_SIZE);
  private velZ = new Float32Array(POOL_SIZE);
  private life = new Float32Array(POOL_SIZE);
  private maxLife = new Float32Array(POOL_SIZE);
  private particleSize = new Float32Array(POOL_SIZE);
  private activeCount = 0;
  private carry = new Map<string, number>();

  private positionBuffer = new Float32Array(POOL_SIZE * 3);
  private sizeBuffer = new Float32Array(POOL_SIZE);
  private posAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private geometry: THREE.BufferGeometry;
  private points: THREE.Points;

  constructor(private scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positionBuffer, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.posAttr);
    this.sizeAttr = new THREE.BufferAttribute(this.sizeBuffer, 1);
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('size', this.sizeAttr);
    this.geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: AURA_COLOR } },
      vertexShader: `
        attribute float size;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - dist * 2.0;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(state: GameState, delta: number): void {
    const tick = state.tick;
    for (const p of Object.values(state.players)) {
      const phase = auraPhaseFor(p, tick);
      if (!phase) {
        this.carry.delete(p.id);
        continue;
      }
      const rate = phase === 'resting' ? RESTING_RATE : WINDUP_RATE;
      // Cap the backlog: a stalled tab resuming with a huge delta must not burst-dump motes.
      let acc = Math.min((this.carry.get(p.id) ?? 0) + rate * delta, 6);
      while (acc >= 1) {
        acc -= 1;
        if (phase === 'resting') this.spawnRising(p.position.x, p.position.y);
        else this.spawnConverging(p.position.x, p.position.y);
      }
      this.carry.set(p.id, acc);
    }
    // Drop carry state for players no longer in the snapshot (disconnects).
    for (const id of this.carry.keys()) {
      if (!(id in state.players)) this.carry.delete(id);
    }

    // Advance and cull — no gravity; motes keep their velocity.
    let i = 0;
    while (i < this.activeCount) {
      this.life[i] -= delta;
      if (this.life[i] <= 0) {
        const last = this.activeCount - 1;
        this.posX[i] = this.posX[last]; this.posY[i] = this.posY[last]; this.posZ[i] = this.posZ[last];
        this.velX[i] = this.velX[last]; this.velY[i] = this.velY[last]; this.velZ[i] = this.velZ[last];
        this.life[i] = this.life[last]; this.maxLife[i] = this.maxLife[last];
        this.particleSize[i] = this.particleSize[last];
        this.activeCount--;
        continue;
      }
      this.posX[i] += this.velX[i] * delta;
      this.posY[i] += this.velY[i] * delta;
      this.posZ[i] += this.velZ[i] * delta;
      const t = i * 3;
      this.positionBuffer[t]     = this.posX[i];
      this.positionBuffer[t + 1] = this.posY[i];
      this.positionBuffer[t + 2] = this.posZ[i];
      this.sizeBuffer[i] = this.particleSize[i] * (this.life[i] / this.maxLife[i]);
      i++;
    }

    this.geometry.setDrawRange(0, this.activeCount);
    if (this.activeCount > 0) {
      this.posAttr.addUpdateRange(0, this.activeCount * 3);
      this.sizeAttr.addUpdateRange(0, this.activeCount);
      this.posAttr.needsUpdate = true;
      this.sizeAttr.needsUpdate = true;
    }
  }

  /** Resting: motes born at foot level near the character, drifting upward. */
  private spawnRising(wx: number, wy: number): void {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 16;
    this.spawn(
      wx + Math.cos(angle) * r,
      2 + Math.random() * 4,
      wy + Math.sin(angle) * r,
      (Math.random() - 0.5) * 12,
      20 + Math.random() * 15,
      (Math.random() - 0.5) * 12,
      1.0 + Math.random() * 0.4,
      13 + Math.random() * 4,
    );
  }

  /** Wind-up: motes born on a ring at mid-body height, drawn inward. */
  private spawnConverging(wx: number, wy: number): void {
    const angle = Math.random() * Math.PI * 2;
    const R = 28;
    const inSpeed = 35; // reaches the center in ~0.8s, matching the lifetime
    this.spawn(
      wx + Math.cos(angle) * R,
      14 + Math.random() * 6,
      wy + Math.sin(angle) * R,
      -Math.cos(angle) * inSpeed,
      (Math.random() - 0.5) * 6,
      -Math.sin(angle) * inSpeed,
      0.8,
      11 + Math.random() * 3,
    );
  }

  private spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    life: number, size: number,
  ): void {
    if (this.activeCount >= SOFT_CAP) return;
    const i = this.activeCount++;
    this.posX[i] = x; this.posY[i] = y; this.posZ[i] = z;
    this.velX[i] = vx; this.velY[i] = vy; this.velZ[i] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.particleSize[i] = size;
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    (this.points.material as THREE.ShaderMaterial).dispose();
  }
}
