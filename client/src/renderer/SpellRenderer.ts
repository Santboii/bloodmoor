import * as THREE from 'three';
import {
  GameState, METEOR_DELAY_TICKS, METEOR_AOE_RADIUS, RAIN_DELAY_TICKS,
  iceRayRamp, ICE_RAY_HALF_WIDTH_START, ICE_RAY_HALF_WIDTH_FULL,
  aurasForGear, type AuraAnchor, type Vec2,
} from '@arena/shared';
import type { FireWallState, PlayerState } from '@arena/shared';
import { ParticleSystem } from './ParticleSystem';
import { TeleportEffect } from './TeleportEffect';
import { spriteWorldHeight } from './sprites/SpriteCharacter';
import * as sfx from '../audio/sfx';

type MeteorEntry = { ring: THREE.Mesh; rock: THREE.Mesh; target: { x: number; y: number }; spawnTime: number; sizeScale: number };
type ArrowEntry = { mesh: THREE.Group };
type SpearEntry = { mesh: THREE.Group };
type BlockShieldEntry = { mesh: THREE.Mesh };
type ReflectEntry = { mesh: THREE.Mesh };
type StunEntry = { sprites: THREE.Sprite[] };
type IceBoltEntry = { mesh: THREE.Group };
type FrozenOrbEntry = { mesh: THREE.Mesh };
// spinAngle accumulates every frame so the beam's rotation about its own
// length axis is continuous even though its base orientation (rotation.set)
// is recomputed from scratch each frame to track the caster's current aim.
// `glow` is a child of `mesh` (the hot core) — see syncIceRays for why.
type IceRayEntry = { mesh: THREE.Mesh; glow: THREE.Mesh; spinAngle: number };
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
// Cylinder/cone height axis is Y by default; rotateZ(-90°) bakes in a
// quarter-turn so the long axis becomes local +X — the same axis the arrow's
// BoxGeometry is naturally long on. That lets syncSpears reuse syncArrows'
// exact group.rotation.set(-Math.PI/2, 0, -angle) velocity-orientation math.
const SPEAR_SHAFT_GEO = new THREE.CylinderGeometry(1.2, 1.2, 26, 6).rotateZ(-Math.PI / 2);
const SPEAR_TIP_GEO = new THREE.ConeGeometry(2.2, 5, 6).rotateZ(-Math.PI / 2);
const BLOCK_SHIELD_GEO = new THREE.RingGeometry(20, 26, 12, 1, -Math.PI / 2, Math.PI);
const REFLECT_RING_GEO = new THREE.RingGeometry(22, 25, 24);
// Icicle shard, apex along +X so the same rotation math as the arrow shaft
// (rotation.set(-PI/2, 0, -angle)) points it down the velocity vector.
const ICE_BOLT_GEO = new THREE.ConeGeometry(5, 22, 6).rotateZ(-Math.PI / 2);
const FALLING_SHARD_GEO = new THREE.ConeGeometry(1.5, 10, 4);
// Ice Ray beam: unit box, scaled per-frame to (length, width, thickness) and
// rotated with the same -PI/2,0,-angle convention as the arrow shaft/ice
// bolt above, so its local X axis (length) ends up pointing from caster to
// channelEnd and local Y (width) ends up spanning the horizontal plane.
const ICE_RAY_BEAM_GEO = new THREE.BoxGeometry(1, 1, 1);

// HDR-bright fire: channel values above 1.0 survive into the half-float
// composer buffer (tone mapping runs last), so bloom reads the fireball as a
// real light source. ACES renders the core white-hot with an orange fringe,
// and the 360p-pinned bloom smears it into the wide soft glow the old
// pixelated pipeline had.
const FIREBALL_CORE_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.8, 0.2) });
const FIREBALL_GLOW_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.3, 0.09), transparent: true, opacity: 0.25 });
const METEOR_ROCK_MAT = new THREE.MeshBasicMaterial({ color: 0xff4400 });
const WALL_SEGMENT_MAT = new THREE.LineBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.4 });
const SPEAR_SHAFT_MAT = new THREE.MeshBasicMaterial({ color: 0x9a8866 });
const SPEAR_TIP_MAT = new THREE.MeshBasicMaterial({ color: 0xcfcfd8 });
const BLOCK_SHIELD_MAT = new THREE.MeshBasicMaterial({
  color: 0x8ca9ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
});
// Opacity is mutated once per frame in syncGladiatorStatus (pulsing with
// elapsedTime, shared across every reflecting player — there's no per-player
// phase, so one material suffices instead of one-per-instance like the
// meteor ring).
const REFLECT_RING_MAT = new THREE.MeshBasicMaterial({
  color: 0xd9f0ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
});

const ICE_BOLT_MAT = new THREE.MeshBasicMaterial({ color: 0xbfe9ff });
const FROZEN_ORB_CORE_MAT = new THREE.MeshBasicMaterial({ color: 0xaee9ff });
const FROZEN_ORB_GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.3 });

// Frozen orbs carry no server-side radius (they deal no direct damage — only
// their sprayed shards do), so the visual size is a client-only constant.
const FROZEN_ORB_VISUAL_RADIUS = 16;

// Fixed vertical slab thickness for the beam — only its horizontal width
// (perpendicular to travel) ramps with iceRayRamp's halfWidth.
const ICE_RAY_THICKNESS = 10;
const ICE_RAY_COLOR = 0x6fd3f2;
// As charge builds the outer glow bleaches partway toward white — a cheap
// stand-in for heat-death intensity that reads as "more powerful" without a
// soft glow/bloom pass. Capped well short of pure white (see
// ICE_RAY_COLOR_LERP_MAX below) so full charge stays recognisably frost-blue
// instead of washing out.
const ICE_RAY_COLOR_BASE = new THREE.Color(ICE_RAY_COLOR);
const ICE_RAY_COLOR_HOT = new THREE.Color(0xffffff);
// Pale icy white for the hot inner core — brighter than the frost-blue glow
// around it so the beam reads as a bright lance wrapped in cold haze rather
// than one flat-colored slab.
const ICE_RAY_CORE_COLOR = 0xeaffff;
// The core is a thin bright band; the glow is a wider, softer haze around it
// — both are fractions of the same ramped halfWidth/thickness so the two-
// layer look holds at every charge level.
const ICE_RAY_CORE_WIDTH_FRAC = 0.4;
const ICE_RAY_CORE_THICKNESS_FRAC = 0.55;
const ICE_RAY_GLOW_WIDTH_FRAC = 1.7;
const ICE_RAY_GLOW_THICKNESS_FRAC = 1.6;
// The glow mesh is parented to the core mesh, so its scale is relative to
// the core's — these ratios (not the raw FRAC constants above) are what
// actually size it. Constant across every charge level, so set once at
// creation rather than recomputed per frame.
const ICE_RAY_GLOW_REL_SCALE_Y = ICE_RAY_GLOW_WIDTH_FRAC / ICE_RAY_CORE_WIDTH_FRAC;
const ICE_RAY_GLOW_REL_SCALE_Z = ICE_RAY_GLOW_THICKNESS_FRAC / ICE_RAY_CORE_THICKNESS_FRAC;
// Spin speed (rad/s) about the beam's own length axis — a fresh, narrow beam
// drifts lazily; a fully charged one whips around fast enough to blur.
const ICE_RAY_SPIN_MIN = 1.5;
const ICE_RAY_SPIN_MAX = 9;

// Brightness ceilings for full charge. A first pass ramped opacity and the
// white color-lerp all the way to their natural maximums (opacity ~0.95,
// color 100% white) — at full charge the beam blew out into a white-out that
// hid the arena behind it. These caps keep the top end reading as an intense
// frost-blue lance instead of a flash of white; the *ramp* (min values, and
// the ease curve below) is unchanged so charging up still visibly brightens
// the beam, it just tops out sooner.
const ICE_RAY_CORE_OPACITY_MIN = 0.45;
const ICE_RAY_CORE_OPACITY_MAX = 0.7;
const ICE_RAY_GLOW_OPACITY_MIN = 0.18;
const ICE_RAY_GLOW_OPACITY_MAX = 0.38;
// Cap on how far the glow's color lerps toward white at full charge — 1.0
// (the old value) washes it out to near-pure white; this keeps full charge
// recognizably frost-blue.
const ICE_RAY_COLOR_LERP_MAX = 0.35;
// Cap on the white-bias passed to ParticleSystem.emitIceRayTrail's
// `intensity` param — 1.0 (the old value) biased the spray to solid white at
// full charge; this keeps the sprayed particles frost-tinted.
const ICE_RAY_PARTICLE_INTENSITY_MAX = 0.5;

const sharedGeometries = new Set<THREE.BufferGeometry>([
  FIREBALL_GEO, ARROW_SHAFT_GEO, ARROW_TRAIL_GEO, FALLING_ARROW_GEO, METEOR_RING_GEO, METEOR_ROCK_GEO,
  SPEAR_SHAFT_GEO, SPEAR_TIP_GEO, BLOCK_SHIELD_GEO, REFLECT_RING_GEO,
  ICE_BOLT_GEO, FALLING_SHARD_GEO, ICE_RAY_BEAM_GEO,
]);
const sharedMaterials = new Set<THREE.Material>([
  FIREBALL_CORE_MAT, FIREBALL_GLOW_MAT, METEOR_ROCK_MAT, WALL_SEGMENT_MAT,
  SPEAR_SHAFT_MAT, SPEAR_TIP_MAT, BLOCK_SHIELD_MAT, REFLECT_RING_MAT,
  ICE_BOLT_MAT, FROZEN_ORB_CORE_MAT, FROZEN_ORB_GLOW_MAT,
]);

// Stun stars are the one effect with no existing texture-based visual in
// this renderer to reuse — ParticleSystem's "particles" are procedural
// shader points, not sprites. Built lazily (needs a canvas 2D context, which
// the node test environment lacks) and shared across every stunned player,
// mirroring how AssetLoader/SpriteCompositor bake a canvas into a
// THREE.CanvasTexture elsewhere in this codebase.
let stunStarMaterial: THREE.SpriteMaterial | null = null;
function getStunStarMaterial(): THREE.SpriteMaterial {
  if (!stunStarMaterial) {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(size / 2, size / 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const spikes = 4;
    const outerR = size / 2;
    const innerR = size / 5;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    stunStarMaterial = new THREE.SpriteMaterial({ map: texture, color: 0xffee55, transparent: true, depthWrite: false });
    sharedMaterials.add(stunStarMaterial);
  }
  return stunStarMaterial;
}

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

/** Cheap change-detector for a wall's geometry — rotating walls change every
 *  tick, static ones never do. */
function wallSignature(fw: FireWallState): string {
  return fw.segments.map(s => `${s.x1.toFixed(1)},${s.y1.toFixed(1)},${s.x2.toFixed(1)},${s.y2.toFixed(1)}`).join('|');
}

/** Where on the body an aura emits. Fractions of the sprite's world height:
 * feet just clear of the ground, chest at the midpoint, head near the top. */
export function auraAnchorY(anchor: AuraAnchor, spriteHeight: number): number {
  const fraction = anchor === 'feet' ? 0.08 : anchor === 'chest' ? 0.5 : 0.82;
  return spriteHeight * fraction;
}

// Below this per-sample step the player is standing still — position noise
// from interpolation should not make a wisp trail flicker on.
const AURA_MOVE_EPSILON = 0.5;

export function isMoving(prev: Vec2 | undefined, next: Vec2): boolean {
  if (!prev) return false;
  return Math.hypot(next.x - prev.x, next.y - prev.y) > AURA_MOVE_EPSILON;
}

/** Mirrors main.ts's own visibility rule for Shadowstep (archer_utility.shadowstep):
 * every viewer sees themselves; everyone else sees nobody once their
 * invisibleUntil tick is still ahead of the current tick. Shared so a
 * unique's aura can't out itself as an invisible player's glow. */
export function isInvisibleToViewer(
  player: { id: string; invisibleUntil?: number },
  viewerId: string,
  tick: number,
): boolean {
  return player.id !== viewerId && (player.invisibleUntil ?? 0) > tick;
}

export class SpellRenderer {
  private fireballs = new Map<string, THREE.Mesh>();
  private wallSignatures = new Map<string, string>();
  private arrows = new Map<string, ArrowEntry>();
  private spears = new Map<string, SpearEntry>();
  private blockShields = new Map<string, BlockShieldEntry>();
  private reflectShimmers = new Map<string, ReflectEntry>();
  private stunStars = new Map<string, StunEntry>();
  private fireWalls = new Map<string, THREE.Group>();
  private meteors = new Map<string, MeteorEntry>();
  private rainOfArrows = new Map<string, RainEntry>();
  private rainZoneArrows = new Map<string, RainArrowVisual>();
  private iceBolts = new Map<string, IceBoltEntry>();
  private frozenOrbs = new Map<string, FrozenOrbEntry>();
  private iceRays = new Map<string, IceRayEntry>();
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
  // Auras run at half the continuous cadence — they are ambient, and the
  // pool is shared with every spell effect.
  private auraAccumulator = 0;
  private shouldEmitAura = false;
  private prevAuraPositions = new Map<string, Vec2>();

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

  /** Same falling-particle shape as createFallingArrows, swapped to icy
   * shard meshes for blizzard zones. */
  private createFallingShards(cx: number, cz: number, radius: number, count = 16): RainArrowVisual {
    const arrowGroup = new THREE.Group();
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xaee9ff, transparent: true, opacity: 0.7 });
    const arrowPhases: number[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const shard = new THREE.Mesh(FALLING_SHARD_GEO, arrowMaterial);
      shard.position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
      shard.rotation.x = (Math.random() - 0.5) * 0.3;
      shard.rotation.z = (Math.random() - 0.5) * 0.3;
      arrowGroup.add(shard);
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

  /** selfPosition, when given, overrides the local player's position for aura
   * emission — the interpolated state buffer lags behind the predicted render
   * position main.ts actually draws the local mesh at, so without this the
   * aura visibly detaches from the body while moving (see syncUniqueAuras). */
  update(state: GameState, selfPosition?: Vec2): void {
    const delta = this.clock.getDelta();
    this.elapsedTime += delta;
    this.emitAccumulator += delta;
    this.shouldEmitContinuous = this.emitAccumulator >= 1 / 60;
    if (this.shouldEmitContinuous) this.emitAccumulator %= 1 / 60;
    this.auraAccumulator += delta;
    this.shouldEmitAura = this.auraAccumulator >= 1 / 30;
    if (this.shouldEmitAura) this.auraAccumulator %= 1 / 30;
    this.detectTeleports(state);
    this.syncFireballs(state);
    this.syncArrows(state);
    this.syncSpears(state);
    this.syncIceBolts(state);
    this.syncFireWalls(state);
    this.syncMeteors(state);
    this.syncRainOfArrows(state);
    this.syncFrozenOrbs(state);
    this.syncIceRays(state, delta);
    this.syncGladiatorStatus(state);
    this.syncUniqueAuras(state, selfPosition);
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

  private syncSpears(state: GameState): void {
    const activeSpearIds = new Set(state.projectiles.filter(p => p.type === 'spear').map(p => p.id));

    for (const [id, entry] of this.spears) {
      if (!activeSpearIds.has(id)) {
        this.scene.remove(entry.mesh);
        disposeObject3D(entry.mesh);
        this.spears.delete(id);
      }
    }

    for (const spear of state.projectiles) {
      if (spear.type !== 'spear') continue;

      if (!this.spears.has(spear.id)) {
        const group = new THREE.Group();
        const shaft = new THREE.Mesh(SPEAR_SHAFT_GEO, SPEAR_SHAFT_MAT);
        group.add(shaft);
        // Tip sits at the shaft's forward end (half its 26u length), pointing
        // further out — see SPEAR_TIP_GEO's rotateZ comment for why local +X
        // is "forward" here.
        const tip = new THREE.Mesh(SPEAR_TIP_GEO, SPEAR_TIP_MAT);
        tip.position.x = 13;
        group.add(tip);
        this.scene.add(group);
        this.spears.set(spear.id, { mesh: group });
      }

      const entry = this.spears.get(spear.id)!;
      const wx = spear.position.x;
      const wy = 30;
      const wz = spear.position.y;
      entry.mesh.position.set(wx, wy, wz);

      // Orient along velocity vector (X-Z plane in world space) — identical
      // to syncArrows; see SPEAR_SHAFT_GEO's comment for why this formula
      // works for a cylinder too.
      const vx = spear.velocity.x;
      const vz = spear.velocity.y;
      const angle = Math.atan2(vz, vx);
      entry.mesh.rotation.set(-Math.PI / 2, 0, -angle);
    }
  }

  private syncIceBolts(state: GameState): void {
    const activeIceBoltIds = new Set(
      state.projectiles.filter(p => p.type === 'icebolt' || p.type === 'iceshard').map(p => p.id),
    );

    for (const [id, entry] of this.iceBolts) {
      if (!activeIceBoltIds.has(id)) {
        this.scene.remove(entry.mesh);
        disposeObject3D(entry.mesh);
        this.iceBolts.delete(id);
      }
    }

    for (const bolt of state.projectiles) {
      if (bolt.type !== 'icebolt' && bolt.type !== 'iceshard') continue;

      if (!this.iceBolts.has(bolt.id)) {
        const group = new THREE.Group();
        const shaft = new THREE.Mesh(ICE_BOLT_GEO, ICE_BOLT_MAT);
        // Shards are the same icicle mesh, just smaller — spray fragments
        // rather than the bolt itself.
        if (bolt.type === 'iceshard') shaft.scale.setScalar(0.45);
        group.add(shaft);

        this.scene.add(group);
        this.iceBolts.set(bolt.id, { mesh: group });
      }

      const entry = this.iceBolts.get(bolt.id)!;
      const wx = bolt.position.x;
      const wy = 30;
      const wz = bolt.position.y;
      entry.mesh.position.set(wx, wy, wz);

      // Orient along velocity vector (X-Z plane in world space)
      const vx = bolt.velocity.x;
      const vz = bolt.velocity.y;
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
        this.wallSignatures.delete(id);
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
      const isRainZone = fw.kind === 'rain';
      const isBlizzard = fw.kind === 'blizzard';

      if (!this.fireWalls.has(fw.id)) {
        if (!isRainZone && !isBlizzard) sfx.startFireWallLoop(fw.id);
        const group = new THREE.Group();
        if (fw.shape === 'circle' && fw.center && fw.radius) {
          const disc = new THREE.Mesh(
            new THREE.CircleGeometry(fw.radius, 32),
            new THREE.MeshBasicMaterial({
              color: isBlizzard ? ELEMENT_COLORS.freeze : isRainZone ? ELEMENT_COLORS[this.arrowElement] : 0xff2200,
              transparent: true,
              opacity: isBlizzard ? 0.18 : isRainZone ? 0.15 : 0.2,
              side: THREE.DoubleSide,
            }),
          );
          disc.rotation.x = -Math.PI / 2;
          disc.position.set(fw.center.x, 1, fw.center.y);
          group.add(disc);
          if (isRainZone) {
            this.rainZoneArrows.set(fw.id, this.createFallingArrows(fw.center.x, fw.center.y, fw.radius, 12));
          } else if (isBlizzard) {
            this.rainZoneArrows.set(fw.id, this.createFallingShards(fw.center.x, fw.center.y, fw.radius, 20));
          }
        } else {
          this.rebuildWallSegments(group, fw);
          this.wallSignatures.set(fw.id, wallSignature(fw));
        }
        this.scene.add(group);
        this.fireWalls.set(fw.id, group);
      }

      // Firestorm rotation and Inferno Expanse growth mutate segments every
      // tick, so a straight wall rebuilds its meshes whenever the server's
      // geometry actually changed. Checked on the 60Hz emit cadence: the
      // server ticks at 60Hz, so per-render-frame signature strings would
      // only allocate more on high-refresh displays, never detect sooner.
      if (fw.shape !== 'circle' && this.shouldEmitContinuous) {
        const sig = wallSignature(fw);
        if (sig !== this.wallSignatures.get(fw.id)) {
          this.wallSignatures.set(fw.id, sig);
          this.rebuildWallSegments(this.fireWalls.get(fw.id)!, fw);
        }
      }

      if (fw.shape === 'circle' && fw.center && fw.radius) {
        // Stormcall drifts a rain zone's center over its lifetime — reposition
        // the disc and its falling-arrow particles every frame, not just once.
        const group = this.fireWalls.get(fw.id);
        const disc = group?.children[0];
        if (disc) disc.position.set(fw.center.x, 1, fw.center.y);
        if (isRainZone || isBlizzard) {
          const visual = this.rainZoneArrows.get(fw.id);
          if (visual) {
            visual.arrowGroup.position.set(fw.center.x, 0, fw.center.y);
            this.updateFallingArrows(visual);
          }
        } else if (this.shouldEmitContinuous) {
          this.particles.emitCrater(fw.center.x, fw.center.y, fw.radius);
        }
      } else if (this.shouldEmitContinuous) {
        this.particles.emitWall(fw.segments);
      }
    }
  }

  /**
   * Rebuilds a wall's line meshes from its current segments. Called on
   * creation and again whenever the server's geometry changes. Disposing
   * matters: a rotating wall rebuilds every tick, so leaking one
   * BufferGeometry per segment per tick is the failure mode. disposeObject3D
   * skips WALL_SEGMENT_MAT because it is registered in sharedMaterials.
   */
  private rebuildWallSegments(group: THREE.Group, fw: FireWallState): void {
    for (const child of [...group.children]) {
      group.remove(child);
      disposeObject3D(child);
    }
    for (const seg of fw.segments) {
      const points = [
        new THREE.Vector3(seg.x1, 1, seg.y1),
        new THREE.Vector3(seg.x2, 1, seg.y2),
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), WALL_SEGMENT_MAT));
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
      // Guided Descent steers the meteor mid-fall, so the ring and the cached
      // impact point must track the server's current target, not the one
      // captured at spawn.
      entry.target.x = meteor.target.x;
      entry.target.y = meteor.target.y;
      entry.ring.position.set(meteor.target.x, 2, meteor.target.y);
      entry.ring.visible = true;
      entry.rock.visible = true;
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
      if (this.shouldEmitContinuous) {
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

    /** Block shield / reflect shimmer / stun stars — one diff-map per effect,
   * keyed by player id, each created on first sight and disposed the moment
   * its condition (blocking / reflectUntil / stunUntil) stops holding. Stun
   * stars are the legibility-critical one: they're the only on-screen signal
   * telling a stunned player why their inputs are dead.
   *
   * Also drops all three the moment a player is a corpse or invisible to
   * this viewer — mirrors syncUniqueAuras's hp<=0 / isInvisibleToViewer
   * guard exactly (including its viewer-aware semantics: a player always
   * sees their own effects, per isInvisibleToViewer's `player.id !== viewerId`
   * check). Without it, a corpse's stale `blocking` flag (the server's §1
   * loop skips hp<=0 players, so it never latches back to false) would leave
   * the shield arc rendering forever, and a Shadowstepped player's exact
   * position would leak through the shield/shimmer/stars to every other
   * viewer. */
    private syncGladiatorStatus(state: GameState): void {
    const hidden = (p: PlayerState | undefined): boolean =>
      !p || p.hp <= 0 || isInvisibleToViewer(p, this.myId, state.tick);

    for (const [id, entry] of this.blockShields) {
      const p = state.players[id];
      if (hidden(p) || !p!.blocking) {
        this.scene.remove(entry.mesh);
        disposeObject3D(entry.mesh);
        this.blockShields.delete(id);
      }
    }
    for (const [id, entry] of this.reflectShimmers) {
      const p = state.players[id];
      if (hidden(p) || !((p!.reflectUntil ?? 0) > state.tick)) {
        this.scene.remove(entry.mesh);
        disposeObject3D(entry.mesh);
        this.reflectShimmers.delete(id);
      }
    }
    for (const [id, entry] of this.stunStars) {
      const p = state.players[id];
      if (hidden(p) || !((p!.stunUntil ?? 0) > state.tick)) {
        for (const sprite of entry.sprites) this.scene.remove(sprite);
        this.stunStars.delete(id);
      }
    }

    for (const p of Object.values(state.players)) {
      if (p.hp <= 0 || isInvisibleToViewer(p, this.myId, state.tick)) continue;

      if (p.blocking) {
        if (!this.blockShields.has(p.id)) {
          const mesh = new THREE.Mesh(BLOCK_SHIELD_GEO, BLOCK_SHIELD_MAT);
          this.scene.add(mesh);
          this.blockShields.set(p.id, { mesh });
        }
        const entry = this.blockShields.get(p.id)!;
        entry.mesh.position.set(p.position.x, 2, p.position.y);
        // Reuses the arrow/spear velocity-orientation formula with `facing`
        // standing in for the angle: it both flattens the ring into the
        // ground plane and yaws its arc (centered on local +X, per
        // BLOCK_SHIELD_GEO's thetaStart) to open toward the player's facing.
        entry.mesh.rotation.set(-Math.PI / 2, 0, -p.facing);
      }

      if ((p.reflectUntil ?? 0) > state.tick) {
        if (!this.reflectShimmers.has(p.id)) {
          const mesh = new THREE.Mesh(REFLECT_RING_GEO, REFLECT_RING_MAT);
          mesh.rotation.x = -Math.PI / 2;
          this.scene.add(mesh);
          this.reflectShimmers.set(p.id, { mesh });
        }
        const entry = this.reflectShimmers.get(p.id)!;
        entry.mesh.position.set(p.position.x, 2, p.position.y);
        REFLECT_RING_MAT.opacity = Math.sin(this.elapsedTime * 4) * 0.25 + 0.5;
      }

      if ((p.stunUntil ?? 0) > state.tick) {
        if (!this.stunStars.has(p.id)) {
          const sprites: THREE.Sprite[] = [];
          for (let i = 0; i < 3; i++) {
            const sprite = new THREE.Sprite(getStunStarMaterial());
            sprite.scale.set(8, 8, 1);
            this.scene.add(sprite);
            sprites.push(sprite);
          }
          this.stunStars.set(p.id, { sprites });
        }
        const entry = this.stunStars.get(p.id)!;
        const orbitRadius = 12;
        for (let i = 0; i < entry.sprites.length; i++) {
          const angle = this.elapsedTime * 4 + i * ((Math.PI * 2) / 3);
          entry.sprites[i].position.set(
            p.position.x + Math.cos(angle) * orbitRadius,
            30,
            p.position.y + Math.sin(angle) * orbitRadius,
          );
        }
      }
    }
  }

  private syncFrozenOrbs(state: GameState): void {
    // Deploy skew defense (rolling deploy): frozenOrbs is required in the
    // type, but a mismatched server build could still omit it — same reason
    // echoVolleys is optional and read with `?? []`.
    const frozenOrbs = state.frozenOrbs ?? [];
    const activeIds = new Set(frozenOrbs.map(o => o.id));

    for (const [id, entry] of this.frozenOrbs) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.mesh);
        disposeObject3D(entry.mesh);
        this.frozenOrbs.delete(id);
      }
    }

    for (const orb of frozenOrbs) {
      if (!this.frozenOrbs.has(orb.id)) {
        // Same core+glow shape as a fireball, recolored icy blue and sized
        // for an orb rather than a bolt.
        const mesh = new THREE.Mesh(FIREBALL_GEO, FROZEN_ORB_CORE_MAT);
        mesh.scale.setScalar(FROZEN_ORB_VISUAL_RADIUS * 0.8);
        const glow = new THREE.Mesh(FIREBALL_GEO, FROZEN_ORB_GLOW_MAT);
        glow.scale.setScalar(1.4 / 0.8); // relative to the core's scale
        mesh.add(glow);
        this.scene.add(mesh);
        this.frozenOrbs.set(orb.id, { mesh });
      }

      const entry = this.frozenOrbs.get(orb.id)!;
      entry.mesh.position.set(orb.position.x, 30, orb.position.y);
    }
  }

  private syncIceRays(state: GameState, delta: number): void {
    const activeIds = new Set(
      Object.entries(state.players)
        .filter(([, p]) => p.channelSpell === 12 && p.channelEnd)
        .map(([id]) => id),
    );

    for (const [id, entry] of this.iceRays) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.mesh);
        disposeObject3D(entry.mesh);
        this.iceRays.delete(id);
      }
    }

    for (const [id, player] of Object.entries(state.players)) {
      if (player.channelSpell !== 12 || !player.channelEnd) continue;

      if (!this.iceRays.has(id)) {
        // Per-instance materials so opacity/color can animate independently
        // per beam; disposeObject3D frees both automatically (it traverses
        // into children) since neither is added to sharedMaterials.
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: ICE_RAY_CORE_COLOR,
          transparent: true,
          opacity: ICE_RAY_CORE_OPACITY_MIN,
        });
        const mesh = new THREE.Mesh(ICE_RAY_BEAM_GEO, coreMaterial);

        // Outer glow: same box geometry (shared, already registered), scaled
        // wider/thicker than the core and parented to it so it inherits the
        // core's position/rotation/spin for free.
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: ICE_RAY_COLOR,
          transparent: true,
          opacity: ICE_RAY_GLOW_OPACITY_MIN,
          depthWrite: false,
        });
        const glow = new THREE.Mesh(ICE_RAY_BEAM_GEO, glowMaterial);
        glow.scale.set(1, ICE_RAY_GLOW_REL_SCALE_Y, ICE_RAY_GLOW_REL_SCALE_Z);
        mesh.add(glow);

        this.scene.add(mesh);
        this.iceRays.set(id, { mesh, glow, spinAngle: 0 });
      }

      const entry = this.iceRays.get(id)!;
      const mesh = entry.mesh;
      const glow = entry.glow;
      const ramp = iceRayRamp(player.channelTicks ?? 0);

      const dx = player.channelEnd.x - player.position.x;
      const dz = player.channelEnd.y - player.position.y;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const fullWidth = ramp.halfWidth * 2;

      mesh.position.set(
        (player.position.x + player.channelEnd.x) / 2,
        30,
        (player.position.y + player.channelEnd.y) / 2,
      );

      // Charge fraction derived from the already-ramped halfWidth (not a
      // re-derivation of the ramp curve itself). Width GROWS from START to
      // FULL as charge builds, so t still runs 0 → 1 as the beam widens.
      const t = (ramp.halfWidth - ICE_RAY_HALF_WIDTH_START) / (ICE_RAY_HALF_WIDTH_FULL - ICE_RAY_HALF_WIDTH_START);

      // Same base orientation convention as the arrow shaft/ice bolt: local X
      // (the length axis after scaling) ends up pointing from caster to
      // channelEnd. Reset to that base every frame (aim can move), then spin
      // about the same local X axis so the beam visibly twists along its
      // length — faster as it charges up. The glow (child of mesh) inherits
      // this rotation for free.
      mesh.rotation.set(-Math.PI / 2, 0, -angle);
      const spinSpeed = ICE_RAY_SPIN_MIN + t * (ICE_RAY_SPIN_MAX - ICE_RAY_SPIN_MIN);
      entry.spinAngle += delta * spinSpeed;
      mesh.rotateX(entry.spinAngle);
      mesh.scale.set(
        Math.max(length, 0.001),
        fullWidth * ICE_RAY_CORE_WIDTH_FRAC,
        ICE_RAY_THICKNESS * ICE_RAY_CORE_THICKNESS_FRAC,
      );

      // Ease the brightness ramp (opacity/color/particle bias below) so most
      // of the intensification happens early and it flattens near full
      // charge, rather than climbing linearly all the way to the (now
      // capped) ceiling. Spin speed and particle sample count above still
      // track the raw, linear `t` — only brightness is eased/capped here.
      const brightnessT = 1 - (1 - t) * (1 - t);

      // Hot core brightens toward its capped opacity as charge builds; the
      // outer glow stays translucent throughout but bleaches from frost blue
      // partway toward white the same way, so the whole beam reads as a
      // bright lance wrapped in a cold haze rather than one flat-colored
      // slab — without either layer blowing out to solid white at t=1.
      const coreMaterial = mesh.material as THREE.MeshBasicMaterial;
      coreMaterial.opacity = ICE_RAY_CORE_OPACITY_MIN
        + brightnessT * (ICE_RAY_CORE_OPACITY_MAX - ICE_RAY_CORE_OPACITY_MIN);
      const glowMaterial = glow.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = ICE_RAY_GLOW_OPACITY_MIN
        + brightnessT * (ICE_RAY_GLOW_OPACITY_MAX - ICE_RAY_GLOW_OPACITY_MIN);
      glowMaterial.color.copy(ICE_RAY_COLOR_BASE).lerp(ICE_RAY_COLOR_HOT, brightnessT * ICE_RAY_COLOR_LERP_MAX);

      if (this.shouldEmitContinuous && length > 0) {
        const ux = dx / length;
        const uz = dz / length;
        // Perpendicular unit vector in the XZ plane, for jittering particles
        // off the centerline.
        const px = -uz;
        const pz = ux;
        // Stratified sampling: one random point per length-slice, so frost
        // sheds off the whole beam instead of bunching at a single spot,
        // while still covering it evenly tip-to-tip. Sample count rises
        // linearly with charge; the white-bias passed in (below) uses the
        // same eased, capped brightnessT as the beam material so the spray
        // doesn't read whiter than the beam it's shedding from.
        const sampleCount = 3 + Math.round(t * 7);
        const particleIntensity = brightnessT * ICE_RAY_PARTICLE_INTENSITY_MAX;
        for (let i = 0; i < sampleCount; i++) {
          const frac = (i + Math.random()) / sampleCount;
          const jitter = (Math.random() - 0.5) * ramp.halfWidth * 1.6;
          this.particles.emitIceRayTrail(
            player.position.x + dx * frac + px * jitter,
            28 + Math.random() * 6,
            player.position.y + dz * frac + pz * jitter,
            ux, uz,
            ramp.halfWidth * 0.6,
            particleIntensity,
          );
        }
        // Impact spray kicked back off the target where the beam terminates,
        // denser and brighter at full charge.
        this.particles.emitIceRayTrail(
          player.channelEnd.x, 28, player.channelEnd.y,
          -ux, -uz,
          ramp.halfWidth * (1.2 + t * 0.8),
          particleIntensity,
        );
      }
    }
  }

  private syncUniqueAuras(state: GameState, selfPosition?: Vec2): void {
    if (!this.shouldEmitAura) return;
    const height = spriteWorldHeight();
    const live = new Set<string>();
    for (const player of Object.values(state.players)) {
      live.add(player.id);
      if (player.hp <= 0 || isInvisibleToViewer(player, this.myId, state.tick)) continue;
      const position = player.id === this.myId && selfPosition ? selfPosition : player.position;
      const auras = aurasForGear(player.gear ?? {});
      const prev = this.prevAuraPositions.get(player.id);
      const moving = isMoving(prev, position);
      this.prevAuraPositions.set(player.id, { ...position });
      for (const { aura } of auras) {
        this.particles.emitAura(
          aura.style, aura.color,
          position.x, auraAnchorY(aura.anchor, height), position.y,
          { intensity: aura.intensity, motes: aura.motes, phase: this.elapsedTime, moving },
        );
      }
    }
    for (const id of this.prevAuraPositions.keys()) {
      if (!live.has(id)) this.prevAuraPositions.delete(id);
    }
  }

  dispose(): void {
    sfx.stopAllSpellLoops();
    for (const mesh of this.fireballs.values()) { this.scene.remove(mesh); disposeObject3D(mesh); }
    for (const entry of this.arrows.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
    for (const entry of this.spears.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
    for (const entry of this.blockShields.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
    for (const entry of this.reflectShimmers.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
    for (const entry of this.stunStars.values()) { for (const sprite of entry.sprites) this.scene.remove(sprite); }
    for (const entry of this.iceBolts.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
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
    for (const entry of this.frozenOrbs.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
    for (const entry of this.iceRays.values()) { this.scene.remove(entry.mesh); disposeObject3D(entry.mesh); }
    for (const effect of this.teleportEffects) effect.dispose();
    this.fireballs.clear();
    this.arrows.clear();
    this.spears.clear();
    this.blockShields.clear();
    this.reflectShimmers.clear();
    this.stunStars.clear();
    this.iceBolts.clear();
    this.fireWalls.clear();
    this.meteors.clear();
    this.rainOfArrows.clear();
    this.frozenOrbs.clear();
    this.iceRays.clear();
    this.teleportEffects.length = 0;
    this.particles.dispose();
  }
}
