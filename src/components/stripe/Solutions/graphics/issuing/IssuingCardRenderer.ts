import * as THREE from "three";
import {
  applyWaveConfig,
  createWaveMaterial,
  foldedGeometry,
  PausableLoop,
} from "@/components/stripe/Hero/wave/waveMesh";
import { ISSUING_WAVE } from "./config";
import {
  CARD_FRAG,
  CARD_VERT,
  ISSUING_POST_FRAG,
  ISSUING_POST_VERT,
} from "./shaders";

const TEXTURES = {
  palette: "/stripe/issuing-palette-dd8825db.webp",
  // Mono variant of issuing_card_fg-80bf7e1d: neutral shadow/border, chip and Visa logo untouched.
  cardFg: "/stripe/issuing_card_fg-mono.webp",
  cardBg: "/stripe/issuing_card_bg-4817f5b5.webp",
};
const CARD_ASPECT = 685 / 1078;
const CARD_Y = -0.062;
const BASE_SCALE = 1.42;
const MOUSE_ROTATION = 0.15 * Math.PI;
const FOLLOW = 0.004; // per ms lerp factor

/**
 * Port of the reference issuing card renderer (bundle module 51310).
 * Three passes into render targets — the wave ribbon (orthographic camera), the card face
 * (perspective camera) and the card window mask — are composited by a post shader that shows the
 * ribbon through the card window with angular blur and grain. Pointer position over the bento
 * card tilts the card by ±0.15π and it settles back when the pointer leaves.
 */
export class IssuingCardRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cardCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
  private waveCamera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 10000);
  private postCamera = new THREE.OrthographicCamera();
  private dpr = Math.min(window.devicePixelRatio, 2);
  private size = new THREE.Vector2();
  private resolution = new THREE.Vector2();
  private card!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private cardWindow!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private cardGroup = new THREE.Group();
  private waveMesh: THREE.Mesh | null = null;
  private waveMaterial: THREE.ShaderMaterial | null = null;
  private waveTarget!: THREE.WebGLRenderTarget;
  private cardTarget!: THREE.WebGLRenderTarget;
  private cardWindowTarget!: THREE.WebGLRenderTarget;
  private postMaterial!: THREE.ShaderMaterial;
  private postScene = new THREE.Scene();
  private mouseVector = new THREE.Vector2();
  private rotationCurrent = new THREE.Vector2();
  private rotationTarget = new THREE.Vector2();
  private scaleCurrent = BASE_SCALE;
  private scaleTarget = BASE_SCALE;
  private loop: PausableLoop;
  private loaded = false;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: number | undefined;

  constructor(
    private canvas: HTMLCanvasElement,
    private hoverRoot: HTMLElement | null,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: true,
    });
    if (!this.renderer.capabilities.isWebGL2)
      throw new Error("WebGL2 required");
    this.renderer.autoClear = false;
    this.renderer.autoClearColor = false;
    this.renderer.autoClearDepth = false;
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.setPixelRatio(this.dpr);
    this.cardCamera.position.set(0, 0, 3);
    this.waveCamera.position.set(0, 0, 5000);
    this.loop = new PausableLoop(
      (_, elapsed, dt) => this.updateAndRender(elapsed, dt),
      2,
    );
  }

  get paused() {
    return this.loop.paused;
  }
  set paused(v: boolean) {
    this.loop.paused = v;
    if (v) {
      this.rotationCurrent.set(0, 0);
      this.rotationTarget.set(0, 0);
    }
  }

  async init() {
    const loader = new THREE.TextureLoader();
    const [palette, fg, bg] = await Promise.all([
      loader.loadAsync(TEXTURES.palette),
      loader.loadAsync(TEXTURES.cardFg),
      loader.loadAsync(TEXTURES.cardBg),
    ]);
    if (this.disposed) return;
    palette.wrapS = palette.wrapT = THREE.RepeatWrapping;
    for (const t of [fg, bg]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;

    this.measure();
    const geo = new THREE.PlaneGeometry(CARD_ASPECT, 1);
    const cardMat = () =>
      new THREE.ShaderMaterial({
        uniforms: { u_texture: { value: null } },
        vertexShader: CARD_VERT,
        fragmentShader: CARD_FRAG,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
    this.card = new THREE.Mesh(geo, cardMat());
    this.card.position.y = CARD_Y;
    this.card.material.uniforms.u_texture.value = fg;
    this.cardWindow = new THREE.Mesh(geo.clone(), cardMat());
    this.cardWindow.position.y = CARD_Y;
    this.cardWindow.material.uniforms.u_texture.value = bg;
    this.cardGroup.add(this.card, this.cardWindow);
    this.cardGroup.scale.setScalar(this.scaleCurrent);
    this.scene.add(this.cardGroup);

    this.waveTarget = new THREE.WebGLRenderTarget(
      this.resolution.x,
      this.resolution.y,
    );
    this.cardTarget = new THREE.WebGLRenderTarget(
      this.resolution.x,
      this.resolution.y,
    );
    this.cardWindowTarget = new THREE.WebGLRenderTarget(
      this.resolution.x,
      this.resolution.y,
    );
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_wave: { value: this.waveTarget.texture },
        u_resolution: { value: this.resolution.clone() },
        u_blurAmount: { value: ISSUING_WAVE.post.blurAmount },
        u_blurSamples: { value: 6 },
        u_grainAmount: { value: ISSUING_WAVE.post.grainAmount },
        u_card: { value: this.cardTarget.texture },
        u_cardWindow: { value: this.cardWindowTarget.texture },
      },
      vertexShader: ISSUING_POST_VERT,
      fragmentShader: ISSUING_POST_FRAG,
      side: THREE.DoubleSide,
    });
    this.postScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial),
    );

    this.waveMaterial = createWaveMaterial(
      "light",
      palette,
      new THREE.Vector3(1, 1, 1),
      this.resolution.clone(),
    );
    // Premium dark card: the light field runs near-black -> graphite -> silver instead of the hero's full range.
    (this.waveMaterial.uniforms.u_monoRange.value as THREE.Vector2).set(0.03, 0.66);
    this.waveMesh = new THREE.Mesh(foldedGeometry(), this.waveMaterial);
    applyWaveConfig(
      this.waveMaterial,
      this.waveMesh,
      ISSUING_WAVE.materialProps,
    );
    this.scene.add(this.waveMesh);
    const cam = ISSUING_WAVE.camera;
    this.waveCamera.position.set(
      cam.position[0],
      cam.position[1],
      cam.position[2],
    );
    this.waveCamera.zoom = cam.zoom;
    this.waveCamera.lookAt(0, 0, 0);
    this.sizeCameras();

    this.resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.resize(), 300);
    });
    this.resizeObserver.observe(document.body);
    this.hoverRoot?.addEventListener("mousemove", this.onMouseMove);
    this.hoverRoot?.addEventListener("mouseout", this.onMouseOut);
    this.loaded = true;
    this.loop.start();
    if (this.paused) this.render();
  }

  private measure() {
    const r = this.canvas.getBoundingClientRect();
    this.size.set(r.width, r.height);
    this.resolution.set(r.width * this.dpr, r.height * this.dpr);
    this.renderer.setSize(r.width, r.height, false);
  }

  private sizeCameras() {
    this.cardCamera.aspect = this.size.x / this.size.y;
    this.cardCamera.updateProjectionMatrix();
    this.waveCamera.left = -this.size.x / 2;
    this.waveCamera.right = this.size.x / 2;
    this.waveCamera.top = this.size.y / 2;
    this.waveCamera.bottom = -this.size.y / 2;
    this.waveCamera.updateProjectionMatrix();
  }

  private resize() {
    if (this.disposed || !this.loaded) return;
    const r = this.canvas.getBoundingClientRect();
    if (r.width === this.size.x && r.height === this.size.y) return;
    this.measure();
    for (const t of [this.waveTarget, this.cardTarget, this.cardWindowTarget])
      t.setSize(this.resolution.x, this.resolution.y);
    this.postMaterial.uniforms.u_resolution.value = this.resolution.clone();
    if (this.waveMaterial)
      this.waveMaterial.uniforms.u_resolution.value = this.resolution.clone();
    this.sizeCameras();
    if (this.paused) this.render();
  }

  private onMouseMove = (e: MouseEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = 1 - (e.clientY - r.top) / r.height;
    this.mouseVector.set(nx, ny);
    const lx = THREE.MathUtils.mapLinear(nx, 0, 1, -1, 1);
    const ly = THREE.MathUtils.mapLinear(ny, 0, 1, -1, 1);
    this.rotationTarget.set(-MOUSE_ROTATION * ly, MOUSE_ROTATION * lx);
  };

  private onMouseOut = () => {
    this.scaleTarget = BASE_SCALE;
    this.rotationTarget.set(0, 0);
  };

  private updateAndRender(elapsed: number, dt: number) {
    if (!this.loaded || !this.waveMaterial) return;
    this.waveMaterial.uniforms.u_mousePosition.value = this.mouseVector;
    // mesh setter adds its own timeOffset on top of the elapsed time
    this.waveMaterial.uniforms.u_time.value =
      ISSUING_WAVE.materialProps.timeOffset + elapsed;
    const delta = this.rotationTarget.clone().sub(this.rotationCurrent);
    this.rotationCurrent.add(delta.multiplyScalar(FOLLOW * dt));
    this.scaleCurrent += (this.scaleTarget - this.scaleCurrent) * dt * FOLLOW;
    this.cardGroup.rotation.x = this.rotationCurrent.x;
    this.cardGroup.rotation.y = this.rotationCurrent.y;
    this.cardGroup.scale.setScalar(this.scaleCurrent);
    this.render();
  }

  private show(wave: boolean, card: boolean, win: boolean) {
    if (this.waveMesh) this.waveMesh.visible = wave;
    this.card.visible = card;
    this.cardWindow.visible = win;
  }

  private render() {
    if (!this.loaded) return;
    const r = this.renderer;
    this.show(true, false, false);
    r.setRenderTarget(this.waveTarget);
    r.clearDepth();
    r.clearColor();
    r.render(this.scene, this.waveCamera);
    this.show(false, true, false);
    r.setRenderTarget(this.cardTarget);
    r.clearDepth();
    r.clearColor();
    r.render(this.scene, this.cardCamera);
    this.show(false, false, true);
    r.setRenderTarget(this.cardWindowTarget);
    r.clearDepth();
    r.clearColor();
    r.render(this.scene, this.cardCamera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCamera);
  }

  drawOnce() {
    this.render();
  }

  dispose() {
    this.disposed = true;
    this.loop.stop();
    this.resizeObserver?.disconnect();
    window.clearTimeout(this.resizeTimer);
    this.hoverRoot?.removeEventListener("mousemove", this.onMouseMove);
    this.hoverRoot?.removeEventListener("mouseout", this.onMouseOut);
    this.waveMesh?.geometry.dispose();
    this.waveMaterial?.dispose();
    this.card?.geometry.dispose();
    this.card?.material.dispose();
    this.cardWindow?.geometry.dispose();
    this.cardWindow?.material.dispose();
    for (const t of [this.waveTarget, this.cardTarget, this.cardWindowTarget])
      t?.dispose();
    this.postMaterial?.dispose();
    this.renderer.dispose();
  }
}
