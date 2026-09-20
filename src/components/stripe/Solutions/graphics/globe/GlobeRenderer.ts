import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import {
  ARC_CONTROLLER,
  ARC_PALETTES,
  ARC_TIMING,
  CITIES,
  GLOBE,
  SIMPLE_ARC_PALETTES,
  SIMPLE_ARC_TIMING,
  STABLECOINS,
  TRANSPACIFIC_PAIRS,
  WALLETS,
  WALLET_TEMPLATES,
  type City,
  type EasingName,
} from "./config";
import { isTouchDevice, loadSharedDots, type DotData } from "./dots";
import {
  ATMOSPHERE_FRAG,
  ATMOSPHERE_VERT,
  DOTS_FRAG,
  DOTS_VERT,
  SURFACE_FRAG,
  SURFACE_VERT,
} from "./shaders";

const { clamp, lerp, degToRad, smoothstep, randInt } = THREE.MathUtils;

// Easing table (bundle module 8734); unknown names fall back to easeOutCubic.
const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInCubic: (t) => t * t * t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInQuad: (t) => t * t,
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  easeInExpo: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  easeOutBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  easeInBack: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
};
const ease = (t: number, name: EasingName) => (EASINGS[name] ?? EASINGS.easeOutCubic)(Math.max(0, Math.min(1, t)));

interface LinePoolItem {
  line: Line2;
  geometry: LineGeometry;
  material: LineMaterial;
  inUse: boolean;
}

interface PointsPoolItem {
  points: THREE.Vector3[];
  inUse: boolean;
}

type MarkerMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

interface MarkerPoolItem {
  mesh: MarkerMesh;
  inUse: boolean;
}

type UiState = "idle" | "intro" | "travel" | "outro" | "done";
type FinalizeState = "idle" | "active" | "done";

interface ArcState {
  mesh: Line2;
  points: THREE.Vector3[];
  startMarker: MarkerMesh;
  endMarker: MarkerMesh;
  uiElement: HTMLElement | null;
  markerScale: number;
  animation: {
    startTime: number;
    markerA: number;
    markerB: number;
    line: number;
    markerAEasing: EasingName;
    markerBEasing: EasingName;
    lineEasing: EasingName;
  };
  lineSegmentCount: number;
  lineProgress: number;
  pointDistances: number[];
  totalLineLength: number;
  arcDistanceKm: number;
  uiState: UiState;
  uiStartTime: number;
  uiIntroDuration: number;
  uiTravelDuration: number;
  uiOutroDuration: number;
  uiIntroEasing: EasingName;
  uiTravelEasing: EasingName;
  uiOutroEasing: EasingName;
  uiOpacity: number;
  uiScaleValue: number;
  uiTravelProgress: number;
  uiTravelStartT: number;
  uiTravelEndT: number;
  uiCurrentScale: number;
  uiOutroStartScale: number;
  uiHideFade: number;
  uiLastX?: number;
  uiLastY?: number;
  finalizeState: FinalizeState;
  finalizeStartTime: number;
  lineRetreatDuration: number;
  markerFadeDuration: number;
  lineRetreatEasing: EasingName;
  markerFadeEasing: EasingName;
  lineRetreatProgress: number;
  markerFadeProgress: number;
  linePoolItem: LinePoolItem;
  pointsPoolItem: PointsPoolItem;
  isSimpleArc: boolean;
  fromCityName: string;
  toCityName: string;
  markerAOpacity: number;
  markerBOpacity: number;
}

interface Projection {
  x: number;
  y: number;
  depthFade: number;
  isBehindGlobe: boolean;
  isOffscreen: boolean;
}

interface VisibleRangeUserData {
  visibleRange: THREE.Vector2;
  totalSegments: number;
  shader?: { uniforms: Record<string, THREE.IUniform> };
  u_totalSegmentsUniform?: THREE.IUniform<number>;
}

let uidCounter = 0;

/**
 * Patches a fat-line material so only instances within `visibleRange` (0..1 along the line) are
 * drawn; this is how the reference draws / retreats arcs progressively without touching geometry.
 */
function applyVisibleRange(material: LineMaterial) {
  const data = material.userData as VisibleRangeUserData;
  data.visibleRange = new THREE.Vector2(0, 0);
  data.totalSegments = 1;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.u_visibleRange = { value: data.visibleRange };
    shader.uniforms.u_totalSegments = { value: data.totalSegments };
    data.shader = shader;
    data.u_totalSegmentsUniform = shader.uniforms.u_totalSegments as THREE.IUniform<number>;
    const main = "void main() {";
    shader.vertexShader = `
      uniform vec2 u_visibleRange;
      uniform float u_totalSegments;
      varying float v_instanceProgress;
      ${shader.vertexShader}
    `.replace(
      main,
      `${main}
        float instanceProg = float(gl_InstanceID) / max(u_totalSegments, 1.0);
        v_instanceProgress = instanceProg;
      `,
    );
    shader.fragmentShader = `
      varying float v_instanceProgress;
      uniform vec2 u_visibleRange;
      ${shader.fragmentShader}
    `.replace(
      main,
      `${main}
        if (v_instanceProgress < u_visibleRange.x || v_instanceProgress > u_visibleRange.y) {
          discard;
        }
      `,
    );
  };
}

function setSegments(material: LineMaterial, count: number) {
  const data = material.userData as VisibleRangeUserData;
  data.totalSegments = count;
  if (data.u_totalSegmentsUniform) data.u_totalSegmentsUniform.value = count;
  if (data.shader?.uniforms?.u_totalSegments) data.shader.uniforms.u_totalSegments.value = count;
}

export interface GlobeOptions {
  /** The five pooled `.globe__arc-ui` badge elements. */
  uiPool: HTMLElement[];
  /** Globe centre offset (the homepage passes { y: -1 }). */
  position?: { x?: number; y?: number; z?: number };
}

/**
 * Port of the reference dot globe (bundle chunk 38639, "GradientNoiseGlobe"): 60k land dots on a
 * tilted auto-rotating sphere with a translucent gradient surface and halo, pooled fat-line arcs
 * (four wallet-badge arcs plus three thin background arcs), ring markers, and DOM badges that
 * travel along the arc. Timings, palettes and city data are identical to the reference.
 */
export class GlobeRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(25, 1, 0.1, 1000);
  private dpr = 1;
  private radius = 2;
  private globePosition = new THREE.Vector3(0, 0, 0);
  private dotsStartTime = 0;
  private uiPool: HTMLElement[];
  private activeArcs: ArcState[] = [];
  private activeSimpleArcs: ArcState[] = [];

  // Arc controller (UI arcs)
  private arcControllerEnabled = ARC_CONTROLLER.ENABLED;
  private arcControllerMaxActive = ARC_CONTROLLER.MAX_ACTIVE_ARCS;
  private arcPeakMinHeight = 0.1;
  private arcPeakMaxHeight = 0.275;
  private arcPeakAnglePower = 1.2;
  private arcSpawnIntervalMin = ARC_CONTROLLER.MIN_SPAWN_INTERVAL_MS;
  private arcSpawnIntervalMax = ARC_CONTROLLER.MAX_SPAWN_INTERVAL_MS;
  private arcCityMinDistanceKm = ARC_CONTROLLER.CITY_MIN_DISTANCE_KM;
  private arcMinUIScreenDistance = ARC_CONTROLLER.MIN_UI_SCREEN_DISTANCE;
  private arcMaxSpawnDistanceAttempts = ARC_CONTROLLER.MAX_SPAWN_DISTANCE_ATTEMPTS;
  private arcVisibleCityDotThreshold = 0.25;
  private arcRightEdgeExclusionRatio = 0.3;
  private arcPreferTranspacific = true;
  private arcPacificWestBoundary = -170;
  private arcPacificEastBoundary = 55;
  private arcPacificSpeedWestBoundary = -165;
  private arcPacificSpeedEastBoundary = 50;
  private arcPacificSpeedMultiplier = 1.25;
  private arcControllerNextSpawnTime = 0;
  private lastArcPairKey: string | null = null;

  // Simple (background) arc controller
  private simpleArcControllerEnabled = true;
  private simpleArcMaxActive = 3;
  private simpleArcSpawnIntervalMin = 800;
  private simpleArcSpawnIntervalMax = 2000;
  private simpleArcMaxDistanceKm = 8000;
  private simpleArcMinDistanceKm = 500;
  private simpleArcControllerNextSpawnTime = 0;
  private lastSimpleArcPairKey: string | null = null;

  // Dots
  private dotSize: number = GLOBE.DOT_SIZE_DESKTOP;
  // Monochrome: the screen-space gradient runs charcoal (lit top-left) -> mid grey -> silver; depth fade
  // below adds the near/far separation (near dots darker and stronger, far dots fainter).
  private dotColorTop = new THREE.Color(0x1c1c1c);
  private dotColorMid = new THREE.Color(0x6a6a6a);
  private dotColorBottom = new THREE.Color(0xb0b0b0);
  private dotGradientStopTop = 0.024;
  private dotGradientStopMid = 0.3794;
  private dotGradientStopBottom = 0.7941;
  private dotGradientAngle = 225;
  private dotGradientWidth = 1;
  private dotGradientHeight = 1;
  private dotOpacity = 0.6;
  private dotDepthFadeEnabled = true;
  private dotDepthFadeFront = 0.25;
  private dotDepthFadeBack = -0.1;
  private dotDepthFadeMinOpacity = 0.15;
  private dotDepthFadeCurve = 2;

  // Surface / atmosphere
  private globeGradientColorA = new THREE.Color(0xffffff);
  private globeGradientColorB = new THREE.Color(0x8a8a8a);
  private globeGradientClockAngle = 215;
  private globeGradientDepth = -0.1;
  private globeGradientContrast = 2;
  private globeGradientOffset = -0.4;
  private globeOpacity = 0.2;
  private globeFresnelColor = new THREE.Color(0xc8c8c8);
  private globeFresnelStrength = 0.1;
  private globeFresnelPower = 0.3;
  private atmosphereColor = new THREE.Color("#6a6a6a");
  private atmosphereIntensity = 0.08;
  private atmosphereOpacity = 0.35;
  private atmosphereFalloff = 0.4;
  private atmosphereRadius = 1.02;

  // Corona (dots lifting off the surface)
  private dotCoronaParticipation = 0.2;
  private dotCoronaDistance = 0.6;
  private dotCoronaLaunchRate = 0.15;
  private dotCoronaTravelSpeed = 0.35;
  private dotCoronaOpacityDrop = 0.5;
  private dotCoronaNoiseStrength = 0.42;
  private dotCoronaNoiseScale = 0.75;

  // Hover boost
  private isHovered = false;
  private hoverMultiplier = 1;
  private hoverBoostAmount = 1.33;
  private hoverAttackSpeed = 0.1;
  private hoverDecaySpeed = 0.04;

  // Loop state
  private rafId: number | null = null;
  private frameIndex = 0;
  private renderEvery = 2;
  private _paused = false;
  private pauseStartTime: number | null = null;
  private initialized = false;
  private loaded = false;
  private onLoadCallback: (() => void) | null = null;
  private lastRender: number | null = null;
  private disposed = false;

  // Rotation
  private autoRotate = true;
  private rotationSpeedY = 0.00115;
  private currentRotationSpeedY = 0.00115;
  private globeAxisTiltX = -2;
  private globeAxisTiltZ = 8;
  private globeInitialRotationY = 70;

  // Scene objects
  private globeGroup!: THREE.Group;
  private arcsGroup!: THREE.Group;
  private dotsGroup!: THREE.Group;
  private backgroundSphere!: THREE.Mesh;
  private globeSurface?: THREE.Mesh;
  private globeSurfaceMaterial?: THREE.ShaderMaterial;
  private atmosphereMesh?: THREE.Mesh;
  private atmosphereMaterial?: THREE.ShaderMaterial;
  private dotsMaterial?: THREE.ShaderMaterial;

  // Scratch
  private tempVecA = new THREE.Vector3();
  private tempVecB = new THREE.Vector3();
  private tempVecC = new THREE.Vector3();
  private tempVecD = new THREE.Vector3();
  private tempVecE = new THREE.Vector3();
  private tempVecF = new THREE.Vector3();
  private tempVecG = new THREE.Vector3();
  private tempVecH = new THREE.Vector3();
  private tempVecI = new THREE.Vector3();
  private tempVecJ = new THREE.Vector3();
  private tempVecK = new THREE.Vector3();
  private tempArcFactors = new THREE.Vector2();
  private proj: Projection = { x: 0, y: 0, depthFade: 0, isBehindGlobe: false, isOffscreen: false };
  private arcTempP0 = new THREE.Vector3();
  private arcTempP3 = new THREE.Vector3();
  private arcTempU0 = new THREE.Vector3();
  private arcTempU3 = new THREE.Vector3();
  private arcTempDir = new THREE.Vector3();
  private arcTempTangent = new THREE.Vector3();
  private arcTempForward = new THREE.Vector3();
  private arcColorA = new THREE.Color();
  private arcColorB = new THREE.Color();
  private arcColorTemp = new THREE.Color();
  private arcTempQuat = new THREE.Quaternion();
  private arcTempU0Orig = new THREE.Vector3();
  private arcTempU3Orig = new THREE.Vector3();
  private arcTempChordDir = new THREE.Vector3();
  private arcTempTangentStart = new THREE.Vector3();
  private arcTempTangentEnd = new THREE.Vector3();
  private arcTempP0Final = new THREE.Vector3();
  private arcTempP3Final = new THREE.Vector3();
  private arcPointDistancesPool: number[] = [];
  private arcLinePositionsPool: number[] = [];
  private arcLineColorsPool: number[] = [];
  private visibleCityIndicesCache: number[] = [];
  private candidateCityIndices: number[] = [];
  private cityVectors: THREE.Vector3[] = [];
  private markerTextureCache: Record<number, THREE.CanvasTexture> = {};
  private markerGeometry = new THREE.PlaneGeometry(0.4, 0.4);
  private cachedWidth = 0;
  private cachedHeight = 0;

  // Pools
  private readonly ARC_LINE_POOL_SIZE = 10;
  private readonly ARC_MAX_SEGMENTS = 256;
  private arcLinePool: LinePoolItem[] = [];
  private arcLinePoolInitialized = false;
  private readonly SIMPLE_ARC_LINE_POOL_SIZE = 6;
  private readonly SIMPLE_ARC_MAX_SEGMENTS = 64;
  private simpleArcLinePool: LinePoolItem[] = [];
  private simpleArcLinePoolInitialized = false;
  private readonly MARKER_POOL_SIZE = 20;
  private markerPool: MarkerPoolItem[] = [];
  private markerPoolInitialized = false;
  private arcPointsPool: PointsPoolItem[] = [];
  private arcPointsPoolInitialized = false;
  private simpleArcPointsPool: PointsPoolItem[] = [];
  private simpleArcPointsPoolInitialized = false;

  constructor(
    private canvas: HTMLCanvasElement,
    { uiPool, position }: GlobeOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: true,
    });
    const caps = this.renderer.capabilities;
    if (!caps.isWebGL2 || caps.maxTextureSize < 4096) {
      this.renderer.dispose();
      throw new Error("WebGL disabled based on capabilities check");
    }
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.setPixelRatio(this.dpr);
    this.uiPool = uiPool;
    this.dotSize = isTouchDevice() ? GLOBE.DOT_SIZE_MOBILE : GLOBE.DOT_SIZE_DESKTOP;
    this.candidateCityIndices = CITIES.map((_, i) => i);
    if (position) {
      if (position.x !== undefined) this.globePosition.x = position.x;
      if (position.y !== undefined) this.globePosition.y = position.y;
      if (position.z !== undefined) this.globePosition.z = position.z;
    }
  }

  // ---------------------------------------------------------------- pools

  private initArcLinePool() {
    if (this.arcLinePoolInitialized) return;
    for (let i = 0; i < this.ARC_LINE_POOL_SIZE; i += 1) {
      this.arcLinePool.push(this.createLinePoolItem(this.ARC_MAX_SEGMENTS + 1, 0.007));
    }
    this.arcLinePoolInitialized = true;
  }

  private initSimpleArcLinePool() {
    if (this.simpleArcLinePoolInitialized) return;
    for (let i = 0; i < this.SIMPLE_ARC_LINE_POOL_SIZE; i += 1) {
      this.simpleArcLinePool.push(this.createLinePoolItem(this.SIMPLE_ARC_MAX_SEGMENTS + 1, 0.004));
    }
    this.simpleArcLinePoolInitialized = true;
  }

  private createLinePoolItem(pointCount: number, linewidth: number): LinePoolItem {
    const geometry = new LineGeometry();
    geometry.setPositions(new Float32Array(3 * pointCount));
    geometry.setColors(new Float32Array(3 * pointCount));
    const material = new LineMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: true,
      linewidth,
      vertexColors: true,
    });
    material.resolution.set(
      this.cachedWidth || this.canvas.clientWidth,
      this.cachedHeight || this.canvas.clientHeight,
    );
    material.worldUnits = true;
    material.opacity = 0;
    applyVisibleRange(material);
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.renderOrder = 10;
    line.visible = false;
    geometry.instanceCount = 0;
    return { line, geometry, material, inUse: false };
  }

  private acquireLine(simple: boolean): LinePoolItem | null {
    if (simple) this.initSimpleArcLinePool();
    else this.initArcLinePool();
    const pool = simple ? this.simpleArcLinePool : this.arcLinePool;
    const item = pool.find((p) => !p.inUse);
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

  private initMarkerPool() {
    if (this.markerPoolInitialized) return;
    for (let i = 0; i < this.MARKER_POOL_SIZE; i += 1) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: true });
      const mesh = new THREE.Mesh(this.markerGeometry, material);
      mesh.visible = false;
      this.markerPool.push({ mesh, inUse: false });
    }
    this.markerPoolInitialized = true;
  }

  private acquireMarker(color: number): MarkerMesh | null {
    this.initMarkerPool();
    const item = this.markerPool.find((p) => !p.inUse);
    if (!item) return null;
    item.inUse = true;
    item.mesh.material.map = this.getOrCreateMarkerTexture(color);
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

  private acquirePoints(simple: boolean): PointsPoolItem | null {
    const pool = simple ? this.simpleArcPointsPool : this.arcPointsPool;
    const initialized = simple ? this.simpleArcPointsPoolInitialized : this.arcPointsPoolInitialized;
    if (!initialized) {
      const count = (simple ? this.SIMPLE_ARC_MAX_SEGMENTS : this.ARC_MAX_SEGMENTS) + 1;
      const size = simple ? this.SIMPLE_ARC_LINE_POOL_SIZE : this.ARC_LINE_POOL_SIZE;
      for (let i = 0; i < size; i += 1) {
        const points: THREE.Vector3[] = [];
        for (let j = 0; j < count; j += 1) points.push(new THREE.Vector3());
        pool.push({ points, inUse: false });
      }
      if (simple) this.simpleArcPointsPoolInitialized = true;
      else this.arcPointsPoolInitialized = true;
    }
    const item = pool.find((p) => !p.inUse);
    if (!item) return null;
    item.inUse = true;
    return item;
  }

  private getOrCreateMarkerTexture(color: number) {
    const cached = this.markerTextureCache[color];
    if (cached) return cached;
    // 128px sprite: light halo disc (22%), mid-grey ring (r 38.4 → 25.6), solid core in the arc colour.
    // Monochrome pulse: black core, mid-grey ring, light-grey outer halo.
    const scale = Math.min(Math.ceil(window.devicePixelRatio || 1), 2);
    const c = new THREE.Color(color);
    const ring = c.clone().lerp(new THREE.Color(0xffffff), 0.42);
    const rgba = (col: THREE.Color, a: number) =>
      `rgba(${Math.floor(255 * col.r)},${Math.floor(255 * col.g)},${Math.floor(255 * col.b)},${a})`;
    const canvas = document.createElement("canvas");
    canvas.width = 128 * scale;
    canvas.height = 128 * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = rgba(c, 0.22);
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = rgba(ring, 1);
    ctx.beginPath();
    ctx.arc(64, 64, 38.4, 0, 2 * Math.PI);
    ctx.arc(64, 64, 25.6, 0, 2 * Math.PI, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath();
    ctx.arc(64, 64, 25.6, 0, 2 * Math.PI);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.markerTextureCache[color] = texture;
    return texture;
  }

  // ------------------------------------------------------------ geography

  private findCityByName(name: string) {
    return CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
  }

  private cityToVector(city: City, out: THREE.Vector3, radius = this.radius) {
    return out.set(city.ux * radius, city.uy * radius, city.uz * radius);
  }

  private getCityDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
    const la1 = degToRad(a.lat);
    const lo1 = degToRad(a.lon);
    const la2 = degToRad(b.lat);
    const lo2 = degToRad(b.lon);
    const dLat = la2 - la1;
    const dLon = lo2 - lo1;
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 6371;
  }

  /** Cities facing the camera (dot ≥ threshold) and left of the right-edge exclusion band. */
  private getVisibleCityIndices(threshold = this.arcVisibleCityDotThreshold) {
    this.visibleCityIndicesCache.length = 0;
    if (!this.globeGroup) return this.visibleCityIndicesCache;
    const t = clamp(threshold, -1, 1);
    const centre = this.tempVecA;
    this.globeGroup.getWorldPosition(centre);
    const toCamera = this.tempVecB.copy(this.camera.position).sub(centre).normalize();
    const world = this.tempVecD;
    const matrix = this.arcsGroup?.matrixWorld ?? this.globeGroup.matrixWorld;
    const rightLimit = 1 - 2 * this.arcRightEdgeExclusionRatio;
    for (let i = 0; i < this.cityVectors.length; i += 1) {
      world.copy(this.cityVectors[i]).applyMatrix4(matrix);
      const dir = this.tempVecC.copy(world).sub(centre);
      if (dir.lengthSq() > 1e-6) {
        dir.normalize();
        if (dir.dot(toCamera) >= t && this.tempVecE.copy(world).project(this.camera).x < rightLimit) {
          this.visibleCityIndicesCache.push(i);
        }
      }
    }
    return this.visibleCityIndicesCache;
  }

  // ------------------------------------------------------------ projection

  private computeProjection(
    world: THREE.Vector3,
    centre: THREE.Vector3,
    toCamera: THREE.Vector3,
    width: number,
    height: number,
  ) {
    const ndc = this.tempVecE.copy(world);
    ndc.project(this.camera);
    const facing = this.tempVecF.copy(world).sub(centre).normalize().dot(toCamera);
    this.proj.x = (0.5 * ndc.x + 0.5) * width;
    this.proj.y = (-(0.5 * ndc.y) + 0.5) * height;
    this.proj.isOffscreen = ndc.x < -1.1 || ndc.x > 1.1 || ndc.y < -1.1 || ndc.y > 1.1;
    this.proj.isBehindGlobe = facing < GLOBE.ARC_UI_HIDE_DOT_THRESHOLD;
    this.proj.depthFade = facing <= -0.1 ? smoothstep(facing, -0.35, -0.1) : 1;
    return this.proj;
  }

  // ------------------------------------------------------------- badge UI

  private updateUIElementContent(el: HTMLElement, walletIndex: number, amount: number, currency: string) {
    const icon = el.querySelector<HTMLElement>(".globe__arc-ui-icon");
    const amountEl = el.querySelector<HTMLElement>(".globe__arc-ui-amount");
    const currencyEl = el.querySelector<HTMLElement>(".globe__arc-ui-currency");
    if (icon) {
      icon.style.display = "";
      const wallet = WALLET_TEMPLATES[walletIndex % WALLET_TEMPLATES.length];
      uidCounter += 1;
      const svg = new DOMParser().parseFromString(
        wallet.template.replaceAll("-UID", `-${uidCounter}`),
        "image/svg+xml",
      ).documentElement;
      icon.replaceChildren(svg);
    }
    if (amountEl) {
      amountEl.style.display = "";
      amountEl.textContent = `$${amount}`;
    }
    if (currencyEl) currencyEl.textContent = currency;
  }

  private getRandomUIData() {
    const walletIndex = Math.floor(Math.random() * WALLETS.length);
    const isPhantom = WALLETS[walletIndex].name === "Phantom";
    return {
      walletIndex,
      amount: Math.floor(999 * Math.random()) + 1,
      currencyLabel: isPhantom ? "CASH" : STABLECOINS[Math.floor(Math.random() * STABLECOINS.length)],
    };
  }

  // --------------------------------------------------------- arc updates

  private updateArcsConsolidated(now: number) {
    const centre = this.tempVecA;
    this.globeGroup.getWorldPosition(centre);
    const toCamera = this.tempVecC.copy(this.camera.position).sub(centre).normalize();
    const w = this.cachedWidth;
    const h = this.cachedHeight;
    const hasSize = w > 0 && h > 0;
    for (let i = this.activeArcs.length - 1; i >= 0; i -= 1) {
      const arc = this.activeArcs[i];
      this.updateSingleArcAnimation(arc, now);
      if (hasSize && arc.uiElement) this.updateSingleArcUIPosition(arc, centre, toCamera, w, h);
      if (arc.finalizeState === "done" && arc.uiState === "done") {
        this.disposeArcResources(arc);
        this.activeArcs.splice(i, 1);
      }
    }
  }

  private updateSimpleArcsConsolidated(now: number) {
    for (let i = this.activeSimpleArcs.length - 1; i >= 0; i -= 1) {
      const arc = this.activeSimpleArcs[i];
      this.updateSingleArcAnimation(arc, now);
      if (arc.lineProgress >= 0.999 && arc.finalizeState === "idle") this.startArcFinalization(arc, now);
      if (arc.finalizeState === "done") {
        this.disposeArcResources(arc);
        this.activeSimpleArcs.splice(i, 1);
      }
    }
  }

  private updateSingleArcAnimation(arc: ArcState, now: number) {
    const { markerA, markerB, line, startTime, markerAEasing, markerBEasing, lineEasing } = arc.animation;
    const elapsed = Math.max(0, now - startTime);
    const { x: markerFactor, y: retreat } = this.getArcFinalizationFactors(arc, now);
    const lineT = line <= 0 ? 1 : clamp(Math.max(0, elapsed - markerA - markerB) / line, 0, 1);

    const a = ease(markerA <= 0 ? 1 : Math.min(1, elapsed / markerA), markerAEasing);
    arc.startMarker.material.opacity = a * markerFactor;
    arc.markerAOpacity = a * markerFactor;
    arc.startMarker.scale.setScalar(Math.max(1e-4, arc.markerScale * a * markerFactor));

    const b = elapsed >= markerA ? ease(markerB <= 0 ? 1 : Math.min(1, Math.max(0, elapsed - markerA) / markerB), markerBEasing) : 0;
    arc.endMarker.material.opacity = b * markerFactor;
    arc.markerBOpacity = b * markerFactor;
    arc.endMarker.scale.setScalar(Math.max(1e-4, arc.markerScale * b * markerFactor));

    const material = arc.mesh.material as LineMaterial;
    const data = material.userData as VisibleRangeUserData;
    const visibleEnd = ease(lineT, lineEasing);
    const visibleStart = arc.finalizeState !== "idle" ? retreat : 0;
    data.visibleRange.set(visibleStart, visibleEnd);
    setSegments(material, arc.lineSegmentCount);
    if (arc.linePoolItem.geometry.instanceCount !== arc.lineSegmentCount) {
      arc.linePoolItem.geometry.instanceCount = arc.lineSegmentCount;
    }

    if (retreat > 1e-4 && arc.lineProgress >= 0.999 && arc.finalizeState !== "idle") {
      const remaining = Math.max(0, 1 - retreat);
      if (visibleStart >= visibleEnd || remaining <= 0.001) {
        arc.mesh.visible = false;
        material.opacity = 0;
      } else {
        arc.mesh.visible = true;
        material.opacity = remaining;
      }
    } else if (lineT <= 0) {
      arc.mesh.visible = false;
      material.opacity = 0;
    } else {
      arc.mesh.visible = true;
      material.opacity = visibleEnd;
    }
    arc.lineProgress = lineT;
    this.updateArcUIState(arc, now);
  }

  private updateSingleArcUIPosition(
    arc: ArcState,
    centre: THREE.Vector3,
    toCamera: THREE.Vector3,
    width: number,
    height: number,
  ) {
    if (!arc.uiElement) return;
    const t = clamp(arc.uiTravelProgress ?? 0.5, 0, 1);
    const onArc = this.getPointOnArc(arc, t, this.tempVecK);
    const normal = this.tempVecI.copy(onArc).normalize();
    const altitude = Math.max(0, onArc.length() - this.radius);
    const altitudeT = clamp(altitude / (0.75 * this.radius), 0, 1);
    const offset = lerp(GLOBE.ARC_UI_MIN_OFFSET, GLOBE.ARC_UI_MAX_OFFSET, altitudeT);
    const anchor = this.tempVecJ.copy(onArc).add(normal.multiplyScalar(offset));
    anchor.applyMatrix4(this.arcsGroup.matrixWorld);
    const { x, y, isOffscreen, isBehindGlobe, depthFade } = this.computeProjection(anchor, centre, toCamera, width, height);
    const hidden = isBehindGlobe || isOffscreen;
    arc.uiHideFade = lerp(arc.uiHideFade, hidden ? 1 : 0, hidden ? 0.25 : 0.15);
    const opacity = clamp(arc.uiOpacity ?? 0, 0, 1) * depthFade * (1 - arc.uiHideFade);
    const style = arc.uiElement.style;
    if (opacity > 0.001) {
      const targetScale = lerp(GLOBE.ARC_UI_MIN_SCALE, GLOBE.ARC_UI_MAX_SCALE, altitudeT);
      const s = clamp(arc.uiScaleValue ?? 0, 0, 1);
      let scale = 0;
      if (arc.uiState === "intro") scale = lerp(0, targetScale, s);
      else if (arc.uiState === "travel") scale = targetScale;
      else if (arc.uiState === "outro") {
        const from = arc.uiOutroStartScale > 0 ? arc.uiOutroStartScale : targetScale;
        scale = lerp(from, 0, s);
      } else if (arc.uiState === "done") scale = 0;
      const rx = Math.round(x);
      const ry = Math.round(y);
      if (
        arc.uiLastX === undefined ||
        arc.uiLastY === undefined ||
        Math.abs(rx - (arc.uiLastX ?? 0)) >= 1 ||
        Math.abs(ry - (arc.uiLastY ?? 0)) >= 1
      ) {
        style.setProperty("--ui-x", `${rx}px`);
        style.setProperty("--ui-y", `${ry}px`);
        arc.uiLastX = rx;
        arc.uiLastY = ry;
      }
      if (arc.uiCurrentScale !== scale) style.setProperty("--ui-scale", scale.toFixed(3));
      style.setProperty("--ui-opacity", opacity.toFixed(3));
      if (style.display === "none") style.display = "block";
      arc.uiCurrentScale = scale;
    } else {
      style.display = "none";
    }
  }

  private startArcFinalization(arc: ArcState, now: number) {
    if (arc.finalizeState === "idle") {
      arc.finalizeState = "active";
      arc.finalizeStartTime = now;
    }
  }

  /** x = marker visibility factor, y = line retreat progress. */
  private getArcFinalizationFactors(arc: ArcState, now: number) {
    if (arc.finalizeState === "done") {
      arc.lineRetreatProgress = 1;
      arc.markerFadeProgress = 1;
      return this.tempArcFactors.set(0, 1);
    }
    if (arc.finalizeState !== "active") return this.tempArcFactors.set(1, 0);
    const elapsed = Math.max(0, now - arc.finalizeStartTime);
    const retreatDuration = Math.max(100, arc.lineRetreatDuration);
    const retreat = ease(clamp(elapsed / retreatDuration, 0, 1), arc.lineRetreatEasing);
    arc.lineRetreatProgress = retreat;
    const fadeDuration = Math.max(50, arc.markerFadeDuration);
    const fade = ease(clamp(Math.max(0, elapsed - 0.8 * retreatDuration) / fadeDuration, 0, 1), arc.markerFadeEasing);
    arc.markerFadeProgress = fade;
    if (retreat >= 1 && fade >= 1) arc.finalizeState = "done";
    return this.tempArcFactors.set(Math.max(0, 1 - fade), clamp(retreat, 0, 1));
  }

  private getPointOnArc(arc: ArcState, t: number, out: THREE.Vector3) {
    if (!arc.points.length) return out.set(0, 0, 0);
    if (!arc.totalLineLength || arc.totalLineLength <= 0) return out.copy(arc.points[arc.points.length - 1]);
    const d = arc.pointDistances;
    const target = clamp(t, 0, 1) * arc.totalLineLength;
    for (let i = 1; i < d.length; i += 1) {
      if (target <= d[i]) {
        const span = d[i] - d[i - 1];
        const f = span <= 1e-5 ? 0 : (target - d[i - 1]) / span;
        return out.copy(arc.points[i - 1]).lerp(arc.points[i], f);
      }
    }
    return out.copy(arc.points[arc.points.length - 1]);
  }

  private disposeArcResources(arc: ArcState) {
    this.releaseLine(arc.linePoolItem);
    arc.pointsPoolItem.inUse = false;
    this.releaseMarker(arc.startMarker);
    this.releaseMarker(arc.endMarker);
    if (arc.uiElement) arc.uiElement.style.display = "none";
  }

  private updateArcUIState(arc: ArcState, now: number) {
    if (arc.uiState === "done") {
      arc.uiOpacity = 0;
      arc.uiScaleValue = 0;
      return;
    }
    if (arc.uiState === "idle") {
      arc.uiOpacity = 0;
      arc.uiScaleValue = 0;
      arc.uiTravelProgress = arc.uiTravelStartT;
      if (arc.lineProgress >= 1) {
        arc.uiState = "intro";
        arc.uiStartTime = now;
        arc.uiScaleValue = 0;
      }
      return;
    }
    if (arc.uiState === "intro") {
      const t = (now - arc.uiStartTime) / Math.max(1, arc.uiIntroDuration);
      const e = ease(t, arc.uiIntroEasing);
      arc.uiOpacity = e;
      arc.uiScaleValue = e;
      arc.uiTravelProgress = arc.uiTravelStartT;
      if (t >= 1) {
        arc.uiState = "travel";
        arc.uiStartTime = now;
        arc.uiScaleValue = 0;
      }
      return;
    }
    if (arc.uiState === "travel") {
      const t = clamp((now - arc.uiStartTime) / Math.max(1, arc.uiTravelDuration), 0, 1);
      const e = ease(t, arc.uiTravelEasing);
      arc.uiOpacity = 1;
      arc.uiScaleValue = e;
      arc.uiTravelProgress = lerp(arc.uiTravelStartT, arc.uiTravelEndT, e);
      if (t >= 1) {
        arc.uiState = "outro";
        arc.uiStartTime = now;
        arc.uiScaleValue = 0;
        this.startArcFinalization(arc, now);
        arc.uiOutroStartScale = arc.uiCurrentScale ?? 0;
      }
      return;
    }
    if (arc.uiState === "outro") {
      const t = (now - arc.uiStartTime) / Math.max(1, arc.uiOutroDuration);
      const e = ease(t, arc.uiOutroEasing);
      arc.uiOpacity = Math.max(0, 1 - e);
      arc.uiScaleValue = e;
      arc.uiTravelProgress = arc.uiTravelEndT;
      if (t >= 1) {
        arc.uiState = "done";
        arc.uiOpacity = 0;
        arc.uiScaleValue = 0;
      }
    }
  }

  // ------------------------------------------------------ arc controllers

  private updateArcController(now: number) {
    if (!this.arcControllerEnabled || CITIES.length < 2) return;
    if (this.arcControllerNextSpawnTime === 0) this.arcControllerNextSpawnTime = now;
    if (now < this.arcControllerNextSpawnTime) return;
    if (this.activeArcs.length >= this.arcControllerMaxActive) {
      this.arcControllerNextSpawnTime = now + 250;
      return;
    }
    let spawned = false;
    for (let i = 0; i < 2 && !spawned; i += 1) spawned = this.spawnRandomCityArc(now);
    if (spawned) {
      const min = Math.max(0, Math.floor(this.arcSpawnIntervalMin));
      const max = Math.max(min, Math.floor(this.arcSpawnIntervalMax));
      this.arcControllerNextSpawnTime = now + Math.max(100, min === max ? min : randInt(min, max));
    } else {
      this.arcControllerNextSpawnTime = now + 200;
    }
  }

  private spawnRandomCityArc(now: number) {
    const pair = this.pickRandomCityPair();
    if (!pair) return false;
    const palette = ARC_PALETTES[Math.floor(Math.random() * ARC_PALETTES.length)];
    const arc = this.drawArc(pair.from, pair.to, palette.start, palette.end, now, false);
    if (arc) this.updateSingleArcAnimation(arc, now);
    return !!arc;
  }

  private updateSimpleArcController(now: number) {
    if (!this.simpleArcControllerEnabled || CITIES.length < 2) return;
    if (this.simpleArcControllerNextSpawnTime === 0) this.simpleArcControllerNextSpawnTime = now;
    if (now < this.simpleArcControllerNextSpawnTime) return;
    let active = 0;
    for (const arc of this.activeSimpleArcs) if (arc.finalizeState !== "done") active += 1;
    if (active >= this.simpleArcMaxActive) {
      this.simpleArcControllerNextSpawnTime = now + 150;
      return;
    }
    let spawned = false;
    for (let i = 0; i < 2 && !spawned; i += 1) spawned = this.spawnSimpleArc(now);
    if (spawned) {
      const min = Math.max(0, Math.floor(this.simpleArcSpawnIntervalMin));
      const max = Math.max(min, Math.floor(this.simpleArcSpawnIntervalMax));
      this.simpleArcControllerNextSpawnTime = now + Math.max(50, min === max ? min : randInt(min, max));
    } else {
      this.simpleArcControllerNextSpawnTime = now + 150;
    }
  }

  private spawnSimpleArc(now: number) {
    const pair = this.pickSimpleArcCityPair();
    if (!pair) return false;
    const palette = SIMPLE_ARC_PALETTES[Math.floor(Math.random() * SIMPLE_ARC_PALETTES.length)];
    const arc = this.drawArc(pair.from, pair.to, palette.start, palette.end, now, true);
    if (!arc) return false;
    this.activeSimpleArcs.push(arc);
    this.updateSingleArcAnimation(arc, now);
    return true;
  }

  private getActiveUIArcCityNames() {
    const names = new Set<string>();
    for (const arc of this.activeArcs) {
      if (arc.uiElement) {
        if (arc.fromCityName) names.add(arc.fromCityName);
        if (arc.toCityName) names.add(arc.toCityName);
      }
    }
    return names;
  }

  private pickSimpleArcCityPair() {
    const candidates = this.candidateCityIndices;
    const n = candidates.length;
    if (n < 2) return null;
    const busy = this.getActiveUIArcCityNames();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const ia = candidates[Math.floor(Math.random() * n)];
      let ib = candidates[Math.floor(Math.random() * n)];
      let tries = 0;
      while (ib === ia && tries < 10) {
        ib = candidates[Math.floor(Math.random() * n)];
        tries += 1;
      }
      if (ib === ia) continue;
      const from = CITIES[ia];
      const to = CITIES[ib];
      if (!from || !to || busy.has(from.name) || busy.has(to.name)) continue;
      const key = `${from.name}-${to.name}`;
      if (key === this.lastSimpleArcPairKey) continue;
      const km = this.getCityDistanceKm(from, to);
      if (km >= this.simpleArcMinDistanceKm && km <= this.simpleArcMaxDistanceKm) {
        this.lastSimpleArcPairKey = key;
        return { from, to };
      }
    }
    return null;
  }

  /** Rejects pairs whose badge would sit within `arcMinUIScreenDistance` px of an active badge / marker. */
  private checkArcSpawnDistance(from: City, to: City) {
    if (this.activeArcs.length === 0) return true;
    const minDist = this.arcMinUIScreenDistance;
    if (minDist <= 0) return true;
    const a = this.cityToVector(from, this.tempVecA);
    const b = this.cityToVector(to, this.tempVecB);
    const mid = this.tempVecC.copy(a).lerp(b, 0.5).normalize();
    mid.multiplyScalar(1.1 * this.radius);
    if (this.arcsGroup) mid.applyMatrix4(this.arcsGroup.matrixWorld);
    const ndc = this.tempVecD.copy(mid);
    ndc.project(this.camera);
    const w = this.cachedWidth;
    const h = this.cachedHeight;
    if (w === 0 || h === 0) return true;
    const sx = (0.5 * ndc.x + 0.5) * w;
    const sy = (-(0.5 * ndc.y) + 0.5) * h;
    if (ndc.z > 1 || ndc.x < -1.2 || ndc.x > 1.2 || ndc.y < -1.2 || ndc.y > 1.2) return true;
    for (const arc of this.activeArcs) {
      if (arc.uiState === "done" || arc.uiState === "outro") continue;
      if (arc.uiLastX !== undefined && arc.uiLastY !== undefined) {
        const dx = sx - arc.uiLastX;
        const dy = sy - arc.uiLastY;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) return false;
      }
      const start = this.tempVecE.copy(arc.startMarker.position).applyMatrix4(this.arcsGroup.matrixWorld);
      const sp = this.tempVecF.copy(start).project(this.camera);
      const spx = (0.5 * sp.x + 0.5) * w;
      const spy = (-(0.5 * sp.y) + 0.5) * h;
      const end = this.tempVecG.copy(arc.endMarker.position).applyMatrix4(this.arcsGroup.matrixWorld);
      const ep = this.tempVecH.copy(end).project(this.camera);
      const epx = (0.5 * ep.x + 0.5) * w;
      const epy = (-(0.5 * ep.y) + 0.5) * h;
      const markerMin = 0.7 * minDist;
      const dsx = sx - spx;
      const dsy = sy - spy;
      if (Math.sqrt(dsx * dsx + dsy * dsy) < markerMin) return false;
      const dex = sx - epx;
      const dey = sy - epy;
      if (Math.sqrt(dex * dex + dey * dey) < markerMin) return false;
    }
    return true;
  }

  private getViewedLongitude() {
    if (!this.globeGroup) return 0;
    let y = this.globeGroup.rotation.y % (2 * Math.PI);
    if (y > Math.PI) y -= 2 * Math.PI;
    if (y < -Math.PI) y += 2 * Math.PI;
    return -((180 / Math.PI) * y);
  }

  private isPacificOceanVisible() {
    const lon = this.getViewedLongitude();
    return lon <= this.arcPacificWestBoundary || lon >= this.arcPacificEastBoundary;
  }

  private isPacificForSpeedAcceleration() {
    const lon = this.getViewedLongitude();
    return lon <= this.arcPacificSpeedWestBoundary || lon >= this.arcPacificSpeedEastBoundary;
  }

  private hasActiveTranspacificArc() {
    for (const arc of this.activeArcs) {
      const s = arc.startMarker.position;
      const e = arc.endMarker.position;
      const lonS = Math.atan2(s.x, s.z) * (180 / Math.PI);
      const lonE = Math.atan2(e.x, e.z) * (180 / Math.PI);
      if ((lonS < -100 && lonE > 100) || (lonS > 100 && lonE < -100)) return true;
    }
    return false;
  }

  private pickTranspacificPair() {
    for (const pair of [...TRANSPACIFIC_PAIRS].sort(() => Math.random() - 0.5)) {
      let from = this.findCityByName(pair.from);
      let to = this.findCityByName(pair.to);
      if (!from || !to) continue;
      if (Math.random() < 0.5) [from, to] = [to, from];
      const key = `${from.name}-${to.name}`;
      const reverse = `${to.name}-${from.name}`;
      if (key !== this.lastArcPairKey && reverse !== this.lastArcPairKey && this.checkArcSpawnDistance(from, to)) {
        return { from, to };
      }
    }
    return null;
  }

  private pickRandomCityPair(): { from: City; to: City } | null {
    const candidates = this.candidateCityIndices;
    const n = candidates.length;
    if (n < 2) return null;
    if (this.arcPreferTranspacific && this.isPacificOceanVisible() && !this.hasActiveTranspacificArc()) {
      const pair = this.pickTranspacificPair();
      if (pair) {
        this.lastArcPairKey = `${pair.from.name}-${pair.to.name}`;
        return pair;
      }
    }
    const minKm = Math.max(0, this.arcCityMinDistanceKm);
    const attempts = Math.max(20, 4 * n);
    const maxDistanceAttempts = this.arcMaxSpawnDistanceAttempts;
    let best: { from: City; to: City } | null = null;
    let bestKm = -Infinity;
    let bestValid = false;
    const visible = this.getVisibleCityIndices();
    const visibleSet = new Set(visible);
    let fromPool = candidates;
    let toPool = candidates;
    if (visible.length > 0) {
      const pool = candidates.length < CITIES.length ? visible.filter((i) => visibleSet.has(i)) : visible;
      if (pool.length > 0) {
        if (Math.random() < 0.5) fromPool = pool;
        else toPool = pool;
      }
    }
    let rejectedByDistance = 0;
    for (let i = 0; i < attempts; i += 1) {
      const ia = fromPool[Math.floor(Math.random() * fromPool.length)];
      let ib = toPool[Math.floor(Math.random() * toPool.length)];
      let tries = 0;
      while (ib === ia && tries < toPool.length + 5) {
        ib = toPool[Math.floor(Math.random() * toPool.length)];
        tries += 1;
      }
      if (ib === ia) continue;
      const from = CITIES[ia];
      const to = CITIES[ib];
      if (!from || !to || from === to) continue;
      const key = `${from.name}-${to.name}`;
      if (key === this.lastArcPairKey && n > 2) continue;
      const km = this.getCityDistanceKm(from, to);
      if (this.checkArcSpawnDistance(from, to)) {
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
        rejectedByDistance += 1;
        if (!bestValid && km > bestKm) {
          bestKm = km;
          best = { from, to };
        }
      }
      if (rejectedByDistance >= maxDistanceAttempts && !bestValid && best && km >= minKm) {
        this.lastArcPairKey = key;
        return { from, to };
      }
    }
    if (best) {
      this.lastArcPairKey = `${best.from.name}-${best.to.name}`;
      return best;
    }
    return null;
  }

  // -------------------------------------------------------------- drawing

  /**
   * Builds a great-circle arc (slerp between the two surface points, lifted by a sine bump) into a
   * pooled fat line with a start→end colour gradient, two ring markers and, for UI arcs, a badge.
   */
  private drawArc(from: City, to: City, colorStart: number, colorEnd: number, now: number, simple: boolean): ArcState | null {
    const p0 = this.cityToVector(from, this.arcTempP0);
    const p3 = this.cityToVector(to, this.arcTempP3);
    const u0 = this.arcTempU0Orig.copy(p0).normalize();
    const u3 = this.arcTempU3Orig.copy(p3).normalize();
    const chord = this.arcTempChordDir.copy(p3).sub(p0);
    const tangentStart = this.arcTempTangentStart.copy(chord).addScaledVector(u0, -chord.dot(u0)).normalize();
    const tangentEnd = this.arcTempTangentEnd.copy(chord).addScaledVector(u3, -chord.dot(u3)).normalize();
    // The line starts/ends slightly inside the markers.
    const start = this.arcTempP0Final.copy(p0).addScaledVector(tangentStart, GLOBE.MARKER_TANGENT_OFFSET);
    start.normalize().multiplyScalar(this.radius);
    const end = this.arcTempP3Final.copy(p3).addScaledVector(tangentEnd, -GLOBE.MARKER_TANGENT_OFFSET);
    end.normalize().multiplyScalar(this.radius);
    const a = this.arcTempU0.copy(start).normalize();
    const b = this.arcTempU3.copy(end).normalize();
    const omega = Math.acos(clamp(a.dot(b), -1, 1));
    const angleT = clamp(omega / Math.PI, 0, 1);
    let peak: number;
    if (simple) {
      peak = lerp(0.06, 0.18, angleT) * this.radius;
    } else {
      const shaped = angleT ** clamp(this.arcPeakAnglePower, 0.01, 5);
      const minH = Math.max(0.01, this.arcPeakMinHeight);
      const maxH = Math.max(minH, this.arcPeakMaxHeight);
      peak = lerp(minH, maxH, shaped) * this.radius;
    }
    const sinOmega = Math.sin(omega);
    const segments = simple ? this.SIMPLE_ARC_MAX_SEGMENTS : this.ARC_MAX_SEGMENTS;
    const pointsItem = this.acquirePoints(simple);
    if (!pointsItem) return null;
    const { points } = pointsItem;
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const dir = this.arcTempDir;
      if (sinOmega > 1e-6) {
        const wa = Math.sin((1 - t) * omega) / sinOmega;
        const wb = Math.sin(t * omega) / sinOmega;
        dir.copy(a).multiplyScalar(wa).addScaledVector(b, wb).normalize();
      } else {
        dir.copy(a).lerp(b, t).normalize();
      }
      const lift = Math.sin(Math.PI * t) * peak;
      points[i].set(dir.x * (this.radius + lift), dir.y * (this.radius + lift), dir.z * (this.radius + lift));
    }

    this.arcPointDistancesPool.length = 0;
    this.arcPointDistancesPool.push(0);
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      total += points[i].distanceTo(points[i - 1]);
      this.arcPointDistancesPool.push(total);
    }
    this.arcLinePositionsPool.length = 0;
    this.arcLineColorsPool.length = 0;
    const ca = this.arcColorA.setHex(colorStart);
    const cb = this.arcColorB.setHex(colorEnd);
    const count = points.length;
    for (let i = 0; i < count; i += 1) {
      const p = points[i];
      this.arcLinePositionsPool.push(p.x, p.y, p.z);
      this.arcColorTemp.copy(ca).lerp(cb, i / Math.max(1, count - 1));
      this.arcLineColorsPool.push(this.arcColorTemp.r, this.arcColorTemp.g, this.arcColorTemp.b);
    }
    const positions = this.arcLinePositionsPool.slice();
    const colors = this.arcLineColorsPool.slice();
    const distances = this.arcPointDistancesPool.slice();

    const lineItem = this.acquireLine(simple);
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
    const initialScale = simple ? 0.01 : 0.02;
    const startNormal = this.arcTempTangent.copy(p0).normalize();
    const endNormal = this.arcTempForward.copy(p3).normalize();
    startMarker.position.copy(p0);
    startMarker.scale.setScalar(initialScale);
    startMarker.visible = true;
    this.arcTempQuat.setFromUnitVectors(this.tempVecA.set(0, 0, 1), startNormal);
    startMarker.quaternion.copy(this.arcTempQuat);
    startMarker.material.opacity = 0;
    startMarker.material.transparent = true;
    endMarker.position.copy(p3);
    endMarker.scale.setScalar(initialScale);
    endMarker.visible = true;
    this.arcTempQuat.setFromUnitVectors(this.tempVecA.set(0, 0, 1), endNormal);
    endMarker.quaternion.copy(this.arcTempQuat);
    endMarker.material.opacity = 0;
    endMarker.material.transparent = true;

    const km = this.getCityDistanceKm(from, to);
    const startTime = now;

    if (simple) {
      const T = SIMPLE_ARC_TIMING;
      return {
        mesh: line,
        points,
        startMarker,
        endMarker,
        uiElement: null,
        markerScale: 0.12,
        animation: {
          startTime,
          markerA: T.markerA.durationMs,
          markerB: T.markerB.durationMs,
          line: T.line.durationMs,
          markerAEasing: T.markerA.easing,
          markerBEasing: T.markerB.easing,
          lineEasing: T.line.easing,
        },
        lineSegmentCount: segmentCount,
        lineProgress: 0,
        pointDistances: distances,
        totalLineLength: total,
        arcDistanceKm: km,
        uiState: "done",
        uiStartTime: 0,
        uiIntroDuration: 0,
        uiTravelDuration: 0,
        uiOutroDuration: 0,
        uiIntroEasing: "easeOutCubic",
        uiTravelEasing: "easeInOutCubic",
        uiOutroEasing: "easeInCubic",
        uiOpacity: 0,
        uiScaleValue: 0,
        uiTravelProgress: 0,
        uiTravelStartT: 0,
        uiTravelEndT: 1,
        uiCurrentScale: 0,
        uiOutroStartScale: 0,
        uiHideFade: 0,
        finalizeState: "idle",
        finalizeStartTime: 0,
        lineRetreatDuration: T.lineRetreat.durationMs,
        markerFadeDuration: T.markerFade.durationMs,
        lineRetreatEasing: T.lineRetreat.easing,
        markerFadeEasing: T.markerFade.easing,
        lineRetreatProgress: 0,
        markerFadeProgress: 0,
        linePoolItem: lineItem,
        pointsPoolItem: pointsItem,
        isSimpleArc: true,
        fromCityName: from.name,
        toCityName: to.name,
        markerAOpacity: 0,
        markerBOpacity: 0,
      };
    }

    // Badge: reuse a pooled element not owned by a live arc, evicting the oldest otherwise.
    const ui = this.getRandomUIData();
    let uiElement: HTMLElement | null = null;
    if (this.uiPool.length > 0) {
      const taken = new Set(this.activeArcs.filter((x) => x.uiState !== "done" && x.uiElement).map((x) => x.uiElement));
      const free = this.uiPool.find((el) => !taken.has(el));
      if (free) {
        uiElement = free;
        this.activeArcs.forEach((x) => {
          if (x.uiElement === free) {
            x.uiElement.style.display = "none";
            x.uiElement = null;
            x.uiState = "done";
            x.uiOpacity = 0;
          }
        });
      }
    }
    if (uiElement) {
      this.updateUIElementContent(uiElement, ui.walletIndex, ui.amount, ui.currencyLabel);
      uiElement.style.setProperty("--ui-opacity", "0");
      uiElement.style.setProperty("--ui-scale", "0");
      uiElement.style.setProperty("--ui-x", "0px");
      uiElement.style.setProperty("--ui-y", "0px");
      uiElement.style.display = "block";
    }

    const T = ARC_TIMING;
    const travelScale = clamp(
      (km / 10000) * T.uiTravel.distanceScale.factor + 1,
      T.uiTravel.distanceScale.min,
      T.uiTravel.distanceScale.max,
    );
    const travelDuration = T.uiTravel.durationMs * travelScale;
    const lineDuration = clamp(
      T.lineDistanceScale.baseDurationMs * (km / T.lineDistanceScale.referenceKm),
      T.lineDistanceScale.min,
      T.lineDistanceScale.max,
    );
    const arc: ArcState = {
      mesh: line,
      points,
      startMarker,
      endMarker,
      uiElement,
      markerScale: 0.2,
      animation: {
        startTime,
        markerA: T.markerA.durationMs,
        markerB: T.markerB.durationMs,
        line: lineDuration,
        markerAEasing: T.markerA.easing,
        markerBEasing: T.markerB.easing,
        lineEasing: T.line.easing,
      },
      lineSegmentCount: segmentCount,
      lineProgress: 0,
      pointDistances: distances,
      totalLineLength: total,
      arcDistanceKm: km,
      uiState: "idle",
      uiStartTime: 0,
      uiIntroDuration: T.uiIntro.durationMs,
      uiTravelDuration: travelDuration,
      uiOutroDuration: T.uiOutro.durationMs,
      uiIntroEasing: T.uiIntro.easing,
      uiTravelEasing: T.uiTravel.easing,
      uiOutroEasing: T.uiOutro.easing,
      uiOpacity: 0,
      uiScaleValue: 0,
      uiTravelProgress: 0.05,
      uiTravelStartT: 0.05,
      uiTravelEndT: 0.95,
      uiCurrentScale: 0,
      uiOutroStartScale: 0,
      uiHideFade: 0,
      finalizeState: "idle",
      finalizeStartTime: 0,
      lineRetreatDuration: T.lineRetreat.durationMs,
      markerFadeDuration: T.markerFade.durationMs,
      lineRetreatEasing: T.lineRetreat.easing,
      markerFadeEasing: T.markerFade.easing,
      lineRetreatProgress: 0,
      markerFadeProgress: 0,
      linePoolItem: lineItem,
      pointsPoolItem: pointsItem,
      isSimpleArc: false,
      fromCityName: from.name,
      toCityName: to.name,
      markerAOpacity: 0,
      markerBOpacity: 0,
    };
    this.activeArcs.push(arc);
    return arc;
  }

  // ---------------------------------------------------------------- scene

  /** Creates the scene and starts the loop (paused until dots arrive). Safe to call once. */
  initScene() {
    if (this.initialized) return;
    this.initialized = true;
    const w = this.cachedWidth || this.canvas.clientWidth;
    const h = this.cachedHeight || this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h || 1;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 0, isTouchDevice() ? GLOBE.CAMERA_Z_MOBILE : GLOBE.CAMERA_Z_DESKTOP);
    this.camera.lookAt(0, 0, 0);
    this.createGlobe();
    this.startLoop();
  }

  private startLoop() {
    if (this.rafId != null) return;
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      // The reference renders WebGL every other frame and updates the DOM badges every frame.
      if (this.frameIndex % this.renderEvery === 0) this.animate();
      this.updateUI();
      this.frameIndex += 1;
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private animate() {
    if (this._paused || !this.loaded) return;
    const now = performance.now();
    if (this.lastRender === null) this.lastRender = now;
    let dt = (now - this.lastRender) / 1000;
    dt = Math.min(dt, 0.05);
    this.lastRender = now;
    this.updateAndRender(dt);
  }

  private updateUI() {
    if (this._paused || !this.loaded) return;
    const now = performance.now();
    this.updateArcsConsolidated(now);
    this.updateSimpleArcsConsolidated(now);
    this.updateArcController(now);
    this.updateSimpleArcController(now);
  }

  private createGlobe() {
    this.globeGroup = new THREE.Group();
    this.globeGroup.position.copy(this.globePosition);
    this.globeGroup.rotation.x = degToRad(this.globeAxisTiltX);
    this.globeGroup.rotation.y = degToRad(this.globeInitialRotationY);
    this.globeGroup.rotation.z = degToRad(this.globeAxisTiltZ);
    this.scene.add(this.globeGroup);

    // Depth-only occluder so back-side arcs/markers are hidden by the sphere.
    this.backgroundSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.993 * this.radius, 64, 64),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.FrontSide, depthWrite: true, colorWrite: false }),
    );
    this.backgroundSphere.renderOrder = -1;
    this.globeGroup.add(this.backgroundSphere);

    const haloSize = 6 * this.radius;
    this.atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_color: { value: this.atmosphereColor.clone() },
        u_intensity: { value: this.atmosphereIntensity },
        u_opacity: { value: this.atmosphereOpacity },
        u_innerRadius: { value: this.radius },
        u_outerRadius: { value: this.radius * this.atmosphereRadius },
        u_outerFade: { value: Math.max(0.01, this.atmosphereFalloff) * this.radius },
      },
      vertexShader: ATMOSPHERE_VERT,
      fragmentShader: ATMOSPHERE_FRAG,
      blending: THREE.NormalBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    this.atmosphereMesh = new THREE.Mesh(new THREE.PlaneGeometry(haloSize, haloSize, 1, 1), this.atmosphereMaterial);
    this.atmosphereMesh.frustumCulled = false;
    this.atmosphereMesh.renderOrder = -4;
    this.scene.add(this.atmosphereMesh);

    this.globeSurfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_colorA: { value: this.globeGradientColorA.clone() },
        u_colorB: { value: this.globeGradientColorB.clone() },
        u_fresnelColor: { value: this.globeFresnelColor.clone() },
        u_fresnelStrength: { value: this.globeFresnelStrength },
        u_fresnelPower: { value: this.globeFresnelPower },
        u_opacity: { value: this.globeOpacity },
        u_gradientDir: { value: new THREE.Vector3(1, 0, 0) },
        u_gradientContrast: { value: this.globeGradientContrast },
        u_gradientOffset: { value: this.globeGradientOffset },
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
    });
    this.globeSurface = new THREE.Mesh(new THREE.SphereGeometry(0.9995 * this.radius, 128, 128), this.globeSurfaceMaterial);
    this.globeSurface.renderOrder = -0.5;
    this.globeGroup.add(this.globeSurface);
    this.updateGlobeSurfaceUniforms();
    this.updateCameraBasisUniforms();
    this.updateAtmosphereMaterial();

    // City unit vectors are authored in a frame rotated by π about X and Z.
    this.arcsGroup = new THREE.Group();
    this.arcsGroup.rotation.x = -Math.PI;
    this.arcsGroup.rotation.z = -Math.PI;
    this.globeGroup.add(this.arcsGroup);
    this.dotsGroup = new THREE.Group();
    this.dotsGroup.rotation.x = -Math.PI;
    this.dotsGroup.rotation.z = -Math.PI;
    this.globeGroup.add(this.dotsGroup);

    this.cityVectors = CITIES.map((c) => new THREE.Vector3(c.ux, c.uy, c.uz).multiplyScalar(this.radius));
    this.globeGroup.updateMatrixWorld(true);

    loadSharedDots()
      .then((dots) => {
        if (this.disposed) return;
        this.applyDotsToScene(dots);
        this.loaded = true;
        this.onLoadCallback?.();
        this.onLoadCallback = null;
        if (this._paused) this.updateAndRender(0);
      })
      .catch(() => {
        /* the fallback image stays visible */
      });
  }

  private applyDotsToScene(dots: DotData) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(dots.positions, 3));
    geometry.setAttribute("rndId", new THREE.Float32BufferAttribute(dots.rndIds, 1));
    geometry.setAttribute("sizeVariation", new THREE.Float32BufferAttribute(dots.sizeVariations, 1));
    geometry.setAttribute("opacityVariation", new THREE.Float32BufferAttribute(dots.opacityVariations, 1));
    geometry.setAttribute("coronaSeed", new THREE.Float32BufferAttribute(dots.coronaSeeds, 1));
    geometry.setAttribute("varianceRate", new THREE.Float32BufferAttribute(dots.varianceRates, 1));
    geometry.setAttribute("varianceMotion", new THREE.Float32BufferAttribute(dots.varianceMotions, 1));
    geometry.setAttribute("coronaCanParticipate", new THREE.Float32BufferAttribute(dots.coronaCanParticipate, 1));
    const speed = Math.max(0.1, this.dotCoronaTravelSpeed);
    const launchInterval = Math.max(0.45, 1 / Math.max(this.dotCoronaLaunchRate, 0.001));
    this.dotsMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        u_timeSec: { value: 0 },
        u_radius: { value: this.radius },
        u_dotSize: { value: 0.01 * this.dotSize },
        u_opacity_factor: { value: this.dotOpacity },
        u_coronaBurstDistance: { value: this.dotCoronaDistance },
        u_coronaParticipation: { value: this.dotCoronaParticipation },
        u_coronaOpacityDrop: { value: this.dotCoronaOpacityDrop },
        u_coronaNoiseStrength: { value: this.dotCoronaNoiseStrength },
        u_coronaNoiseScale: { value: this.dotCoronaNoiseScale },
        u_coronaBaseFlightDur: { value: Math.min(20, Math.max(0.3, 3.1 / speed)) },
        u_coronaBaseFadeDur: { value: Math.min(20, Math.max(0.05, 0.6 / speed)) },
        u_coronaLaunchInterval: { value: launchInterval },
        u_canvasHeight: { value: this.cachedHeight || this.canvas.clientHeight },
        u_pixelRatio: { value: this.dpr },
        u_depthFadeEnabled: { value: this.dotDepthFadeEnabled ? 1 : 0 },
        u_depthFadeFront: { value: this.dotDepthFadeFront },
        u_depthFadeBack: { value: this.dotDepthFadeBack },
        u_depthFadeMin: { value: this.dotDepthFadeMinOpacity },
        u_depthFadeCurve: { value: this.dotDepthFadeCurve },
        u_gradientAngle: { value: this.dotGradientAngle },
        u_gradientScale: {
          value: new THREE.Vector2(Math.max(0.05, this.dotGradientWidth), Math.max(0.05, this.dotGradientHeight)),
        },
        u_cameraRight: { value: new THREE.Vector3(1, 0, 0) },
        u_cameraUp: { value: new THREE.Vector3(0, 1, 0) },
        u_cameraForward: { value: new THREE.Vector3(0, 0, -1) },
        u_cameraPosition: { value: new THREE.Vector3() },
        u_gradientStops: { value: new Float32Array(GLOBE.DOT_GRADIENT_STOP_COUNT) },
        u_gradientColors: {
          value: Array.from({ length: GLOBE.DOT_GRADIENT_STOP_COUNT }, () => new THREE.Color(0xffffff)),
        },
      },
      vertexShader: DOTS_VERT,
      fragmentShader: DOTS_FRAG,
    });
    this.updateDotGradientUniforms();
    this.updateDotDepthFadeUniforms();
    const points = new THREE.Points(geometry, this.dotsMaterial);
    while (this.dotsGroup.children.length > 0) {
      const child = this.dotsGroup.children[0] as THREE.Points;
      this.dotsGroup.remove(child);
      child.geometry?.dispose();
      (child.material as THREE.Material)?.dispose();
    }
    this.dotsGroup.add(points);
    this.dotsStartTime = performance.now();
  }

  private updateGlobeSurfaceUniforms() {
    if (!this.globeSurfaceMaterial) return;
    const u = this.globeSurfaceMaterial.uniforms;
    (u.u_colorA.value as THREE.Color).copy(this.globeGradientColorA);
    (u.u_colorB.value as THREE.Color).copy(this.globeGradientColorB);
    (u.u_fresnelColor.value as THREE.Color).copy(this.globeFresnelColor);
    u.u_fresnelStrength.value = this.globeFresnelStrength;
    u.u_fresnelPower.value = this.globeFresnelPower;
    u.u_opacity.value = this.globeOpacity;
    u.u_gradientContrast.value = this.globeGradientContrast;
    u.u_gradientOffset.value = this.globeGradientOffset;
    (u.u_cameraPosition.value as THREE.Vector3).copy(this.camera.position);
    (u.u_gradientDir.value as THREE.Vector3).copy(this.getGradientDirectionCamera());
    this.globeSurfaceMaterial.needsUpdate = true;
  }

  private getGradientDirectionCamera() {
    const angle = degToRad(this.globeGradientClockAngle);
    const planar = this.tempVecI.set(Math.sin(angle), Math.cos(angle), 0);
    const depth = clamp(this.globeGradientDepth, -1, 1);
    return this.tempVecJ.copy(planar).multiplyScalar(1 - Math.abs(depth)).add(this.tempVecG.set(0, 0, -depth)).normalize();
  }

  private updateAtmosphereMaterial() {
    if (!this.atmosphereMaterial || !this.atmosphereMesh) return;
    const u = this.atmosphereMaterial.uniforms;
    (u.u_color.value as THREE.Color).copy(this.atmosphereColor);
    u.u_intensity.value = this.atmosphereIntensity;
    u.u_opacity.value = this.atmosphereOpacity;
    u.u_innerRadius.value = this.radius;
    u.u_outerRadius.value = this.radius * this.atmosphereRadius;
    u.u_outerFade.value = Math.max(0.01, this.atmosphereFalloff) * this.radius;
    this.atmosphereMesh.position.copy(this.globeGroup.position);
    this.atmosphereMaterial.needsUpdate = true;
  }

  private updateDotDepthFadeUniforms() {
    if (!this.dotsMaterial) return;
    const u = this.dotsMaterial.uniforms;
    u.u_depthFadeEnabled.value = this.dotDepthFadeEnabled ? 1 : 0;
    u.u_depthFadeFront.value = this.dotDepthFadeFront;
    u.u_depthFadeBack.value = this.dotDepthFadeBack;
    u.u_depthFadeMin.value = this.dotDepthFadeMinOpacity;
    u.u_depthFadeCurve.value = Math.max(0.01, this.dotDepthFadeCurve);
  }

  private updateDotGradientUniforms() {
    if (!this.dotsMaterial) return;
    const u = this.dotsMaterial.uniforms;
    const stops = u.u_gradientStops.value as Float32Array;
    stops[0] = clamp(this.dotGradientStopTop, 0, 1);
    stops[1] = clamp(this.dotGradientStopMid, 0, 1);
    stops[2] = clamp(this.dotGradientStopBottom, 0, 1);
    const colors = u.u_gradientColors.value as THREE.Color[];
    colors[0].copy(this.dotColorTop);
    colors[1].copy(this.dotColorMid);
    colors[2].copy(this.dotColorBottom);
    u.u_gradientAngle.value = this.dotGradientAngle;
    (u.u_gradientScale.value as THREE.Vector2).set(Math.max(0.05, this.dotGradientWidth), Math.max(0.05, this.dotGradientHeight));
  }

  private updateCameraBasisUniforms() {
    const right = this.tempVecH;
    const up = this.tempVecG;
    const forward = this.tempVecF;
    this.camera.matrixWorld.extractBasis(right, up, forward);
    forward.negate();
    if (this.dotsMaterial) {
      const u = this.dotsMaterial.uniforms;
      (u.u_cameraRight.value as THREE.Vector3).copy(right);
      (u.u_cameraUp.value as THREE.Vector3).copy(up);
      (u.u_cameraForward.value as THREE.Vector3).copy(forward);
    }
    if (this.globeSurfaceMaterial) {
      const u = this.globeSurfaceMaterial.uniforms;
      (u.u_cameraRight.value as THREE.Vector3).copy(right);
      (u.u_cameraUp.value as THREE.Vector3).copy(up);
      (u.u_cameraForward.value as THREE.Vector3).copy(forward);
    }
  }

  private updateAndRender(dt: number) {
    this.updateCameraBasisUniforms();
    if (this.globeSurfaceMaterial) {
      (this.globeSurfaceMaterial.uniforms.u_cameraPosition.value as THREE.Vector3).copy(this.camera.position);
      (this.globeSurfaceMaterial.uniforms.u_gradientDir.value as THREE.Vector3).copy(this.getGradientDirectionCamera());
    }
    if (this.atmosphereMaterial && this.atmosphereMesh) {
      this.atmosphereMesh.quaternion.copy(this.camera.quaternion);
      this.atmosphereMesh.position.copy(this.globeGroup.position);
    }
    // Hover boosts corona lift distance and participation (attack faster than decay).
    const hoverTarget = this.isHovered ? this.hoverBoostAmount : 1;
    if (Math.abs(this.hoverMultiplier - hoverTarget) >= 0.001) {
      const speed = this.isHovered ? this.hoverAttackSpeed : this.hoverDecaySpeed;
      this.hoverMultiplier = clamp(lerp(this.hoverMultiplier, hoverTarget, speed), 1, this.hoverBoostAmount);
      if (this.dotsMaterial) {
        const u = this.dotsMaterial.uniforms;
        u.u_coronaBurstDistance.value = this.dotCoronaDistance * this.hoverMultiplier;
        u.u_coronaParticipation.value = Math.min(1, this.dotCoronaParticipation * this.hoverMultiplier);
      }
    }
    const t = (performance.now() - this.dotsStartTime) * 0.001;
    if (this.dotsMaterial) {
      this.dotsMaterial.uniforms.u_timeSec.value = t + 100;
      (this.dotsMaterial.uniforms.u_cameraPosition.value as THREE.Vector3).copy(this.camera.position);
    }
    if (this.autoRotate && this.globeGroup) {
      const target = this.isPacificForSpeedAcceleration()
        ? this.rotationSpeedY * this.arcPacificSpeedMultiplier
        : this.rotationSpeedY;
      this.currentRotationSpeedY = lerp(this.currentRotationSpeedY, target, 0.01);
      this.globeGroup.rotation.y += this.currentRotationSpeedY * dt * 60;
    }
    if (this.globeGroup) {
      this.globeGroup.updateMatrixWorld(true);
      this.arcsGroup?.updateMatrixWorld(true);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private shiftTimestamps(delta: number) {
    this.dotsStartTime += delta;
    for (const arc of this.activeArcs) {
      arc.animation.startTime += delta;
      arc.uiStartTime += delta;
      arc.finalizeStartTime += delta;
    }
    for (const arc of this.activeSimpleArcs) {
      arc.animation.startTime += delta;
      arc.finalizeStartTime += delta;
    }
    if (this.arcControllerNextSpawnTime > 0) this.arcControllerNextSpawnTime += delta;
    if (this.simpleArcControllerNextSpawnTime > 0) this.simpleArcControllerNextSpawnTime += delta;
  }

  // ------------------------------------------------------------ public API

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

  setHovered(hovered: boolean) {
    this.isHovered = hovered;
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
    if (this.dotsMaterial) {
      this.dotsMaterial.uniforms.u_canvasHeight.value = height;
      this.dotsMaterial.uniforms.u_pixelRatio.value = this.dpr;
    }
    this.arcsGroup?.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as LineMaterial | undefined;
      if (material?.isLineMaterial) material.resolution.set(width, height);
    });
    if (this.loaded && this._paused) this.updateAndRender(0);
  }

  dispose() {
    this.disposed = true;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.dotsMaterial?.dispose();
    this.backgroundSphere?.geometry.dispose();
    (this.backgroundSphere?.material as THREE.Material | undefined)?.dispose();
    this.globeSurface?.geometry.dispose();
    this.globeSurfaceMaterial?.dispose();
    this.atmosphereMesh?.geometry.dispose();
    this.atmosphereMaterial?.dispose();
    for (const arc of [...this.activeArcs, ...this.activeSimpleArcs]) this.disposeArcResources(arc);
    this.activeArcs = [];
    this.activeSimpleArcs = [];
    for (const item of [...this.arcLinePool, ...this.simpleArcLinePool]) {
      item.geometry.dispose();
      item.material.dispose();
    }
    this.arcLinePool = [];
    this.simpleArcLinePool = [];
    for (const item of this.markerPool) item.mesh.material.dispose();
    this.markerPool = [];
    Object.values(this.markerTextureCache).forEach((t) => t.dispose());
    this.markerTextureCache = {};
    this.markerGeometry.dispose();
    this.dotsGroup?.children.forEach((child) => {
      const p = child as THREE.Points;
      p.geometry?.dispose();
      (p.material as THREE.Material)?.dispose();
    });
    this.renderer.dispose();
  }
}
