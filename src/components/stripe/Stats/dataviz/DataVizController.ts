import * as THREE from "three";
import { createCircleTexture, DEFAULT_PALETTE, Palette, PALETTES, Tween, type TimeOfDay, type VizAnimation } from "./core";
import { GlobeLinesAnimation } from "./GlobeLinesAnimation";
import { RaysAnimation } from "./RaysAnimation";
import { SplinesAnimation } from "./SplinesAnimation";
import { WaveLinesAnimation } from "./WaveLinesAnimation";

const idle: (cb: () => void) => number =
  typeof requestIdleCallback !== "undefined" ? (cb) => requestIdleCallback(cb) : (cb) => window.setTimeout(cb, 0);
const cancelIdle: (id: number) => void = typeof cancelIdleCallback !== "undefined" ? cancelIdleCallback : clearTimeout;

/**
 * Port of the reference stats data-viz controller (class `ej`): one WebGL canvas, one camera
 * (fov 45 at z=5) and four animations — payment methods (rays), payments volume (globe lines),
 * uptime (wave lines) and subscriptions (splines). Switching stats cross-fades: the outgoing dots
 * scatter through a shared cloud while the incoming animation's dots arrive from the outgoing
 * positions (1.25s tweens). Animations not yet built are pre-warmed during idle time.
 */
export class DataVizController {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  animations: VizAnimation[];
  private animationsInitialized: boolean[];
  private activeIndex = 0;
  private currentColorPalette: Palette = DEFAULT_PALETTE;
  private resumeTime: number | null = null;
  private lastRenderTime: number | null = null;
  private runTime = 0;
  private rafId: number | null = null;
  private loopStart: number | null = null;
  private _paused = true;
  private initialized = false;
  private preWarmId: number | null = null;
  private animationIn: Tween | null = null;
  private animationOut: Tween | null = null;
  private isTransitioning = false;
  private pauseOnTransitionComplete = false;
  private resizeTimer: number | undefined;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: true,
    });
    const caps = this.renderer.capabilities;
    if (!caps.isWebGL2 || caps.maxTextureSize < 4096) {
      this.renderer.dispose();
      throw new Error("WebGL disabled based on capabilities check");
    }
    this.renderer.setClearColor(0, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;
    this.renderer.autoClearColor = false;
    this.renderer.autoClearDepth = false;
    this.camera.position.set(0, 0, 5);
    const circle = createCircleTexture(this.renderer.getPixelRatio());
    const palette = DEFAULT_PALETTE;
    this.animations = [
      new RaysAnimation(canvas, this.renderer, this.camera, circle, palette),
      new GlobeLinesAnimation(canvas, this.renderer, this.camera, circle, palette),
      new WaveLinesAnimation(canvas, this.renderer, this.camera, circle, palette),
      new SplinesAnimation(canvas, this.renderer, this.camera, circle, palette),
    ];
    this.animationsInitialized = this.animations.map(() => false);
    this.updateAndRender(0);
  }

  get rays() {
    return this.animations[0] as RaysAnimation;
  }

  private updateAndRender = (elapsed: number) => {
    if (!this.initialized || this.paused) return;
    if (this.resumeTime === null) this.resumeTime = elapsed;
    if (this.lastRenderTime === null) this.lastRenderTime = elapsed;
    const time = elapsed - this.resumeTime + this.runTime;
    const dt = elapsed - this.lastRenderTime;
    this.lastRenderTime = elapsed;
    this.renderer.clearColor();
    this.renderer.clearDepth();
    this.animations.forEach((a) => {
      if (!a.paused) a.updateAndRender(time, dt);
    });
  };

  get paused() {
    return this._paused;
  }

  set paused(value: boolean) {
    if (value) {
      if (this.isTransitioning) {
        this.pauseOnTransitionComplete = true;
        return;
      }
      this.runTime += (this.lastRenderTime || 0) - (this.resumeTime || 0);
      this.resumeTime = null;
      this.lastRenderTime = null;
    } else {
      this.pauseOnTransitionComplete = false;
    }
    this.animations[this.activeIndex].paused = value;
    this._paused = value;
  }

  private initAnimationAtIndex(index: number) {
    if (this.animationsInitialized[index]) return;
    const dpr = this.renderer.getPixelRatio();
    const rect = this.canvas.getBoundingClientRect();
    const animation = this.animations[index];
    animation.initScene();
    animation.resize(new THREE.Vector2(rect.width * dpr, rect.height * dpr));
    animation.setColorPalette(this.currentColorPalette, false);
    this.animationsInitialized[index] = true;
  }

  initScene() {
    if (this.initialized) return;
    const rect = this.canvas.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height, false);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.initAnimationAtIndex(this.activeIndex);
    this.animations[this.activeIndex].addListeners();
    const tick = (t: number) => {
      this.rafId = requestAnimationFrame(tick);
      if (this.loopStart === null) this.loopStart = t;
      this.updateAndRender(t - this.loopStart);
    };
    this.rafId = requestAnimationFrame(tick);
    this.initialized = true;
    this.preWarmRemainingAnimations();
  }

  private preWarmRemainingAnimations() {
    const pending = this.animations.map((_, i) => i).filter((i) => !this.animationsInitialized[i]);
    const next = () => {
      this.preWarmId = null;
      if (!this.initialized) return;
      const i = pending.shift();
      if (i !== undefined) {
        this.initAnimationAtIndex(i);
        if (pending.length > 0) this.preWarmId = idle(next);
      }
    };
    if (pending.length > 0) this.preWarmId = idle(next);
  }

  private cancelAnimations() {
    for (const key of ["animationIn", "animationOut"] as const) {
      const tween = this[key];
      if (!tween) continue;
      Tween.manager?.remove(tween);
      tween.stop();
      tween.completeFn(1);
      this[key] = null;
    }
  }

  setAnimationIndex(index: number, animate = true) {
    if (index === this.activeIndex) return;
    const previous = this.activeIndex;
    this.activeIndex = index;
    this.cancelAnimations();
    this.isTransitioning = animate;
    this.initAnimationAtIndex(index);
    const from = this.animations[previous];
    const to = this.animations[index];
    from.removeListeners();
    to.addListeners();
    const points = from.getPoints();
    const inTween = to.animateIn(points, () => {
      this.isTransitioning = false;
      if (this.pauseOnTransitionComplete) this.paused = true;
    });
    const outTween = from.animateOut(() => {
      from.paused = true;
      from.reset();
    });
    if (!animate) {
      inTween.updateFn(1);
      inTween.completeFn(1);
      outTween.updateFn(1);
      outTween.completeFn(1);
      this.animations.forEach((a, i) => {
        a.paused = i !== this.activeIndex;
      });
      return;
    }
    inTween.updateFn(0);
    outTween.updateFn(0);
    inTween.start();
    outTween.start();
    this.animationIn = inTween;
    this.animationOut = outTween;
    from.paused = false;
    to.paused = false;
  }

  renderActive() {
    this.renderer.clearColor();
    this.renderer.clearDepth();
    this.animations[this.activeIndex].updateAndRender((this.resumeTime || 0) + (this.runTime || 0), 1 / 60);
  }

  resize = () => {
    const dpr = this.renderer.getPixelRatio();
    const rect = this.canvas.getBoundingClientRect();
    const size = new THREE.Vector2(rect.width, rect.height);
    const scaled = size.clone().multiplyScalar(dpr);
    this.renderer.setSize(size.width, size.height, false);
    this.animations.forEach((a, i) => {
      if (this.animationsInitialized[i]) a.resize(scaled);
    });
    if (this._paused) this.renderActive();
  };

  /** Debounced resize (reference: 300ms). */
  debouncedResize = () => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(this.resize, 300);
  };

  setTimeOfDay(timeOfDay: TimeOfDay, animate: boolean) {
    this.setColorPalette(PALETTES[timeOfDay], animate);
  }

  setColorPalette(palette: Palette, animate: boolean) {
    this.currentColorPalette = palette;
    this.animations.forEach((a, i) => {
      if (this.animationsInitialized[i]) a.setColorPalette(palette, this.activeIndex === i && animate);
    });
    if (!animate && this.initialized) this.renderActive();
  }

  dispose() {
    if (this.preWarmId !== null) cancelIdle(this.preWarmId);
    this.preWarmId = null;
    window.clearTimeout(this.resizeTimer);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.animations.forEach((a, i) => {
      if (this.animationsInitialized[i]) a.dispose();
    });
    this.renderer.dispose();
  }
}
