// client/src/renderer/Scene.ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CameraController } from './CameraController';

const FRUSTUM = 380;
const INITIAL_CENTER_X = 200;
const INITIAL_CENTER_Z = 1000;

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    intensity: { value: 0.35 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * 2.0;
      float v = 1.0 - dot(uv * 0.4, uv * 0.4);
      v = clamp(mix(1.0 - intensity, 1.0, v), 0.0, 1.0);
      gl_FragColor = vec4(color.rgb * v, color.a);
    }
  `,
};

export class Scene {
  private static readonly MAX_DPR = 1.5;

  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private qualityDpr = Math.min(window.devicePixelRatio, Scene.MAX_DPR);
  private frameTimeAvg = 16.7;
  private lastQualityDrop = 0;
  private cameraController: CameraController;
  private composer!: EffectComposer;
  private animFrameId = 0;
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _worldTarget = new THREE.Vector3();
  private readonly _ndc = new THREE.Vector2();
  private _canvasRect: DOMRect | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Cap DPR: full retina (2x) pushes ~6M pixels through the bloom chain
    // per frame — the single biggest source of dropped frames. 1.5x is
    // visually near-identical on a fast-moving isometric scene at ~1/2 the
    // fill cost; adaptive quality below can lower it further if needed.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Scene.MAX_DPR));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Without tone mapping, bloom + additive particles + emissives clip to
    // flat white; ACES rolls highlights off filmically.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -FRUSTUM * aspect, FRUSTUM * aspect,
      FRUSTUM, -FRUSTUM,
      0.1, 3000,
    );
    this.cameraController = new CameraController(this.camera, INITIAL_CENTER_X, INITIAL_CENTER_Z);
    this.cameraController.update(INITIAL_CENTER_X, INITIAL_CENTER_Z, 1);

    this.buildLighting();

    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  private buildLighting(): void {
    // Warm ambient — base illumination so characters are always visible
    this.scene.add(new THREE.AmbientLight(0x554433, 1.5));

    // Cool blue sky / blood-red ground gradient
    this.scene.add(new THREE.HemisphereLight(0x223355, 0x331100, 0.8));

    // Moonlight — casts shadows, cool blue-white. Aim it at the arena center
    // (default target is the origin, i.e. a corner of the 0..2000 arena,
    // which left half the map outside the shadow frustum).
    const moon = new THREE.DirectionalLight(0x7788cc, 1.0);
    moon.position.set(1500, 800, 1200);
    moon.target.position.set(1000, 0, 1000);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 0.5;
    moon.shadow.camera.far = 4000;
    moon.shadow.camera.left = -1500;
    moon.shadow.camera.right = 1500;
    moon.shadow.camera.top = 1500;
    moon.shadow.camera.bottom = -1500;
    this.scene.add(moon);
    this.scene.add(moon.target);
  }

  /** Call after scene objects are added. Creates EffectComposer pipeline. */
  initPostProcessing(): void {
    // EffectComposer's default render target has no MSAA — pass one with
    // samples so geometry edges stay antialiased under post-processing.
    // 2 samples: at >=1.5 DPR the supersampling already softens edges, and
    // 4x MSAA on a half-float buffer at retina res is a fill-rate killer.
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 2,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(
        // Half-resolution bloom: it's a blur — invisible difference, big saving.
        new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
        0.5,  // strength
        0.4,  // radius
        0.3,  // threshold
      ),
    );
    this.composer.addPass(new ShaderPass(VignetteShader));
    this.composer.addPass(new OutputPass());
  }

  updateCamera(playerX: number, playerZ: number, delta: number): void {
    this.cameraController.update(playerX, playerZ, delta);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.left = -FRUSTUM * aspect;
    this.camera.right = FRUSTUM * aspect;
    this.camera.top = FRUSTUM;
    this.camera.bottom = -FRUSTUM;
    this.camera.updateProjectionMatrix();
    // Re-read DPR (monitor may have changed), respecting any adaptive drop.
    this.qualityDpr = Math.min(this.qualityDpr, window.devicePixelRatio, Scene.MAX_DPR);
    this.renderer.setPixelRatio(this.qualityDpr);
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this._canvasRect = null;
  };

  /** Cached — getBoundingClientRect forces layout and this is hit every frame. */
  getCanvasRect(): DOMRect {
    if (!this._canvasRect) this._canvasRect = this.renderer.domElement.getBoundingClientRect();
    return this._canvasRect;
  }

  startRenderLoop(onFrame: () => void): void {
    if (this.animFrameId !== 0) return;
    let lastTime = performance.now();
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const now = performance.now();
      this.trackQuality(now - lastTime, now);
      lastTime = now;
      onFrame();
      // Fall back to bare render before initPostProcessing() is called
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  /**
   * Adaptive quality: if frame times stay poor, step the render resolution
   * down (never back up — upscaling oscillates). 1.5 → 1.25 → 1.0 keeps the
   * game smooth on weaker GPUs instead of stuttering at full resolution.
   */
  private trackQuality(frameMs: number, now: number): void {
    // Ignore hitches from tab switches / breakpoints.
    if (frameMs > 500) return;
    this.frameTimeAvg = this.frameTimeAvg * 0.98 + frameMs * 0.02;
    if (
      this.frameTimeAvg > 22 &&
      this.qualityDpr > 1 &&
      now - this.lastQualityDrop > 3000
    ) {
      this.qualityDpr = Math.max(1, this.qualityDpr - 0.25);
      this.lastQualityDrop = now;
      this.frameTimeAvg = 16.7; // re-measure at the new resolution
      this.renderer.setPixelRatio(this.qualityDpr);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer?.setSize(window.innerWidth, window.innerHeight);
      this._canvasRect = null;
    }
  }

  stopRenderLoop(): void {
    cancelAnimationFrame(this.animFrameId);
    this.animFrameId = 0;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.getCanvasRect();
    this._ndc.set(
      ((screenX - rect.left) / rect.width) * 2 - 1,
      -((screenY - rect.top) / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(this._ndc, this.camera);
    this._raycaster.ray.intersectPlane(this._groundPlane, this._worldTarget);
    return { x: this._worldTarget.x, y: this._worldTarget.z };
  }

  dispose(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.composer?.dispose();
  }
}
