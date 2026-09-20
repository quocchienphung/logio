import * as THREE from "three";

// Shared pieces of the reference stats data-viz (bundle module 40428): a tiny rAF tween manager,
// its easing table, time-of-day colour palettes, seeded random, simplex noise and the scatter cloud
// every animation morphs its dots through while transitioning.

/** Tween manager (class `o`): integrates every active tween once per animation frame. */
class TweenManager {
  animations: Tween[] = [];
  paused = false;

  constructor() {
    requestAnimationFrame(this.tick);
  }

  tick = (time: number) => {
    if (this.paused) return;
    requestAnimationFrame(this.tick);
    this.update(time);
  };

  update = (time: number) => {
    const done: Tween[] = [];
    const now = performance.now();
    this.animations.forEach((t) => {
      if (time - t.startTime < t.startDelay) return;
      if (!t.started) {
        t.started = true;
        t.startTime = now;
        t.lastUpdate = now;
        t.startFn(t.val);
      }
      if (t.complete) {
        done.push(t);
        t.completeFn(t.val);
        return;
      }
      t.integrate((now - t.lastUpdate) / 1000);
      t.updateFn(t.val);
      t.lastUpdate = now;
    });
    this.animations = this.animations.filter((t) => !done.includes(t));
  };

  add = (t: Tween) => {
    if (!this.paused && this.animations.indexOf(t) === -1) this.animations.push(t);
  };

  remove = (t: Tween) => {
    const i = this.animations.indexOf(t);
    if (i !== -1) this.animations.splice(i, 1);
  };
}

/** Linear 0→1 tween over `duration` seconds (class `r`); easing is applied by the update callback. */
export class Tween {
  static manager: TweenManager | null = null;
  val = 0;
  startTime = 0;
  startDelay = 0;
  lastUpdate = 0;
  complete = false;
  started = false;
  elapsed = 0;
  startFn: (v: number) => void = () => {};
  updateFn: (v: number) => void = () => {};
  completeFn: (v: number) => void = () => {};

  constructor(public duration: number) {}

  start = (delay?: number) => {
    this.startDelay = delay || 0;
    if (!Tween.manager) Tween.manager = new TweenManager();
    Tween.manager.add(this);
  };

  integrate = (dt: number) => {
    this.elapsed += dt;
    const t = (this.elapsed - this.startDelay) / this.duration;
    this.val = Math.max(Math.min(t, 1), 0);
    if (this.val === 1) this.complete = true;
  };

  stop = () => {
    this.val = 1;
    this.updateFn(1);
    this.complete = true;
  };

  cancel = () => {
    this.complete = true;
  };
}

/** Easing table (class `l`). */
export const Ease = {
  inSine: (t: number) => 1 - Math.cos((Math.PI / 2) * t),
  outSine: (t: number) => Math.sin((Math.PI / 2) * t),
  inOutSine: (t: number) => -0.5 * (Math.cos(Math.PI * t) - 1) + 0,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => -t * (t - 2),
  inOutQuad: (t: number) => (t < 0.5 ? t * t * 2 : 4 * t - 2 * t * t - 1),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

/** Top/bottom gradient colour pair with the stop range the shaders sample between (class `y`). */
export class Palette {
  colorTop: THREE.Color;
  colorBottom: THREE.Color;
  colorStop: THREE.Vector2;

  constructor(top: THREE.ColorRepresentation, bottom: THREE.ColorRepresentation, stop: THREE.Vector2) {
    this.colorTop = new THREE.Color(top);
    this.colorBottom = new THREE.Color(bottom);
    this.colorStop = stop;
  }

  static lerp(a: Palette, b: Palette, t: number) {
    return new Palette(
      a.colorTop.clone().lerp(b.colorTop, t),
      a.colorBottom.clone().lerp(b.colorBottom, t),
      a.colorStop.clone().lerp(b.colorStop, t),
    );
  }
}

export type TimeOfDay = "pre-dawn" | "sunrise" | "daytime" | "dusk" | "sunset" | "night";

// Monochrome line palettes (top, bottom). Each time of day sits on its own luminance background
// (see mono.css stats block): the lines run near-black at the top of the field, where the background
// is light, to white at the bottom, where the radial background is darkest. Night keeps white lines.
export const PALETTES: Record<TimeOfDay, Palette> = {
  "pre-dawn": new Palette("#2a2a2a", "#ffffff", new THREE.Vector2(0, 0.75)),
  sunrise: new Palette("#1a1a1a", "#ffffff", new THREE.Vector2(0, 0.75)),
  daytime: new Palette("#1a1a1a", "#ffffff", new THREE.Vector2(0, 0.75)),
  dusk: new Palette("#262626", "#ffffff", new THREE.Vector2(0, 0.75)),
  sunset: new Palette("#202020", "#f4f4f4", new THREE.Vector2(0, 0.75)),
  night: new Palette("#ffffff", "#FFFFFF", new THREE.Vector2(0, 0.66)),
};

export const DEFAULT_PALETTE = PALETTES.night;

/** `_.GE`: progress of `v` between `a` and `b`, clamped 0..1. */
export const progress = (a: number, b: number, v: number) => THREE.MathUtils.clamp((v - a) / (b - a), 0, 1);

/** `_.UI`: maps `v` from [a, b] to [c, d]. */
export const mapRange = (a: number, b: number, c: number, d: number, v: number) => ((v - a) * (d - c)) / (b - a) + c;

/** `_.xr`: deterministic PRNG (lowbias32-style hash on a running counter). */
export function seededRandom(seed = 1) {
  let state = (4294967296 * seed) >>> 0;
  const next = () => {
    state = (state + 2654435769) | 0;
    let z = state ^ (state >>> 16);
    z = Math.imul(z, 569420461);
    z ^= z >>> 15;
    z = Math.imul(z, 1935289751);
    return ((z ^= z >>> 15) >>> 0) / 4294967296;
  };
  return {
    randFloat: (lo: number, hi: number) => next() * (hi - lo) + lo,
    randInt: (lo: number, hi: number) => Math.floor(next() * (hi - lo + 1)) + lo,
  };
}

/**
 * Scatter cloud (const `c`): 400 Fibonacci-sphere points of radius 12, jittered ±9 and pushed 90
 * units back. Dots interpolate through these while an animation morphs into the next one.
 */
export const SCATTER_POINTS: THREE.Vector3[] = (() => {
  const count = 400;
  const radius = 12;
  const points: THREE.Vector3[] = [];
  const step = 2 / count;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    let y = i * step - 1 + step / 2;
    const r = Math.sqrt(1 - y ** 2);
    const phi = ((i + 1) % count) * golden;
    let x = Math.cos(phi) * r;
    let z = Math.sin(phi) * r;
    x *= radius;
    y *= radius;
    z *= radius;
    points.push(
      new THREE.Vector3(x + THREE.MathUtils.randFloat(-9, 9), y + THREE.MathUtils.randFloat(-9, 9), z - 90),
    );
  }
  return points;
})();

/** Soft red disc used as the point sprite (function `ek`); colour comes from the shaders. */
export function createCircleTexture(devicePixelRatio = 1) {
  const size = 12 * Math.ceil(devicePixelRatio);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, 2 * Math.PI);
  ctx.fillStyle = "red";
  ctx.fill();
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Element rect in document coordinates (module 26847). */
export function documentRect(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (getComputedStyle(el).position === "fixed") return r;
  return new DOMRect(r.x + window.scrollX, r.y + window.scrollY, r.width, r.height);
}

// ---------------------------------------------------------------- simplex noise (ported verbatim)

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;
const fastFloor = (x: number) => Math.floor(x) | 0;
const GRAD2 = new Float64Array([1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1]);
const GRAD3 = new Float64Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
]);

function buildPermutation(random: () => number) {
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 0; i < 255; i++) {
    const r = i + ~~(random() * (256 - i));
    const tmp = p[i];
    p[i] = p[r];
    p[r] = tmp;
  }
  for (let i = 256; i < 512; i++) p[i] = p[i - 256];
  return p;
}

export function createNoise2D(random: () => number = Math.random) {
  const perm = buildPermutation(random);
  const gx = new Float64Array(perm).map((v) => GRAD2[(v % 12) * 2]);
  const gy = new Float64Array(perm).map((v) => GRAD2[(v % 12) * 2 + 1]);
  return (x: number, y: number) => {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    const s = (x + y) * F2;
    const i = fastFloor(x + s);
    const j = fastFloor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    let i1: number;
    let j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const g = ii + perm[jj];
      t0 *= t0;
      n0 = t0 * t0 * (gx[g] * x0 + gy[g] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const g = ii + i1 + perm[jj + j1];
      t1 *= t1;
      n1 = t1 * t1 * (gx[g] * x1 + gy[g] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const g = ii + 1 + perm[jj + 1];
      t2 *= t2;
      n2 = t2 * t2 * (gx[g] * x2 + gy[g] * y2);
    }
    return 70 * (n0 + n1 + n2);
  };
}

export function createNoise3D(random: () => number = Math.random) {
  const perm = buildPermutation(random);
  const gx = new Float64Array(perm).map((v) => GRAD3[(v % 12) * 3]);
  const gy = new Float64Array(perm).map((v) => GRAD3[(v % 12) * 3 + 1]);
  const gz = new Float64Array(perm).map((v) => GRAD3[(v % 12) * 3 + 2]);
  return (x: number, y: number, z: number) => {
    let n0: number;
    let n1: number;
    let n2: number;
    let n3: number;
    const s = (x + y + z) * F3;
    const i = fastFloor(x + s);
    const j = fastFloor(y + s);
    const k = fastFloor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);
    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
      } else {
        i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
      }
    } else if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
    } else {
      i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    }
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0;
    else {
      const g = ii + perm[jj + perm[kk]];
      t0 *= t0;
      n0 = t0 * t0 * (gx[g] * x0 + gy[g] * y0 + gz[g] * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0;
    else {
      const g = ii + i1 + perm[jj + j1 + perm[kk + k1]];
      t1 *= t1;
      n1 = t1 * t1 * (gx[g] * x1 + gy[g] * y1 + gz[g] * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0;
    else {
      const g = ii + i2 + perm[jj + j2 + perm[kk + k2]];
      t2 *= t2;
      n2 = t2 * t2 * (gx[g] * x2 + gy[g] * y2 + gz[g] * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0;
    else {
      const g = ii + 1 + perm[jj + 1 + perm[kk + 1]];
      t3 *= t3;
      n3 = t3 * t3 * (gx[g] * x3 + gy[g] * y3 + gz[g] * z3);
    }
    return 32 * (n0 + n1 + n2 + n3);
  };
}

/** Common surface every animation exposes to the controller. */
export interface VizAnimation {
  paused: boolean;
  initScene(): void;
  resize(size: THREE.Vector2): void;
  updateAndRender(time: number, dt: number): void;
  addListeners(): void;
  removeListeners(): void;
  getPoints(): THREE.Vector3[];
  animateIn(points: THREE.Vector3[], onComplete: (v: number) => void): Tween;
  animateOut(onComplete: (v: number) => void): Tween;
  reset(): void;
  setColorPalette(palette: Palette, animate: boolean): void;
  dispose(): void;
}

/** Shared palette-crossfade logic (identical in every animation): 0.5s lerp when `animate`. */
export function transitionPalette(
  host: { colorPalette: Palette; colorAnimation: Tween | null; updateColorUniforms(p: Palette): void },
  palette: Palette,
  animate: boolean,
) {
  if (host.colorAnimation) {
    Tween.manager?.remove(host.colorAnimation);
    host.colorAnimation = null;
  }
  if (!animate) {
    host.updateColorUniforms(palette);
    host.colorPalette = palette;
    return;
  }
  const from = host.colorPalette;
  host.colorPalette = palette;
  const tween = new Tween(0.5);
  tween.updateFn = (t) => host.updateColorUniforms(Palette.lerp(from, palette, t));
  host.colorAnimation = tween;
  tween.start();
}

/** Copies a palette into the three gradient uniforms every material shares. */
export function applyPaletteUniforms(uniforms: Record<string, THREE.IUniform>, palette: Palette) {
  uniforms.gradientColorTop.value = palette.colorTop;
  uniforms.gradientColorBottom.value = palette.colorBottom;
  uniforms.gradientColorStop.value = palette.colorStop;
}

/** Reads a geometry's dot positions as vectors (used to hand dots over between animations). */
export function readPoints(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < attr.count; i += 1) points.push(new THREE.Vector3(attr.getX(i), attr.getY(i), attr.getZ(i)));
  return points;
}

/** Writes incoming points (cycled) into the `positionStart` attribute. */
export function writeStartPoints(geometry: THREE.BufferGeometry, points: THREE.Vector3[]) {
  const attr = geometry.getAttribute("positionStart") as THREE.BufferAttribute;
  for (let i = 0; i < attr.count; i += 1) {
    const p = points[i % (points.length - 1)];
    attr.setXYZ(i, p.x, p.y, p.z);
  }
  attr.needsUpdate = true;
}

/** Snapshots current positions into `positionStart` so an outgoing animation scatters from where it is. */
export function snapshotStartPoints(geometry: THREE.BufferGeometry) {
  const copy = (geometry.getAttribute("position") as THREE.BufferAttribute).clone();
  geometry.setAttribute("positionStart", copy);
  copy.needsUpdate = true;
}
