// client/src/renderer/CharacterMesh.ts
import * as THREE from 'three';
import { CLASS_DEFAULT_APPEARANCE, type CharacterClass } from '@arena/shared';
import { SpriteCharacter } from './sprites/SpriteCharacter';
import { snapToTexel, worldUnitsPerTexel } from './pixelation';

const TARGET_HEIGHT = 50; // world units tall — kept for label offset math

// Shared across all characters — never disposed per instance.
const RING_GEOMETRY = new THREE.RingGeometry(14, 18, 32);
const LABEL_POS = new THREE.Vector3();

export class CharacterMesh {
  readonly group = new THREE.Group();
  private sprite: SpriteCharacter;
  private nameLabel: HTMLDivElement;
  private ownedMaterials: THREE.Material[] = [];
  private prevX = 0;
  private prevZ = 0;
  private velocityMag = 0;
  private smoothVel = 0;

  constructor(charClass: CharacterClass, color: number, displayName: string, labelContainer: HTMLElement) {
    this.sprite = new SpriteCharacter(CLASS_DEFAULT_APPEARANCE[charClass], charClass);
    this.group.add(this.sprite.group);

    // Glow ring on ground
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    this.ownedMaterials.push(ringMat);
    const ring = new THREE.Mesh(RING_GEOMETRY, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1;
    this.group.add(ring);

    // DOM name label
    this.nameLabel = document.createElement('div');
    this.nameLabel.style.cssText = `
      position:absolute; left:0; top:0; pointer-events:none; font-size:12px; color:#fff;
      text-shadow:0 0 4px #000; white-space:nowrap; transform:translateX(-50%);
    `;
    this.nameLabel.textContent = displayName;
    labelContainer.appendChild(this.nameLabel);
  }

  setPosition(x: number, y: number, facing?: number): void {
    const dx = x - this.prevX;
    const dz = y - this.prevZ;
    const raw = Math.min(Math.sqrt(dx * dx + dz * dz) * 60, 1000);
    this.smoothVel = this.smoothVel * 0.85 + raw * 0.15;
    this.velocityMag = this.smoothVel;
    // Facing follows the aim direction only (cursor), never movement — the
    // character snaps to face the cursor Core-Keeper-style, strafing while
    // running. Billboards never rotate the group — facing only steers which
    // sprite row is shown.
    if (facing !== undefined) {
      this.sprite.setFacing(facing);
    }
    this.prevX = x;
    this.prevZ = y;
    // Render on the texel grid; raw x/y stay in prevX/prevZ for velocity.
    const texel = worldUnitsPerTexel();
    this.group.position.set(snapToTexel(x, texel), 0, snapToTexel(y, texel));
  }

  update(delta: number, isCasting: boolean): void {
    this.sprite.update(delta, this.velocityMag, isCasting);
  }

  /** Hide/show the whole character including its DOM name label. */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
    this.nameLabel.style.display = visible ? '' : 'none';
  }

  die(): void {
    this.sprite.die();
  }

  updateLabel(camera: THREE.Camera, canvasRect: DOMRect): void {
    this.group.getWorldPosition(LABEL_POS);
    LABEL_POS.y += TARGET_HEIGHT + 10;
    LABEL_POS.project(camera);
    const sx = (LABEL_POS.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
    const sy = (-LABEL_POS.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top - 10;
    // translate() instead of left/top: avoids layout, stays on the compositor.
    this.nameLabel.style.transform = `translate(${sx}px, ${sy}px) translateX(-50%)`;
  }

  dispose(labelContainer: HTMLElement): void {
    labelContainer.removeChild(this.nameLabel);
    this.group.removeFromParent();
    for (const mat of this.ownedMaterials) mat.dispose();
    this.ownedMaterials = [];
    this.sprite.dispose();
  }
}
