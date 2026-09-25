// Billing hero ribbon (reference: HeroWave component module 96173 + renderer 4014 + mesh 82401, fed with
// the billing configs from module 89224 exports EK / WD / nl and palette `billing-hero-palette.png`).
// Same renderer family as the homepage ribbon; the billing config differs by a vertex-shader variant
// (module 56878: the X twist wobbles with simplex noise over time), camera zoom 0.9316, two noise
// bands in the light fragment shader and a lighter post pass (blur 0, grain 0.576).
// The homepage port supplies the GLSL (src/components/stripe/Hero/wave/shaders.ts, imported read-only);
// only the one line that differs in 56878 is patched here.
// Lifecycle as in the reference: canvas only when WebGL is usable, initScene when within 20 px of the
// viewport, render every 2nd frame, intro time ramp +0.016 per rendered frame, pause offscreen / hidden /
// reduced motion (a single static frame is drawn), resize debounced 300 ms, DPR capped at 2, and the
// static fallback picture fades out on the first draw (hero-wave-animation--drawn).
// Monochrome: the palette texture is pre-converted with the project's hue -> luminance curve.

import * as THREE from "three";
import { POST_FRAG, POST_VERT, WAVE_LIGHT_FRAG, WAVE_VERT } from "@/components/stripe/Hero/wave/shaders";
import { debounce, Disposer, observeIntersection, onReducedMotionChange, onVisibilityChange, reducedMotion, type Cleanup } from "../revenue-shared/env";

const PALETTE = "/sites/stripe-com-9ababc9a/revenue/billing-hero-palette-mono.png";

interface NoiseBand {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  feather: number;
  strength: number;
  frequency: number;
  colorAttenuation: number;
  parabolaPower: number;
}
interface BillingWaveConfig {
  speed: number;
  timeOffset: number;
  colorContrast: number;
  colorSaturation: number;
  colorHueShift: number;
  displaceFrequencyX: number;
  displaceFrequencyZ: number;
  displaceAmount: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  twistFrequency: [number, number, number];
  twistPower: [number, number, number];
  glowAmount: number;
  glowPower: number;
  glowRamp: number;
  lineThickness: number;
  lineAmount: number;
  lineDerivativePower: number;
  noiseBands: NoiseBand[];
}

// From source: module 89224 `f` (wide). `d` (medium) sets rotationY -0.1; `m` (small) rotationY -0.4,
// positionY -540.
const WIDE: BillingWaveConfig = {
  speed: 525e-7,
  timeOffset: 17500,
  colorContrast: 0.969,
  colorSaturation: 1.383,
  colorHueShift: 0.0376991118430778,
  displaceFrequencyX: 0.005,
  displaceFrequencyZ: 0.0212,
  displaceAmount: 6.68,
  position: [206.1171875, -438, -11.0999999999999],
  rotation: [-0.666017642561036, -0.0314159265358978, 0.779114978090269],
  scale: [6.0501, 8.3983, 6.9854],
  twistFrequency: [-0.424, 0.024, -1.312],
  twistPower: [1.81, 0.94, 4.76],
  glowAmount: 1.55,
  glowPower: 1.174,
  glowRamp: 0.972,
  lineThickness: 1,
  lineAmount: 1,
  lineDerivativePower: 1,
  noiseBands: [
    { startX: 0.856, endX: 1, startY: 0, endY: 0.913, feather: 0.5, strength: 0.346, frequency: 1018, colorAttenuation: 1, parabolaPower: 0 },
    { startX: 0.038, endX: 0.538, startY: 0.105, endY: 1, feather: 0.3315, strength: 1, frequency: 190, colorAttenuation: 0, parabolaPower: 2.11 },
  ],
};
const MEDIUM: BillingWaveConfig = { ...WIDE, rotation: [WIDE.rotation[0], -0.1, WIDE.rotation[2]] };
const SMALL: BillingWaveConfig = { ...WIDE, rotation: [WIDE.rotation[0], -0.4, WIDE.rotation[2]], position: [WIDE.position[0], -540, WIDE.position[2]] };
const CAMERA = { position: new THREE.Vector3(100.00000000000004, 3.06222926004786e-13, 5000), zoom: 0.9316 }; // from source camState
const POST = { blurAmount: 0, grainAmount: 0.576 }; // from source guiState "Post Processing"

const TWIST_LINE = "  mat4 rotationB = rotationMatrix(vec3(0.0, 0.5, 0.5), u_twistFrequencyX * expStep(v_uv.y, u_twistPowerX));";
/** From source: module 56878 differs from the default vertex shader only in this twist. */
const BILLING_VERT = WAVE_VERT.includes(TWIST_LINE)
  ? WAVE_VERT.replace(
      TWIST_LINE,
      "  float twistXNoise = simplexNoise(vec2(v_uv.y * 2.0, u_time * u_speed));\n" +
        "  float twistXMotion = u_twistFrequencyX - twistXNoise * 0.1;\n" +
        "  mat4 rotationB = rotationMatrix(vec3(0.0, 0.5, 0.5), twistXMotion * expStep(v_uv.y, u_twistPowerX));",
    )
  : WAVE_VERT;

const isCoarseTouch = () => window.matchMedia("(pointer: coarse)").matches && "ontouchstart" in window;
const pickConfig = () =>
  window.matchMedia("(max-width: 639px)").matches ? SMALL : window.matchMedia("(min-width: 640px) and (max-width: 1263px)").matches ? MEDIUM : WIDE;

/** Folded plane (reference module 82401 `foldedAsync(..., 400, 400, 128, 256)`). */
function foldedGeometry(width = 400, height = 400, segX = 128, segY = 256) {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const p = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const parabola = (x: number, k: number) => Math.pow(4 * x * (1 - x), k);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const r = 4 - 2 * parabola(uv.getY(i), 9.5);
    if (p.x < -16) p.z += r;
    else if (p.x < 16) {
      p.z = Math.cos(THREE.MathUtils.mapLinear(p.x, -16, 16, 0, Math.PI)) * r;
      p.x = Math.cos(THREE.MathUtils.mapLinear(p.x, -16, 16, -Math.PI / 2, Math.PI / 2)) * r - 16;
    } else {
      p.z -= r;
      p.x = -p.x;
    }
    p.x += width / 4;
    p.applyAxisAngle(xAxis, -Math.PI / 2);
    p.applyAxisAngle(yAxis, -Math.PI / 2);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

class BillingWave {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 10000);
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh | null = null;
  private target: THREE.WebGLRenderTarget | null = null;
  private post: THREE.ShaderMaterial | null = null;
  private postScene: THREE.Scene | null = null;
  private postCamera = new THREE.OrthographicCamera();
  private dpr = Math.min(window.devicePixelRatio, 2);
  private size = new THREE.Vector2();
  private config = pickConfig();
  private raf = 0;
  private frame = 0;
  private ramp = 0;
  private firstDraw: number | null = null;
  private lastDraw: number | null = null;
  private pausedAt: number | null = null;
  private resumedAt: number | null = null;
  private pausedTime = 0;
  private drawn = false;
  private _paused = true;
  private disposed = false;
  private ro: ResizeObserver | null = null;
  private onResize = debounce(() => this.resize(), 300);

  constructor(
    private canvas: HTMLCanvasElement,
    private onFirstDraw: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: !qaForce() });
    if (!this.renderer.capabilities.isWebGL2) throw new Error("WebGL2 required");
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(new THREE.Color(0), 0);
    this.camera.position.set(0, 0, 5000);
  }

  async init() {
    const tex = await new THREE.TextureLoader().loadAsync(PALETTE);
    if (this.disposed) {
      tex.dispose();
      return;
    }
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const r = this.canvas.getBoundingClientRect();
    this.size.set(r.width, r.height);
    this.renderer.setSize(r.width, r.height, false);
    this.sizeCamera();
    this.material = new THREE.ShaderMaterial({
      defines: { USE_NOISE_BANDS: true },
      uniforms: {
        u_time: { value: 0 },
        u_speed: { value: 4e-5 },
        u_resolution: { value: this.size.clone().multiplyScalar(this.dpr) },
        u_paletteTexture: { value: tex },
        u_lutTexture: { value: tex },
        u_blueNoiseTexture: { value: tex },
        u_colorContrast: { value: 1 },
        u_colorSaturation: { value: 1 },
        u_colorHueShift: { value: 0 },
        u_monoRange: { value: new THREE.Vector2(0, 1) },
        u_monoGamma: { value: 1 },
        u_monoDeep: { value: 0 },
        u_monoLit: { value: new THREE.Vector4(0, 0, 0, 0) },
        u_monoLitFeather: { value: new THREE.Vector2(0.25, 0.25) },
        u_canvasSize: { value: this.size.clone().multiplyScalar(this.dpr) },
        u_displaceFrequencyX: { value: 2.25 },
        u_displaceFrequencyZ: { value: 2.25 },
        u_displaceAmount: { value: 0 },
        u_twistFrequencyX: { value: 0 },
        u_twistFrequencyY: { value: 0 },
        u_twistFrequencyZ: { value: 0 },
        u_twistPowerX: { value: 1 },
        u_twistPowerY: { value: 1 },
        u_twistPowerZ: { value: 1 },
        u_glowAmount: { value: 0.01 },
        u_glowPower: { value: 0.01 },
        u_glowRamp: { value: 1 },
        u_mousePosition: { value: new THREE.Vector2(0, 0) },
        u_lineAmount: { value: 450 },
        u_lineThickness: { value: 0.01 },
        u_lineDerivativePower: { value: 0.9 },
        u_maxWidth: { value: 1232 },
        u_clearColor: { value: new THREE.Vector3(0, 0, 0) },
        u_numNoiseBands: { value: 0 },
        u_noiseBandBounds: { value: [new THREE.Vector4(0, 1, 0, 1), new THREE.Vector4(0, 1, 0, 1)] },
        u_noiseBandParams: { value: [new THREE.Vector4(0.1, 0.2, 600, 0.9), new THREE.Vector4(0.1, 0.2, 600, 0.9)] },
        u_noiseBandParabolaPower: { value: [3, 3] },
      },
      vertexShader: BILLING_VERT,
      fragmentShader: WAVE_LIGHT_FRAG,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcColorFactor,
      blendDst: THREE.ZeroFactor,
    });
    this.mesh = new THREE.Mesh(foldedGeometry(), this.material);
    this.scene.add(this.mesh);
    this.apply(this.config);
    this.camera.position.copy(CAMERA.position);
    this.camera.zoom = CAMERA.zoom;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    if (!isCoarseTouch()) this.initPost();
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.canvas);
    this.raf = requestAnimationFrame(this.loop);
  }

  private initPost() {
    const res = this.size.clone().multiplyScalar(this.dpr);
    this.target = new THREE.WebGLRenderTarget(res.x, res.y);
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        u_scene: { value: this.target.texture },
        u_resolution: { value: res },
        u_blurAmount: { value: POST.blurAmount },
        u_blurSamples: { value: 6 },
        u_diffuseBlur: { value: 0 },
        u_grainAmount: { value: POST.grainAmount },
        u_tailFraction: { value: 0 },
        u_opaque: { value: 0 },
        u_clearColor: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      side: THREE.DoubleSide,
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
  }

  private apply(c: BillingWaveConfig) {
    if (!this.material || !this.mesh) return;
    const u = this.material.uniforms;
    u.u_speed.value = c.speed;
    u.u_colorContrast.value = c.colorContrast;
    u.u_colorSaturation.value = c.colorSaturation;
    u.u_colorHueShift.value = c.colorHueShift;
    u.u_displaceFrequencyX.value = c.displaceFrequencyX;
    u.u_displaceFrequencyZ.value = c.displaceFrequencyZ;
    u.u_displaceAmount.value = c.displaceAmount;
    [u.u_twistFrequencyX.value, u.u_twistFrequencyY.value, u.u_twistFrequencyZ.value] = c.twistFrequency;
    [u.u_twistPowerX.value, u.u_twistPowerY.value, u.u_twistPowerZ.value] = c.twistPower;
    u.u_glowAmount.value = c.glowAmount;
    u.u_glowPower.value = c.glowPower;
    u.u_glowRamp.value = c.glowRamp;
    u.u_lineAmount.value = c.lineAmount;
    u.u_lineThickness.value = c.lineThickness;
    u.u_lineDerivativePower.value = c.lineDerivativePower;
    c.noiseBands.forEach((b, i) => {
      (u.u_noiseBandBounds.value as THREE.Vector4[])[i].set(b.startX, b.endX, b.startY, b.endY);
      (u.u_noiseBandParams.value as THREE.Vector4[])[i].set(b.feather, b.strength, b.frequency, b.colorAttenuation);
      (u.u_noiseBandParabolaPower.value as number[])[i] = b.parabolaPower;
    });
    u.u_numNoiseBands.value = c.noiseBands.length;
    this.mesh.position.set(...c.position);
    this.mesh.rotation.set(...c.rotation);
    this.mesh.scale.set(...c.scale);
  }

  private sizeCamera() {
    this.camera.left = -this.size.x / 2;
    this.camera.right = this.size.x / 2;
    this.camera.top = this.size.y / 2;
    this.camera.bottom = -this.size.y / 2;
    this.camera.updateProjectionMatrix();
  }

  private resize() {
    if (this.disposed) return;
    const r = this.canvas.getBoundingClientRect();
    this.size.set(r.width, r.height);
    const res = this.size.clone().multiplyScalar(this.dpr);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(r.width, r.height, false);
    this.target?.setSize(res.x, res.y);
    if (this.post) this.post.uniforms.u_resolution.value = res.clone();
    if (this.material) {
      this.material.uniforms.u_resolution.value = res.clone();
      this.material.uniforms.u_canvasSize.value = res.clone();
    }
    this.sizeCamera();
    const next = pickConfig();
    if (next !== this.config) {
      this.config = next;
      this.apply(next);
    }
    if (this._paused) this.render();
  }

  get paused() {
    return this._paused;
  }
  set paused(v: boolean) {
    if (v && !this._paused) {
      this.resumedAt = null;
      this.pausedAt = this.lastDraw;
      this.lastDraw = null;
    }
    this._paused = v;
  }

  /** Reference: when (re)started paused, draw one frame at full ramp. */
  drawStatic() {
    this.ramp = 1;
    this.update(0);
    this.render();
    this.markDrawn();
  }

  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (++this.frame % 2 !== 0) return; // from source: renderLoop.frameInterval = 2
    if (this._paused || !this.material) return;
    this.firstDraw ??= t;
    if (this.resumedAt === null) {
      this.resumedAt = t;
      if (this.pausedAt !== null) {
        this.pausedTime += this.resumedAt - this.pausedAt;
        this.pausedAt = null;
      }
    }
    this.lastDraw = t;
    this.update((t - this.firstDraw - this.pausedTime) * this.ramp);
    this.render();
    if (!this.drawn) {
      this.markDrawn();
      return;
    }
    this.ramp = Math.min(this.ramp + 0.016, 1); // from source: introTimeRamp += 0.016
  };

  private update(elapsed: number) {
    if (!this.material) return;
    // Renderer adds timeOffset and the mesh time setter adds it again (reference behaviour).
    this.material.uniforms.u_time.value = this.config.timeOffset * 2 + elapsed;
  }

  private render() {
    if (this.target && this.postScene) {
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCamera);
    } else this.renderer.render(this.scene, this.camera);
  }

  private markDrawn() {
    if (this.drawn) return;
    this.drawn = true;
    this.onFirstDraw();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.onResize.cancel();
    this.ro?.disconnect();
    this.mesh?.geometry.dispose();
    (this.material?.uniforms.u_paletteTexture.value as THREE.Texture | undefined)?.dispose();
    this.material?.dispose();
    this.target?.dispose();
    this.post?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/**
 * Reference capability check: WebGL2 without a major performance caveat (software rasterisers are
 * refused, the static fallback stays). QA scripts may set `window.__qaForceWebgl = true` (Playwright init
 * script) to exercise the renderer under SwiftShader.
 */
const qaForce = () => (window as Window & { __qaForceWebgl?: boolean }).__qaForceWebgl === true;
function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: !qaForce() });
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

export function mountBillingHeroWave(root: HTMLElement): Cleanup {
  const d = new Disposer();
  const wave = root.querySelector<HTMLElement>(".billing-hero__wave");
  const contents = wave?.querySelector<HTMLElement>(".hero-wave-animation__contents");
  if (!wave || !contents || !webglAvailable()) return () => {};
  const canvas = document.createElement("canvas");
  canvas.className = "hero-wave-animation__canvas";
  canvas.setAttribute("aria-hidden", "true");
  contents.insertBefore(canvas, contents.firstChild);
  d.add(() => {
    canvas.remove();
    contents.classList.remove("hero-wave-animation--drawn");
  });

  let renderer: BillingWave | null = null;
  try {
    renderer = new BillingWave(canvas, () => contents.classList.add("hero-wave-animation--drawn"));
  } catch {
    canvas.remove();
    return () => d.run();
  }
  const r = renderer;
  d.add(() => r.dispose());
  let visible = false;
  let started = false;
  let hidden = document.hidden;
  let reduced = reducedMotion();
  const sync = () => {
    if (!started) return;
    const pause = !visible || hidden || reduced;
    const was = r.paused;
    r.paused = pause;
    if (pause && reduced && !was) r.drawStatic();
  };
  d.add(
    observeIntersection(
      wave,
      (v) => {
        visible = v;
        if (v && !started) {
          started = true;
          r.init()
            .then(() => {
              sync();
              if (r.paused) r.drawStatic();
            })
            .catch(() => canvas.remove());
          return;
        }
        sync();
      },
      { rootMargin: "20px 0px" },
    ),
  );
  d.add(
    onVisibilityChange((h) => {
      hidden = h;
      sync();
    }),
  );
  d.add(
    onReducedMotionChange((v) => {
      reduced = v;
      sync();
    }),
  );
  return () => d.run();
}
