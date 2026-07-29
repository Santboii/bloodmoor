// client/src/renderer/CharacterMesh.ts
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterAnimator } from './CharacterAnimator';

const TARGET_HEIGHT = 50; // world units tall

// Shared across all characters — never disposed per instance.
const RING_GEOMETRY = new THREE.RingGeometry(14, 18, 32);
const LABEL_POS = new THREE.Vector3();

export class CharacterMesh {
  readonly group = new THREE.Group();
  private animator: CharacterAnimator;
  private nameLabel: HTMLDivElement;
  private ownedMaterials: THREE.Material[] = [];
  private prevX = 0;
  private prevZ = 0;
  private velocityMag = 0;
  private smoothVel = 0;
  private smoothVelX = 0;
  private smoothVelZ = 0;

  constructor(gltf: GLTF, color: number, displayName: string, labelContainer: HTMLElement) {
    // Clone per player: adding the shared gltf.scene directly would reparent
    // it, so a second same-class player steals the first player's model.
    // SkeletonUtils.clone is required for skinned meshes (plain .clone()
    // leaves bones pointing at the original skeleton).
    const model = cloneSkeleton(gltf.scene);

    // Auto-scale to TARGET_HEIGHT. Measure the ORIGINAL scene, never the
    // clone: Box3.setFromObject on a fresh clone reads garbage bounds from
    // its never-updated skeleton (zeroed bone matrices) — ~40x too tall for
    // this rig — which shrank models to a sub-pixel speck in game.
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const height = box.max.y - box.min.y;
    const scale = TARGET_HEIGHT / Math.max(height, 0.001);
    model.scale.setScalar(scale);
    model.position.y = -box.min.y * scale;

    model.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      // SkinnedMesh deforms beyond its rest-pose bounding sphere at runtime.
      mesh.frustumCulled = false;
      // Clone materials before tinting — mutating the shared GLTF materials
      // compounds the lerp on every rematch and bleeds across players.
      const tint = (src: THREE.Material): THREE.Material => {
        const mat = src.clone() as THREE.MeshStandardMaterial;
        mat.color.lerp(new THREE.Color(color), 0.3);
        mat.emissive.setHex(color);
        mat.emissiveIntensity = 0.12;
        this.ownedMaterials.push(mat);
        return mat;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tint) : tint(mesh.material);
      mesh.castShadow = true;
    });

    this.group.add(model);

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

    this.animator = new CharacterAnimator(model, gltf.animations);
  }

  setPosition(x: number, y: number, facing?: number): void {
    const dx = x - this.prevX;
    const dz = y - this.prevZ;
    // Exponential smoothing of velocity vector — filters jitter from interpolated positions.
    this.smoothVelX = this.smoothVelX * 0.8 + dx * 0.2;
    this.smoothVelZ = this.smoothVelZ * 0.8 + dz * 0.2;
    const smoothMag = Math.sqrt(this.smoothVelX * this.smoothVelX + this.smoothVelZ * this.smoothVelZ);
    const raw = Math.min(Math.sqrt(dx * dx + dz * dz) * 60, 1000);
    this.smoothVel = this.smoothVel * 0.85 + raw * 0.15;
    this.velocityMag = this.smoothVel;
    // Rotation: use smoothed velocity direction when moving (stable & responsive),
    // fall back to server facing (aim direction) when stationary.
    // Model's forward is +Z in world space, so atan2(dx, dz) directly gives rotation.y.
    if (smoothMag > 0.05) {
      this.group.rotation.y = Math.atan2(this.smoothVelX, this.smoothVelZ);
    } else if (facing !== undefined) {
      this.group.rotation.y = Math.atan2(Math.cos(facing), Math.sin(facing));
    }
    this.prevX = x;
    this.prevZ = y;
    this.group.position.set(x, 0, y);
  }

  update(delta: number, isCasting: boolean): void {
    this.animator.update(delta, this.velocityMag, isCasting);
  }

  /** Hide/show the whole character including its DOM name label. */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
    this.nameLabel.style.display = visible ? '' : 'none';
  }

  die(): void {
    this.animator.die();
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
  }
}
