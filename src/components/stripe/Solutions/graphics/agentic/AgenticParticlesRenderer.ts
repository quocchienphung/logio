import * as THREE from "three";
import { PausableLoop } from "@/components/stripe/Hero/wave/waveMesh";
import { POINTS_FRAG, POINTS_VERT } from "./shaders";

const SPRITESHEET = "/stripe/point_spritesheet-8513a80a.webp";
const isCoarseTouch = () =>
  window.matchMedia("(pointer: coarse)").matches && "ontouchstart" in window;
const zoomFor = (width: number) => THREE.MathUtils.clamp(width / 400, 0, 1);
const cameraYFor = (height: number) =>
  240 * (1 - THREE.MathUtils.clamp(height / 646, 0, 1));

/**
 * Port of the reference agentic-commerce particle field (index chunk module 30271):
 * 10k (6k on touch) sprite points on a ring of radius 180, simplex-scattered in the vertex shader,
 * with a rotating "thinking" vector that pulls a wedge of particles inward, and pointer attraction
 * through a raycast against an invisible plane. frameInterval 2.
 */
export class AgenticParticlesRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 10000);
  private material: THREE.ShaderMaterial;
  private points: THREE.Points | null = null;
  private mousePlane: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private dpr = Math.min(window.devicePixelRatio, 2);
  private rect = new DOMRect();
  private resolution = new THREE.Vector2();
  private thinkingVector = new THREE.Vector2(1, 0);
  private targetMouse = new THREE.Vector3();
  private currentMouse = new THREE.Vector3();
  private targetScatterPower = 1;
  private currentScatterPower = 1;
  private targetMouseStrength = 0;
  private currentMouseStrength = 0;
  private targetThinkingStrength = 0;
  private currentThinkingStrength = 0;
  private thinkingTimeout: number | undefined;
  private loop: PausableLoop;
  private loaded = false;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: number | undefined;
  private hoverRoot: HTMLElement | null;

  constructor(private canvas: HTMLCanvasElement) {
    this.hoverRoot = canvas.closest<HTMLElement>("[data-bento-card-root]");
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
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
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_frame: { value: 0 },
        u_mouse: { value: new THREE.Vector3() },
        u_time: { value: 0 },
        u_pointSize: { value: isCoarseTouch() ? 8 : 6 },
        u_pixelRatio: { value: this.dpr },
        u_pointSpriteSheet: { value: null },
        u_resolution: { value: new THREE.Vector2() },
        u_mousePosition: { value: new THREE.Vector2() },
        u_mouseStrength: { value: 0 },
        u_thinkingVector: { value: new THREE.Vector2() },
        u_thinkingStrength: { value: 0 },
        u_scatterPower: { value: 3 },
      },
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.loop = new PausableLoop(
      (_, elapsed, dt) => this.update(elapsed, dt),
      2,
    );
  }

  get paused() {
    return this.loop.paused;
  }
  set paused(v: boolean) {
    this.loop.paused = v;
  }

  async init() {
    const tex = await new THREE.TextureLoader().loadAsync(SPRITESHEET);
    if (this.disposed) return;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    this.material.uniforms.u_pointSpriteSheet.value = tex;

    this.measure();
    this.camera.position.set(0, cameraYFor(this.rect.height), 5000);
    this.sizeCamera();
    this.mousePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(this.rect.width, this.rect.height),
      new THREE.MeshBasicMaterial({
        color: 0x0fff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1,
      }),
    );
    this.mousePlane.visible = false;
    this.scene.add(this.mousePlane);
    this.points = new THREE.Points(this.createPoints(), this.material);
    this.scene.add(this.points);

    this.resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.resize(), 150);
    });
    this.resizeObserver.observe(document.body);
    this.hoverRoot?.addEventListener("mousemove", this.onMouseMove);
    this.hoverRoot?.addEventListener("mouseover", this.onMouseOver);
    this.hoverRoot?.addEventListener("mouseout", this.onMouseOut);
    this.loaded = true;
    this.loop.start();
    if (this.paused) this.render();
  }

  private createPoints() {
    const positions: number[] = [];
    const uvs: number[] = [];
    const n = isCoarseTouch() ? 6000 : 10000;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      positions.push(
        180 * Math.cos(a),
        180 * Math.sin(a),
        THREE.MathUtils.randFloat(-100, 100),
      );
      uvs.push(
        0.25 * THREE.MathUtils.randInt(0, 3),
        0.25 * THREE.MathUtils.randInt(0, 3),
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("pointSpriteUv", new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }

  private measure() {
    this.rect = this.canvas.getBoundingClientRect();
    this.resolution.set(
      this.rect.width * this.dpr,
      this.rect.height * this.dpr,
    );
    this.renderer.setSize(this.rect.width, this.rect.height, false);
    this.material.uniforms.u_resolution.value = this.resolution;
  }

  private sizeCamera() {
    this.camera.left = -this.rect.width / 2;
    this.camera.right = this.rect.width / 2;
    this.camera.top = this.rect.height / 2;
    this.camera.bottom = -this.rect.height / 2;
    this.camera.zoom = zoomFor(this.rect.width);
    this.camera.updateProjectionMatrix();
  }

  private resize() {
    if (this.disposed) return;
    const r = this.canvas.getBoundingClientRect();
    if (r.width === this.rect.width && r.height === this.rect.height) return;
    this.measure();
    this.sizeCamera();
    this.camera.position.y = cameraYFor(this.rect.height);
    if (this.paused && this.loaded) this.render();
  }

  /** Scatter the ring after `delay` ms and hold for `duration` ms (reference: think(2000, 1000) on reveal). */
  think(duration: number, delay: number) {
    window.clearTimeout(this.thinkingTimeout);
    this.thinkingTimeout = window.setTimeout(() => {
      this.targetScatterPower = 12;
      this.targetThinkingStrength = 1;
      this.thinkingTimeout = window.setTimeout(
        () => this.stopThinking(),
        duration,
      );
    }, delay);
  }

  stopThinking(immediate = false) {
    window.clearTimeout(this.thinkingTimeout);
    this.thinkingTimeout = undefined;
    this.targetScatterPower = 3;
    this.targetThinkingStrength = 0;
    if (immediate) {
      this.targetMouse.set(0, 0, 0);
      this.targetMouseStrength = 0;
      this.currentScatterPower = this.targetScatterPower;
      this.currentMouse.copy(this.targetMouse);
      this.currentMouseStrength = this.targetMouseStrength;
      this.currentThinkingStrength = this.targetThinkingStrength;
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = (-(e.clientY - r.top) / r.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    if (!this.mousePlane) return;
    const hit = this.raycaster.intersectObject(this.mousePlane);
    if (hit.length > 0) this.targetMouse.copy(hit[0].point);
  };
  private onMouseOver = () => {
    this.targetMouseStrength = 1;
  };
  private onMouseOut = () => {
    this.targetMouseStrength = 0;
  };

  private update(elapsed: number, dt: number) {
    if (!this.loaded) return;
    const dm = this.targetMouse
      .clone()
      .sub(this.currentMouse)
      .multiplyScalar(3);
    this.currentMouse.add(dm.multiplyScalar(0.004 * dt));
    this.currentScatterPower +=
      (this.targetScatterPower - this.currentScatterPower) * dt * 0.002;
    this.currentMouseStrength +=
      (this.targetMouseStrength - this.currentMouseStrength) * dt * 0.002;
    this.currentThinkingStrength +=
      (this.targetThinkingStrength - this.currentThinkingStrength) * dt * 0.002;
    this.thinkingVector.rotateAround(new THREE.Vector2(0, 0), -0.1 * dt * 0.06);
    const u = this.material.uniforms;
    u.u_thinkingVector.value = this.thinkingVector;
    u.u_thinkingStrength.value = this.currentThinkingStrength;
    u.u_mouseStrength.value = this.currentMouseStrength;
    u.u_time.value = elapsed;
    u.u_mousePosition.value = new THREE.Vector2(
      this.currentMouse.x,
      this.currentMouse.y,
    );
    u.u_scatterPower.value = this.currentScatterPower;
    this.render();
  }

  private render() {
    this.renderer.clearDepth();
    this.renderer.clearColor();
    this.renderer.render(this.scene, this.camera);
  }

  drawOnce() {
    this.render();
  }

  dispose() {
    this.disposed = true;
    this.loop.stop();
    window.clearTimeout(this.thinkingTimeout);
    this.resizeObserver?.disconnect();
    window.clearTimeout(this.resizeTimer);
    this.hoverRoot?.removeEventListener("mousemove", this.onMouseMove);
    this.hoverRoot?.removeEventListener("mouseover", this.onMouseOver);
    this.hoverRoot?.removeEventListener("mouseout", this.onMouseOut);
    this.points?.geometry.dispose();
    this.material.dispose();
    (
      this.material.uniforms.u_pointSpriteSheet.value as THREE.Texture | null
    )?.dispose();
    this.renderer.dispose();
  }
}
