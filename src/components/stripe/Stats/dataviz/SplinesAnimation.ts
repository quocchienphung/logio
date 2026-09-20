import * as THREE from "three";
import {
  applyPaletteUniforms,
  documentRect,
  Ease,
  mapRange,
  Palette,
  progress,
  readPoints,
  SCATTER_POINTS,
  snapshotStartPoints,
  transitionPalette,
  Tween,
  writeStartPoints,
  type VizAnimation,
} from "./core";
import { SPLINE_LINES_FRAG, SPLINE_LINES_VERT, SPLINE_POINTS_FRAG, SPLINE_POINTS_VERT } from "./shaders";

const { clamp, randFloat, randInt } = THREE.MathUtils;
const SPLINE_OFFSET = new THREE.Vector3(0, -0.75, 0.165);
const SPLINE_COUNT = 98;
const ANCHOR_COUNT = Math.floor(SPLINE_COUNT / 3) + 1;

const heartbeatUniforms = () => ({
  frame: { value: 0 },
  mouseRayDirection: { value: new THREE.Vector3() },
  mouseRayOrigin: { value: new THREE.Vector3() },
  mousePower: { value: 0 },
  resolution: { value: new THREE.Vector2(1, 1) },
  heartbeatSpeed: { value: 1.5 },
  heartbeatFrequency: { value: 9000 },
  lineOpacity: { value: 1 },
  floatSpeed: { value: 1e-4 },
  floatPower: { value: 2 },
  floatAmount: { value: 0.05 },
  gradientColorTop: { value: new THREE.Color("#2a2a2a") },
  gradientColorBottom: { value: new THREE.Color("#ffffff") },
  gradientColorStop: { value: new THREE.Vector2(0, 0.75) },
  animValue: { value: 1 },
});

/** 98 Catmull-Rom splines from the left edge to 33 right-hand anchors, with a dot at each end (class `Y`). */
class Splines {
  lineMeshes: THREE.Line[];
  pointMesh: THREE.Points;
  private tension = 0.4;

  constructor(
    private lineMaterial: THREE.ShaderMaterial,
    private pointMaterial: THREE.ShaderMaterial,
  ) {
    const built = this.generateSplineMeshes();
    this.lineMeshes = built.lineMeshes;
    this.pointMesh = built.pointMesh;
  }

  dispose() {
    this.lineMeshes.forEach((m) => m.geometry.dispose());
    this.pointMesh.geometry.dispose();
  }

  private generateSplinePoints(t: number, anchor: THREE.Vector3) {
    const bend = mapRange(0, 1, -0.7, 0.7, t);
    const y = mapRange(0, 1, -2.2, 2.4, t);
    const start = new THREE.Vector3(randFloat(-3.45, -3.5), y, 0);
    const middle = new THREE.Vector3(0, randFloat(-0.008, 0.008), 0);
    const c1 = start.clone().lerp(middle, 0.5).add(new THREE.Vector3(0, bend, 0));
    const c2 = anchor.clone().lerp(middle, 0.5).multiply(new THREE.Vector3(1, 1.75, 1));
    const points = [start, c1, middle, c2, anchor];
    points.forEach((p) => p.add(SPLINE_OFFSET));
    return points;
  }

  private generatePoints(starts: THREE.Vector3[], ends: THREE.Vector3[], cycles: number[]) {
    const position: number[] = [];
    const positionStart: number[] = [];
    const positionMid: number[] = [];
    const randomness: number[] = [];
    const cycle: number[] = [];
    const type: number[] = [];
    const pointUv: number[] = [];
    const mouseStart: number[] = [];
    const mouseEnd: number[] = [];
    const total = 2 * starts.length;
    const push = (p: THREE.Vector3, mid: THREE.Vector3, i: number, kind: number) => {
      position.push(p.x, p.y, p.z);
      positionStart.push(p.x, p.y, p.z);
      positionMid.push(mid.x, mid.y, mid.z);
      randomness.push(Math.random());
      cycle.push(cycles[i]);
      type.push(kind);
      pointUv.push(i / total, i / total);
      mouseStart.push(starts[i].x, starts[i].y, starts[i].z);
      mouseEnd.push(ends[i].x, ends[i].y, ends[i].z);
    };
    starts.forEach((p, i) => push(p, SCATTER_POINTS[randInt(0, SCATTER_POINTS.length - 1)], i, 0));
    ends.forEach((p, i) => push(p, SCATTER_POINTS[(i + starts.length) % SCATTER_POINTS.length], i, 1));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute("positionStart", new THREE.Float32BufferAttribute(positionStart, 3));
    geometry.setAttribute("positionMid", new THREE.Float32BufferAttribute(positionMid, 3));
    geometry.setAttribute("pointUv", new THREE.Float32BufferAttribute(pointUv, 2));
    geometry.setAttribute("randomness", new THREE.Float32BufferAttribute(randomness, 1));
    geometry.setAttribute("cycle", new THREE.Float32BufferAttribute(cycle, 1));
    geometry.setAttribute("type", new THREE.Float32BufferAttribute(type, 1));
    geometry.setAttribute("mouseStartPoint", new THREE.Float32BufferAttribute(mouseStart, 3));
    geometry.setAttribute("mouseEndPoint", new THREE.Float32BufferAttribute(mouseEnd, 3));
    return geometry;
  }

  private generateSplineMeshes() {
    const lineMeshes: THREE.Line[] = [];
    const starts: THREE.Vector3[] = [];
    const ends: THREE.Vector3[] = [];
    const cycles: number[] = [];
    const anchors: THREE.Vector3[] = [];
    const cycleValues: number[] = [];
    for (let i = 0; i < ANCHOR_COUNT; i += 1) {
      const t = i / (SPLINE_COUNT / 3);
      anchors.push(new THREE.Vector3(randFloat(3.4, 3.6), mapRange(0, 1, -1.55, 1.8, t), 0));
    }
    anchors.forEach((_, i) => cycleValues.push(1 - i / anchors.length));
    // Fisher–Yates shuffle so heartbeat phases are not ordered top-to-bottom.
    for (let n = cycleValues.length; n !== 0; ) {
      const j = Math.floor(Math.random() * n);
      n -= 1;
      [cycleValues[n], cycleValues[j]] = [cycleValues[j], cycleValues[n]];
    }
    for (let i = 0; i < SPLINE_COUNT; i += 1) {
      const a = Math.floor(i / 3) % anchors.length;
      const anchor = anchors[a].clone();
      const cycle = cycleValues[a];
      cycleValues[a] += 0.4;
      const points = this.generateSplinePoints(i / (SPLINE_COUNT - 1), anchor);
      const { geometry, lastPosition } = this.generateSplineGeometry(points, cycle, true);
      lineMeshes.push(new THREE.Line(geometry, this.lineMaterial));
      starts.push(points[0]);
      ends.push(lastPosition);
      cycles.push(cycle);
    }
    return { lineMeshes, pointMesh: new THREE.Points(this.generatePoints(starts, ends, cycles), this.pointMaterial) };
  }

  private generateSplineGeometry(points: THREE.Vector3[], cycle = 0, primary = false) {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", this.tension);
    const position: number[] = [];
    const percent: number[] = [];
    const cycles: number[] = [];
    const primaries: number[] = [];
    const startPoint: number[] = [];
    const endPoint: number[] = [];
    const p = new THREE.Vector3();
    const first = new THREE.Vector3();
    const last = new THREE.Vector3();
    curve.getPoint(0, first);
    curve.getPoint(1, last);
    for (let i = 0; i < 128; i += 1) {
      const t = i / 127;
      curve.getPoint(t, p);
      position.push(p.x, p.y, p.z);
      percent.push(t);
      cycles.push(cycle);
      primaries.push(Number(primary));
      startPoint.push(first.x, first.y, first.z);
      endPoint.push(last.x, last.y, last.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute("percent", new THREE.Float32BufferAttribute(percent, 1));
    geometry.setAttribute("primary", new THREE.Float32BufferAttribute(primaries, 1));
    geometry.setAttribute("cycle", new THREE.Float32BufferAttribute(cycles, 1));
    geometry.setAttribute("startPoint", new THREE.Float32BufferAttribute(startPoint, 3));
    geometry.setAttribute("endPoint", new THREE.Float32BufferAttribute(endPoint, 3));
    const n = position.length;
    return { geometry, lastPosition: new THREE.Vector3(position[n - 3], position[n - 2], position[n - 1]) };
  }

  getPoints() {
    return readPoints(this.pointMesh.geometry.getAttribute("position"));
  }
}

/**
 * "200M+ active subscriptions" (class `er`): heartbeat pulses travel along the splines (9s cycle,
 * phase per anchor) while the whole field floats gently; the pointer pushes dots and lines away.
 */
export class SplinesAnimation implements VizAnimation {
  paused = true;
  colorPalette: Palette;
  colorAnimation: Tween | null = null;
  private scene = new THREE.Scene();
  private lines: Splines | null = null;
  private mousePower = 0;
  private targetMousePosition = new THREE.Vector2();
  private currentMousePosition = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private rect = new DOMRect();
  private lineMaterial: THREE.ShaderMaterial;
  private pointMaterial: THREE.ShaderMaterial;

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: THREE.WebGLRenderer,
    private camera: THREE.PerspectiveCamera,
    circleTexture: THREE.Texture,
    palette: Palette,
  ) {
    this.colorPalette = palette;
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    size.multiplyScalar(this.renderer.getPixelRatio());
    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: heartbeatUniforms(),
      vertexShader: SPLINE_LINES_VERT,
      fragmentShader: SPLINE_LINES_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.lineMaterial.uniforms.resolution.value = size;
    this.pointMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...heartbeatUniforms(),
        opacity: { value: 1 },
        pointSize: { value: 12 },
        circleTexture: { value: circleTexture },
      },
      vertexShader: SPLINE_POINTS_VERT,
      fragmentShader: SPLINE_POINTS_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.pointMaterial.uniforms.resolution.value = size;
    this.updateColorUniforms(palette);
  }

  private mousemove = (e: MouseEvent) => {
    if (this.paused) return;
    const x = ((e.clientX - (this.rect.left - window.scrollX)) / this.rect.width) * 2 - 1;
    const y = (-(e.clientY - (this.rect.top - window.scrollY)) / this.rect.height) * 2 + 1;
    this.mousePower = clamp(this.mousePower + 0.05, 0, 1);
    this.targetMousePosition.set(x, y);
  };

  initScene() {
    this.lines = new Splines(this.lineMaterial, this.pointMaterial);
    this.scene.add(this.lines.pointMesh, ...this.lines.lineMeshes);
  }

  private updateMousePhysics(dt: number) {
    const t = 1 - 0.9 ** (dt / 16.67);
    this.currentMousePosition.lerp(this.targetMousePosition, t);
    this.raycaster.setFromCamera(this.currentMousePosition, this.camera);
    const { ray } = this.raycaster;
    for (const m of [this.pointMaterial, this.lineMaterial]) {
      m.uniforms.mouseRayDirection.value = ray.direction;
      m.uniforms.mouseRayOrigin.value = ray.origin;
      m.uniforms.mousePower.value = this.mousePower;
    }
    this.mousePower *= 1 - 0.25 * t;
  }

  updateAndRender = (time: number, dt: number) => {
    if (!this.lines) return;
    this.lineMaterial.uniforms.frame.value = time;
    this.pointMaterial.uniforms.frame.value = time;
    this.updateMousePhysics(dt);
    this.renderer.render(this.scene, this.camera);
  };

  resize(size: THREE.Vector2) {
    this.rect = documentRect(this.canvas);
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
    this.lineMaterial.uniforms.resolution.value = size;
    this.pointMaterial.uniforms.resolution.value = size;
  }

  getPoints() {
    return this.lines ? this.lines.getPoints() : [];
  }

  reset() {
    this.lineMaterial.uniforms.animValue.value = 1;
    this.pointMaterial.uniforms.animValue.value = 1;
    this.pointMaterial.uniforms.opacity.value = 1;
  }

  animateIn(points: THREE.Vector3[], onComplete: (v: number) => void) {
    if (!this.lines) return new Tween(1.25);
    writeStartPoints(this.lines.pointMesh.geometry, points);
    const p = this.pointMaterial.uniforms;
    const l = this.lineMaterial.uniforms;
    l.animValue.value = 0;
    p.animValue.value = 0;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      l.animValue.value = Ease.inOutQuad(progress(0.54, 1, t));
      p.animValue.value = t;
      p.opacity.value = progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  animateOut(onComplete: (v: number) => void) {
    if (!this.lines) return new Tween(1.25);
    snapshotStartPoints(this.lines.pointMesh.geometry);
    const p = this.pointMaterial.uniforms;
    const l = this.lineMaterial.uniforms;
    l.animValue.value = 1;
    p.animValue.value = 1;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      l.animValue.value = 1 - Ease.outSine(progress(0, 0.2, t));
      p.animValue.value = t;
      p.opacity.value = 1 - progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  updateColorUniforms(p: Palette) {
    applyPaletteUniforms(this.pointMaterial.uniforms, p);
    applyPaletteUniforms(this.lineMaterial.uniforms, p);
  }

  setColorPalette(p: Palette, animate: boolean) {
    transitionPalette(this, p, animate);
  }

  addListeners() {
    this.canvas.addEventListener("mousemove", this.mousemove);
  }

  removeListeners() {
    this.canvas.removeEventListener("mousemove", this.mousemove);
  }

  dispose() {
    this.removeListeners();
    this.lines?.dispose();
    this.lineMaterial.dispose();
    this.pointMaterial.dispose();
  }
}
