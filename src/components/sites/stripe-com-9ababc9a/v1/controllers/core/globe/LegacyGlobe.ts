// three.js port of the reference legacy Globe (v1-Globe-ULZY3QTC.js → v1-chunk-KDRZV34K.js, three r151).
// Dotted land globe (pentagon dots on a Fibonacci sphere, kept where the equirectangular land mask has
// alpha), a translucent Lambert-lit fill sphere, and animated arcs between country centroids that are
// drawn along a cubic Bézier tube and erased after 4 s (one new arc per second).
//
// Differences from the reference, all forced by the environment or the project rules:
//  - Colour pipeline: the reference runs three r151 in legacy mode (no colour management, linear output,
//    legacy lights). Here (r178) the same result is reproduced locally: colours are set as raw linear
//    values, output is LinearSRGB, point lights use decay 0 and every light intensity is × π.
//  - Colours come from the page config and are mapped to greys (mono.ts).
//  - Textures the reference loads from images.ctfassets.net are not in the mirror: the land mask uses
//    the project's local copy of Stripe's equirectangular mask (/stripe/map_dots-96ddc62d.png, same
//    lng 0 → left edge, north → top layout the reference UV math expects); the arc gradient strips and
//    the arc-end disc are generated procedurally (inferred); the optional background glow sprite
//    (`backgroundGradient`) is not drawn.
//  - Per-frame increments of the reference (rotation, reveal, circle growth, erase speed, drag decay,
//    throw inertia) are converted to elapsed time at the reference's 60 fps frame (16.67 ms), and a
//    globe-local clock drives all timers, so the globe freezes cleanly while paused.
import * as THREE from "three";
import { easeOutQuart } from "../util";
import { monoOf } from "../mono";
import { COUNTRY_CENTROIDS } from "./countries";

const FRAME_MS = 1000 / 60;
const LAND_MASK_URL = "/stripe/map_dots-96ddc62d.png";

// ---- constants (from source) ----
const BASE_RADIUS = 250; // J
const RADIUS_WIDTH_FACTOR = 0.3; // vt
const MAX_RESPONSIVE_WIDTH = 1080; // Mt
const SEGMENTS_BASE = 20; // Vt
const SEGMENTS_FACTOR = 10; // jt
const DEFAULT_OPACITY = 0.94; // qt
const REVEAL_STEP = 0.005; // Ht, per frame
const ROTATION_START = 0.02; // Ct, radians per frame
const ROTATION_END = 0.001; // Kt, radians per frame
const ROTATION_X = Math.PI * 0.1111; // Nt
const ROTATION_Y = Math.PI; // Ut
const ROTATION_Y_STATIC = Math.PI * 0.1; // Wt
const DRAG_FACTOR = -0.003; // xt
const THROW_DECAY = 0.94; // St
const MIN_ROTATION_X = Math.PI * -0.5; // _t
const MAX_ROTATION_X = Math.PI * 0.25; // Rt
const RESIZE_MIN_WIDTH = 512; // te
const STATIC_LINE_COUNT = 5; // ee
const LINE_INTERVAL = 1000; // ie
const LINE_LIFETIME = 4000; // se
const LINE_DISPOSE_DELAY = 1500;
const DOTS_PER_UNIT = 7e4; // Xt
const STATIC_DOTS_TIME = 3000;
// arcs (class Y)
const TUBE_RADIUS = 0.2; // Gt
const TUBE_RADIAL_SEGMENTS = 8; // It
const TUBE_SEGMENTS = 44; // Dt
const ERASE_STEP = 48; // Et * 2, indices per frame
const CIRCLE_MAX_SCALE = 0.35; // v
const DRAW_COUNT = 3000; // k
const DRAW_HALF = DRAW_COUNT * 0.5; // Lt
const MIN_ARC_ALTITUDE = 160; // Ot
const MAX_ARC_ALTITUDE = 500; // zt
const CIRCLE_STEP = 0.01; // T, per frame
const CIRCLE_SHRINK = 0.01; // wt, per frame
const DRAW_DURATION = 2500; // kt
const FLOW_SPEED = 4e-4;
/** Default arc colour pairs (ae), before the monochrome mapping. */
const DEFAULT_ARC_COLORS: [number, number][] = [
  [16335176, 16763735],
  [11232234, 9494783],
  [16335176, 11232234],
  [16763735, 9494783],
];
const EAST = ["my", "sg", "au", "nz", "hk", "jp", "in"];
const WEST = ["ca", "mx", "us", "br"];
const MIDDLE = ["be", "gb", "at", "dk", "ee", "fi", "fr", "gr", "de", "ie", "it", "lv", "lt", "lu", "nl", "no", "pl", "pt", "es", "sk", "si", "se", "ch", "cy", "bg", "ro", "cz"];
const LIVE = [...EAST, ...WEST, ...MIDDLE];

export interface GlobeConfig {
  dotColor?: number | string;
  globeColor?: number | string;
  ambientLight?: number | string;
  backLight?: number | string;
  frontLight?: number | string;
  backgroundGradient?: number;
  arcColors?: [number, number][];
  arcThicknessMultiplier?: number;
  cameraXBase?: number;
  cameraYBase?: number;
  opacity?: number;
  ambientIntensity?: number;
  backIntensity?: number;
  frontIntensity?: number;
  globeScale?: number;
  dotDensity?: number;
  dotSize?: number;
  dotSideCount?: number;
  pauseRotate?: boolean;
  linesOff?: boolean;
  globeAlignment?: "center" | "top";
  enableResponsiveSize?: boolean;
}

const POSITIONS: Record<string, { x: number; y: number }> = {
  BottomCenter: { x: -0.4, y: 0.5 },
  BottomRight: { x: -1.05, y: 0.2 },
  WhiteGlove: { x: -0.75, y: 0.55 },
  CryptoAnimation: { x: 0, y: 0.33 },
  Payments: { x: -0.75, y: 0.25 },
  PaymentsAuth: { x: -0.75, y: 0.5 },
  ManagedPayments: { x: -0.5, y: 0.1 },
  ManagedPaymentsMobile: { x: 0, y: 0.1 },
};

/** Raw (legacy, non-colour-managed) grey for a config colour. */
const monoColor = (c: number | string) => {
  const v = monoOf(c);
  return new THREE.Color().setRGB(v, v, v, THREE.LinearSRGBColorSpace);
};

/** Reference `z()`: lat/lng on a sphere of radius r. */
function latLngToVector(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Great-circle interpolation between two [lng, lat] points (d3-geo `geoInterpolate`). */
function geoInterpolate(a: [number, number], b: [number, number]): (t: number) => [number, number] {
  const rad = Math.PI / 180;
  const [x0, y0, x1, y1] = [a[0] * rad, a[1] * rad, b[0] * rad, b[1] * rad];
  const cy0 = Math.cos(y0), sy0 = Math.sin(y0), cy1 = Math.cos(y1), sy1 = Math.sin(y1);
  const kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0), kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1);
  const haversin = (x: number) => Math.sin(x / 2) ** 2;
  const d = 2 * Math.asin(Math.min(1, Math.sqrt(haversin(y1 - y0) + cy0 * cy1 * haversin(x1 - x0))));
  const k = Math.sin(d);
  if (!d) return () => [x0 / rad, y0 / rad];
  return (t: number) => {
    const B = Math.sin((t *= d)) / k;
    const A = Math.sin(d - t) / k;
    const x = A * kx0 + B * kx1;
    const y = A * ky0 + B * ky1;
    const z = A * sy0 + B * sy1;
    return [Math.atan2(y, x) / rad, Math.atan2(z, Math.sqrt(x * x + y * y)) / rad];
  };
}

const resetRevolutions = (t: number) => {
  const TWO_PI = Math.PI * 2;
  if (Math.abs(t / TWO_PI) === 0) return t;
  return t - Math.floor(Math.abs(t / TWO_PI)) * Math.sign(t) * TWO_PI;
};

/** Procedural stand-in for the reference arc texture: a wrap-around gradient between the two arc greys. */
function makeArcTexture(a: number, b: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 4;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  const grey = (v: number) => `rgb(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)})`;
  g.addColorStop(0, grey(a));
  g.addColorStop(0.5, grey(b));
  g.addColorStop(1, grey(a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 4);
  return new THREE.CanvasTexture(c);
}

/** Procedural stand-in for the reference disc texture: a soft-edged white disc. */
function makeDiscTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.8, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const ARC_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const ARC_FRAGMENT = /* glsl */ `
uniform float u_time;
uniform float u_alpha;
uniform sampler2D u_texture;
uniform float speedEpsilon;
varying vec2 vUv;
void main() {
  float pct = fract(vUv.x * 0.5 - u_time * speedEpsilon);
  vec4 color = texture2D(u_texture, vec2(pct, 0.6));
  color.a = u_alpha;
  gl_FragColor = color;
}`;

class Arc extends THREE.Group {
  readonly tube: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>;
  readonly circle1: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  readonly circle2: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  readonly createdAt: number;
  erasingAt = -1;

  constructor(start: [number, number], end: [number, number], colors: [THREE.Color, THREE.Color], texture: THREE.Texture, disc: THREE.Texture, radius: number, thickness: number, readonly isStatic: boolean, opacity: number, now: number) {
    super();
    this.createdAt = now;
    const b = latLngToVector(start[0], start[1], radius);
    const d = latLngToVector(end[0], end[1], radius * 1.002);
    const altitude = THREE.MathUtils.clamp(b.distanceTo(d) * 0.5, MIN_ARC_ALTITUDE, MAX_ARC_ALTITUDE);
    const interp = geoInterpolate([start[1], start[0]], [end[1], end[0]]);
    const q1 = interp(0.25);
    const q3 = interp(0.75);
    const curve = new THREE.CubicBezierCurve3(b, latLngToVector(q1[1], q1[0], radius + altitude), latLngToVector(q3[1], q3[0], radius + altitude), d);
    const material = new THREE.ShaderMaterial({
      uniforms: { u_time: { value: 0 }, u_alpha: { value: opacity }, u_texture: { value: texture }, speedEpsilon: { value: FLOW_SPEED } },
      vertexShader: ARC_VERTEX,
      fragmentShader: ARC_FRAGMENT,
    });
    this.tube = new THREE.Mesh(new THREE.TubeGeometry(curve, TUBE_SEGMENTS, TUBE_RADIUS + (radius / 1200) * thickness, TUBE_RADIAL_SEGMENTS, false), material);
    this.add(this.tube);
    const circleGeometry = new THREE.PlaneGeometry(radius * 0.1, radius * 0.1, 2);
    const mk = (color: THREE.Color, pos: THREE.Vector3) => {
      const m = new THREE.Mesh(circleGeometry, new THREE.MeshBasicMaterial({ map: disc, color, transparent: true, opacity, side: THREE.DoubleSide }));
      m.scale.setScalar(0.01);
      m.position.copy(pos);
      m.rotation.set(Math.PI, Math.PI, Math.PI);
      m.lookAt(0, 0, 0);
      this.add(m);
      return m;
    };
    this.circle1 = mk(colors[0], b);
    this.circle2 = mk(colors[1], d);
    this.tube.geometry.setDrawRange(0, 1);
    if (isStatic) this.drawStatic();
  }

  private drawStatic() {
    this.tube.geometry.setDrawRange(0, DRAW_COUNT);
    this.circle1.scale.setScalar(CIRCLE_MAX_SCALE);
    this.circle2.scale.setScalar(CIRCLE_MAX_SCALE);
  }

  /** Advances the draw (or erase) animation to globe time `now`. */
  update(now: number): void {
    if (this.isStatic) return;
    const elapsed = now - this.createdAt;
    this.tube.material.uniforms.u_time.value = elapsed;
    if (this.erasingAt < 0) {
      const count = Math.min(DRAW_COUNT, Math.ceil(easeOutQuart(Math.min(elapsed, DRAW_DURATION), 0, 1, DRAW_DURATION) * DRAW_COUNT));
      if (count < DRAW_COUNT || elapsed < DRAW_DURATION) {
        const frames = elapsed / FRAME_MS;
        this.circle1.scale.setScalar(Math.min(CIRCLE_MAX_SCALE, 0.01 + CIRCLE_STEP * frames));
        if (count > DRAW_HALF) {
          // circle 2 starts growing once half of the draw range is reached (easeOutQuart⁻¹(0.5) of 2500 ms)
          const startMs = DRAW_DURATION * (1 - Math.pow(0.5, 0.25));
          this.circle2.scale.setScalar(Math.min(CIRCLE_MAX_SCALE, 0.01 + CIRCLE_STEP * 1.5 * ((elapsed - startMs) / FRAME_MS)));
        }
      }
      this.tube.geometry.setDrawRange(0, count);
      return;
    }
    const frames = (now - this.erasingAt) / FRAME_MS;
    const start = Math.min(DRAW_COUNT + ERASE_STEP, Math.floor(ERASE_STEP * frames));
    const s1 = this.circle1Erase - CIRCLE_SHRINK * frames;
    this.circle1.scale.setScalar(Math.max(Math.min(this.circle1Erase, 0.03), s1));
    if (start > DRAW_HALF) {
      const halfFrames = frames - DRAW_HALF / ERASE_STEP;
      const s2 = this.circle2Erase - CIRCLE_SHRINK * 1.5 * halfFrames;
      this.circle2.scale.setScalar(Math.max(Math.min(this.circle2Erase, 0.03), s2));
    }
    this.tube.geometry.setDrawRange(start, DRAW_COUNT);
  }

  private circle1Erase = CIRCLE_MAX_SCALE;
  private circle2Erase = CIRCLE_MAX_SCALE;
  erase(now: number): void {
    if (this.erasingAt >= 0) return;
    this.erasingAt = now;
    this.circle1Erase = this.circle1.scale.x;
    this.circle2Erase = this.circle2.scale.x;
    this.tube.geometry.setDrawRange(0, DRAW_COUNT);
  }

  setOpacity(o: number): void {
    this.tube.material.uniforms.u_alpha.value = o;
    this.circle1.material.opacity = o;
    this.circle2.material.opacity = o;
  }

  dispose(): void {
    this.tube.geometry.dispose();
    this.tube.material.dispose();
    this.circle1.geometry.dispose();
    this.circle1.material.dispose();
    this.circle2.material.dispose();
    this.removeFromParent();
  }
}

const DOT_VERTEX = /* glsl */ `
uniform float u_time;
uniform float u_drag_time;
uniform float u_z_offset_factor;
attribute float rndId;
varying float vRndId;
varying float pct;
void main() {
  vRndId = rndId;
  pct = min(1.0, u_time / (1000. / max(0.2, 0.2 * sin(fract(rndId)))));
  float vNormal = 1.0;
  if (u_drag_time > 0.) {
    vNormal -= ((sin(u_time / 400.0 * vRndId) + 1.0) * 0.02) * min(1., u_drag_time / 1200.0);
  }
  vNormal -= ((sin(u_time / 400.0 * rndId) + 1.0) * 0.02) * u_z_offset_factor;
  gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, vNormal));
}`;
// The reference fragment also tints the dots per channel while dragging, behind a `u_dragging`
// uniform it never sets (always false); that dead branch is omitted.
const DOT_FRAGMENT = /* glsl */ `
uniform float u_time;
uniform vec3 u_color;
uniform float u_opacity_factor;
varying float vRndId;
varying float pct;
void main() {
  float v = sin(u_time / 200.0 * vRndId);
  float alpha = (pct * 0.7 + v * 0.2) * u_opacity_factor;
  gl_FragColor = vec4(u_color, alpha);
}`;

/** Loads the land mask and returns its pixels (alpha > 0 = land). */
function loadLandMask(): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("2d"));
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error("land mask"));
    img.src = LAND_MASK_URL;
  });
}

/** Builds the dot geometry exactly like the reference initDots (one pentagon per land sample). */
function buildDots(radius: number, density: number, dotSize: number, sides: number, mask: ImageData): THREE.BufferGeometry {
  const scale = radius / 450;
  const count = Math.floor((radius / 600) * density * DOTS_PER_UNIT);
  const dotR = dotSize * scale;
  // CircleGeometry(dotR, sides): centre + (sides + 1) rim vertices in the XY plane.
  const rim: [number, number][] = [];
  for (let s = 0; s <= sides; s++) rim.push([Math.cos((s / sides) * Math.PI * 2) * dotR, Math.sin((s / sides) * Math.PI * 2) * dotR]);
  const positions: number[] = [];
  const rnd: number[] = [];
  const c = new THREE.Vector3();
  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const verts: THREE.Vector3[] = Array.from({ length: sides + 2 }, () => new THREE.Vector3());
  const box = new THREE.Box3();
  const centre = new THREE.Vector3();
  for (let b = count; b >= 0; b -= 1) {
    const phi = Math.acos(-1 + (2 * b) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    c.setFromSphericalCoords(radius, phi, theta);
    // geometry.lookAt(c): +Z towards c (Matrix4.lookAt with eye = c, target = origin, up = +Y)
    zAxis.copy(c).normalize();
    xAxis.crossVectors(up, zAxis);
    if (xAxis.lengthSq() === 0) {
      zAxis.z += 0.0001;
      zAxis.normalize();
      xAxis.crossVectors(up, zAxis);
    }
    xAxis.normalize();
    yAxis.crossVectors(zAxis, xAxis);
    verts[0].copy(c);
    for (let s = 0; s <= sides; s++) verts[s + 1].copy(c).addScaledVector(xAxis, rim[s][0]).addScaledVector(yAxis, rim[s][1]);
    box.setFromPoints(verts);
    box.getCenter(centre);
    // reference UV: direction from the dot centre to the globe origin (the antipode) on the equirectangular mask
    const e = centre.clone().negate().normalize();
    const u = 1 - (0.5 + Math.atan2(e.z, e.x) / (2 * Math.PI));
    const v = 0.5 + Math.asin(e.y) / Math.PI;
    const px = Math.floor(u * mask.width);
    const py = Math.floor(v * mask.height);
    const alpha = mask.data[(px + py * mask.width) * 4 + 3];
    if (!(alpha > 0)) continue;
    const g = Math.random();
    for (let s = 0; s < sides; s++) {
      positions.push(verts[0].x, verts[0].y, verts[0].z, verts[s + 1].x, verts[s + 1].y, verts[s + 1].z, verts[s + 2].x, verts[s + 2].y, verts[s + 2].z);
      rnd.push(g, g, g);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("rndId", new THREE.Float32BufferAttribute(rnd, 1));
  return geo;
}

export interface LegacyGlobeOptions {
  isStatic: boolean;
  /** Element that receives `is-globe-dragging` (the reference's <html>). */
  dragClassTarget: HTMLElement;
}

export class LegacyGlobe {
  private readonly el: HTMLElement;
  private readonly isStatic: boolean;
  private readonly dragClassTarget: HTMLElement;
  private readonly cfg: Required<Pick<GlobeConfig, "opacity" | "ambientIntensity" | "backIntensity" | "frontIntensity" | "dotDensity" | "dotSize" | "dotSideCount" | "pauseRotate" | "linesOff">> & { globeAlignment: "center" | "top" };
  private readonly radius: number;
  private readonly segments: number;
  private readonly cameraXBase: number;
  private readonly cameraYBase: number;
  private readonly sizeToParent: boolean;
  private readonly arcColors: [THREE.Color, THREE.Color][];
  private readonly arcGreys: [number, number][];
  private readonly thickness: number;
  private readonly globeColor: THREE.Color;
  private readonly dotColor: THREE.Color;
  private readonly lightColors: { ambient: THREE.Color; back: THREE.Color; front: THREE.Color };
  private countryList = Object.keys(COUNTRY_CENTROIDS);

  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0, 0);
  private container = new THREE.Group();
  private globeMap = new THREE.Group();
  private dotsGroup = new THREE.Group();
  private linesContainer: THREE.Group | null = null;
  private dotsMaterial: THREE.ShaderMaterial | null = null;
  private fillMaterial: THREE.MeshLambertMaterial | null = null;
  private fill: THREE.Mesh | null = null;
  private arcTextures: THREE.Texture[] = [];
  private discTexture: THREE.Texture | null = null;
  private lines: Arc[] = [];
  private disposables: { dispose(): void }[] = [];

  private windowW = 0;
  private windowH = 0;
  private oldInnerWidth = 0;
  private moveGlobeToTopAmount = 0;
  private clock = 0;
  private lastFrame = 0;
  private raf = 0;
  private playing = false;
  private initialized = false;
  private disposed = false;
  private dotsReady = false;
  private dotsStart = 0;
  private revealed = false;
  private revealProgress = 0;
  private targetOpacityBase = Number.NaN;
  private targetOpacity = 1;
  private rotationIncrement = ROTATION_START;
  private rotationBase = 0;
  private scale = 1;
  private targetScale = 1;
  private lineCount = 0;
  private nextLineAt = 0;
  // dragging
  private isDragging = false;
  private dotsDragging = false;
  private dragStart = 0;
  private dragTime = 0;
  private mouse = { x: 0, y: 0 };
  private oldMouse = { x: 0, y: 0 };
  private move = { x: 0, y: 0 };
  private touchStart = { x: 0, y: 0 };
  private oldRotation = { x: 0, y: 0 };
  private throwVelocity: { x: number; y: number } | null = null;
  private removeListeners: () => void = () => {};

  constructor(el: HTMLElement, config: GlobeConfig, opts: LegacyGlobeOptions) {
    this.el = el;
    this.isStatic = opts.isStatic;
    this.dragClassTarget = opts.dragClassTarget;
    this.cfg = {
      opacity: config.opacity ?? DEFAULT_OPACITY,
      ambientIntensity: config.ambientIntensity ?? 1,
      backIntensity: config.backIntensity ?? 0.2,
      frontIntensity: config.frontIntensity ?? 0.8,
      dotDensity: config.dotDensity ?? 1,
      dotSize: config.dotSize ?? 1.8,
      dotSideCount: config.dotSideCount ?? 5,
      pauseRotate: config.pauseRotate ?? false,
      linesOff: config.linesOff ?? false,
      globeAlignment: config.globeAlignment === "top" ? "top" : "center",
    };
    this.sizeToParent = el.hasAttribute("data-js-size-to-parent");
    const width = this.sizeToParent ? el.offsetWidth : document.documentElement.clientWidth;
    this.radius = config.enableResponsiveSize !== false ? BASE_RADIUS + Math.min(width, MAX_RESPONSIVE_WIDTH) * RADIUS_WIDTH_FACTOR : BASE_RADIUS + MAX_RESPONSIVE_WIDTH * RADIUS_WIDTH_FACTOR;
    this.segments = Math.floor((this.radius / BASE_RADIUS) * SEGMENTS_FACTOR) + SEGMENTS_BASE;
    const white = el.dataset.jsGlobeTheme === "White";
    const pos = POSITIONS[el.dataset.jsGlobePosition || "BottomRight"] ?? { x: 0, y: 0 };
    this.globeColor = monoColor(config.globeColor ?? (white ? 15857141 : 1056824));
    this.dotColor = monoColor(config.dotColor ?? (white ? 11783423 : 3173286));
    this.cameraXBase = config.cameraXBase !== undefined ? this.radius * config.cameraXBase : this.radius * pos.x;
    this.cameraYBase = config.cameraYBase !== undefined ? this.radius * config.cameraYBase : this.radius * pos.y;
    this.lightColors = {
      ambient: monoColor(config.ambientLight ?? (white ? 14542575 : 10086140)),
      back: monoColor(config.backLight ?? (white ? 2236962 : 12775677)),
      front: monoColor(config.frontLight ?? (white ? 4473935 : 10593711)),
    };
    const pairs = config.arcColors ?? DEFAULT_ARC_COLORS;
    this.arcGreys = pairs.map(([a, b]) => [monoOf(a), monoOf(b)]);
    this.arcColors = pairs.map(([a, b]) => [monoColor(a), monoColor(b)]);
    this.thickness = config.arcThicknessMultiplier ?? 1;
  }

  setCountryList(list: string[]): void {
    this.countryList = list;
  }

  /** Builds renderer, lights and globe (reference load()); the dots appear once the land mask loaded. */
  load(): boolean {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      return false; // no WebGL2: nothing is drawn (the reference has no fallback either)
    }
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0xdddddd, 0);
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.sortObjects = false;
    this.el.appendChild(r.domElement);
    this.addLighting();
    this.addGlobe();
    this.addListeners();
    this.setWindowSize();
    this.addCamera();
    loadLandMask()
      .then((mask) => {
        if (this.disposed) return;
        this.initDots(mask);
      })
      .catch(() => {});
    return true;
  }

  private addLighting() {
    const pi = Math.PI; // legacy lights: intensities were effectively × π
    this.scene.add(new THREE.AmbientLight(this.lightColors.ambient, this.cfg.ambientIntensity * pi));
    const back = new THREE.PointLight(this.lightColors.back, this.cfg.backIntensity * pi, 0, 0);
    back.position.set(-1000, -1100, -3300);
    this.scene.add(back);
    const front = new THREE.PointLight(this.lightColors.front, this.cfg.frontIntensity * pi, 0, 0);
    front.position.set(-3000, 3000, 3300);
    this.scene.add(front);
  }

  private addGlobe() {
    this.scene.add(this.container);
    this.container.add(this.globeMap);
    // dots group (reference class N): rotated by (-π, 0, -π)
    this.dotsGroup.rotation.set(-Math.PI, 0, -Math.PI);
    this.globeMap.add(this.dotsGroup);
    this.fillMaterial = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0, color: this.globeColor });
    const sphere = new THREE.SphereGeometry(this.radius - 0.1, this.segments, this.segments);
    this.fill = new THREE.Mesh(sphere, this.fillMaterial);
    this.globeMap.add(this.fill);
    this.disposables.push(this.fillMaterial, sphere);
    this.container.position.z = -this.radius * 2;
    this.container.rotation.x = ROTATION_X;
    this.container.rotation.y = this.isStatic ? ROTATION_Y_STATIC : ROTATION_Y;
    const s = this.el.dataset.jsGlobeScale ? Number(this.el.dataset.jsGlobeScale) : 1;
    this.container.scale.set(s, s, s);
  }

  private initDots(mask: ImageData) {
    const geo = buildDots(this.radius, this.cfg.dotDensity, this.cfg.dotSize, this.cfg.dotSideCount, mask);
    this.dotsMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        u_time: { value: 0 },
        u_drag_time: { value: 0 },
        u_color: { value: this.dotColor },
        u_z_offset_factor: { value: 0 },
        u_opacity_factor: { value: 1 },
      },
      vertexShader: DOT_VERTEX,
      fragmentShader: DOT_FRAGMENT,
    });
    this.dotsGroup.add(new THREE.Mesh(geo, this.dotsMaterial));
    this.disposables.push(geo, this.dotsMaterial);
    this.dotsStart = this.clock;
    this.dotsReady = true;
    if (this.isStatic && this.initialized) this.requestRender();
  }

  private setWindowSize = () => {
    if (!this.renderer) return;
    this.windowW = this.sizeToParent ? this.el.offsetWidth : document.documentElement.clientWidth;
    this.windowH = this.el.offsetHeight;
    this.renderer.setSize(this.windowW, this.windowH);
    this.oldInnerWidth = this.windowW;
    if (this.cfg.globeAlignment === "top") this.moveGlobeToTopAmount = -(this.windowH / 2) + this.radius * 0.65;
  };

  private addCamera() {
    const aspect = this.windowH ? this.windowW / this.windowH : 1;
    const t = this.windowH * 0.5;
    const e = -(aspect * this.windowH) * 0.5;
    const depth = this.radius * 4;
    Object.assign(this.camera, { left: e, right: -e, top: t, bottom: -t, near: -depth, far: depth });
    this.camera.position.x = this.cameraXBase;
    this.camera.position.y = this.cameraYBase + (this.cfg.globeAlignment === "top" ? this.moveGlobeToTopAmount : 0);
    this.camera.updateProjectionMatrix();
  }

  private handleResize = () => {
    const w = document.documentElement.clientWidth;
    if (this.oldInnerWidth !== w || w > RESIZE_MIN_WIDTH) {
      this.setWindowSize();
      this.addCamera();
      if (this.isStatic || !this.playing) this.renderOnce();
    }
  };

  // ---- dragging (reference handlers; both current pages disable pointer events on the globe) ----
  private dragStartFn = () => {
    if (this.dotsMaterial && !this.isStatic) {
      this.dotsDragging = true;
      this.dragStart = this.clock;
    }
    this.isDragging = true;
    this.throwVelocity = null;
    this.oldRotation = { x: this.container.rotation.x, y: this.rotationBase };
    this.targetScale = this.isStatic ? 1 : 0.98;
    this.dragClassTarget.classList.add("is-globe-dragging");
  };
  private handleMouseDown = (e: MouseEvent) => {
    this.dragClassTarget.classList.add("is-globe-dragging");
    this.oldMouse = { x: e.clientX, y: e.clientY };
    this.dragStartFn();
  };
  private handleTouchStart = (e: TouchEvent) => {
    const t = e.touches[0] || e.changedTouches[0];
    this.oldMouse = { x: t.pageX, y: t.pageY };
    this.mouse = { x: t.pageX, y: t.pageY };
    this.touchStart = { x: t.pageX, y: t.pageY };
    this.dragStartFn();
  };
  private handleMouseMove = (e: MouseEvent) => {
    this.mouse = { x: e.clientX, y: e.clientY };
    this.handleDragging();
  };
  private handleTouchMove = (e: TouchEvent) => {
    const t = e.touches[0] || e.changedTouches[0];
    if (Math.abs(this.touchStart.y - t.pageY) > Math.abs(this.touchStart.x - t.pageX)) return;
    this.mouse = { x: t.pageX, y: t.pageY };
    this.handleDragging();
  };
  private dragClassTimer = 0;
  private handleMouseUp = () => {
    window.clearTimeout(this.dragClassTimer);
    this.dragClassTimer = window.setTimeout(() => this.dragClassTarget.classList.remove("is-globe-dragging"), 20);
    this.isDragging = false;
    this.dotsDragging = false;
    if (this.move.x !== 0 || Math.abs(this.move.y) > 0) this.throwVelocity = { x: this.move.x * THROW_DECAY, y: this.move.y * THROW_DECAY };
    this.oldMouse = { x: 0, y: 0 };
    this.move = { x: 0, y: 0 };
    this.targetScale = 1;
  };
  private handleDragging() {
    if (!this.isDragging) return;
    let tension = 1 + Math.abs(this.oldRotation.x);
    tension = Math.pow(tension, tension);
    this.move = { x: (this.oldMouse.x - this.mouse.x) * DRAG_FACTOR, y: ((this.oldMouse.y - this.mouse.y) * DRAG_FACTOR) / tension };
    const ry = resetRevolutions(this.oldRotation.y + this.move.x);
    const rx = Math.max(MIN_ROTATION_X, Math.min(MAX_ROTATION_X, this.oldRotation.x + this.move.y));
    this.container.rotation.y = ry;
    this.rotationBase = ry;
    this.container.rotation.x = rx;
    this.oldRotation = { x: rx, y: ry };
    this.oldMouse = { ...this.mouse };
  }

  private addListeners() {
    const offs: (() => void)[] = [];
    const on = (t: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      t.addEventListener(type, fn, opts);
      offs.push(() => t.removeEventListener(type, fn, opts));
    };
    on(window, "resize", this.handleResize);
    if (!this.isStatic) {
      on(window, "mouseup", this.handleMouseUp);
      on(window, "mousemove", this.handleMouseMove as EventListener);
      on(this.el, "touchstart", this.handleTouchStart as EventListener, { passive: true });
      on(window, "touchmove", this.handleTouchMove as EventListener);
      on(window, "touchend", this.handleMouseUp);
      on(this.el, "mousedown", this.handleMouseDown as EventListener);
    }
    this.removeListeners = () => offs.forEach((f) => f());
  }

  // ---- arcs ----
  private ensureLines() {
    if (this.linesContainer) return;
    this.discTexture = makeDiscTexture();
    this.arcTextures = this.arcGreys.map(([a, b]) => makeArcTexture(a, b));
    this.disposables.push(this.discTexture, ...this.arcTextures);
    this.linesContainer = new THREE.Group();
    this.container.add(this.linesContainer);
  }

  private drawLine(): void {
    if (!this.linesContainer || !this.discTexture) return;
    this.lineCount += 1;
    const t = resetRevolutions(this.container.rotation.y);
    const n = this.lineCount;
    let start = this.countryList[n % this.countryList.length];
    let end = LIVE[n % LIVE.length];
    if ((t < 5.7 && t > 4.4) || (t > -2 && t < -0.2)) end = EAST[n % EAST.length];
    else if ((t < 4.2 && t > 2.2) || (t > -4 && t < -1.7)) {
      if ((t < -1.7 && t > -3) || (t > 3 && t < 4.2)) start = EAST[n % EAST.length];
      end = WEST[n % WEST.length];
    } else if ((t < 2.2 && t > 0.3) || (t > -6.28 && t < -4)) end = MIDDLE[n % MIDDLE.length];
    if (start === end) return this.drawLine();
    const a = COUNTRY_CENTROIDS[start];
    const b = COUNTRY_CENTROIDS[end];
    if (!a || !b) return;
    const i = n % this.arcColors.length;
    const line = new Arc(a, b, this.arcColors[i], this.arcTextures[i], this.discTexture, this.radius * 1.001 + Math.random() * 0.01, this.thickness, this.isStatic, Number.isNaN(this.targetOpacity) ? 0 : this.targetOpacity, this.clock);
    this.linesContainer.add(line);
    this.lines.push(line);
  }

  private updateLines() {
    for (const line of [...this.lines]) {
      if (!this.isStatic && line.erasingAt < 0 && this.clock - line.createdAt >= LINE_LIFETIME) line.erase(this.clock);
      line.update(this.clock);
      if (line.erasingAt >= 0 && this.clock - line.erasingAt >= LINE_DISPOSE_DELAY) {
        line.dispose();
        this.lines.splice(this.lines.indexOf(line), 1);
      }
    }
  }

  // ---- loop ----
  play(): void {
    if (this.disposed || !this.renderer) return;
    if (!this.cfg.linesOff) {
      this.ensureLines();
      if (this.isStatic) {
        if (this.lineCount === 0) for (let i = 0; i < STATIC_LINE_COUNT; i++) this.drawLine();
      } else this.nextLineAt = this.clock + LINE_INTERVAL;
    }
    if (this.isStatic && this.initialized) return;
    this.initialized = true;
    this.playing = true;
    this.lastFrame = 0;
    this.requestRender();
  }

  pause(): void {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private requestRender() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.renderer) return;
    const dt = this.lastFrame ? Math.min(now - this.lastFrame, 100) : FRAME_MS;
    this.lastFrame = now;
    this.clock += dt;
    const f = dt / FRAME_MS;
    this.step(f);
    if (this.isStatic && this.revealed && this.dotsReady) {
      this.renderOnce();
      return;
    }
    if (this.playing || this.isStatic) this.requestRender();
  };

  private step(f: number) {
    // throw inertia (reference throwGlobe, per frame × 0.94)
    if (this.throwVelocity && !this.isDragging) {
      const v = this.throwVelocity;
      this.rotationBase = resetRevolutions(this.rotationBase + v.x * f);
      this.container.rotation.x = Math.max(MIN_ROTATION_X, Math.min(MAX_ROTATION_X, this.container.rotation.x + v.y * f));
      const k = Math.pow(THROW_DECAY, f);
      v.x *= k;
      v.y *= k;
      if (Math.abs(v.x) <= 0.001 && Math.abs(v.y) <= 0.001) this.throwVelocity = null;
    }
    // auto-rotation
    if (!this.isDragging && !this.isStatic && !this.cfg.pauseRotate) {
      this.rotationBase -= this.rotationIncrement * f;
      this.container.rotation.y = this.rotationBase;
    }
    // fill scale eases to targetScale (0.98 while dragging)
    if (Math.abs(this.scale - this.targetScale) > 0.001 && this.fill) {
      this.scale = this.targetScale + (this.scale - this.targetScale) * Math.pow(0.9, f);
      this.fill.scale.setScalar(this.scale);
    }
    // opacity
    this.targetOpacity = Math.max(0, this.targetOpacityBase);
    if (this.fillMaterial && Math.abs(this.targetOpacity - this.fillMaterial.opacity) > 0.001) {
      this.fillMaterial.opacity = this.targetOpacity;
      if (this.dotsMaterial) this.dotsMaterial.uniforms.u_opacity_factor.value = 1;
      this.lines.forEach((l) => l.setOpacity(this.targetOpacity));
    }
    // arcs (spawned on the reference's 1 s interval whether or not the dots are ready)
    if (!this.isStatic && this.linesContainer && !this.cfg.linesOff && this.playing && this.clock >= this.nextLineAt) {
      this.nextLineAt = this.clock + LINE_INTERVAL;
      this.drawLine();
    }
    this.updateLines();
    if (!this.dotsReady || !this.renderer) return;
    // dots
    if (this.dotsDragging) this.dragTime = this.clock - this.dragStart;
    else if (this.dragTime > 0.1) this.dragTime = Math.max(0, this.dragTime * Math.pow(0.9, f));
    if (this.dotsMaterial) {
      this.dotsMaterial.uniforms.u_drag_time.value = this.dragTime;
      this.dotsMaterial.uniforms.u_time.value = this.isStatic ? STATIC_DOTS_TIME : this.clock - this.dotsStart;
    }
    // reveal (reference revealAnimation: 0.005 per frame → 200 frames)
    if (!this.revealed) {
      const t = this.isStatic ? 1 : easeOutQuart(Math.min(this.revealProgress, 1), 0, 1, 1);
      this.revealProgress += REVEAL_STEP * f;
      this.targetOpacityBase = t * this.cfg.opacity;
      this.rotationIncrement = (1 - t) * ROTATION_START + ROTATION_END * t;
      if (t > 0.999) this.revealed = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private renderOnce() {
    if (this.renderer && this.dotsReady) this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    this.pause();
    window.clearTimeout(this.dragClassTimer);
    this.removeListeners();
    this.lines.forEach((l) => l.dispose());
    this.lines = [];
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.dragClassTarget.classList.remove("is-globe-dragging");
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
  }
}
