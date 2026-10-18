import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Material,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { DEVICE, type ScreenLayout } from "./geometry";
import { RoomEnvironment } from "./roomEnvironment";

/*
 * The Apple iPhone Duo (Star White, Landscape pose) from chuspeeism/iphone-duo, baked to glTF by
 * scripts/iphone-duo/ (geometry in world units, centred like the reference app). Lighting, tone
 * mapping and camera follow the reference: RoomEnvironment PMREM, a hemisphere fill, a key and a rim
 * light, ACES at 1.18 exposure, a 40-unit camera distance.
 *
 * The inner display is not a texture: a CSS3DObject carries the real DOM screen (status bar and the
 * interactive usage meter) on the display plane, so every control stays a normal, focusable element.
 */

const CAMERA_Z = 40;
const MAX_TILT_X = MathUtils.degToRad(5);
const MAX_TILT_Y = MathUtils.degToRad(8);
const ENTRANCE_TILT = MathUtils.degToRad(14);

export interface IphoneDuoRendererOptions {
  modelUrl: string;
  screen: HTMLElement;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}

export class IphoneDuoRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly overlay: HTMLElement;
  private renderer: WebGLRenderer;
  private css: CSS3DRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.1, 250);
  /** Tilts toward the pointer and settles as the section scrolls into place. */
  private pivot = new Group();
  /** Holds the device; rotated a quarter turn for portrait stages. */
  private device = new Group();
  private screenObject: CSS3DObject;
  private width = 1;
  private height = 1;
  private layout: ScreenLayout | null = null;
  private tilt = { x: 0, y: 0 };
  private tiltTarget = { x: 0, y: 0 };
  private entrance = 0;
  private entranceTarget = 0;
  private raf = 0;
  private dirty = true;
  private disposed = false;
  private loaded = false;
  paused = true;
  reducedMotion = false;

  constructor(private host: HTMLElement, private options: IphoneDuoRendererOptions) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.canvas = this.renderer.domElement;
    this.canvas.className = "iphone-duo__canvas";
    this.canvas.setAttribute("aria-hidden", "true");

    this.css = new CSS3DRenderer();
    this.overlay = this.css.domElement;
    this.overlay.className = "iphone-duo__overlay";
    // Only the screen itself takes pointer input; the rest of the overlay lets it through.
    this.overlay.style.pointerEvents = "none";
    host.append(this.canvas, this.overlay);

    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 1.35;
    room.dispose();
    pmrem.dispose();
    this.scene.add(new HemisphereLight(0xffffff, 0xb5baa8, 1.8));
    const key = new DirectionalLight(0xfffcf5, 2.6);
    key.position.set(-15, 25, 30);
    const rim = new DirectionalLight(0xe8edf5, 2);
    rim.position.set(15, 5, -15);
    this.scene.add(key, rim);

    this.camera.position.set(0, 0, CAMERA_Z);
    this.camera.lookAt(0, 0, 0);
    this.pivot.add(this.device);
    this.scene.add(this.pivot);

    options.screen.classList.add("iphone-duo__screen");
    this.screenObject = new CSS3DObject(options.screen);
    this.screenObject.position.set(DEVICE.screen.cx, DEVICE.screen.cy, DEVICE.screen.z + 0.002);
    this.device.add(this.screenObject);
    this.screenObject.visible = false;

    this.load();
  }

  private load() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      this.options.modelUrl,
      (gltf) => {
        if (this.disposed) return;
        gltf.scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.frustumCulled = false;
          if (object.userData.screen) {
            // The DOM screen covers the display; the glass under it stays black.
            disposeMaterial(object.material);
            object.material = new MeshBasicMaterial({ color: 0x000000 });
          }
        });
        this.device.add(gltf.scene);
        this.loaded = true;
        this.screenObject.visible = true;
        this.dirty = true;
        this.options.onReady?.();
        this.kick();
      },
      undefined,
      (error) => this.options.onError?.(error),
    );
  }

  /** Size the stage and lay the screen out for `layout` (landscape: as unfolded; portrait: a quarter turn). */
  setSize(width: number, height: number, layout: ScreenLayout) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.layout = layout;
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.css.setSize(this.width, this.height);

    const portrait = layout.orientation === "portrait";
    this.device.rotation.z = portrait ? Math.PI / 2 : 0;
    this.screenObject.rotation.z = portrait ? -Math.PI / 2 : 0;
    this.screenObject.scale.setScalar(1 / layout.unit);
    const el = this.options.screen;
    el.style.width = `${layout.width}px`;
    el.style.height = `${layout.height}px`;

    // Fit the device footprint with a small margin (the reference fits 25 x 17 units at <= 37px/unit).
    const footW = (portrait ? DEVICE.height : DEVICE.width) * 1.06;
    const footH = (portrait ? DEVICE.width : DEVICE.height) * 1.06;
    const pixelsPerUnit = Math.min(this.width / footW, this.height / footH);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = MathUtils.radToDeg(2 * Math.atan(this.height / pixelsPerUnit / 2 / CAMERA_Z));
    this.camera.updateProjectionMatrix();
    this.dirty = true;
    this.kick();
  }

  /** Pointer position over the stage in -1..1; `null` (or over the screen) settles the device flat. */
  setPointer(nx: number | null, ny: number | null) {
    if (nx === null || ny === null || this.reducedMotion) this.tiltTarget = { x: 0, y: 0 };
    else this.tiltTarget = { x: ny * MAX_TILT_X, y: nx * MAX_TILT_Y };
    this.kick();
  }

  /** 0 when the section's centre is in the middle of the viewport, 1 when it is a viewport away. */
  setScrollOffset(offset: number) {
    this.entranceTarget = this.reducedMotion ? 0 : MathUtils.clamp(offset, -1, 1);
    this.kick();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.kick();
  }

  private kick() {
    if (this.disposed || this.paused || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = () => {
    this.raf = 0;
    if (this.disposed || this.paused) return;
    const ease = this.reducedMotion ? 1 : 0.08;
    let moving = false;
    const approach = (from: number, to: number) => {
      const next = from + (to - from) * ease;
      if (Math.abs(to - next) > 1e-5) moving = true;
      return Math.abs(to - next) > 1e-5 ? next : to;
    };
    this.tilt.x = approach(this.tilt.x, this.tiltTarget.x);
    this.tilt.y = approach(this.tilt.y, this.tiltTarget.y);
    this.entrance = approach(this.entrance, this.entranceTarget);
    const before = `${this.pivot.rotation.x},${this.pivot.rotation.y}`;
    this.pivot.rotation.x = this.tilt.x - this.entrance * ENTRANCE_TILT;
    this.pivot.rotation.y = this.tilt.y;
    if (this.dirty || before !== `${this.pivot.rotation.x},${this.pivot.rotation.y}`) {
      this.dirty = false;
      if (this.layout && this.loaded) {
        this.renderer.render(this.scene, this.camera);
        this.css.render(this.scene, this.camera);
      }
    }
    if (moving) this.kick();
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        disposeMaterial(object.material);
      }
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.canvas.remove();
    this.overlay.remove();
  }
}

function disposeMaterial(material: Material | Material[]) {
  for (const m of Array.isArray(material) ? material : [material]) {
    for (const value of Object.values(m)) if (value && typeof value === "object" && "isTexture" in value) (value as { dispose: () => void }).dispose();
    m.dispose();
  }
}
