// A player character as an LPC sprite billboard: one plane whose UVs window
// a 64x64 frame of the composited per-animation texture, plus a blob shadow.
import * as THREE from 'three';
import { Appearance, LPC_ANIMATIONS, LpcAnimation, CharacterClass } from '@arena/shared';
import { worldUnitsPerTexel } from '../pixelation';
import { FRAME, LpcDirection, frameRect, directionFromWorldAngle, animationFrame } from './lpc';
import { compositeAppearance, disposeComposite } from './SpriteCompositor';

// One sprite pixel = one internal render pixel: the billboard is FRAME
// texels tall in world units. LPC bodies occupy ~48px of the 64px frame,
// giving an on-screen character close to the old 50-world-unit models.
const SPRITE_SCALE = 1;

const SHADOW_GEO = new THREE.CircleGeometry(11, 16);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });

export class SpriteCharacter {
  readonly group = new THREE.Group();
  private plane: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private textures: Record<LpcAnimation, THREE.CanvasTexture | null> | null = null;
  private anim: LpcAnimation = 'idle';
  private animElapsed = 0;
  private direction: LpcDirection = 2; // facing screen-down
  private dead = false;
  private castAnim: LpcAnimation;
  private casting = false;
  private lastFrameKey = '';

  constructor(appearance: Appearance, charClass: CharacterClass) {
    this.castAnim = charClass === 'amazon' ? 'shoot' : 'spellcast';

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

    compositeAppearance(appearance).then(tex => {
      this.textures = tex;
      this.material.visible = true;
      this.applyFrame(true);
    });
  }

  setFacing(worldAngle: number): void {
    if (this.dead) return;
    this.direction = directionFromWorldAngle(worldAngle);
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.anim = 'hurt';
    this.animElapsed = 0;
  }

  update(delta: number, speed: number, isCasting: boolean): void {
    this.animElapsed += delta;
    if (!this.dead) {
      let next: LpcAnimation;
      if (isCasting || (this.casting && this.animElapsed < LPC_ANIMATIONS[this.castAnim].frames / LPC_ANIMATIONS[this.castAnim].fps)) {
        next = this.castAnim;
      } else if (speed > 220) {
        next = 'run';
      } else if (speed > 1.5) {
        next = 'walk';
      } else {
        next = 'idle';
      }
      if (isCasting && !this.casting) this.animElapsed = 0; // restart cast
      this.casting = next === this.castAnim && (isCasting || this.casting);
      if (next !== this.anim && !(this.casting && this.anim === this.castAnim)) {
        this.anim = next;
        this.animElapsed = 0;
      }
    }
    this.applyFrame(false);
  }

  private applyFrame(force: boolean): void {
    if (!this.textures) return;
    const tex = this.textures[this.anim] ?? this.textures.idle ?? this.textures.walk;
    if (!tex) return;
    const meta = LPC_ANIMATIONS[this.anim];
    const loop = this.anim !== 'hurt' && this.anim !== this.castAnim;
    const frame = animationFrame(this.anim, this.animElapsed, loop);
    const key = `${this.anim}:${this.direction}:${frame}`;
    if (!force && key === this.lastFrameKey) return;
    this.lastFrameKey = key;

    if (this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }
    const { sx, sy } = frameRect(this.anim, this.direction, frame);
    const rows = meta.singleRow ? 1 : 4;
    tex.repeat.set(FRAME / (meta.frames * FRAME), FRAME / (rows * FRAME));
    tex.offset.set(sx / (meta.frames * FRAME), 1 - (sy + FRAME) / (rows * FRAME));
  }

  dispose(): void {
    this.plane.geometry.dispose();
    this.material.dispose();
    if (this.textures) disposeComposite(this.textures);
  }
}
