import * as THREE from 'three';
import { GameState, METEOR_DELAY_TICKS, METEOR_AOE_RADIUS, RAIN_DELAY_TICKS } from '@arena/shared';
import { ParticleSystem } from './ParticleSystem';
import { TeleportEffect } from './TeleportEffect';
import * as sfx from '../audio/sfx';

type MeteorEntry = { ring: THREE.Mesh; rock: THREE.Mesh; target: { x: number; y: number }; spawnTime: number; sizeScale: number };
type ArrowEntry = { mesh: THREE.Group };
type RainArrowVisual = {
  arrowGroup: THREE.Group;
  arrowMaterial: THREE.MeshBasicMaterial;
  arrowPhases: number[];
  spawnTime: number;
};

type RainEntry = {
  circle: THREE.Mesh;
  target: { x: number; y: number };
  radius: number;
  spawnTime: number;
} & RainArrowVisual;

export type ArrowElement = 'none' | 'burn' | 'freeze' | 'poison';

const ELEMENT_COLORS: Record<ArrowElement, number> = {
  none: 0xffffff,
  burn: 0xff6600,
  freeze: 0x66ccff,
  poison: 0x44dd44,
};

// ── Shared GPU resources ────────────────────────────────────────────────────
// Geometries/materials reused by every instance of an effect. Anything NOT in
// these sets is per-instance and gets disposed with its object — previously
// nothing was ever disposed, leaking VRAM on every single cast.
const FIREBALL_GEO = new THREE.SphereGeometry(1, 8, 8);
const ARROW_SHAFT_GEO = new THREE.BoxGeometry(18, 4, 4);
const ARROW_TRAIL_GEO = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-9, 0, 0),
  new THREE.Vector3(-15, 0, 0),
]);
const FALLING_ARROW_GEO = new THREE.BoxGeometry(2, 14, 2);
const METEOR_RING_GEO = new THREE.RingGeometry(50, 58, 32);
const METEOR_ROCK_GEO = new THREE.SphereGeometry(25, 6, 6);

const FIREBALL_CORE_MAT = new THREE.MeshBasicMaterial({ color: 0xff6600 });
const FIREBALL_GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.25 });
const METEOR_ROCK_MAT = new THREE.MeshBasicMaterial({ color: 0xff4400 });
const WALL_SEGMENT_MAT = new THREE.LineBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.4 });

const sharedGeometries = new Set<THREE.BufferGeometry>([
  FIREBALL_GEO, ARROW_SHAFT_GEO, ARROW_TRAIL_GEO, FALLING_ARROW_GEO, METEOR_RING_GEO, METEOR_ROCK_GEO,
]);
const sharedMaterials = new Set<THREE.Material>([
  FIREBALL_CORE_MAT, FIREBALL_GLOW_MAT, METEOR_ROCK_MAT, WALL_SEGMENT_MAT,
]);

const arrowShaftMats = new Map<number, THREE.MeshBasicMaterial>();
const arrowTrailMats = new Map<number, THREE.LineBasicMaterial>();

function shaftMaterial(color: number): THREE.MeshBasicMaterial {
  let mat = arrowShaftMats.get(color);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color });
    arrowShaftMats.set(color, mat);
    sharedMaterials.add(mat);
  }
  return mat;
}

function trailMaterial(color: number): THREE.LineBasicMaterial {
  let mat = arrowTrailMats.get(color);
  if (!mat) {
    mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
    arrowTrailMats.set(color, mat);
    sharedMaterials.add(mat);
  }
  return mat;
}

/** scene.remove + free per-instance GPU resources (skips shared ones). */
function disposeObject3D(root: THREE.Object3D): void {
  root.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry && !sharedGeometries.has(mesh.geometry)) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!sharedMaterials.has(m)) m.dispose();
      }
    }
  });
}

export class SpellRenderer {
  private fireballs = new Map<string, THREE.Mesh>();
  private arrows = new Map<string, ArrowEntry>();
  private fireWalls = new Map<string, THREE.Group>();
  private meteors = new Map<string, MeteorEntry>();
  private rainOfArrows = new Map<string, RainEntry>();
  private rainZoneArrows = new Map<string, RainArrowVisual>();
  private particles: ParticleSystem;
  private prevFireballPositions = new Map<string, { x: number; y: number; z: number; radius: number }>();
  private clock = new THREE.Clock();
  private elapsedTime = 0;
  private teleportEffects: TeleportEffect[] = [];
  private arrowElement: ArrowElement = 'none';
  private emitAccumulator = 0;
  // Continuous emitters (trails, crater embers) run on a fixed 60Hz cadence —
  // emitting per render frame spawns 2.4x the particles on a 144Hz display
  // and exhausts the pool during heavy fights.
  private shouldEmitContinuous = true;

  constructor(private scene: THREE.Scene, private myId: string) {
    this.particles = new ParticleSystem(scene);
  }

  setArrowElement(element: ArrowElement): void {
    this.arrowElement = element;
  }

  /** Adopt a new socket id after a mid-game rejoin remaps the player. */
  setMyId(id: string): void {
    this.myId = id;
  }

  private createFallingArrows(cx: number, cz: number, radius: number, count = 16): RainArrowVisual {
    const color = ELEMENT_COLORS[this.arrowElement];
    const arrowGroup = new THREE.Group();
    const arrowMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const arrowPhases: number[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const shaft = new THREE.Mesh(FALLING_ARROW_GEO, arrowMaterial);
      shaft.position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
      shaft.rotation.x = (Math.random() - 0.5) * 0.3;
      shaft.rotation.z = (Math.random() - 0.5) * 0.3;
      arrowGroup.add(shaft);
      arrowPhases.push(Math.random());
    }
    arrowGroup.position.set(cx, 0, cz);
    this.scene.add(arrowGroup);
    return { arrowGroup, arrowMaterial, arrowPhases, spawnTime: this.elapsedTime };
  }

  private updateFallingArrows(visual: RainArrowVisual): void {
    const localTime = this.elapsedTime - visual.spawnTime;
    const maxHeight = 250;
    const fallDuration = 0.35;
    const children = visual.arrowGroup.children;
    for (let i = 0; i < visual.arrowPhases.length; i++) {
      const fallProgress = ((localTime / fallDuration) + visual.arrowPhases[i]) % 1;
      children[i].position.y = maxHeight * (1 - fallProgress);
    }
  }

  private detectTeleports(state: GameState): void {
    for (const player of Object.values(state.players)) {
      if (player.teleported) {
        sfx.playTeleport();
        this.teleportEffects.push(new TeleportEffect(this.scene, player.teleported.x, player.teleported.y, this.particles));
        this.teleportEffects.push(new TeleportEffect(this.scene, player.position.x, player.position.y, this.particles));
      }
    }
  }

  update(state: GameState): void {
    const delta = this.clock.getDelta();
    this.elapsedTime += delta;
    this.emitAccumulator += delta;
    this.shouldEmitContinuous = this.emitAccumulator >= 1 / 60;
    if (this.shouldEmitContinuous) this.emitAccumulator %= 1 / 60;
    this.detectTeleports(state);
    this.syncFireballs(state);
    this.syncArrows(state);
    this.syncFireWalls(state);
    this.syncMeteors(state);
    this.syncRainOfArrows(state);
    this.particles.update(delta);

    for (let i = this.teleportEffects.length - 1; i >= 0; i--) {
      this.teleportEffects[i].update(delta);
      if (this.teleportEffects[i].done) {
        this.teleportEffects.splice(i, 1);
      }
    }
  }

  private syncFireballs(state: GameState): void {
    const activeFireballIds = new Set(state.projectiles.filter(p => p.type === 'fireball').map(p => p.id));

    for (const [id, mesh] of this.fireballs) {
      if (!activeFireballIds.has(id)) {
        const last = this.prevFireballPositions.get(id);
        if (last) this.particles.emitExplosion(last.x, last.y, last.z, last.radius);
        sfx.playFireballExplode();
        this.scene.remove(mesh);
        disposeObject3D(mesh);
        this.fireballs.delete(id);
        this.prevFireballPositions.delete(id);
      }
    }

    for (const fb of state.projectiles) {
      if (fb.type !== 'fireball') continue;

      if (!this.fireballs.has(fb.id)) {
        sfx.playFireballWhoosh();
        const r = fb.radius ?? 10;
        const mesh = new THREE.Mesh(FIREBALL_GEO, FIREBALL_CORE_MAT);
        mesh.scale.setScalar(r * 0.8);
        const glow = new THREE.Mesh(FIREBALL_GEO, FIREBALL_GLOW_MAT);
        glow.scale.setScalar(1.4 / 0.8); // relative to the core's scale
        mesh.add(glow);
        this.scene.add(mesh);
        this.fireballs.set(fb.id, mesh);
      }

      const mesh = this.fireballs.get(fb.id)!;
      const wx = fb.position.x;
      const wy = 30;
      const wz = fb.position.y;
      mesh.position.set(wx, wy, wz);

      const prev = this.prevFireballPositions.get(fb.id);
      let dirX = 0, dirZ = 0;
      if (prev) {
        const dx = wx - prev.x;
        const dz = wz - prev.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) { dirX = dx / len; dirZ = dz / len; }
      }
      if (this.shouldEmitContinuous) this.particles.emitTrail(wx, wy, wz, dirX, dirZ, fb.radius ?? 10);
      this.prevFireballPositions.set(fb.id, { x: wx, y: wy, z: wz, radius: fb.blastRadius ?? fb.radius ?? 10 });
    }
  }

  private syncArrows(state: GameState): void {
    const activeArrowIds = new Set(state.projectiles.filter(p => p.type === 'arrow').map(p => p.id));

    for (const [id, entry] of this.arrows) {
      if (!activeArrowIds.has(id)) {
        this.scene.remove(entry.mesh);
        disposeObject3D(entry.mesh);
        this.arrows.delete(id);
      }
    }

    for (const arrow of state.projectiles) {
      if (arrow.type !== 'arrow') continue;

      if (!this.arrows.has(arrow.id)) {
        sfx.playArrowSpawn();
        const group = new THREE.Group();
        const color = arrow.ownerId === this.myId
          ? ELEMENT_COLORS[this.arrowElement]
          : 0xffffff;

        const shaft = new THREE.Mesh(ARROW_SHAFT_GEO, shaftMaterial(color));
        group.add(shaft);

        const trail = new THREE.Line(ARROW_TRAIL_GEO, trailMaterial(color));
        group.add(trail);

        this.scene.add(group);
        this.arrows.set(arrow.id, { mesh: group });
      }

      const entry = this.arrows.get(arrow.id)!;
      const wx = arrow.position.x;
      const wy = 30;
      const wz = arrow.position.y;
      entry.mesh.position.set(wx, wy, wz);

      // Orient along velocity vector (X-Z plane in world space)
      const vx = arrow.velocity.x;
      const vz = arrow.velocity.y;
      const angle = Math.atan2(vz, vx);
      entry.mesh.rotation.set(-Math.PI / 2, 0, -angle);
    }
  }

  private syncFireWalls(state: GameState): void {
    const activeIds = new Set(state.fireWalls.map(f => f.id));

    for (const [id, group] of this.fireWalls) {
      if (!activeIds.has(id)) {
        this.scene.remove(group);
        disposeObject3D(group);
        this.fireWalls.delete(id);
        sfx.stopFireWallLoop(id);
        const rainVisual = this.rainZoneArrows.get(id);
        if (rainVisual) {
          this.scene.remove(rainVisual.arrowGroup);
          disposeObject3D(rainVisual.arrowGroup);
          this.rainZoneArrows.delete(id);
        }
      }
    }

    for (const fw of state.fireWalls) {
      const isRainZone = fw.id.startsWith('rain_zone_');

      if (!this.fireWalls.has(fw.id)) {
        if (!isRainZone) sfx.startFireWallLoop(fw.id);
        const group = new THREE.Group();
        if (fw.shape === 'circle' && fw.center && fw.radius) {
          const disc = new THREE.Mesh(
            new THREE.CircleGeometry(fw.radius, 32),
            new THREE.MeshBasicMaterial({
              color: isRainZone ? ELEMENT_COLORS[this.arrowElement] : 0xff2200,
              transparent: true,
              opacity: isRainZone ? 0.15 : 0.2,
              side: THREE.DoubleSide,
            }),
          );
          disc.rotation.x = -Math.PI / 2;
          disc.position.set(fw.center.x, 1, fw.center.y);
          group.add(disc);
          if (isRainZone) {
            this.rainZoneArrows.set(fw.id, this.createFallingArrows(fw.center.x, fw.center.y, fw.radius, 12));
          }
        } else {
          for (const seg of fw.segments) {
            const points = [
              new THREE.Vector3(seg.x1, 1, seg.y1),
              new THREE.Vector3(seg.x2, 1, seg.y2),
            ];
            const line = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(points),
              WALL_SEGMENT_MAT,
            );
            group.add(line);
          }
        }
        this.scene.add(group);
        this.fireWalls.set(fw.id, group);
      }

      if (fw.shape === 'circle' && fw.center && fw.radius) {
        if (isRainZone) {
          const visual = this.rainZoneArrows.get(fw.id);
          if (visual) this.updateFallingArrows(visual);
        } else if (this.shouldEmitContinuous) {
          this.particles.emitCrater(fw.center.x, fw.center.y, fw.radius);
        }
      } else if (this.shouldEmitContinuous) {
        this.particles.emitWall(fw.segments);
      }
    }
  }

  private syncMeteors(state: GameState): void {
    const activeIds = new Set(state.meteors.map(m => m.id));

    for (const [id, entry] of this.meteors) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.ring);
        this.scene.remove(entry.rock);
        disposeObject3D(entry.ring);
        disposeObject3D(entry.rock);
        this.particles.emitMeteorImpact(entry.target.x, 0, entry.target.y);
        sfx.playMeteorImpact();
        this.meteors.delete(id);
      }
    }

    for (const meteor of state.meteors) {
      if (!this.meteors.has(meteor.id)) {
        sfx.playMeteorFall();
        const s = meteor.aoeRadius / METEOR_AOE_RADIUS;
        // Ring material is per-instance (opacity pulses); geometry is shared
        // and the size multiplier is applied via scale in the update below.
        const ring = new THREE.Mesh(
          METEOR_RING_GEO,
          new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(meteor.target.x, 2, meteor.target.y);

        const rock = new THREE.Mesh(METEOR_ROCK_GEO, METEOR_ROCK_MAT);

        this.scene.add(ring);
        this.scene.add(rock);
        this.meteors.set(meteor.id, { ring, rock, target: { ...meteor.target }, spawnTime: this.elapsedTime, sizeScale: s });
      }

      const entry = this.meteors.get(meteor.id)!;
      const visible = !meteor.hidden || meteor.ownerId === this.myId;
      entry.ring.visible = visible;
      entry.rock.visible = visible;
      const t = Math.max(0, Math.min(1, 1 - (meteor.strikeAt - state.tick) / METEOR_DELAY_TICKS));

      const scale = 1.0 - t * 0.4;
      entry.ring.scale.setScalar(scale * entry.sizeScale);
      const localTime = this.elapsedTime - entry.spawnTime;
      const pulseFreq = 0.5 + t * 2; // 0.5Hz → 2.5Hz
      (entry.ring.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(localTime * pulseFreq * Math.PI * 2) * 0.3 + 0.5;

      // Animate rock: fall from y=500 to y=0
      const rockY = 500 * (1 - t);
      entry.rock.position.set(meteor.target.x, rockY, meteor.target.y);
      const rockScale = 0.4 + t * 0.6;
      entry.rock.scale.setScalar(rockScale * entry.sizeScale);

      // Emit trail while falling
      if (this.shouldEmitContinuous && visible) {
        this.particles.emitMeteorTrail(meteor.target.x, rockY, meteor.target.y);
      }
    }
  }

  private syncRainOfArrows(state: GameState): void {
    const activeIds = new Set(state.rainOfArrows.map(r => r.id));

    for (const [id, entry] of this.rainOfArrows) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.circle);
        this.scene.remove(entry.arrowGroup);
        disposeObject3D(entry.circle);
        disposeObject3D(entry.arrowGroup);
        this.particles.emitRainImpact(entry.target.x, 0, entry.target.y, entry.radius);
        sfx.playRainImpact();
        this.rainOfArrows.delete(id);
      }
    }

    for (const rain of state.rainOfArrows) {
      if (!this.rainOfArrows.has(rain.id)) {
        sfx.playRainVolley();
        const color = ELEMENT_COLORS[this.arrowElement];
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(rain.radius, 48),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
        );
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(rain.target.x, 1, rain.target.y);
        this.scene.add(disc);

        const arrows = this.createFallingArrows(rain.target.x, rain.target.y, rain.radius);
        arrows.arrowMaterial.opacity = 0;

        this.rainOfArrows.set(rain.id, {
          circle: disc,
          target: { ...rain.target },
          radius: rain.radius,
          ...arrows,
        });
      }

      const entry = this.rainOfArrows.get(rain.id)!;
      const t = Math.max(0, Math.min(1, 1 - (rain.strikeAt - state.tick) / RAIN_DELAY_TICKS));
      (entry.circle.material as THREE.MeshBasicMaterial).opacity = 0.12 + t * 0.23;
      entry.arrowMaterial.opacity = Math.min(1, t * 2);
      this.updateFallingArrows(entry);
    }
  }

  dispose(): void {
    sfx.stopAllSpellLoops();
    for (const mesh of this.fireballs.values()) { this.scene.remove(mesh); disposeObject3D(mesh); }
    for (const entry of this.arrows.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
    for (const group of this.fireWalls.values()) { this.scene.remove(group); disposeObject3D(group); }
    for (const visual of this.rainZoneArrows.values()) { this.scene.remove(visual.arrowGroup); disposeObject3D(visual.arrowGroup); }
    this.rainZoneArrows.clear();
    for (const entry of this.meteors.values()) {
      this.scene.remove(entry.ring);
      this.scene.remove(entry.rock);
      disposeObject3D(entry.ring);
      disposeObject3D(entry.rock);
    }
    for (const entry of this.rainOfArrows.values()) {
      this.scene.remove(entry.circle);
      this.scene.remove(entry.arrowGroup);
      disposeObject3D(entry.circle);
      disposeObject3D(entry.arrowGroup);
    }
    for (const effect of this.teleportEffects) effect.dispose();
    this.fireballs.clear();
    this.arrows.clear();
    this.fireWalls.clear();
    this.meteors.clear();
    this.rainOfArrows.clear();
    this.teleportEffects.length = 0;
    this.particles.dispose();
  }
}
