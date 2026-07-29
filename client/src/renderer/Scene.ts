// client/src/renderer/Scene.ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CameraController } from './CameraController';
import { internalRenderSize, FRUSTUM_HALF_HEIGHT } from './pixelation';

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
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private cameraController: CameraController;
  private composer!: EffectComposer;
  private animFrameId = 0;
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _worldTarget = new THREE.Vector3();
  private readonly _ndc = new THREE.Vector2();
  private _canvasRect: DOMRect | null = null;

  constructor(container: HTMLElement) {
    // Pixel look: the scene renders at INTERNAL_HEIGHT and is upscaled with
    // nearest-neighbor sampling, so AA and HiDPI supersampling are disabled —
    // they would only blur the pixels (and waste fill rate).
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // The canvas buffer is CSS-sized; the browser upscales it to device
    // pixels on HiDPI — keep that upscale crisp too.
    this.renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -FRUSTUM_HALF_HEIGHT * aspect, FRUSTUM_HALF_HEIGHT * aspect,
      FRUSTUM_HALF_HEIGHT, -FRUSTUM_HALF_HEIGHT,
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
    const internal = internalRenderSize(window.innerWidth, window.innerHeight);
    // NearestFilter on the composer buffers is what makes the final
    // to-screen pass an unsmoothed pixel upscale.
    const target = new THREE.WebGLRenderTarget(internal.width, internal.height, {
      type: THREE.HalfFloatType,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setSize(internal.width, internal.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(internal.width / 2, internal.height / 2),
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
    this.camera.left = -FRUSTUM_HALF_HEIGHT * aspect;
    this.camera.right = FRUSTUM_HALF_HEIGHT * aspect;
    this.camera.top = FRUSTUM_HALF_HEIGHT;
    this.camera.bottom = -FRUSTUM_HALF_HEIGHT;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const internal = internalRenderSize(w, h);
    this.composer?.setSize(internal.width, internal.height);
    this._canvasRect = null;
  };

  /** Cached — getBoundingClientRect forces layout and this is hit every frame. */
  getCanvasRect(): DOMRect {
    if (!this._canvasRect) this._canvasRect = this.renderer.domElement.getBoundingClientRect();
    return this._canvasRect;
  }

  startRenderLoop(onFrame: () => void): void {
    if (this.animFrameId !== 0) return;
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
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
