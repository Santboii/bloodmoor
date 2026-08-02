// client/src/renderer/Scene.ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CameraController } from './CameraController';
import { FRUSTUM_HALF_HEIGHT, INTERNAL_HEIGHT, MAX_PIXEL_RATIO, PALETTE_ENABLED, PALETTE_LEVELS } from './pixelation';

// Bloom's blur reach is measured in bloom-buffer pixels, so pin the buffer to
// the legacy 360p grid: halos keep the wide soft spread they had under the
// low-res pipeline (smooth light over sharp pixels) and the blur chain stays
// cheap. Only aspect tracks the window.
class PinnedBloomPass extends UnrealBloomPass {
  setSize(width: number, height: number): void {
    super.setSize(Math.round(INTERNAL_HEIGHT * (width / Math.max(1, height))), INTERNAL_HEIGHT);
  }
}

const INITIAL_CENTER_X = 200;
const INITIAL_CENTER_Z = 1000;

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    intensity: { value: 0.2 },
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

// 4x4 Bayer ordered dithering + per-channel quantization. Runs at internal
// resolution, after bloom (so glow is quantized too) and before vignette.
const PaletteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    levels: { value: 32.0 },
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
    uniform float levels;
    varying vec2 vUv;

    const mat4 BAYER = mat4(
       0.0,  8.0,  2.0, 10.0,
      12.0,  4.0, 14.0,  6.0,
       3.0, 11.0,  1.0,  9.0,
      15.0,  7.0, 13.0,  5.0
    );

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
      float threshold = (BAYER[p.x][p.y] + 0.5) / 16.0 - 0.5;
      vec3 dithered = color.rgb + threshold / levels;
      vec3 quantized = floor(dithered * (levels - 1.0) + 0.5) / (levels - 1.0);
      gl_FragColor = vec4(quantized, color.a);
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
  private renderingEnabled = false;
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _worldTarget = new THREE.Vector3();
  private readonly _ndc = new THREE.Vector2();
  private _canvasRect: DOMRect | null = null;

  constructor(container: HTMLElement) {
    // The pixel look lives in the assets (NearestFilter sprites and
    // posterized tiles); the scene itself renders at native resolution.
    // antialias stays off: rendering happens in the composer's target, so
    // canvas MSAA would never apply — and multisampling the composer buffers
    // instead forces a resolve on every pass (measured as a renderer freeze
    // on HiDPI). The billboard-over-flat-ground scene has almost no geometry
    // silhouettes for MSAA to smooth anyway.
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);

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
    this.scene.add(new THREE.AmbientLight(0x665544, 2.2));

    // Cool blue sky / blood-red ground gradient
    this.scene.add(new THREE.HemisphereLight(0x334466, 0x442211, 1.1));

    // Moonlight — casts shadows, cool blue-white. Aim it at the arena center
    // (default target is the origin, i.e. a corner of the 0..2000 arena,
    // which left half the map outside the shadow frustum).
    const moon = new THREE.DirectionalLight(0x7788cc, 1.25);
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
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = this.renderer.getPixelRatio();
    // Plain single-sample target — see the antialias note in the constructor.
    const target = new THREE.WebGLRenderTarget(w * pr, h * pr, {
      type: THREE.HalfFloatType,
    });
    this.composer = new EffectComposer(this.renderer, target);
    // setSize before setPixelRatio: each call re-runs the other's sizing, and
    // this order keeps the transient allocation small (w×h) instead of
    // pr²-scaled (setPixelRatio first would briefly allocate 4× at dpr 2).
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new PinnedBloomPass(
      new THREE.Vector2(Math.round(INTERNAL_HEIGHT * (w / Math.max(1, h))), INTERNAL_HEIGHT),
      0.5,  // strength
      0.4,  // radius
      0.3,  // threshold
    ));
    if (PALETTE_ENABLED) {
      const palette = new ShaderPass(PaletteShader);
      palette.uniforms.levels.value = PALETTE_LEVELS;
      this.composer.addPass(palette);
    }
    this.composer.addPass(new ShaderPass(VignetteShader));
    this.composer.addPass(new OutputPass());
    // One warm-up frame while the loading screen is still up: compiles every
    // pass's shaders so the first visible match frame doesn't hitch. The loop
    // itself won't render until setRenderingEnabled(true) at match start.
    this.composer.render();
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
    // Re-read devicePixelRatio: dragging the window across monitors changes
    // it, and ParticleSystem's point-size scale reads the live value too.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(w, h);
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
    this._canvasRect = null;
  };

  /** Cached — getBoundingClientRect forces layout and this is hit every frame. */
  getCanvasRect(): DOMRect {
    if (!this._canvasRect) this._canvasRect = this.renderer.domElement.getBoundingClientRect();
    return this._canvasRect;
  }

  /** Gate GPU work on match visibility. The canvas is display:none outside a
   * match, but drawing the native-res pipeline behind the menus still costs
   * full GPU frames — enough swap backpressure to lag DOM interactions. */
  setRenderingEnabled(enabled: boolean): void {
    this.renderingEnabled = enabled;
  }

  startRenderLoop(onFrame: () => void): void {
    if (this.animFrameId !== 0) return;
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      onFrame();
      if (!this.renderingEnabled) return;
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
