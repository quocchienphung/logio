import * as THREE from "three";
import {
  applyPaletteUniforms,
  Ease,
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
import { RAYS_DOTS_FRAG, RAYS_DOTS_VERT, RAYS_LINES_FRAG, RAYS_LINES_VERT } from "./shaders";

const ORIGIN = new THREE.Vector3(0, -2.3, -0.4);

/**
 * "135+ currencies and payment methods" (class `w`): 810 rays from a common origin with a dot at
 * each tip, shimmer/noise in the shaders, and a grass-like spring physics that bends tips away
 * from the pointer. Intro scales the group from 0.7 → 1 over 1.2s.
 */
export class RaysAnimation implements VizAnimation {
  paused = true;
  colorPalette: Palette;
  colorAnimation: Tween | null = null;
  private scene = new THREE.Scene();
  private linesGroup = new THREE.Group();
  private lineMaterial: THREE.ShaderMaterial;
  private dotsMaterial: THREE.ShaderMaterial;
  private batchedLines: THREE.LineSegments | null = null;
  private dots: THREE.Points | null = null;
  private introStartTime: number | null = null;
  private introDuration = 1200;
  private isIntroActive = true;
  private rotationSpeed = { x: 1e-4, y: 1e-4, z: 0 };
  private enableRotation = false;
  private totalLines = 810;
  private minLineLength = 2.75;
  private maxLineLength = 3.75;
  private cullThreshold = 0;
  private shimmerSpeed = 2;
  private noiseScale = 4;
  private noiseSpeed = 0.1;
  private noiseStrength = 0.2;
  private mouse = new THREE.Vector2();
  private mouseInfluenceRadius = 0.8;
  private mouseRepulsionStrength = 0.07;
  private springStrength = 0.05;
  private damping = 0.9;
  private radialBlend = 0.15;
  private targetFPS = 60;
  private lastPhysicsTime: number | null = null;
  private originalEndPositions: THREE.Vector3[] = [];
  private currentEndPositions: THREE.Vector3[] = [];
  private velocities: THREE.Vector3[] = [];
  private tempVec1 = new THREE.Vector3();
  private tempVec2 = new THREE.Vector3();
  private tempVec3 = new THREE.Vector3();
  private currentWorldPos = new THREE.Vector3();
  private currentNDC = new THREE.Vector3();
  private screenDirection = new THREE.Vector3();
  private radialDirection = new THREE.Vector3();
  private repulsionDirection = new THREE.Vector3();
  private springForce = new THREE.Vector3();

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: THREE.WebGLRenderer,
    private camera: THREE.PerspectiveCamera,
    circleTexture: THREE.Texture,
    palette: Palette,
  ) {
    this.colorPalette = palette;
    this.scene.add(this.linesGroup);
    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        gradientColorTop: { value: palette.colorTop },
        gradientColorBottom: { value: palette.colorBottom },
        gradientColorStop: { value: palette.colorStop },
        opacity: { value: 1 },
        time: { value: 0 },
        shimmerSpeed: { value: this.shimmerSpeed },
        fadeRadius: { value: 3 },
        fadeSharpness: { value: 10.5 },
        noiseStrength: { value: this.noiseStrength },
        noiseScale: { value: this.noiseScale },
        noiseSpeed: { value: this.noiseSpeed },
        origin: { value: ORIGIN },
        animValue: { value: 1 },
        resolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: RAYS_LINES_VERT,
      fragmentShader: RAYS_LINES_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.dotsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        gradientColorTop: { value: palette.colorTop },
        gradientColorBottom: { value: palette.colorBottom },
        gradientColorStop: { value: palette.colorStop },
        pointTexture: { value: circleTexture },
        size: { value: 12 },
        opacity: { value: 0.8 },
        time: { value: 0 },
        shimmerSpeed: { value: this.shimmerSpeed },
        noiseStrength: { value: this.noiseStrength },
        noiseScale: { value: this.noiseScale },
        noiseSpeed: { value: this.noiseSpeed },
        origin: { value: ORIGIN },
        animValue: { value: 1 },
        resolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: RAYS_DOTS_VERT,
      fragmentShader: RAYS_DOTS_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }

  private mousemove = (e: MouseEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  };

  private mouseleave = () => {
    this.mouse.set(999, 999);
  };

  initScene() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    size.multiplyScalar(this.renderer.getPixelRatio());
    this.dotsMaterial.uniforms.resolution.value = size;
    this.lineMaterial.uniforms.resolution.value = size;
    this.createRadialLines();
    this.createDots();
    this.updateColorUniforms(this.colorPalette);
    this.isIntroActive = true;
  }

  private generateSpherePoints(count: number) {
    const points: THREE.Vector3[] = [];
    const golden = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < count; i += 1) {
      const theta = (2 * Math.PI * i) / golden;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      points.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)));
    }
    return points;
  }

  private isPointInView(p: THREE.Vector3) {
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
    const ndc = p.clone().project(this.camera);
    const t = this.cullThreshold;
    return ndc.x >= -1 - t && ndc.x <= 1 + t && ndc.y >= -1 - t && ndc.y <= 1 + t;
  }

  private createRadialLines() {
    const dirs = this.generateSpherePoints(this.totalLines);
    const positions: number[] = [];
    const ids: number[] = [];
    let id = 0;
    dirs.forEach((dir) => {
      const length = this.minLineLength + Math.random() * (this.maxLineLength - this.minLineLength);
      const end = dir.clone().multiplyScalar(length);
      end.add(ORIGIN);
      if (this.isPointInView(end)) {
        this.originalEndPositions.push(end.clone());
        this.currentEndPositions.push(end.clone());
        this.velocities.push(new THREE.Vector3());
        positions.push(ORIGIN.x, ORIGIN.y, ORIGIN.z, end.x, end.y, end.z);
        ids.push(id, id);
        id += 1;
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("lineId", new THREE.Float32BufferAttribute(ids, 1));
    this.batchedLines = new THREE.LineSegments(geometry, this.lineMaterial);
    this.linesGroup.add(this.batchedLines);
  }

  private createDots() {
    const positions: number[] = [];
    const starts: number[] = [];
    const mids: number[] = [];
    const distances: number[] = [];
    const ids: number[] = [];
    this.currentEndPositions.forEach((p, i) => {
      positions.push(p.x, p.y, p.z);
      starts.push(p.x, p.y, p.z);
      const m = SCATTER_POINTS[i % SCATTER_POINTS.length];
      mids.push(m.x, m.y, m.z);
      distances.push(p.clone().sub(ORIGIN).length());
      ids.push(i);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("positionStart", new THREE.Float32BufferAttribute(starts, 3));
    geometry.setAttribute("positionMid", new THREE.Float32BufferAttribute(mids, 3));
    geometry.setAttribute("distance", new THREE.Float32BufferAttribute(distances, 1));
    geometry.setAttribute("lineId", new THREE.Float32BufferAttribute(ids, 1));
    this.dots = new THREE.Points(geometry, this.dotsMaterial);
    this.linesGroup.add(this.dots);
  }

  private updatePhysics(time: number) {
    if (this.lastPhysicsTime === null) {
      this.lastPhysicsTime = time;
      return;
    }
    const dtMs = Math.min(time - this.lastPhysicsTime, 100);
    this.lastPhysicsTime = time;
    if (dtMs <= 0) return;
    const dt = (dtMs / 1000) * this.targetFPS;
    const mx = this.mouse.x;
    const my = this.mouse.y;
    const n = this.currentEndPositions.length;
    for (let i = 0; i < n; i += 1) {
      const current = this.currentEndPositions[i];
      const original = this.originalEndPositions[i];
      const velocity = this.velocities[i];
      this.currentWorldPos.copy(current);
      this.linesGroup.localToWorld(this.currentWorldPos);
      this.currentNDC.copy(this.currentWorldPos).project(this.camera);
      const dx = this.currentNDC.x - mx;
      const dy = this.currentNDC.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const depth = 1 - Math.max(0, Math.min(1, (this.currentNDC.z + 1) / 2));
      const radius = this.mouseInfluenceRadius * (0.8 + 0.4 * depth);
      if (dist < radius && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const depthBoost = 0.8 + 0.4 * depth;
        let force = (1 - dist / radius) ** 2 * this.mouseRepulsionStrength * depthBoost;
        force *= 0.8 + 0.4 * Math.sin(0.1 * i + 0.001 * time);
        const right = this.tempVec1.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = this.tempVec2.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.screenDirection.copy(right).multiplyScalar(nx).addScaledVector(up, ny).normalize();
        this.radialDirection.copy(original).sub(ORIGIN).normalize();
        this.repulsionDirection
          .copy(this.screenDirection)
          .multiplyScalar(1 - this.radialBlend)
          .addScaledVector(this.radialDirection, this.radialBlend)
          .normalize();
        this.tempVec3.copy(this.repulsionDirection).multiplyScalar(force * dt);
        velocity.add(this.tempVec3);
      }
      const displacement = current.distanceTo(original);
      this.springForce.copy(original).sub(current);
      const stiffness = 1 + (displacement / 2) ** 1.5;
      this.springForce.multiplyScalar(this.springStrength * stiffness * dt);
      velocity.add(this.springForce);
      const damping = (dist < 1.5 * this.mouseInfluenceRadius ? 0.85 * this.damping : this.damping) ** dt;
      velocity.multiplyScalar(damping);
      this.tempVec3.copy(velocity).multiplyScalar(dt);
      current.add(this.tempVec3);
    }
    if (!this.batchedLines?.geometry || !this.dots?.geometry) return;
    const linePos = this.batchedLines.geometry.getAttribute("position") as THREE.BufferAttribute;
    const dotPos = this.dots.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < n; i += 1) {
      const p = this.currentEndPositions[i];
      linePos.setXYZ(2 * i + 1, p.x, p.y, p.z);
      dotPos.setXYZ(i, p.x, p.y, p.z);
    }
    linePos.needsUpdate = true;
    dotPos.needsUpdate = true;
  }

  updateAndRender = (time: number) => {
    if (!this.batchedLines || !this.dots) return;
    const seconds = 0.001 * time;
    if (this.isIntroActive) {
      if (this.introStartTime === null) this.introStartTime = time;
      const t = Math.min((time - this.introStartTime) / this.introDuration, 1);
      const eased = 1 - (1 - t) ** 3;
      this.linesGroup.scale.setScalar(0.7 + (1 - 0.7) * eased);
      if (t >= 1) this.isIntroActive = false;
    }
    if (this.enableRotation) {
      this.linesGroup.rotation.x += this.rotationSpeed.x;
      this.linesGroup.rotation.y += this.rotationSpeed.y;
      this.linesGroup.rotation.z += this.rotationSpeed.z;
    }
    this.updatePhysics(time);
    this.lineMaterial.uniforms.time.value = seconds;
    this.dotsMaterial.uniforms.time.value = seconds;
    this.renderer.render(this.scene, this.camera);
  };

  cancelIntro() {
    this.isIntroActive = false;
    this.linesGroup.scale.setScalar(1);
  }

  resize(size: THREE.Vector2) {
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
    const res = new THREE.Vector2();
    this.renderer.getSize(res);
    res.multiplyScalar(this.renderer.getPixelRatio());
    this.dotsMaterial.uniforms.resolution.value = res;
    this.lineMaterial.uniforms.resolution.value = res;
  }

  animateIn(points: THREE.Vector3[], onComplete: (v: number) => void) {
    if (this.dots) writeStartPoints(this.dots.geometry, points);
    const d = this.dotsMaterial.uniforms;
    const l = this.lineMaterial.uniforms;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      l.animValue.value = Ease.inOutSine(progress(0.54, 1, t));
      d.animValue.value = t;
      d.opacity.value = progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  animateOut(onComplete: (v: number) => void) {
    if (this.dots) snapshotStartPoints(this.dots.geometry);
    const d = this.dotsMaterial.uniforms;
    const l = this.lineMaterial.uniforms;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      l.animValue.value = 1 - Ease.outQuad(progress(0, 0.2, t));
      d.animValue.value = t;
      d.opacity.value = 1 - progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  reset() {}

  getPoints() {
    return this.dots ? readPoints(this.dots.geometry.getAttribute("position")) : [];
  }

  updateColorUniforms(p: Palette) {
    applyPaletteUniforms(this.dotsMaterial.uniforms, p);
    applyPaletteUniforms(this.lineMaterial.uniforms, p);
  }

  setColorPalette(p: Palette, animate: boolean) {
    transitionPalette(this, p, animate);
  }

  addListeners() {
    this.canvas.addEventListener("mousemove", this.mousemove);
    this.canvas.addEventListener("mouseleave", this.mouseleave);
  }

  removeListeners() {
    this.canvas.removeEventListener("mousemove", this.mousemove);
    this.canvas.removeEventListener("mouseleave", this.mouseleave);
  }

  dispose() {
    this.removeListeners();
    this.batchedLines?.geometry.dispose();
    this.dots?.geometry.dispose();
    this.lineMaterial.dispose();
    this.dotsMaterial.dispose();
  }
}
