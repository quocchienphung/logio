// Hero globe renderer for /managed-payments: port of the reference "GradientNoiseGlobe" class (chunk
// 38639, class `eb`) configured as the page's HeroGlobe (uiVariant "flags", 90k dots, 3 arcs, no thin
// background arcs, glow on). Engine structure follows the homepage port of the same chunk
// (src/components/stripe/Solutions/graphics/globe/GlobeRenderer.ts, copied, not imported), extended
// with the flags variant, the glow plane, the dot-count override, the reference marker sprite and the
// reference's performance-governed render loop.
//
// Scene: a tilted (x -2deg, z +8deg) group, initial yaw 70deg, auto-rotating at 0.00115 rad per 60Hz
// frame (x1.25 while the Pacific faces the camera, eased 1% per frame). Inside: a depth-only occluder
// sphere (r 0.993R), a translucent gradient surface (r 0.9995R, 20% opacity) and 90k land dots (points,
// 3-stop screen gradient, back-face depth fade, 20% "corona" lift-off particles). A camera-facing
// atmosphere ring and a full-viewport glow blob sit behind. Arcs (fat lines, great-circle slerp lifted
// by a sine bump) connect a seller city to a buyer city; their end markers carry DOM flag badges.

import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { createGlobeRenderer } from "./capabilities";
import {
  ALLOWED_ROUTES,
  ARC_CONTROLLER,
  ARC_PALETTES,
  ARC_TIMING,
  BUYER_COUNTRY_SET,
  CITIES,
  COLORS,
  type City,
  FLAGS_CITY_NAMES,
  FLAGS_EXCLUDED_COUNTRIES,
  GLOBE,
  SELLER_COUNTRIES,
  SELLER_REGIONS,
  ease,
} from "./config";
import type { DotData } from "./dots";
import { loadDots } from "./loadDots";
import { RenderLoop } from "./renderLoop";
import { ATMOSPHERE_FRAG, ATMOSPHERE_VERT, DOTS_FRAG, DOTS_VERT, GLOW_FRAG, GLOW_VERT, SURFACE_FRAG, SURFACE_VERT } from "./shaders";

const { clamp, lerp, degToRad, smoothstep, randInt } = THREE.MathUtils;

interface LinePoolItem {
  line: Line2;
  geometry: LineGeometry;
  material: LineMaterial;
  inUse: boolean;
}

type MarkerMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
type FinalizeState = "idle" | "active" | "done";

interface VisibleRangeUserData {
  visibleRange: THREE.Vector2;
  totalSegments: number;
  shader?: { uniforms: Record<string, THREE.IUniform> };
}

interface ArcState {
  mesh: Line2;
  points: THREE.Vector3[];
  pointsItem: { points: THREE.Vector3[]; inUse: boolean };
  lineItem: LinePoolItem;
  startMarker: MarkerMesh;
  endMarker: MarkerMesh;
  markerScale: number;
  startTime: number;
  markerADuration: number;
  markerBDuration: number;
  lineDuration: number;
  segmentCount: number;
  lineProgress: number;
  finalizeState: FinalizeState;
  finalizeStartTime: number;
  /** "done" once finalization completes (the flags variant has no badge UI states). */
  uiDone: boolean;
  markerAOpacity: number;
  markerBOpacity: number;
  flagStart: HTMLElement | null;
  flagEnd: HTMLElement | null;
}

/** Fat-line patch: only instances whose index/total is inside visibleRange are drawn (reference `eA`). */
function applyVisibleRange(material: LineMaterial) {
  const data = material.userData as VisibleRangeUserData;
  data.visibleRange = new THREE.Vector2(0, 0);
  data.totalSegments = 1;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.u_visibleRange = { value: data.visibleRange };
    shader.uniforms.u_totalSegments = { value: data.totalSegments };
    data.shader = shader;
    const main = "void main() {";
    shader.vertexShader = `uniform vec2 u_visibleRange;\nuniform float u_totalSegments;\nvarying float v_instanceProgress;\n${shader.vertexShader}`.replace(
      main,
      `${main}\n  float instanceProg = float(gl_InstanceID) / max(u_totalSegments, 1.0);\n  v_instanceProgress = instanceProg;\n`,
    );
    shader.fragmentShader = `varying float v_instanceProgress;\nuniform vec2 u_visibleRange;\n${shader.fragmentShader}`.replace(
      main,
      `${main}\n  if (v_instanceProgress < u_visibleRange.x || v_instanceProgress > u_visibleRange.y) {\n    discard;\n  }\n`,
    );
  };
}

function setSegments(material: LineMaterial, count: number) {
  const data = material.userData as VisibleRangeUserData;
  data.totalSegments = count;
  const u = data.shader?.uniforms?.u_totalSegments;
  if (u) u.value = count;
}

const touchDevice = () => window.matchMedia("(pointer: coarse)").matches && "ontouchstart" in window;

export interface GlobeOptions {
  /** The ten `.globe__flag-overlay` elements. */
  flagPool: HTMLElement[];
  /** Fills a flag element with a country's flag. */
  renderFlagContent: (el: HTMLElement, country: string) => void;
  imageUrl: string;
  dotCount: number;
  arcsMaxActive: number;
  surfaceOpacity: number;
  glow: boolean;
}

export class GlobeRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(25, 1, 0.1, 1000);
  private dpr = 1;
  private readonly radius = 2;
  private dotsStartTime = 0;
  private flagPool: HTMLElement[];
  private renderFlagContent: (el: HTMLElement, country: string) => void;
  private activeArcs: ArcState[] = [];

  // Arc controller
  private arcControllerMaxActive: number;
  private arcControllerNextSpawnTime = 0;
  private lastArcPairKey: string | null = null;
  private currentRotationSpeedY = 0.00115;
  private readonly rotationSpeedY = 0.00115;

  // Dots (reference defaults)
  private dotSize: number = GLOBE.DOT_SIZE_DESKTOP;
  private readonly dotOpacity = 0.6;
  private readonly dotGradientStops = [0.024, 0.3794, 0.7941];
  private readonly dotGradientAngle = 225;
  private readonly dotDepthFade = { front: 0.25, back: -0.1, min: 0.15, curve: 2 };
  private readonly corona = { participation: 0.2, distance: 0.6, launchRate: 0.15, travelSpeed: 0.35, opacityDrop: 0.5, noiseStrength: 0.42, noiseScale: 0.75 };

  // Surface / atmosphere / glow (reference defaults; colours mono)
  private readonly surface = { clockAngle: 215, depth: -0.1, contrast: 2, offset: -0.4, fresnelStrength: 0.1, fresnelPower: 0.3 };
  private surfaceOpacity: number;
  private readonly atmosphere = { intensity: 0.08, opacity: 0.35, falloff: 0.4, radius: 1.02 };
  private glowEnabled: boolean;
  private readonly glow = { opacity: 1, center: new THREE.Vector2(0.5, 0.5), radius: new THREE.Vector2(0.48, 0.48) };

  // Loop state
  private loop: RenderLoop | null = null;
  private renderEvery = 2;
  private frameIndex = 0;
  private _paused = false;
  private pauseStartTime: number | null = null;
  private initialized = false;
  private loaded = false;
  private disposed = false;
  private onLoadCallback: (() => void) | null = null;
  private lastRender: number | null = null;
  private dotsPromise: Promise<DotData>;

  // Scene objects
  private globeGroup!: THREE.Group;
  private arcsGroup!: THREE.Group;
  private dotsGroup!: THREE.Group;
  private backgroundSphere?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private surfaceMesh?: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private atmosphereMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private glowMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private dotsMaterial?: THREE.ShaderMaterial;

  // Scratch
  private vA = new THREE.Vector3();
  private vB = new THREE.Vector3();
  private vC = new THREE.Vector3();
  private vD = new THREE.Vector3();
  private vE = new THREE.Vector3();
  private vF = new THREE.Vector3();
  private vG = new THREE.Vector3();
  private vH = new THREE.Vector3();
  private vI = new THREE.Vector3();
  private vJ = new THREE.Vector3();
  private factors = new THREE.Vector2();
  private proj = { x: 0, y: 0, depthFade: 0, isBehindGlobe: false, isOffscreen: false };
  private quat = new THREE.Quaternion();
  private colorA = new THREE.Color();
  private colorB = new THREE.Color();
  private colorT = new THREE.Color();
  private candidateCityIndices: number[];
  private cityVectors: THREE.Vector3[] = [];
  private visibleCache: number[] = [];
  private markerTextures = new Map<number, THREE.CanvasTexture>();
  private markerGeometry = new THREE.PlaneGeometry(0.4, 0.4);
  private cachedWidth = 0;
  private cachedHeight = 0;

  // Pools (reference sizes)
  private readonly ARC_LINE_POOL_SIZE = 10;
  private readonly ARC_MAX_SEGMENTS = 256;
  private readonly MARKER_POOL_SIZE = 20;
  private linePool: LinePoolItem[] = [];
  private markerPool: { mesh: MarkerMesh; inUse: boolean }[] = [];
  private pointsPool: { points: THREE.Vector3[]; inUse: boolean }[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    opts: GlobeOptions,
  ) {
    this.renderer = createGlobeRenderer(canvas);
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.setPixelRatio(this.dpr);
    this.flagPool = opts.flagPool;
    this.renderFlagContent = opts.renderFlagContent;
    this.arcControllerMaxActive = opts.arcsMaxActive;
    this.surfaceOpacity = opts.surfaceOpacity;
    this.glowEnabled = opts.glow;
    const touch = touchDevice();
    this.dotSize = touch ? GLOBE.DOT_SIZE_MOBILE : GLOBE.DOT_SIZE_DESKTOP;
    this.candidateCityIndices = FLAGS_CITY_NAMES.map((n) => CITIES.findIndex((c) => c.name === n)).filter(
      (i) => i !== -1 && !FLAGS_EXCLUDED_COUNTRIES.includes(CITIES[i].country),
    );
    // resolveDotCount(): an explicit count is halved (30k/60k ratio) on touch devices.
    const count = touch ? Math.round(opts.dotCount * (GLOBE.DOT_COUNT_MAX_MOBILE / GLOBE.DOT_COUNT_MAX_DESKTOP)) : opts.dotCount;
    this.dotsPromise = loadDots(opts.imageUrl, count);
  }

  // ------------------------------------------------------------------------------------ pools

  private acquireLine(): LinePoolItem | null {
    if (!this.linePool.length) {
      for (let i = 0; i < this.ARC_LINE_POOL_SIZE; i += 1) {
        const geometry = new LineGeometry();
        geometry.setPositions(new Float32Array(3 * (this.ARC_MAX_SEGMENTS + 1)));
        geometry.setColors(new Float32Array(3 * (this.ARC_MAX_SEGMENTS + 1)));
        const material = new LineMaterial({ transparent: true, depthTest: true, depthWrite: true, linewidth: 0.007, vertexColors: true });
        material.resolution.set(this.cachedWidth || this.canvas.clientWidth, this.cachedHeight || this.canvas.clientHeight);
        material.worldUnits = true;
        material.opacity = 0;
        applyVisibleRange(material);
        const line = new Line2(geometry, material);
        line.computeLineDistances();
        line.renderOrder = 10;
        line.visible = false;
        geometry.instanceCount = 0;
        this.linePool.push({ line, geometry, material, inUse: false });
      }
    }
    const item = this.linePool.find((p) => !p.inUse);
    if (!item) return null;
    item.inUse = true;
    if (!item.line.parent) this.arcsGroup.add(item.line);
    return item;
  }

  private releaseLine(item: LinePoolItem) {
    item.inUse = false;
    item.line.visible = false;
    item.material.opacity = 0;
    item.geometry.instanceCount = 0;
    (item.material.userData as VisibleRangeUserData).visibleRange.set(0, 0);
    setSegments(item.material, 1);
  }

  private acquirePoints() {
    if (!this.pointsPool.length) {
      for (let i = 0; i < this.ARC_LINE_POOL_SIZE; i += 1) {
        this.pointsPool.push({ points: Array.from({ length: this.ARC_MAX_SEGMENTS + 1 }, () => new THREE.Vector3()), inUse: false });
      }
    }
    const item = this.pointsPool.find((p) => !p.inUse);
    if (item) item.inUse = true;
    return item ?? null;
  }

  /** 128px sprite: 25% halo disc, solid ring (r 38.4 -> 25.6) in the arc colour, white core (reference). */
  private markerTexture(color: number) {
    const cached = this.markerTextures.get(color);
    if (cached) return cached;
    const scale = Math.min(Math.ceil(window.devicePixelRatio || 1), 2);
    const c = new THREE.Color(color);
    const rgba = (a: number) => `rgba(${Math.floor(255 * c.r)},${Math.floor(255 * c.g)},${Math.floor(255 * c.b)},${a})`;
    const canvas = document.createElement("canvas");
    canvas.width = 128 * scale;
    canvas.height = 128 * scale;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); // CPU-backed: uploaded to WebGL once
    if (ctx) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = rgba(0.25);
      ctx.beginPath();
      ctx.arc(64, 64, 64, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = rgba(1);
      ctx.beginPath();
      ctx.arc(64, 64, 38.4, 0, 2 * Math.PI);
      ctx.arc(64, 64, 25.6, 0, 2 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,1.0)";
      ctx.beginPath();
      ctx.arc(64, 64, 25.6, 0, 2 * Math.PI);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.markerTextures.set(color, texture);
    return texture;
  }

  private acquireMarker(color: number): MarkerMesh | null {
    if (!this.markerPool.length) {
      for (let i = 0; i < this.MARKER_POOL_SIZE; i += 1) {
        const mesh = new THREE.Mesh(this.markerGeometry, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: true }));
        mesh.visible = false;
        this.markerPool.push({ mesh, inUse: false });
      }
    }
    const item = this.markerPool.find((p) => !p.inUse);
    if (!item) return null;
    item.inUse = true;
    item.mesh.material.map = this.markerTexture(color);
    item.mesh.material.needsUpdate = true;
    if (!item.mesh.parent) this.arcsGroup.add(item.mesh);
    return item.mesh;
  }

  private releaseMarker(mesh: MarkerMesh) {
    const item = this.markerPool.find((p) => p.mesh === mesh);
    if (item) {
      item.inUse = false;
      item.mesh.visible = false;
    }
  }

  // ------------------------------------------------------------------------------- geography

  private cityToVector(city: City, out: THREE.Vector3, r = this.radius) {
    return out.set(city.ux * r, city.uy * r, city.uz * r);
  }

  private distanceKm(a: City, b: City) {
    const la1 = degToRad(a.lat);
    const lo1 = degToRad(a.lon);
    const la2 = degToRad(b.lat);
    const lo2 = degToRad(b.lon);
    const h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 6371;
  }

  /** Cities facing the camera (dot >= 0.25) and left of the right-edge exclusion band (NDC x < 0.4). */
  private visibleCityIndices() {
    this.visibleCache.length = 0;
    if (!this.globeGroup) return this.visibleCache;
    const centre = this.globeGroup.getWorldPosition(this.vA);
    const toCamera = this.vB.copy(this.camera.position).sub(centre).normalize();
    const matrix = this.arcsGroup?.matrixWorld ?? this.globeGroup.matrixWorld;
    const rightLimit = 1 - 2 * ARC_CONTROLLER.RIGHT_EDGE_EXCLUSION_RATIO;
    for (let i = 0; i < this.cityVectors.length; i += 1) {
      const world = this.vD.copy(this.cityVectors[i]).applyMatrix4(matrix);
      const dir = this.vC.copy(world).sub(centre);
      if (dir.lengthSq() <= 1e-6) continue;
      dir.normalize();
      if (dir.dot(toCamera) >= ARC_CONTROLLER.VISIBLE_CITY_DOT_THRESHOLD && this.vE.copy(world).project(this.camera).x < rightLimit) {
        this.visibleCache.push(i);
      }
    }
    return this.visibleCache;
  }

  private project(world: THREE.Vector3, centre: THREE.Vector3, toCamera: THREE.Vector3, w: number, h: number) {
    const ndc = this.vE.copy(world).project(this.camera);
    const facing = this.vF.copy(world).sub(centre).normalize().dot(toCamera);
    this.proj.x = (0.5 * ndc.x + 0.5) * w;
    this.proj.y = (-(0.5 * ndc.y) + 0.5) * h;
    this.proj.isOffscreen = ndc.x < -1.1 || ndc.x > 1.1 || ndc.y < -1.1 || ndc.y > 1.1;
    this.proj.isBehindGlobe = facing < GLOBE.ARC_UI_HIDE_DOT_THRESHOLD;
    this.proj.depthFade = facing <= -0.1 ? smoothstep(facing, -0.35, -0.1) : 1;
    return this.proj;
  }

  // ------------------------------------------------------------------------------ flag badges

  private acquireFlag(country: string) {
    const el = this.flagPool.find((f) => !this.activeArcs.some((a) => a.flagStart === f || a.flagEnd === f)) ?? null;
    if (el) this.renderFlagContent(el, country);
    return el;
  }

  private placeFlag(el: HTMLElement, local: THREE.Vector3, centre: THREE.Vector3, toCamera: THREE.Vector3, w: number, h: number, opacity: number) {
    if (opacity <= 0.001) {
      el.style.display = "none";
      return;
    }
    const world = this.vD.copy(local).applyMatrix4(this.arcsGroup.matrixWorld);
    const p = this.project(world, centre, toCamera, w, h);
    if (p.isOffscreen || p.isBehindGlobe) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.style.setProperty("--ui-x", `${p.x.toFixed(2)}px`);
    el.style.setProperty("--ui-y", `${p.y.toFixed(2)}px`);
    el.style.setProperty("--ui-opacity", (opacity * p.depthFade).toFixed(3));
  }

  // ------------------------------------------------------------------------------------ arcs

  private updateArcs(now: number) {
    const centre = this.globeGroup.getWorldPosition(this.vA);
    const toCamera = this.vC.copy(this.camera.position).sub(centre).normalize();
    const w = this.cachedWidth;
    const h = this.cachedHeight;
    for (let i = this.activeArcs.length - 1; i >= 0; i -= 1) {
      const arc = this.activeArcs[i];
      this.animateArc(arc, now);
      // Flags variant: an arc starts retreating as soon as it has finished drawing.
      if (arc.lineProgress >= 0.999 && arc.finalizeState === "idle") {
        arc.finalizeState = "active";
        arc.finalizeStartTime = now;
      }
      if (w > 0 && h > 0) {
        const ui = arc.uiDone ? 0 : 1;
        if (arc.flagStart) this.placeFlag(arc.flagStart, arc.startMarker.position, centre, toCamera, w, h, arc.markerAOpacity * ui);
        if (arc.flagEnd) this.placeFlag(arc.flagEnd, arc.endMarker.position, centre, toCamera, w, h, arc.markerBOpacity * ui);
      }
      if (arc.finalizeState === "done" && arc.uiDone) {
        this.disposeArc(arc);
        this.activeArcs.splice(i, 1);
      }
    }
  }

  /** x = marker visibility, y = line retreat (visible range start). */
  private finalizeFactors(arc: ArcState, now: number) {
    if (arc.finalizeState === "done") return this.factors.set(0, 1);
    if (arc.finalizeState !== "active") return this.factors.set(1, 0);
    const elapsed = Math.max(0, now - arc.finalizeStartTime);
    const retreatMs = Math.max(100, ARC_TIMING.lineRetreat.durationMs);
    const retreat = ease(clamp(elapsed / retreatMs, 0, 1), ARC_TIMING.lineRetreat.easing);
    const fadeMs = Math.max(50, ARC_TIMING.markerFade.durationMs);
    const fade = ease(clamp(Math.max(0, elapsed - 0.8 * retreatMs) / fadeMs, 0, 1), ARC_TIMING.markerFade.easing);
    if (retreat >= 1 && fade >= 1) arc.finalizeState = "done";
    return this.factors.set(Math.max(0, 1 - fade), clamp(retreat, 0, 1));
  }

  private animateArc(arc: ArcState, now: number) {
    const elapsed = Math.max(0, now - arc.startTime);
    const { x: markerFactor, y: retreat } = this.finalizeFactors(arc, now);
    const lineT = arc.lineDuration <= 0 ? 1 : clamp(Math.max(0, elapsed - arc.markerADuration - arc.markerBDuration) / arc.lineDuration, 0, 1);
    const a = ease(arc.markerADuration <= 0 ? 1 : Math.min(1, elapsed / arc.markerADuration), ARC_TIMING.markerA.easing);
    arc.startMarker.material.opacity = a * markerFactor;
    arc.markerAOpacity = a * markerFactor;
    arc.startMarker.scale.setScalar(Math.max(1e-4, arc.markerScale * a * markerFactor));
    const b =
      elapsed >= arc.markerADuration
        ? ease(arc.markerBDuration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed - arc.markerADuration) / arc.markerBDuration), ARC_TIMING.markerB.easing)
        : 0;
    arc.endMarker.material.opacity = b * markerFactor;
    arc.markerBOpacity = b * markerFactor;
    arc.endMarker.scale.setScalar(Math.max(1e-4, arc.markerScale * b * markerFactor));

    const material = arc.mesh.material as LineMaterial;
    const visibleEnd = ease(lineT, ARC_TIMING.line.easing);
    const visibleStart = arc.finalizeState !== "idle" ? retreat : 0;
    (material.userData as VisibleRangeUserData).visibleRange.set(visibleStart, visibleEnd);
    setSegments(material, arc.segmentCount);
    if (arc.lineItem.geometry.instanceCount !== arc.segmentCount) arc.lineItem.geometry.instanceCount = arc.segmentCount;
    if (retreat > 1e-4 && arc.lineProgress >= 0.999 && arc.finalizeState !== "idle") {
      const remaining = Math.max(0, 1 - retreat);
      const hide = visibleStart >= visibleEnd || remaining <= 0.001;
      arc.mesh.visible = !hide;
      material.opacity = hide ? 0 : remaining;
    } else if (lineT <= 0) {
      arc.mesh.visible = false;
      material.opacity = 0;
    } else {
      arc.mesh.visible = true;
      material.opacity = visibleEnd;
    }
    arc.lineProgress = lineT;
    // Flags variant UI state: stays "idle" (opacity 0) until finalization is done.
    if (arc.finalizeState === "done") arc.uiDone = true;
  }

  private disposeArc(arc: ArcState) {
    this.releaseLine(arc.lineItem);
    arc.pointsItem.inUse = false;
    this.releaseMarker(arc.startMarker);
    this.releaseMarker(arc.endMarker);
    if (arc.flagStart) arc.flagStart.style.display = "none";
    if (arc.flagEnd) arc.flagEnd.style.display = "none";
  }

  private updateArcController(now: number) {
    if (CITIES.length < 2) return;
    if (this.arcControllerNextSpawnTime === 0) this.arcControllerNextSpawnTime = now;
    if (now < this.arcControllerNextSpawnTime) return;
    if (this.activeArcs.length >= this.arcControllerMaxActive) {
      this.arcControllerNextSpawnTime = now + 250;
      return;
    }
    let spawned = false;
    for (let i = 0; i < 2 && !spawned; i += 1) spawned = this.spawnArc(now);
    if (spawned) {
      // scheduleNextArcSpawn: uniform integer in [1500, 4000] ms, at least 100ms.
      this.arcControllerNextSpawnTime = now + Math.max(100, randInt(ARC_CONTROLLER.MIN_SPAWN_INTERVAL_MS, ARC_CONTROLLER.MAX_SPAWN_INTERVAL_MS));
    } else {
      this.arcControllerNextSpawnTime = now + 200;
    }
  }

  private spawnArc(now: number) {
    const pair = this.pickCityPair();
    if (!pair) return false;
    const palette = ARC_PALETTES[Math.floor(Math.random() * ARC_PALETTES.length)];
    const arc = this.drawArc(pair.from, pair.to, palette.start, palette.end, now);
    if (arc) this.animateArc(arc, now);
    return !!arc;
  }

  /** Rejects a pair whose midpoint lands within 80px of a live arc's midpoint (or 56px of its markers). */
  private checkSpawnDistance(from: City, to: City) {
    if (!this.activeArcs.length) return true;
    const min = ARC_CONTROLLER.MIN_UI_SCREEN_DISTANCE;
    const mid = this.vC.copy(this.cityToVector(from, this.vA)).lerp(this.cityToVector(to, this.vB), 0.5).normalize();
    mid.multiplyScalar(1.1 * this.radius).applyMatrix4(this.arcsGroup.matrixWorld);
    const ndc = this.vD.copy(mid).project(this.camera);
    const w = this.cachedWidth;
    const h = this.cachedHeight;
    if (!w || !h) return true;
    if (ndc.z > 1 || ndc.x < -1.2 || ndc.x > 1.2 || ndc.y < -1.2 || ndc.y > 1.2) return true;
    const sx = (0.5 * ndc.x + 0.5) * w;
    const sy = (-(0.5 * ndc.y) + 0.5) * h;
    for (const arc of this.activeArcs) {
      // The flags variant never leaves the "idle" UI state, so every live arc is checked; it has no
      // badge position (uiLastX/Y), only its two markers.
      if (arc.uiDone) continue;
      const markerMin = 0.7 * min;
      for (const m of [arc.startMarker, arc.endMarker]) {
        const p = this.vG.copy(m.position).applyMatrix4(this.arcsGroup.matrixWorld).project(this.camera);
        const dx = sx - (0.5 * p.x + 0.5) * w;
        const dy = sy - (-(0.5 * p.y) + 0.5) * h;
        if (Math.hypot(dx, dy) < markerMin) return false;
      }
    }
    return true;
  }

  /** Flags variant of pickRandomCityPair: seller city (by region) -> buyer city in another country. */
  private pickCityPair(): { from: City; to: City } | null {
    const candidates = this.candidateCityIndices;
    const n = candidates.length;
    if (n < 2) return null;
    const minKm = Math.max(0, ARC_CONTROLLER.FLAGS_CITY_MIN_DISTANCE_KM);
    const attempts = Math.max(20, 4 * n);
    const visible = this.visibleCityIndices().slice();
    const visibleSet = new Set(visible);
    const sellers = candidates.filter((i) => SELLER_COUNTRIES.has(CITIES[i].country));
    const buyers = candidates.filter((i) => BUYER_COUNTRY_SET.has(CITIES[i].country));
    const fromPool = visible.length > 0 ? sellers.filter((i) => visibleSet.has(i)) : sellers;
    const toPool = visible.length > 0 ? buyers.filter((i) => visibleSet.has(i)) : buyers;
    if (!fromPool.length || !toPool.length) return null;
    // Group sellers by region so each region is equally likely.
    const regionKeys = Object.keys(SELLER_REGIONS);
    const byRegion = new Map<string, number[]>();
    for (const i of fromPool) {
      const region = regionKeys.find((k) => SELLER_REGIONS[k].includes(CITIES[i].country));
      if (region) byRegion.set(region, [...(byRegion.get(region) ?? []), i]);
    }
    const groups = [...byRegion.values()];
    const destinations = new Map<string, number[]>();
    for (const c of SELLER_COUNTRIES) destinations.set(c, toPool.filter((t) => CITIES[t].country !== c && ALLOWED_ROUTES.has(`${c}->${CITIES[t].country}`)));
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    let best: { from: City; to: City } | null = null;
    let bestKm = -Infinity;
    let bestValid = false;
    let rejected = 0;
    for (let k = 0; k < attempts; k += 1) {
      const ia = groups.length ? pick(pick(groups)) : pick(fromPool);
      const pool = destinations.get(CITIES[ia]?.country) ?? toPool;
      let ib = pick(pool);
      let tries = 0;
      while (ib === ia && tries < pool.length + 5) {
        ib = pick(pool);
        tries += 1;
      }
      if (ib === ia) continue;
      const from = CITIES[ia];
      const to = CITIES[ib];
      if (!from || !to || from === to) continue;
      const key = `${from.name}-${to.name}`;
      if (key === this.lastArcPairKey && n > 2) continue;
      const km = this.distanceKm(from, to);
      if (this.checkSpawnDistance(from, to)) {
        if (km > bestKm || !bestValid) {
          bestKm = km;
          best = { from, to };
          bestValid = true;
        }
        if (km >= minKm) {
          this.lastArcPairKey = key;
          return { from, to };
        }
      } else {
        rejected += 1;
        if (!bestValid && km > bestKm) {
          bestKm = km;
          best = { from, to };
        }
      }
      if (rejected >= ARC_CONTROLLER.MAX_SPAWN_DISTANCE_ATTEMPTS && !bestValid && best && km >= minKm) {
        this.lastArcPairKey = key;
        return { from, to };
      }
    }
    if (!best) return null;
    const vis = this.visibleCityIndices();
    if (!vis.includes(CITIES.indexOf(best.from)) || !vis.includes(CITIES.indexOf(best.to))) return null;
    this.lastArcPairKey = `${best.from.name}-${best.to.name}`;
    return best;
  }

  private drawArc(from: City, to: City, colorStart: number, colorEnd: number, now: number): ArcState | null {
    const p0 = this.cityToVector(from, new THREE.Vector3());
    const p3 = this.cityToVector(to, new THREE.Vector3());
    const u0 = this.vA.copy(p0).normalize();
    const u3 = this.vB.copy(p3).normalize();
    const chord = this.vC.copy(p3).sub(p0);
    const tanStart = this.vD.copy(chord).addScaledVector(u0, -chord.dot(u0)).normalize();
    const tanEnd = this.vE.copy(chord).addScaledVector(u3, -chord.dot(u3)).normalize();
    // The line starts/ends 0.02 along the chord tangent, slightly inside the markers.
    const start = this.vF.copy(p0).addScaledVector(tanStart, GLOBE.MARKER_TANGENT_OFFSET).normalize().multiplyScalar(this.radius);
    const end = this.vG.copy(p3).addScaledVector(tanEnd, -GLOBE.MARKER_TANGENT_OFFSET).normalize().multiplyScalar(this.radius);
    const a = this.vH.copy(start).normalize();
    const b = this.vI.copy(end).normalize();
    const omega = Math.acos(clamp(a.dot(b), -1, 1));
    const shaped = clamp(omega / Math.PI, 0, 1) ** clamp(ARC_CONTROLLER.PEAK_ANGLE_POWER, 0.01, 5);
    const minH = Math.max(0.01, ARC_CONTROLLER.PEAK_MIN_HEIGHT);
    const peak = lerp(minH, Math.max(minH, ARC_CONTROLLER.PEAK_MAX_HEIGHT), shaped) * this.radius;
    const sinOmega = Math.sin(omega);
    const pointsItem = this.acquirePoints();
    if (!pointsItem) return null;
    const { points } = pointsItem;
    const segs = this.ARC_MAX_SEGMENTS;
    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      const dir = this.vJ;
      if (sinOmega > 1e-6) dir.copy(a).multiplyScalar(Math.sin((1 - t) * omega) / sinOmega).addScaledVector(b, Math.sin(t * omega) / sinOmega).normalize();
      else dir.copy(a).lerp(b, t).normalize();
      const lift = Math.sin(Math.PI * t) * peak;
      points[i].set(dir.x * (this.radius + lift), dir.y * (this.radius + lift), dir.z * (this.radius + lift));
    }
    const positions: number[] = [];
    const colors: number[] = [];
    const ca = this.colorA.setHex(colorStart);
    const cb = this.colorB.setHex(colorEnd);
    for (let i = 0; i < points.length; i += 1) {
      positions.push(points[i].x, points[i].y, points[i].z);
      this.colorT.copy(ca).lerp(cb, i / Math.max(1, points.length - 1));
      colors.push(this.colorT.r, this.colorT.g, this.colorT.b);
    }
    const lineItem = this.acquireLine();
    if (!lineItem) {
      pointsItem.inUse = false;
      return null;
    }
    const { line, geometry, material } = lineItem;
    geometry.setPositions(positions);
    geometry.setColors(colors);
    material.resolution.set(this.cachedWidth || this.canvas.clientWidth, this.cachedHeight || this.canvas.clientHeight);
    material.opacity = 0;
    line.computeLineDistances();
    const segmentCount = Math.max(1, points.length - 1);
    geometry.instanceCount = segmentCount;
    line.visible = false;
    (material.userData as VisibleRangeUserData).visibleRange.set(0, 0);
    setSegments(material, segmentCount);

    const startMarker = this.acquireMarker(colorStart);
    const endMarker = this.acquireMarker(colorEnd);
    if (!startMarker || !endMarker) {
      this.releaseLine(lineItem);
      pointsItem.inUse = false;
      if (startMarker) this.releaseMarker(startMarker);
      if (endMarker) this.releaseMarker(endMarker);
      return null;
    }
    for (const [m, p] of [
      [startMarker, p0],
      [endMarker, p3],
    ] as const) {
      m.position.copy(p);
      m.scale.setScalar(0.02);
      m.visible = true;
      this.quat.setFromUnitVectors(this.vJ.set(0, 0, 1), this.vA.copy(p).normalize());
      m.quaternion.copy(this.quat);
      m.material.opacity = 0;
      m.material.transparent = true;
    }
    const km = this.distanceKm(from, to);
    const S = ARC_TIMING.lineDistanceScale;
    const arc: ArcState = {
      mesh: line,
      points,
      pointsItem,
      lineItem,
      startMarker,
      endMarker,
      markerScale: 0.2,
      startTime: now,
      markerADuration: ARC_TIMING.markerA.durationMs,
      markerBDuration: ARC_TIMING.markerB.durationMs,
      lineDuration: clamp(S.baseDurationMs * (km / S.referenceKm), S.min, S.max),
      segmentCount,
      lineProgress: 0,
      finalizeState: "idle",
      finalizeStartTime: 0,
      uiDone: false,
      markerAOpacity: 0,
      markerBOpacity: 0,
      flagStart: null,
      flagEnd: null,
    };
    this.activeArcs.push(arc);
    arc.flagStart = this.acquireFlag(from.country);
    arc.flagEnd = this.acquireFlag(to.country);
    return arc;
  }

  // ----------------------------------------------------------------------------------- scene

  /** Builds the scene and starts the frame loop (it idles until the dots arrive). */
  initScene() {
    if (this.initialized) return;
    this.initialized = true;
    const w = this.cachedWidth || this.canvas.clientWidth;
    const h = this.cachedHeight || this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h || 1;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 0, touchDevice() ? GLOBE.CAMERA_Z_MOBILE : GLOBE.CAMERA_Z_DESKTOP);
    this.camera.lookAt(0, 0, 0);
    this.createGlobe();
    this.loop = new RenderLoop(() => {
      // WebGL renders every `renderEvery` frames (2, raised by performance warnings); the arc/flag
      // state machine runs every frame.
      if (this.frameIndex % this.renderEvery === 0) this.animate();
      this.updateUI();
      this.frameIndex += 1;
    });
    this.loop.onPerformanceWarning = (level) => {
      this.renderEvery = Math.max(level + 1, this.renderEvery);
    };
    this.loop.onPerformanceRecovered = (level) => {
      this.renderEvery = Math.max(level + 1, 2);
    };
    this.loop.start();
  }

  private animate() {
    if (this._paused || !this.loaded) return;
    const now = performance.now();
    if (this.lastRender === null) this.lastRender = now;
    const dt = Math.min((now - this.lastRender) / 1000, 0.05);
    this.lastRender = now;
    this.updateAndRender(dt);
  }

  private updateUI() {
    if (this._paused || !this.loaded) return;
    const now = performance.now();
    this.updateArcs(now);
    this.updateArcController(now);
  }

  private createGlobe() {
    this.globeGroup = new THREE.Group();
    this.globeGroup.rotation.set(degToRad(-2), degToRad(70), degToRad(8));
    this.scene.add(this.globeGroup);

    // Depth-only occluder: hides back-side arcs, markers and the glow behind the globe disc.
    this.backgroundSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.993 * this.radius, 64, 64),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.FrontSide, depthWrite: true, colorWrite: false }),
    );
    this.backgroundSphere.renderOrder = -1;
    this.globeGroup.add(this.backgroundSphere);

    const halo = 6 * this.radius;
    this.atmosphereMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(halo, halo, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          u_color: { value: new THREE.Color(COLORS.atmosphere) },
          u_intensity: { value: this.atmosphere.intensity },
          u_opacity: { value: this.atmosphere.opacity },
          u_innerRadius: { value: this.radius },
          u_outerRadius: { value: this.radius * this.atmosphere.radius },
          u_outerFade: { value: Math.max(0.01, this.atmosphere.falloff) * this.radius },
        },
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        blending: THREE.NormalBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    this.atmosphereMesh.frustumCulled = false;
    this.atmosphereMesh.renderOrder = -4;
    this.scene.add(this.atmosphereMesh);

    if (this.glowEnabled) {
      this.glowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1, 1, 1),
        new THREE.ShaderMaterial({
          uniforms: {
            u_colorA: { value: new THREE.Color(COLORS.glowA) },
            u_colorB: { value: new THREE.Color(COLORS.glowB) },
            u_center: { value: this.glow.center.clone() },
            u_radius: { value: this.glow.radius.clone() },
            u_opacity: { value: this.glow.opacity },
          },
          vertexShader: GLOW_VERT,
          fragmentShader: GLOW_FRAG,
          blending: THREE.NormalBlending,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          side: THREE.DoubleSide,
        }),
      );
      this.glowMesh.frustumCulled = false;
      this.glowMesh.renderOrder = -0.5;
      this.scene.add(this.glowMesh);
      this.updateGlowPlaneSize();
    }

    this.surfaceMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.9995 * this.radius, 128, 128),
      new THREE.ShaderMaterial({
        uniforms: {
          u_colorA: { value: new THREE.Color(COLORS.surfaceA) },
          u_colorB: { value: new THREE.Color(COLORS.surfaceB) },
          u_fresnelColor: { value: new THREE.Color(COLORS.fresnel) },
          u_fresnelStrength: { value: this.surface.fresnelStrength },
          u_fresnelPower: { value: this.surface.fresnelPower },
          u_opacity: { value: this.surfaceOpacity },
          u_gradientDir: { value: new THREE.Vector3(1, 0, 0) },
          u_gradientContrast: { value: this.surface.contrast },
          u_gradientOffset: { value: this.surface.offset },
          u_cameraPosition: { value: this.camera.position.clone() },
          u_cameraRight: { value: new THREE.Vector3(1, 0, 0) },
          u_cameraUp: { value: new THREE.Vector3(0, 1, 0) },
          u_cameraForward: { value: new THREE.Vector3(0, 0, -1) },
        },
        vertexShader: SURFACE_VERT,
        fragmentShader: SURFACE_FRAG,
        transparent: true,
        depthWrite: true,
        depthTest: true,
      }),
    );
    this.surfaceMesh.renderOrder = -0.5;
    this.globeGroup.add(this.surfaceMesh);
    this.updateCameraUniforms();

    // City vectors / dots are authored in a frame rotated by pi about X and Z.
    this.arcsGroup = new THREE.Group();
    this.arcsGroup.rotation.set(-Math.PI, 0, -Math.PI);
    this.globeGroup.add(this.arcsGroup);
    this.dotsGroup = new THREE.Group();
    this.dotsGroup.rotation.set(-Math.PI, 0, -Math.PI);
    this.globeGroup.add(this.dotsGroup);
    this.cityVectors = CITIES.map((c) => new THREE.Vector3(c.ux, c.uy, c.uz).multiplyScalar(this.radius));
    this.globeGroup.updateMatrixWorld(true);

    this.dotsPromise
      .then((dots) => {
        if (this.disposed) return;
        this.applyDots(dots);
        this.loaded = true;
        this.onLoadCallback?.();
        this.onLoadCallback = null;
        if (this._paused) this.updateAndRender(0);
      })
      .catch(() => {
        /* the canvas stays white; the lazy wrapper never reveals it */
      });
  }

  private applyDots(dots: DotData) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(dots.positions, 3));
    g.setAttribute("rndId", new THREE.Float32BufferAttribute(dots.rndIds, 1));
    g.setAttribute("sizeVariation", new THREE.Float32BufferAttribute(dots.sizeVariations, 1));
    g.setAttribute("opacityVariation", new THREE.Float32BufferAttribute(dots.opacityVariations, 1));
    g.setAttribute("coronaSeed", new THREE.Float32BufferAttribute(dots.coronaSeeds, 1));
    g.setAttribute("varianceRate", new THREE.Float32BufferAttribute(dots.varianceRates, 1));
    g.setAttribute("varianceMotion", new THREE.Float32BufferAttribute(dots.varianceMotions, 1));
    g.setAttribute("coronaCanParticipate", new THREE.Float32BufferAttribute(dots.coronaCanParticipate, 1));
    const c = this.corona;
    const speed = Math.max(0.1, c.travelSpeed);
    this.dotsMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        u_timeSec: { value: 0 },
        u_radius: { value: this.radius },
        u_dotSize: { value: 0.01 * this.dotSize },
        u_opacity_factor: { value: this.dotOpacity },
        u_coronaBurstDistance: { value: c.distance },
        u_coronaParticipation: { value: c.participation },
        u_coronaOpacityDrop: { value: c.opacityDrop },
        u_coronaNoiseStrength: { value: c.noiseStrength },
        u_coronaNoiseScale: { value: c.noiseScale },
        u_coronaBaseFlightDur: { value: Math.min(20, Math.max(0.3, 3.1 / speed)) },
        u_coronaBaseFadeDur: { value: Math.min(20, Math.max(0.05, 0.6 / speed)) },
        u_coronaLaunchInterval: { value: Math.max(0.45, 1 / Math.max(c.launchRate, 0.001)) },
        u_canvasHeight: { value: this.cachedHeight || this.canvas.clientHeight },
        u_pixelRatio: { value: this.dpr },
        u_depthFadeEnabled: { value: 1 },
        u_depthFadeFront: { value: this.dotDepthFade.front },
        u_depthFadeBack: { value: this.dotDepthFade.back },
        u_depthFadeMin: { value: this.dotDepthFade.min },
        u_depthFadeCurve: { value: Math.max(0.01, this.dotDepthFade.curve) },
        u_gradientAngle: { value: this.dotGradientAngle },
        u_gradientScale: { value: new THREE.Vector2(1, 1) },
        u_cameraRight: { value: new THREE.Vector3(1, 0, 0) },
        u_cameraUp: { value: new THREE.Vector3(0, 1, 0) },
        u_cameraForward: { value: new THREE.Vector3(0, 0, -1) },
        u_cameraPosition: { value: new THREE.Vector3() },
        u_gradientStops: { value: new Float32Array(this.dotGradientStops) },
        u_gradientColors: { value: [new THREE.Color(COLORS.dotTop), new THREE.Color(COLORS.dotMid), new THREE.Color(COLORS.dotBottom)] },
      },
      vertexShader: DOTS_VERT,
      fragmentShader: DOTS_FRAG,
    });
    this.dotsGroup.add(new THREE.Points(g, this.dotsMaterial));
    this.dotsStartTime = performance.now();
  }

  private gradientDirection() {
    const angle = degToRad(this.surface.clockAngle);
    const depth = clamp(this.surface.depth, -1, 1);
    return this.vJ
      .set(Math.sin(angle), Math.cos(angle), 0)
      .multiplyScalar(1 - Math.abs(depth))
      .add(this.vI.set(0, 0, -depth))
      .normalize();
  }

  private updateCameraUniforms() {
    const right = this.vH;
    const up = this.vG;
    const forward = this.vF;
    this.camera.matrixWorld.extractBasis(right, up, forward);
    forward.negate();
    for (const mat of [this.dotsMaterial, this.surfaceMesh?.material]) {
      if (!mat) continue;
      (mat.uniforms.u_cameraRight.value as THREE.Vector3).copy(right);
      (mat.uniforms.u_cameraUp.value as THREE.Vector3).copy(up);
      (mat.uniforms.u_cameraForward.value as THREE.Vector3).copy(forward);
    }
  }

  private updateGlowPlaneSize() {
    if (!this.glowMesh) return;
    const h = 2 * this.camera.position.z * Math.tan(degToRad(this.camera.fov) / 2);
    this.glowMesh.scale.set(h * this.camera.aspect, h, 1);
  }

  private isPacificForSpeedAcceleration() {
    let y = this.globeGroup.rotation.y % (2 * Math.PI);
    if (y > Math.PI) y -= 2 * Math.PI;
    if (y < -Math.PI) y += 2 * Math.PI;
    const lon = -((180 / Math.PI) * y);
    return lon <= ARC_CONTROLLER.PACIFIC_SPEED_WEST || lon >= ARC_CONTROLLER.PACIFIC_SPEED_EAST;
  }

  private updateAndRender(dt: number) {
    this.updateCameraUniforms();
    if (this.surfaceMesh) {
      const u = this.surfaceMesh.material.uniforms;
      (u.u_cameraPosition.value as THREE.Vector3).copy(this.camera.position);
      (u.u_gradientDir.value as THREE.Vector3).copy(this.gradientDirection());
    }
    if (this.atmosphereMesh) {
      this.atmosphereMesh.quaternion.copy(this.camera.quaternion);
      this.atmosphereMesh.position.copy(this.globeGroup.position);
    }
    if (this.dotsMaterial) {
      this.dotsMaterial.uniforms.u_timeSec.value = (performance.now() - this.dotsStartTime) * 0.001 + 100;
      (this.dotsMaterial.uniforms.u_cameraPosition.value as THREE.Vector3).copy(this.camera.position);
    }
    const target = this.isPacificForSpeedAcceleration() ? this.rotationSpeedY * ARC_CONTROLLER.PACIFIC_SPEED_MULTIPLIER : this.rotationSpeedY;
    this.currentRotationSpeedY = lerp(this.currentRotationSpeedY, target, 0.01);
    this.globeGroup.rotation.y += this.currentRotationSpeedY * dt * 60;
    this.globeGroup.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);
  }

  private shiftTimestamps(delta: number) {
    this.dotsStartTime += delta;
    for (const arc of this.activeArcs) {
      arc.startTime += delta;
      arc.finalizeStartTime += delta;
    }
    if (this.arcControllerNextSpawnTime > 0) this.arcControllerNextSpawnTime += delta;
  }

  // ------------------------------------------------------------------------------ public API

  get paused() {
    return this._paused;
  }

  /** Pausing freezes every timeline; resuming shifts them so nothing jumps. */
  set paused(value: boolean) {
    if (value === this._paused) return;
    if (value) {
      this.pauseStartTime = performance.now();
      this.lastRender = null;
    } else if (this.pauseStartTime !== null) {
      this.shiftTimestamps(performance.now() - this.pauseStartTime);
      this.pauseStartTime = null;
    }
    this._paused = value;
  }

  onLoad(cb: () => void) {
    if (this.loaded) cb();
    else this.onLoadCallback = cb;
  }

  setSize(width: number, height: number) {
    this.cachedWidth = width;
    this.cachedHeight = height;
    if (!width || !height) return;
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(this.dpr);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.updateGlowPlaneSize();
    if (this.dotsMaterial) {
      this.dotsMaterial.uniforms.u_canvasHeight.value = height;
      this.dotsMaterial.uniforms.u_pixelRatio.value = this.dpr;
    }
    for (const item of this.linePool) item.material.resolution.set(width, height);
    // Resizing clears the drawing buffer; while paused (offscreen / reduced motion) redraw one frame.
    if (this.loaded && this._paused) this.updateAndRender(0);
  }

  dispose() {
    this.disposed = true;
    this.loop?.stop();
    this.loop = null;
    for (const arc of this.activeArcs) this.disposeArc(arc);
    this.activeArcs = [];
    this.flagPool.forEach((f) => (f.style.display = "none"));
    this.dotsMaterial?.dispose();
    this.dotsGroup?.children.forEach((c) => (c as THREE.Points).geometry.dispose());
    this.backgroundSphere?.geometry.dispose();
    this.backgroundSphere?.material.dispose();
    this.surfaceMesh?.geometry.dispose();
    this.surfaceMesh?.material.dispose();
    this.atmosphereMesh?.geometry.dispose();
    this.atmosphereMesh?.material.dispose();
    this.glowMesh?.geometry.dispose();
    this.glowMesh?.material.dispose();
    for (const item of this.linePool) {
      item.geometry.dispose();
      item.material.dispose();
    }
    this.linePool = [];
    for (const item of this.markerPool) item.mesh.material.dispose();
    this.markerPool = [];
    this.markerTextures.forEach((t) => t.dispose());
    this.markerTextures.clear();
    this.markerGeometry.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
