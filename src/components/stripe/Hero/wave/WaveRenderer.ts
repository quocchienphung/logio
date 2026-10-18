import * as THREE from "three";
import {
  POST_VERT,
  WAVE_DARK_FRAG,
  WAVE_LIGHT_FRAG,
  WAVE_VERT,
} from "./shaders";
import type { WaveConfig, WaveMaterialProps } from "./config";
import { HERO_POST_FRAG } from "./heroPost";

export interface WaveRendererOptions {
  /** light = hero (multisampled surface); dark = developers section (transparent, antialiased). */
  theme: "light" | "dark";
  configs: { wide: WaveConfig; medium: WaveConfig; small: WaveConfig };
  paletteUrl: string;
  /** CSS colour the dark shader fades lines into (reference reads --hds-color-core-neutralDark-990). */
  clearColor?: string;
  /**
   * Element whose box stays lit while the rest of the ribbon is pushed to black (light theme only).
   * The hero headline is composited over the ribbon with a multiplying blend, so the type is only ever
   * half the luminance behind it — keeping that patch lit is what keeps it legible.
   */
  litSelector?: string;
  onFirstDraw: () => void;
}

/** Reference folded-plane topology, with denser fold sampling for the refined hero. */
function foldedGeometry(width = 400, height = 400, segX = 128, segY = 256, refineFold = false) {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const p = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const parabola = (x: number, k: number) => Math.pow(4 * x * (1 - x), k);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    if (refineFold) {
      // Spend a quarter of the existing columns on the narrow curved fold (previously ~10).
      // Keep UVs in the original plane's space so shading and motion retain their proportions.
      const u = uv.getX(i);
      p.x = u < 0.375
        ? THREE.MathUtils.mapLinear(u, 0, 0.375, -width / 2, -16)
        : u <= 0.625
          ? THREE.MathUtils.mapLinear(u, 0.375, 0.625, -16, 16)
          : THREE.MathUtils.mapLinear(u, 0.625, 1, 16, width / 2);
      uv.setX(i, (p.x + width / 2) / width);
    }
    // Keep the two sides separated through the twist. The old tight gap self-intersected in
    // the extended tail, exposing dark rows of triangle tips once the heavy blur was removed.
    const r = (4 - 2 * parabola(uv.getY(i), 9.5)) * (refineFold ? 1.75 : 1);
    if (p.x < -16) p.z += r;
    else if (p.x < 16) {
      p.z = Math.cos(THREE.MathUtils.mapLinear(p.x, -16, 16, 0, Math.PI)) * r;
      p.x =
        Math.cos(
          THREE.MathUtils.mapLinear(p.x, -16, 16, -Math.PI / 2, Math.PI / 2),
        ) *
          r -
        16;
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

const isCoarseTouch = () =>
  window.matchMedia("(pointer: coarse)").matches && "ontouchstart" in window;

/**
 * Port of the reference hero renderer (bundle module 4014 + mesh module 82401):
 * orthographic camera at z=5000, folded plane with time-driven simplex displacement,
 * custom src*src blending, multisampled hero surface and a sharp composite,
 * time-based motion, bounded pixel cost, and no render loop while offscreen/hidden.
 */
export class WaveRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 10000);
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private sceneTarget: THREE.WebGLRenderTarget | null = null;
  private postMaterial: THREE.ShaderMaterial | null = null;
  private postScene: THREE.Scene | null = null;
  private postCamera = new THREE.OrthographicCamera();
  private dpr = Math.min(window.devicePixelRatio, 2);
  private canvasSize = new THREE.Vector2();
  /** Extra height (CSS px) the canvas extends below the reference region, read from `--wave-tail`. */
  private tail = 0;
  private config: WaveConfig;
  private lastDrawTime: number | null = null;
  private elapsed = 0;
  private nextFrameTime = 0;
  private qualityScale = 1;
  private qualityWindowStart = 0;
  private qualityFrames = 0;
  private delayedFrames = 0;
  private rafId: number | null = null;
  private _paused = true;
  private disposed = false;
  private firstDrawComplete = false;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: number | undefined;

  private configs: WaveRendererOptions["configs"];
  private theme: WaveRendererOptions["theme"];
  private litSelector?: string;
  private paletteUrl: string;
  private clearColor: THREE.Color;
  private onFirstDraw: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    opts: WaveRendererOptions,
  ) {
    this.configs = opts.configs;
    this.theme = opts.theme;
    this.litSelector = opts.litSelector;
    this.paletteUrl = opts.paletteUrl;
    this.onFirstDraw = opts.onFirstDraw;
    this.config = this.pickConfig();
    const dark = this.theme === "dark";
    if (dark && isCoarseTouch())
      throw new Error(
        "Dark wave disabled on touch devices (reference behaviour)",
      );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: dark || isCoarseTouch(),
      alpha: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: true,
    });
    if (!this.renderer.capabilities.isWebGL2)
      throw new Error("WebGL2 required");
    this.renderer.setPixelRatio(this.dpr);
    this.clearColor = new THREE.Color(dark ? opts.clearColor || "#101010" : 0);
    this.renderer.setClearColor(this.clearColor, 0);
    this.clearColor.convertLinearToSRGB();
    this.camera.position.set(0, 0, 5000);
  }

  /** The canvas may be taller than the reference region (lower fade tail); the tail is declared in CSS. */
  private readTail(): number {
    const raw = getComputedStyle(this.canvas).getPropertyValue("--wave-tail");
    const px = parseFloat(raw);
    if (!Number.isFinite(px) || px <= 0) return 0;
    return Math.min(px, this.canvasSize.y * 0.9);
  }

  private updatePixelRatio() {
    if (this.theme === "dark") return;
    // Supersample 1x displays a little, but bound total pixel work on large/Retina canvases.
    // MSAA smooths the silhouette without forcing a 4x full-screen fragment workload.
    const desired = Math.min(Math.max(window.devicePixelRatio, 1.25), 2);
    const budget = isCoarseTouch() ? 2_400_000 : 3_600_000;
    const base = Math.min(desired, Math.sqrt(budget / Math.max(1, this.canvasSize.x * this.canvasSize.y)));
    this.dpr = Math.max(Math.min(1, base), base * this.qualityScale);
    this.renderer.setPixelRatio(this.dpr);
  }

  /**
   * Feeds the shader the canvas size and the lit box (canvas UV, y from the top) so the black-anchored
   * mapping can stay clear of the headline. Re-measured on resize; a missing element just disables it.
   */
  private updateMonoLit() {
    if (!this.material) return;
    const u = this.material.uniforms;
    (u.u_canvasSize.value as THREE.Vector2).set(
      this.canvasSize.x * this.dpr,
      this.canvasSize.y * this.dpr,
    );
    if (this.theme !== "light" || !this.litSelector) return;
    u.u_monoDeep.value = 1;
    const el = document.querySelector(this.litSelector);
    const canvas = this.canvas.getBoundingClientRect();
    if (!el || canvas.width <= 0 || canvas.height <= 0) {
      u.u_monoDeep.value = 0;
      return;
    }
    const r = el.getBoundingClientRect();
    const x0 = (r.left - canvas.left) / canvas.width;
    const x1 = (r.right - canvas.left) / canvas.width;
    const y0 = (r.top - canvas.top) / canvas.height;
    const y1 = (r.bottom - canvas.top) / canvas.height;
    (u.u_monoLit.value as THREE.Vector4).set(
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      Math.max((x1 - x0) / 2, 0),
      Math.max((y1 - y0) / 2, 0),
    );
    // Wide, soft falloff: the lit patch has to read as light across the fabric, not as a bright rectangle.
    (u.u_monoLitFeather.value as THREE.Vector2).set(0.15, 0.15);
  }

  /** Reference-sized resolution (excludes the tail) so glow/derivative maths match the original look. */
  private referenceResolution() {
    return new THREE.Vector2(
      this.canvasSize.x * this.dpr,
      (this.canvasSize.y - this.tail) * this.dpr,
    );
  }

  private pickConfig(): WaveConfig {
    if (window.matchMedia("(max-width: 639px)").matches)
      return this.configs.small;
    if (window.matchMedia("(min-width: 640px) and (max-width: 1263px)").matches)
      return this.configs.medium;
    return this.configs.wide;
  }

  async init() {
    const texture = await new THREE.TextureLoader().loadAsync(this.paletteUrl);
    if (this.disposed) {
      texture.dispose();
      return;
    }
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const rect = this.canvas.getBoundingClientRect();
    this.canvasSize.set(rect.width, rect.height);
    this.updatePixelRatio();
    this.tail = this.readTail();
    this.renderer.setSize(rect.width, rect.height, false);
    this.sizeCamera();

    this.material = new THREE.ShaderMaterial({
      defines: this.theme === "light" ? { HERO_REFINED_FIBERS: 1 } : {},
      uniforms: {
        u_time: { value: 0 },
        u_speed: { value: 4e-5 },
        u_resolution: { value: this.referenceResolution() },
        u_paletteTexture: { value: texture },
        u_lutTexture: { value: texture },
        u_blueNoiseTexture: { value: texture },
        u_colorContrast: { value: 1 },
        u_colorSaturation: { value: 1 },
        u_colorHueShift: { value: 0 },
        u_monoRange: { value: new THREE.Vector2(0, 1) },
        // Hero ribbon: deepen the tone curve so the folds anchor in near-black (the developers wave
        // already sits on a dark section, so it keeps a linear curve).
        u_monoGamma: { value: this.theme === "light" ? 2.15 : 1 },
        u_monoDeep: { value: 0 },
        u_monoLit: { value: new THREE.Vector4(0, 0, 0, 0) },
        u_monoLitFeather: { value: new THREE.Vector2(0.25, 0.25) },
        u_canvasSize: { value: new THREE.Vector2(1, 1) },
        u_displaceFrequencyX: { value: 2.25 },
        u_displaceFrequencyZ: { value: 2.25 },
        u_displaceAmount: { value: 0 },
        u_twistFrequencyY: { value: 0 },
        u_twistFrequencyX: { value: 0 },
        u_twistFrequencyZ: { value: 0 },
        u_twistPowerY: { value: 1 },
        u_twistPowerX: { value: 1 },
        u_twistPowerZ: { value: 1 },
        u_glowAmount: { value: 0.01 },
        u_glowPower: { value: 0.01 },
        u_glowRamp: { value: 1 },
        u_mousePosition: { value: new THREE.Vector2(0, 0) },
        u_lineAmount: { value: 450 },
        u_lineThickness: { value: 0.01 },
        u_lineDerivativePower: { value: 0.9 },
        u_maxWidth: { value: 1232 },
        u_clearColor: {
          value: new THREE.Vector3(
            this.clearColor.r,
            this.clearColor.g,
            this.clearColor.b,
          ),
        },
      },
      vertexShader: WAVE_VERT,
      fragmentShader: this.theme === "dark" ? WAVE_DARK_FRAG : WAVE_LIGHT_FRAG,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      ...(this.theme === "dark"
        ? { transparent: true }
        : {
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcColorFactor,
            blendDst: THREE.ZeroFactor,
          }),
    });
    this.mesh = new THREE.Mesh(foldedGeometry(400, 400, 128, 256, this.theme === "light"), this.material);
    this.scene.add(this.mesh);
    this.applyConfig(this.config);

    const cam = this.config.camera;
    this.camera.position.set(cam.position[0], cam.position[1], cam.position[2]);
    this.camera.zoom = cam.zoom;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    if (this.theme === "light" && !isCoarseTouch()) this.initPostProcessing();

    this.updateMonoLit();

    this.resizeObserver = new ResizeObserver(this.scheduleResize);
    this.resizeObserver.observe(this.canvas);
    window.addEventListener("resize", this.scheduleResize);
    this.start();
  }

  private initPostProcessing() {
    const res = this.canvasSize.clone().multiplyScalar(this.dpr);
    this.sceneTarget = new THREE.WebGLRenderTarget(res.x, res.y, {
      samples: Math.min(4, this.renderer.capabilities.maxSamples),
      stencilBuffer: false,
    });
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_scene: { value: this.sceneTarget.texture },
      },
      vertexShader: POST_VERT,
      fragmentShader: HERO_POST_FRAG,
      side: THREE.DoubleSide,
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial),
    );
  }

  private applyConfig(cfg: WaveConfig) {
    if (!this.material || !this.mesh) return;
    const m: WaveMaterialProps = cfg.materialProps;
    const u = this.material.uniforms;
    u.u_speed.value = m.speed;
    u.u_colorContrast.value = m.colorContrast;
    u.u_colorSaturation.value = m.colorSaturation;
    u.u_colorHueShift.value = m.colorHueShift;
    u.u_displaceFrequencyX.value = m.displaceFrequencyX;
    u.u_displaceFrequencyZ.value = m.displaceFrequencyZ;
    u.u_displaceAmount.value = m.displaceAmount;
    u.u_twistFrequencyX.value = m.twistFrequencyX;
    u.u_twistFrequencyY.value = m.twistFrequencyY;
    u.u_twistFrequencyZ.value = m.twistFrequencyZ;
    u.u_twistPowerX.value = m.twistPowerX;
    u.u_twistPowerY.value = m.twistPowerY;
    u.u_twistPowerZ.value = m.twistPowerZ;
    u.u_glowAmount.value = m.glowAmount;
    u.u_glowPower.value = m.glowPower;
    u.u_glowRamp.value = m.glowRamp;
    u.u_lineAmount.value = m.lineAmount;
    u.u_lineThickness.value = m.lineThickness;
    u.u_lineDerivativePower.value = m.lineDerivativePower;
    this.mesh.position.set(m.positionX, m.positionY, m.positionZ);
    this.mesh.rotation.set(m.rotationX, m.rotationY, m.rotationZ);
    this.mesh.scale.set(m.scaleX, m.scaleY, m.scaleZ);
  }

  /**
   * Orthographic frustum in CSS px. The world origin stays at the centre of the reference region
   * (canvas minus tail) so the mesh keeps its exact placement; the tail only extends the bottom edge.
   */
  private sizeCamera() {
    const refHeight = this.canvasSize.y - this.tail;
    this.camera.left = -this.canvasSize.x / 2;
    this.camera.right = this.canvasSize.x / 2;
    this.camera.top = refHeight / 2;
    this.camera.bottom = refHeight / 2 - this.canvasSize.y;
    this.camera.updateProjectionMatrix();
  }

  private resize() {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvasSize.set(rect.width, rect.height);
    this.updatePixelRatio();
    this.tail = this.readTail();
    const res = this.canvasSize.clone().multiplyScalar(this.dpr);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(rect.width, rect.height, false);
    this.sceneTarget?.setSize(res.x, res.y);
    if (this.material)
      this.material.uniforms.u_resolution.value = this.referenceResolution();
    this.sizeCamera();
    this.updateMonoLit();
    const next = this.pickConfig();
    if (next !== this.config) {
      this.config = next;
      this.applyConfig(next);
    }
    if (this._paused) this.render();
  }

  private scheduleResize = () => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.resize(), 100);
  };

  private trackFrameBudget(t: number, dt: number) {
    if (this.theme !== "light" || this.qualityScale <= 0.72) return;
    if (!this.qualityWindowStart) this.qualityWindowStart = t;
    this.qualityFrames++;
    if (dt > 28) this.delayedFrames++;
    if (t - this.qualityWindowStart < 2000) return;
    // Only a sustained missed budget reduces resolution. MSAA stays enabled, and there is no
    // repeated up/down quality oscillation while the fabric moves.
    if (this.qualityFrames >= 4 && this.delayedFrames / this.qualityFrames > 0.2) {
      this.qualityScale = Math.max(0.7, this.qualityScale * 0.85);
      this.resize();
    }
    this.qualityWindowStart = t;
    this.qualityFrames = 0;
    this.delayedFrames = 0;
  }

  get paused() {
    return this._paused;
  }
  set paused(v: boolean) {
    if (v === this._paused) return;
    this._paused = v;
    this.lastDrawTime = null;
    this.nextFrameTime = 0;
    this.qualityWindowStart = 0;
    this.qualityFrames = 0;
    this.delayedFrames = 0;
    if (v && this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    } else if (!v) this.start();
  }

  /** Draw the current pose without scheduling continuous animation. */
  drawOnce() {
    this.update(this.elapsed);
    this.render();
    this.markDrawn();
  }

  private start() {
    if (this.rafId != null || this._paused || this.disposed) return;
    const interval = 1000 / (this.theme === "light" ? 60 : 30);
    const loop = (t: number) => {
      if (this._paused || this.disposed) {
        this.rafId = null;
        return;
      }
      this.rafId = requestAnimationFrame(loop);
      if (t + 0.5 < this.nextFrameTime) return;
      this.nextFrameTime = this.nextFrameTime && t - this.nextFrameTime < interval
        ? this.nextFrameTime + interval
        : t + interval;
      this.updateAndRender(t);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private updateAndRender(t: number) {
    if (this._paused || !this.material) return;
    // Integrate time rather than multiplying elapsed time by a frame-dependent intro ramp.
    // Cap one delayed frame so tab restoration or a busy main thread cannot snap the fabric.
    const dt = this.lastDrawTime === null ? 0 : Math.min(t - this.lastDrawTime, 50);
    if (this.lastDrawTime !== null) this.trackFrameBudget(t, t - this.lastDrawTime);
    this.elapsed += dt;
    this.lastDrawTime = t;
    this.update(this.elapsed);
    this.render();
    if (!this.firstDrawComplete) {
      this.markDrawn();
      return;
    }
  }

  private update(elapsed: number) {
    if (!this.material) return;
    // renderer adds config.timeOffset and the mesh setter adds it again (reference quirk): 35000 + elapsed
    this.material.uniforms.u_time.value =
      this.config.materialProps.timeOffset * 2 + elapsed;
  }

  private render() {
    if (this.sceneTarget && this.postScene) {
      this.renderer.setRenderTarget(this.sceneTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private markDrawn() {
    if (this.firstDrawComplete) return;
    this.firstDrawComplete = true;
    this.onFirstDraw();
  }

  dispose() {
    this.disposed = true;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.scheduleResize);
    window.clearTimeout(this.resizeTimer);
    this.mesh?.geometry.dispose();
    this.material?.dispose();
    (
      this.material?.uniforms.u_paletteTexture.value as
        THREE.Texture | undefined
    )?.dispose();
    this.sceneTarget?.dispose();
    this.postScene?.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.postMaterial?.dispose();
    this.renderer.dispose();
  }
}
