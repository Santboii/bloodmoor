// client/src/renderer/Arena.ts
import * as THREE from 'three';
import { PILLARS, ARENA_SIZE } from '@arena/shared';
import type { TextureSet } from './AssetLoader';

const PILLAR_H = 80;

function tiledPBR(tex: TextureSet, repeatU: number, repeatV: number): THREE.MeshStandardMaterial {
  const apply = (t: THREE.Texture) => {
    const c = t.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(repeatU, repeatV);
    c.needsUpdate = true;
    return c;
  };
  const mat = new THREE.MeshStandardMaterial({
    map: apply(tex.map),
    normalMap: tex.normalMap ? apply(tex.normalMap) : null,
    roughnessMap: tex.roughnessMap ? apply(tex.roughnessMap) : null,
    roughness: 1,
    metalness: 0,
  });
  mat.normalScale.set(0.4, 0.4);
  return mat;
}

export class Arena {
  private group = new THREE.Group();

  constructor(textures: { floor: TextureSet; stone: TextureSet }) {
    this.buildFloor(textures.floor);
    this.buildBoundaryWalls(textures.stone);
    this.buildPillars(textures.stone);
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  private buildFloor(tex: TextureSet): void {
    const repeat = ARENA_SIZE / 200; // one tile per 200 world units
    const mat = tiledPBR(tex, repeat, repeat);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA_SIZE / 2, 0, ARENA_SIZE / 2);
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private buildBoundaryWalls(tex: TextureSet): void {
    const wallH = 60;
    const positions: [number, number, number, number][] = [
      [ARENA_SIZE / 2, -10,            ARENA_SIZE + 40, 20],
      [ARENA_SIZE / 2, ARENA_SIZE + 10, ARENA_SIZE + 40, 20],
      [-10,            ARENA_SIZE / 2,  20,              ARENA_SIZE],
      [ARENA_SIZE + 10, ARENA_SIZE / 2, 20,              ARENA_SIZE],
    ];
    // Opposite walls are identical — share geometry and material per pair
    // instead of cloning 3 textures per wall.
    const horizGeo = new THREE.BoxGeometry(positions[0][2], wallH, positions[0][3]);
    const vertGeo = new THREE.BoxGeometry(positions[2][2], wallH, positions[2][3]);
    const horizMat = tiledPBR(tex, positions[0][2] / 200, wallH / 200);
    const vertMat = tiledPBR(tex, positions[2][2] / 200, wallH / 200);
    positions.forEach(([x, z], i) => {
      const mesh = new THREE.Mesh(i < 2 ? horizGeo : vertGeo, i < 2 ? horizMat : vertMat);
      mesh.position.set(x, wallH / 2, z);
      mesh.castShadow = true;
      this.group.add(mesh);
    });
  }

  private buildPillars(tex: TextureSet): void {
    const capMat = new THREE.MeshStandardMaterial({ color: 0x6a6aaa, roughness: 0.7, metalness: 0.1 });

    // All pillars are identical — one geometry + one material for the lot
    // (this used to clone 30 textures and build 10 materials).
    const size = PILLARS[0].halfSize * 2;
    const pillarMat = tiledPBR(tex, size / 200, PILLAR_H / 200);
    const bodyGeo = new THREE.BoxGeometry(size, PILLAR_H, size);
    const capGeo = new THREE.BoxGeometry(size + 6, 8, size + 6);
    const flameGeo = new THREE.SphereGeometry(5, 8, 6);
    // Bright emissive-style flame — bloom makes it glow without a real light.
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa540 });

    // Forward rendering evaluates every point light in every standard-material
    // fragment, so 10 torches taxed the full-screen floor 10x per pixel. Keep
    // real lights on four spread-out pillars — the one nearest each arena
    // corner, derived from the shared layout so it survives pillar changes —
    // and let the rest glow via bloom only.
    const corners = [
      { x: 0, y: 0 }, { x: ARENA_SIZE, y: 0 },
      { x: 0, y: ARENA_SIZE }, { x: ARENA_SIZE, y: ARENA_SIZE },
    ];
    const litPillars = new Set(corners.map(c =>
      PILLARS.reduce((best, p) =>
        (p.x - c.x) ** 2 + (p.y - c.y) ** 2 < (best.x - c.x) ** 2 + (best.y - c.y) ** 2 ? p : best)));

    PILLARS.forEach(p => {
      const body = new THREE.Mesh(bodyGeo, pillarMat);
      body.position.set(p.x, PILLAR_H / 2, p.y);
      body.castShadow = true;
      body.receiveShadow = true;
      this.group.add(body);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(p.x, PILLAR_H + 4, p.y);
      this.group.add(cap);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(p.x, PILLAR_H + 14, p.y);
      this.group.add(flame);

      if (litPillars.has(p)) {
        const torch = new THREE.PointLight(0xff6600, 3, 450, 2);
        torch.position.set(p.x, PILLAR_H + 60, p.y);
        this.group.add(torch);
      }
    });
  }
}
