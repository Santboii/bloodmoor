// A player character as an LPC sprite billboard: one plane whose UVs window
// a 64x64 frame of the composited per-animation texture, plus a blob shadow.
import * as THREE from 'three';
import { Appearance, GearVisuals, LPC_ANIMATIONS, LpcAnimation, CharacterClass } from '@arena/shared';
import { worldUnitsPerTexel } from '../pixelation';
import { FRAME, LpcDirection, frameRect, directionFromWorldAngle, animationFrame } from './lpc';
import { compositeAppearance, disposeComposite } from './SpriteCompositor';

// Exact 2:1 sprite-pixel to internal-pixel ratio: deterministic nearest
// downsampling (no shimmer), and the visible LPC body (~48 of 64 frame px)
// lands at ~50 world units — matching the old model height.
const SPRITE_SCALE = 0.5;

// Casting while moving draws a split-body frame: legs from the locomotion
// sheet below this row, torso/arms/head from the cast sheet above it. LPC
// frames keep the waist near this line across animations, so the halves
// join without a visible seam.
const SPLIT_Y = 42;

const SHADOW_GEO = new THREE.CircleGeometry(11, 16);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });

type MoveAnim = 'idle' | 'walk' | 'run';

export class SpriteCharacter {
  readonly group = new THREE.Group();
  private plane: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private textures: Record<LpcAnimation, THREE.CanvasTexture | null> | null = null;
  private direction: LpcDirection = 2; // facing screen-down
  private dead = false;
  private castAnim: LpcAnimation;
  // Locomotion and casting advance independently so a cast overlays the
  // upper body while the legs keep their walk/run cycle.
  private moveAnim: MoveAnim = 'idle';
  private moveElapsed = 0;
  private casting = false;
  private castElapsed = 0;
  private lastFrameKey = '';
  private scratch: HTMLCanvasElement | null = null;
  private scratchTex: THREE.CanvasTexture | null = null;
  private disposed = false;

  constructor(appearance: Appearance, charClass: CharacterClass, gear: GearVisuals = {}) {
    // Mages cast by swinging the staff. A spellcast pose lifts the hand clear
    // of the grip, so the hole weapon art leaves for the fingers shows through
    // as a missing section of staff; a swing keeps the hand on it throughout.
    this.castAnim = charClass === 'ranger' ? 'shoot' : 'slash';

    const size = FRAME * worldUnitsPerTexel() * SPRITE_SCALE;
    this.material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.01 });
    this.material.visible = false; // until textures arrive
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.material);
    // Billboard: face the isometric camera (matches its fixed orientation).
    this.plane.rotation.order = 'YXZ';
    this.plane.rotation.y = Math.PI / 4;
    this.plane.rotation.x = -Math.atan(600 / Math.hypot(200, 200));
    this.plane.position.y = size / 2;
    this.group.add(this.plane);

    const shadow = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.5;
    this.group.add(shadow);

    compositeAppearance(appearance, gear).then(tex => {
      if (this.disposed) {
        disposeComposite(tex);
        return;
      }
      this.textures = tex;
      this.material.visible = true;
      this.applyFrame(true);
    });
  }

  setFacing(worldAngle: number): void {
    if (this.dead) return;
    this.direction = directionFromWorldAngle(worldAngle, this.direction);
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.casting = false;
    this.moveElapsed = 0;
  }

  update(delta: number, speed: number, isCasting: boolean): void {
    this.moveElapsed += delta;
    this.castElapsed += delta;
    if (!this.dead) {
      const nextMove: MoveAnim = speed > 220 ? 'run' : speed > 1.5 ? 'walk' : 'idle';
      if (nextMove !== this.moveAnim) {
        this.moveAnim = nextMove;
        this.moveElapsed = 0;
      }
      // The server sets castingSpell for exactly one tick per successful cast
      // (cooldown-gated), so an isCasting frame always means a NEW cast —
      // restart the cast overlay even if the previous one is still playing.
      if (isCasting) {
        this.casting = true;
        this.castElapsed = 0;
      }
      const meta = LPC_ANIMATIONS[this.castAnim];
      if (this.casting && this.castElapsed >= meta.frames / meta.fps) {
        this.casting = false;
      }
    }
    this.applyFrame(false);
  }

  private applyFrame(force: boolean): void {
    if (!this.textures) return;

    if (this.dead) {
      this.applyFullFrame('hurt', this.moveElapsed, force);
      return;
    }
    if (this.casting && this.textures[this.castAnim]) {
      if (this.moveAnim === 'idle' || !this.textures[this.moveAnim]) {
        // Standing cast: the full cast frame already has planted legs.
        this.applyFullFrame(this.castAnim, this.castElapsed, force);
      } else {
        this.applySplitFrame(force);
      }
      return;
    }
    this.applyFullFrame(this.moveAnim, this.moveElapsed, force);
  }

  private applyFullFrame(anim: LpcAnimation, elapsed: number, force: boolean): void {
    const usedAnim: LpcAnimation =
      this.textures![anim] ? anim :
      this.textures!.idle ? 'idle' :
      'walk';
    const tex = this.textures![usedAnim];
    if (!tex) return;
    const meta = LPC_ANIMATIONS[usedAnim];
    const loop = usedAnim !== 'hurt' && usedAnim !== this.castAnim;
    const frame = animationFrame(usedAnim, elapsed, loop);
    const key = `${usedAnim}:${this.direction}:${frame}`;
    if (!force && key === this.lastFrameKey) return;
    this.lastFrameKey = key;

    if (this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }
    const { sx, sy } = frameRect(usedAnim, this.direction, frame);
    const rows = meta.singleRow ? 1 : 4;
    tex.repeat.set(FRAME / (meta.frames * FRAME), FRAME / (rows * FRAME));
    tex.offset.set(sx / (meta.frames * FRAME), 1 - (sy + FRAME) / (rows * FRAME));
  }

  /** Blit legs from the locomotion sheet and torso from the cast sheet into
   *  one 64x64 scratch frame — legs keep moving through a mid-run cast. */
  private applySplitFrame(force: boolean): void {
    const upperTex = this.textures![this.castAnim]!;
    const lowerTex = this.textures![this.moveAnim]!;
    const upperFrame = animationFrame(this.castAnim, this.castElapsed, false);
    const lowerFrame = animationFrame(this.moveAnim, this.moveElapsed, true);
    const key = `split:${this.castAnim}:${upperFrame}:${this.moveAnim}:${lowerFrame}:${this.direction}`;
    if (!force && key === this.lastFrameKey) return;
    this.lastFrameKey = key;

    if (!this.scratch) {
      this.scratch = document.createElement('canvas');
      this.scratch.width = FRAME;
      this.scratch.height = FRAME;
      this.scratchTex = new THREE.CanvasTexture(this.scratch);
      this.scratchTex.magFilter = THREE.NearestFilter;
      this.scratchTex.minFilter = THREE.NearestFilter;
      this.scratchTex.generateMipmaps = false;
      this.scratchTex.colorSpace = THREE.SRGBColorSpace;
    }
    const u = frameRect(this.castAnim, this.direction, upperFrame);
    const l = frameRect(this.moveAnim, this.direction, lowerFrame);
    const ctx = this.scratch.getContext('2d')!;
    ctx.clearRect(0, 0, FRAME, FRAME);
    ctx.drawImage(
      lowerTex.image as HTMLCanvasElement,
      l.sx, l.sy + SPLIT_Y, FRAME, FRAME - SPLIT_Y,
      0, SPLIT_Y, FRAME, FRAME - SPLIT_Y,
    );
    ctx.drawImage(
      upperTex.image as HTMLCanvasElement,
      u.sx, u.sy, FRAME, SPLIT_Y,
      0, 0, FRAME, SPLIT_Y,
    );
    this.scratchTex!.needsUpdate = true;

    if (this.material.map !== this.scratchTex) {
      this.material.map = this.scratchTex;
      this.material.needsUpdate = true;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.plane.geometry.dispose();
    this.material.dispose();
    this.scratchTex?.dispose();
    if (this.textures) disposeComposite(this.textures);
  }
}
