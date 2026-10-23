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
  Texture,
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
 * interactive Agent Steering demo) on the display plane, so every control stays a normal, focusable
 * element. The device holds one front-facing showcase pose: no orbit, tilt, fold or scroll motion, and
 * a frame is drawn only when the model arrives or the stage is resized.
 */

const CAMERA_Z = 40;
/** Margin around the device footprint. */
const FIT = 1.04;

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
  private device = new Group();
  private screenObject: CSS3DObject;
  private width = 1;
  private height = 1;
  private layout: ScreenLayout | null = null;
  private raf = 0;
  private disposed = false;
  private loaded = false;

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
    this.scene.add(this.device);

    options.screen.classList.add("iphone-duo__screen");
    this.screenObject = new CSS3DObject(options.screen);
    this.screenObject.position.set(DEVICE.screen.cx, DEVICE.screen.cy, DEVICE.screen.z + 0.002);
    this.device.add(this.screenObject);
    this.screenObject.visible = false;

    this.load();
  }

  /**
   * Loads without blocking the page: textures are uploaded one per frame and shader programs are
   * compiled in parallel (KHR_parallel_shader_compile) before the first draw, so scrolling into the
   * section does not stall on a single long task. (meshopt's worker mode is not used: it rebuilds its
   * worker from function source, which minification breaks.)
   */
  private load() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader
      .loadAsync(this.options.modelUrl)
      .then(async (gltf) => {
        if (this.disposed) return;
        const textures = new Set<Texture>();
        gltf.scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.frustumCulled = false;
          if (object.userData.screen) {
            // The DOM screen covers the display; the glass under it stays black.
            disposeMaterial(object.material);
            object.material = new MeshBasicMaterial({ color: 0x000000 });
          }
          for (const m of Array.isArray(object.material) ? object.material : [object.material])
            for (const v of Object.values(m)) if (v instanceof Texture) textures.add(v);
        });
        const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
        for (const texture of textures) {
          if (this.disposed) return;
          this.renderer.initTexture(texture);
          await nextFrame();
        }
        this.device.add(gltf.scene);
        await this.renderer.compileAsync(this.scene, this.camera);
        if (this.disposed) return;
        this.loaded = true;
        this.screenObject.visible = true;
        this.options.onReady?.();
        this.requestRender();
      })
      .catch((error) => this.options.onError?.(error));
  }

  /** Size the stage and fit the unfolded device into it (the reference fits by pixels per unit). */
  setSize(width: number, height: number, layout: ScreenLayout) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.layout = layout;
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.css.setSize(this.width, this.height);

    this.screenObject.scale.setScalar(1 / layout.unit);
    const el = this.options.screen;
    el.style.width = `${layout.width}px`;
    el.style.height = `${layout.height}px`;

    const pixelsPerUnit = Math.min(this.width / (DEVICE.width * FIT), this.height / (DEVICE.height * FIT));
    this.camera.aspect = this.width / this.height;
    this.camera.fov = MathUtils.radToDeg(2 * Math.atan(this.height / pixelsPerUnit / 2 / CAMERA_Z));
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private requestRender() {
    if (this.disposed || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.disposed || !this.layout || !this.loaded) return;
      this.renderer.render(this.scene, this.camera);
      this.css.render(this.scene, this.camera);
    });
  }

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
