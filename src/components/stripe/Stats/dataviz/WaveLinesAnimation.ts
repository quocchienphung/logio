import * as THREE from "three";
import {
  applyPaletteUniforms,
  Ease,
  Palette,
  progress,
  SCATTER_POINTS,
  snapshotStartPoints,
  transitionPalette,
  Tween,
  writeStartPoints,
  type VizAnimation,
} from "./core";
import { WAVE_DOTS_FRAG, WAVE_DOTS_VERT, WAVE_LINES_FRAG, WAVE_LINES_VERT } from "./shaders";

const PATH_OFFSET = new THREE.Vector3(-1.6, 0, -9);

interface CurvePoint {
  t: number;
  x: number;
  y: number;
  z: number;
}

interface Slot {
  t: number;
  center: THREE.Vector3;
  bottom: THREE.Vector3;
  top: THREE.Vector3;
}

interface Pulse {
  pos: number;
  speed: number;
  lastFrameTime: number;
}

/**
 * "99.999% historical uptime" (class `ev`): 600 vertical lines laid along a receding sinusoidal
 * path with a dot at every top end; a pulse runs down the path every 2.8s (brightening and
 * displacing lines near the front), a travelling noise band shimmers along it, and the pointer
 * pushes the tops around with spring physics. The reference's slot-cycling tween is never started
 * on the homepage, so only the static slot layout is ported.
 */
export class WaveLinesAnimation implements VizAnimation {
  paused = true;
  colorPalette: Palette;
  colorAnimation: Tween | null = null;
  private scene = new THREE.Scene();
  private linesGroup = new THREE.Group();
  private lineMaterial: THREE.ShaderMaterial;
  private dotsMaterial: THREE.ShaderMaterial;
  private linesMesh: THREE.LineSegments | null = null;
  private linesGeometry: THREE.BufferGeometry | null = null;
  private dots: THREE.Points | null = null;

  // Path
  private pathWidth = 17.5;
  private pathHeight = 6;
  private numOscillations = 4;
  private oscillationSharpness = 1e-5;
  private oscillationRoundness = 1.7;
  private numLines = 600;
  private oscillationPhaseOffset = -0.05;
  private pathWidthStart = 0.9;
  private pathWidthEnd = 0.9;
  private depthFadeStart = 0;
  private depthFadeEnd = 0.7;
  private depthFadeIntensity = 1;
  private lineDensityBase = 1;
  private lineDensityAtTurns = 0.6;
  private yStartOffset = -4.9;
  private yRiseAmount = 15;
  private pathXStart = 0;
  private pathXEnd = 6;
  private lineFadeBottom = 0;
  private lineFadeTop = 1;
  private zDepthRange = 20;
  private zDepthOffset = 0;
  private hiddenPreSlots = 1;
  private hiddenPreSlotSpacing = 1;
  private totalLinesCount = 0;
  private slotTs: number[] = [];
  private slotLinePositions: THREE.Vector3[][] = [];
  private lineToSlotIndex: number[] = [];
  private lineFadeAlphas: number[] = [];

  // Physics
  private reusablePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private reusableMouseWorld = new THREE.Vector3();
  private reusableSpringForce = new THREE.Vector3();
  private mouse = new THREE.Vector2(1, 1);
  private raycaster = new THREE.Raycaster();
  private mouseInfluenceRadius = 2.2;
  private mouseRepulsionStrength = 0.2;
  private springStrength = 0.075;
  private damping = 0.825;
  private targetFPS = 50;
  private originalPositions: THREE.Vector3[][] = [];
  private currentPositions: THREE.Vector3[][] = [];
  private velocities: THREE.Vector3[][] = [];

  // Noise band
  private noiseScale = 10;
  private noiseSpeed = 0.08;
  private noiseIntensity = 0.3;
  private noiseOffset = 0;
  private noiseWidth = 0.07;

  // Pulse
  private pulseEnabled = true;
  private pulseInterval = 2800;
  private pulseSpeed = 0.1;
  private pulseAcceleration = 0.1;
  private pulseAccelStartPos = 0.2;
  private pulseFirstDelay = 0;
  private pulseLastTriggerTime = 0;
  private pulseFirstTriggered = false;
  private activePulses: Pulse[] = [];
  private pulseWaveHalfWidth = 0.04;
  private pulseSizeBoost = 0.5;
  private pulseDisplacementMax = 0.5;
  private pulseDisplacementFalloffEnd = 0.07;
  private pulseColor = new THREE.Vector3(0.92, 0.92, 0.92); // was a pale blue; neutral highlight
  private pulseColorWidth = 0.08;
  private pulseColorOffset = -0.01;
  private pulseActiveThreshold = 0.16;
  private pulseWaveFrequency = 2;
  private pulseOpacityBoost = 0.5;
  private pulseLineOpacityBoost = 0.9;
  private pulseColorBrightness = new THREE.Vector3(0.35, 0.3, 0.25);
  private pulseLineColorBrightness = new THREE.Vector3(0.3, 0.25, 0.2);
  private pulseColorMode = 1;
  private pulseSaturationBoost = -0.3;
  private pulseLightnessBoost = -0.15;
  private pulseLineYOffset = 0.12;
  private pulseOpacityFalloffEnd = 0.15;

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
        pulseColor: { value: this.pulseColor },
        pulseColorBrightness: { value: this.pulseLineColorBrightness },
        pulseOpacityBoost: { value: this.pulseLineOpacityBoost },
        pulseColorMode: { value: this.pulseColorMode },
        pulseSaturationBoost: { value: this.pulseSaturationBoost },
        pulseLightnessBoost: { value: this.pulseLightnessBoost },
        pulseLineYOffset: { value: this.pulseLineYOffset },
        pulseSizeBoost: { value: this.pulseSizeBoost },
        pulseOpacityFalloffEnd: { value: this.pulseOpacityFalloffEnd },
        opacity: { value: 1 },
        time: { value: 0 },
        animValue: { value: 1 },
        lineFadeBottom: { value: this.lineFadeBottom },
        lineFadeTop: { value: this.lineFadeTop },
        noiseIntensity: { value: this.noiseIntensity },
        resolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: WAVE_LINES_VERT,
      fragmentShader: WAVE_LINES_FRAG,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.dotsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        gradientColorTop: { value: palette.colorTop },
        gradientColorBottom: { value: palette.colorBottom },
        gradientColorStop: { value: palette.colorStop },
        pulseColor: { value: this.pulseColor },
        pulseColorBrightness: { value: this.pulseColorBrightness },
        pulseOpacityBoost: { value: this.pulseOpacityBoost },
        pulseColorMode: { value: this.pulseColorMode },
        pulseSaturationBoost: { value: this.pulseSaturationBoost },
        pulseLightnessBoost: { value: this.pulseLightnessBoost },
        pulseSizeBoost: { value: this.pulseSizeBoost },
        pulseOpacityFalloffEnd: { value: this.pulseOpacityFalloffEnd },
        pointTexture: { value: circleTexture },
        opacity: { value: 1 },
        time: { value: 0 },
        animValue: { value: 1 },
        noiseIntensity: { value: this.noiseIntensity },
        resolution: { value: new THREE.Vector2(1, 1) },
        size: { value: 12 },
      },
      vertexShader: WAVE_DOTS_VERT,
      fragmentShader: WAVE_DOTS_FRAG,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
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
    this.lineMaterial.uniforms.resolution.value = size;
    this.dotsMaterial.uniforms.resolution.value = size;
    this.createHelixPath();
    this.createDots();
    this.updateColorUniforms(this.colorPalette);
  }

  // ------------------------------------------------------------------ path

  private createHelixPath() {
    this.originalPositions = [];
    this.velocities = [];
    this.lineToSlotIndex = [];
    this.lineFadeAlphas = [];
    this.slotLinePositions = [];
    this.slotTs = [];
    const curve = this.generateCurve();
    const lines = this.distributeLines(curve);
    this.createLines(this.setupSlots(lines));
  }

  private generateCurve() {
    const n = 2 * this.numLines;
    const points: (CurvePoint & { distance: number })[] = [];
    let distance = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const p = this.calculatePointOnCurve(t);
      if (i > 0) {
        const prev = points[i - 1];
        distance += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
      }
      points.push({ t, x: p.x, y: p.y, z: p.z, distance });
    }
    return { points, totalDistance: distance };
  }

  private calculatePointOnCurve(t: number) {
    const phase = (t + this.oscillationPhaseOffset) * Math.PI * 2 * this.numOscillations;
    const wave = this.calculateWaveform(phase);
    const width = this.pathWidthStart + (this.pathWidthEnd - this.pathWidthStart) * t;
    const offset = (this.pathWidth / 2) * wave * width;
    return {
      x: this.pathXStart + (this.pathXEnd - this.pathXStart) * t + offset,
      y: this.yStartOffset + t * this.yRiseAmount,
      z: this.zDepthOffset - t * this.zDepthRange,
    };
  }

  private calculateWaveform(phase: number) {
    const p = phase / this.oscillationRoundness;
    const sine = Math.sin(p) * this.oscillationRoundness;
    const triangle = ((2 * Math.asin(Math.sin(p))) / Math.PI) * this.oscillationRoundness;
    const sharpness = this.oscillationSharpness || 0.7;
    return sine * (1 - sharpness) + triangle * sharpness;
  }

  private distributeLines(curve: { points: (CurvePoint & { distance: number })[]; totalDistance: number }) {
    const result: CurvePoint[] = [];
    let along = 0;
    for (let i = 0; i < this.numLines; i += 1) {
      const t = i / (this.numLines - 1);
      along += curve.totalDistance / this.numLines / this.calculateDensityFactor(t);
      const p = this.interpolateOnCurve(curve.points, along);
      p.x += PATH_OFFSET.x;
      p.y += PATH_OFFSET.y;
      p.z += PATH_OFFSET.z;
      result.push(p);
    }
    return result;
  }

  private calculateDensityFactor(t: number) {
    const phase = (t + this.oscillationPhaseOffset) * Math.PI * 2 * this.numOscillations;
    return this.lineDensityAtTurns + (this.lineDensityBase - this.lineDensityAtTurns) * Math.abs(Math.cos(phase));
  }

  private interpolateOnCurve(points: (CurvePoint & { distance: number })[], distance: number): CurvePoint {
    let i = 0;
    while (i < points.length - 1 && points[i].distance < distance) i += 1;
    if (i === 0) return { t: points[0].t, x: points[0].x, y: points[0].y, z: points[0].z };
    if (i >= points.length) {
      const l = points[points.length - 1];
      return { t: l.t, x: l.x, y: l.y, z: l.z };
    }
    const a = points[i - 1];
    const b = points[i];
    const f = (distance - a.distance) / (b.distance - a.distance);
    return { t: a.t + (b.t - a.t) * f, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
  }

  private setupSlots(lines: CurvePoint[]) {
    const slots: Slot[] = [];
    for (let i = 0; i < this.hiddenPreSlots; i += 1) {
      slots.push(this.extrapolateSlot(lines, -(i + 1) * (this.hiddenPreSlotSpacing || 1)));
    }
    for (const p of lines) {
      slots.push({
        t: p.t,
        center: new THREE.Vector3(p.x, p.y, p.z - 10),
        bottom: new THREE.Vector3(p.x, p.y - this.pathHeight / 2, p.z),
        top: new THREE.Vector3(p.x, p.y + this.pathHeight / 2, p.z),
      });
    }
    return slots;
  }

  private extrapolateSlot(lines: CurvePoint[], steps: number): Slot {
    const h = this.pathHeight / 2;
    if (lines.length < 2) {
      const p = lines[0] || { t: 0, x: 0, y: 0, z: 0 };
      return {
        t: Math.max(0, p.t + 0.001 * steps),
        center: new THREE.Vector3(p.x, p.y, p.z),
        bottom: new THREE.Vector3(p.x, p.y - h, p.z),
        top: new THREE.Vector3(p.x, p.y + h, p.z),
      };
    }
    const a = lines[0];
    const b = lines[1];
    const x = a.x + (b.x - a.x) * steps;
    const y = a.y + (b.y - a.y) * steps;
    const z = a.z + (b.z - a.z) * steps;
    return {
      t: Math.max(0, a.t + (b.t - a.t) * steps),
      center: new THREE.Vector3(x, y, z),
      bottom: new THREE.Vector3(x, y - h, z),
      top: new THREE.Vector3(x, y + h, z),
    };
  }

  private createLines(slots: Slot[]) {
    this.totalLinesCount = slots.length;
    this.slotLinePositions = slots.map((s) => [s.bottom.clone(), s.top.clone()]);
    this.slotTs = slots.map((s) => s.t);
    const position: number[] = [];
    const linePosition: number[] = [];
    const lineId: number[] = [];
    const linePercent: number[] = [];
    const lineCount: number[] = [];
    const noiseValue: number[] = [];
    const lineOpacity: number[] = [];
    for (let i = 0; i < this.totalLinesCount; i += 1) {
      const s = slots[i];
      const hidden = i < this.hiddenPreSlots;
      const pct = i / (this.totalLinesCount - 1);
      position.push(s.bottom.x, s.bottom.y, s.bottom.z, s.top.x, s.top.y, s.top.z);
      linePosition.push(0, 1);
      lineId.push(i, i);
      linePercent.push(pct, pct);
      lineCount.push(this.totalLinesCount, this.totalLinesCount);
      noiseValue.push(0, 0);
      lineOpacity.push(hidden ? 0 : 1, hidden ? 0 : 1);
      this.originalPositions.push([s.bottom.clone(), s.top.clone()]);
      this.currentPositions.push([s.bottom.clone(), s.top.clone()]);
      this.velocities.push([new THREE.Vector3(), new THREE.Vector3()]);
      this.lineToSlotIndex.push(i);
      this.lineFadeAlphas.push(hidden ? 0 : 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    g.setAttribute("linePosition", new THREE.Float32BufferAttribute(linePosition, 1));
    g.setAttribute("lineId", new THREE.Float32BufferAttribute(lineId, 1));
    g.setAttribute("linePercent", new THREE.Float32BufferAttribute(linePercent, 1));
    g.setAttribute("lineCount", new THREE.Float32BufferAttribute(lineCount, 1));
    g.setAttribute("noiseValue", new THREE.Float32BufferAttribute(noiseValue, 1));
    g.setAttribute("lineOpacity", new THREE.Float32BufferAttribute(lineOpacity, 1));
    g.setAttribute("pulseIntensity", new THREE.Float32BufferAttribute(new Float32Array(2 * this.totalLinesCount), 1));
    g.setAttribute("pulseDisplacement", new THREE.Float32BufferAttribute(new Float32Array(2 * this.totalLinesCount), 1));
    this.linesGeometry = g;
    this.linesMesh = new THREE.LineSegments(g, this.lineMaterial);
    this.linesMesh.frustumCulled = false;
    this.linesGroup.add(this.linesMesh);
  }

  private createDots() {
    const position: number[] = [];
    const positionStart: number[] = [];
    const positionMid: number[] = [];
    const lineId: number[] = [];
    const normalizedY: number[] = [];
    const depthOpacity: number[] = [];
    const noiseValue: number[] = [];
    const linePercent: number[] = [];
    this.currentPositions.forEach((pair, i) => {
      const slot = this.lineToSlotIndex[i];
      const top = pair[1];
      const mid = SCATTER_POINTS[THREE.MathUtils.randInt(0, SCATTER_POINTS.length - 1)];
      position.push(top.x, top.y, top.z);
      positionStart.push(top.x, top.y, top.z);
      positionMid.push(mid.x, mid.y, mid.z);
      lineId.push(i);
      normalizedY.push((top.y + 6) / 12);
      depthOpacity.push(this.calculateDepthFade(this.slotTs[slot] ?? 0) * (this.lineFadeAlphas[i] ?? 1));
      noiseValue.push(Math.random());
      linePercent.push(i / (this.totalLinesCount - 1));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    g.setAttribute("positionStart", new THREE.Float32BufferAttribute(positionStart, 3));
    g.setAttribute("positionMid", new THREE.Float32BufferAttribute(positionMid, 3));
    g.setAttribute("lineId", new THREE.Float32BufferAttribute(lineId, 1));
    g.setAttribute("linePercent", new THREE.Float32BufferAttribute(linePercent, 1));
    g.setAttribute("normalizedY", new THREE.Float32BufferAttribute(normalizedY, 1));
    g.setAttribute("depthOpacity", new THREE.Float32BufferAttribute(depthOpacity, 1));
    g.setAttribute("noiseValue", new THREE.Float32BufferAttribute(noiseValue, 1));
    g.setAttribute("pulseIntensity", new THREE.Float32BufferAttribute(new Float32Array(this.totalLinesCount), 1));
    g.setAttribute("pulseDisplacement", new THREE.Float32BufferAttribute(new Float32Array(this.totalLinesCount), 1));
    this.dots = new THREE.Points(g, this.dotsMaterial);
    this.dots.renderOrder = (this.totalLinesCount || this.numLines + this.hiddenPreSlots) + 1;
    this.linesGroup.add(this.dots);
  }

  private calculateDepthFade(t: number) {
    if (t < this.depthFadeStart) return 1;
    if (t > this.depthFadeEnd) return 1 - this.depthFadeIntensity;
    return 1 - ((t - this.depthFadeStart) / (this.depthFadeEnd - this.depthFadeStart)) * this.depthFadeIntensity;
  }

  // --------------------------------------------------------------- per frame

  /** A band of `noiseScale` pulses travels along the path; each line's noise = closeness to a band. */
  private updateNoiseValuesAsPulse(seconds: number) {
    this.noiseOffset = (seconds * this.noiseSpeed) % 1;
    const bands = Math.floor(this.noiseScale);
    const value = (t: number) => {
      let v = 0;
      for (let b = 0; b < bands; b += 1) {
        const center = (this.noiseOffset + b / bands) % 1;
        const d = Math.min(Math.abs(t - center), Math.abs(t - center + 1), Math.abs(t - center - 1));
        if (d < this.noiseWidth) v = Math.max(v, (1 + Math.cos((Math.PI * d) / this.noiseWidth)) * 0.5);
      }
      return v;
    };
    if (this.linesGeometry) {
      const attr = this.linesGeometry.getAttribute("noiseValue") as THREE.BufferAttribute;
      for (let i = 0; i < this.totalLinesCount; i += 1) {
        const v = value(this.slotTs[this.lineToSlotIndex[i]] ?? 0);
        attr.setX(2 * i, v);
        attr.setX(2 * i + 1, v);
      }
      attr.needsUpdate = true;
      this.lineMaterial.uniforms.noiseIntensity.value = this.noiseIntensity;
    }
    if (this.dots) {
      const attr = this.dots.geometry.getAttribute("noiseValue") as THREE.BufferAttribute;
      for (let i = 0; i < this.totalLinesCount; i += 1) attr.setX(i, value(this.slotTs[this.lineToSlotIndex[i]] ?? 0));
      attr.needsUpdate = true;
      this.dotsMaterial.uniforms.noiseIntensity.value = this.noiseIntensity;
    }
  }

  private updatePhysics(dtMs: number) {
    if (!this.dots || !this.linesGeometry) return;
    const dt = Math.min(dtMs / 1000, 0.033) * this.targetFPS;
    const damping = this.damping ** dt;
    const spring = this.springStrength * dt;
    const seconds = 0.001 * performance.now();
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const pos = this.linesGeometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < this.totalLinesCount; i += 1) {
      const current = this.currentPositions[i];
      const original = this.originalPositions[i];
      const velocity = this.velocities[i];
      current[0].copy(original[0]);
      const top = current[1];
      const home = original[1];
      const v = velocity[1];
      this.reusablePlane.constant = -top.z;
      this.raycaster.ray.intersectPlane(this.reusablePlane, this.reusableMouseWorld);
      const dx = top.x - this.reusableMouseWorld.x;
      const dy = top.y - this.reusableMouseWorld.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.mouseInfluenceRadius) {
        const force = (1 - dist / this.mouseInfluenceRadius) * this.mouseRepulsionStrength;
        const inv = 1 / dist;
        v.x += dx * inv * force * 0.3 * dt;
        v.y += dy * inv * force * dt;
        v.z += Math.sin(0.1 * i + seconds) * force * 0.05 * dt;
      }
      this.reusableSpringForce.copy(home).sub(top).multiplyScalar(spring);
      v.add(this.reusableSpringForce);
      v.multiplyScalar(damping);
      top.x += v.x * dt;
      top.y += v.y * dt;
      top.z += v.z * dt;
      pos.setXYZ(2 * i, current[0].x, current[0].y, current[0].z);
      pos.setXYZ(2 * i + 1, current[1].x, current[1].y, current[1].z);
    }
    pos.needsUpdate = true;
    this.updateDots();
  }

  private updateDots() {
    if (!this.dots) return;
    const pos = this.dots.geometry.getAttribute("position") as THREE.BufferAttribute;
    const depth = this.dots.geometry.getAttribute("depthOpacity") as THREE.BufferAttribute;
    const ny = this.dots.geometry.getAttribute("normalizedY") as THREE.BufferAttribute;
    this.currentPositions.forEach((pair, i) => {
      const top = pair[1];
      const slot = this.lineToSlotIndex[i];
      pos.setXYZ(i, top.x, top.y, top.z);
      ny.setX(i, (top.y + 6) / 12);
      depth.setX(i, this.calculateDepthFade(this.slotTs[slot] ?? 0) * (this.lineFadeAlphas[i] ?? 1));
    });
    pos.needsUpdate = true;
    depth.needsUpdate = true;
    ny.needsUpdate = true;
  }

  private updatePulseWave(time: number) {
    if (!this.linesGeometry || !this.dots) return;
    if (!this.pulseEnabled) {
      if (this.activePulses.length > 0) {
        this.activePulses = [];
        this.clearPulseAttributes();
      }
      return;
    }
    const interval = this.pulseFirstTriggered ? this.pulseInterval : this.pulseFirstDelay;
    if (time - this.pulseLastTriggerTime >= interval) {
      this.activePulses.push({ pos: 0, speed: this.pulseSpeed, lastFrameTime: time });
      this.pulseLastTriggerTime = time;
      this.pulseFirstTriggered = true;
    }
    for (let i = this.activePulses.length - 1; i >= 0; i -= 1) {
      const pulse = this.activePulses[i];
      const dt = (time - pulse.lastFrameTime) / 1000;
      pulse.lastFrameTime = time;
      if (pulse.pos > this.pulseAccelStartPos) {
        const t = (pulse.pos - this.pulseAccelStartPos) / (1 - this.pulseAccelStartPos);
        pulse.speed = this.pulseSpeed + this.pulseAcceleration * t * t;
      }
      pulse.pos += pulse.speed * dt;
      if (pulse.pos >= 1) this.activePulses.splice(i, 1);
    }
    if (this.activePulses.length === 0) {
      this.clearPulseAttributes();
      return;
    }
    this.updatePulseEffects(this.activePulses.map((p) => p.pos));
  }

  private updatePulseEffects(positions: number[]) {
    if (!this.linesGeometry || !this.dots) return;
    const lineIntensity = this.linesGeometry.getAttribute("pulseIntensity") as THREE.BufferAttribute;
    const lineDisplacement = this.linesGeometry.getAttribute("pulseDisplacement") as THREE.BufferAttribute;
    const dotIntensity = this.dots.geometry.getAttribute("pulseIntensity") as THREE.BufferAttribute;
    const dotDisplacement = this.dots.geometry.getAttribute("pulseDisplacement") as THREE.BufferAttribute;
    const halfWidth = this.pulseWaveHalfWidth;
    const colorWidth = this.pulseColorWidth;
    for (let i = 0; i < this.totalLinesCount; i += 1) {
      const t = this.slotTs[this.lineToSlotIndex[i]] ?? 0;
      let intensity = 0;
      let displacement = 0;
      for (const p of positions) {
        const head = p - this.pulseActiveThreshold;
        const colorD = head - this.pulseColorOffset - t;
        if (colorD >= 0 && colorD < colorWidth) intensity += Math.sin((colorD / colorWidth) * Math.PI);
        const d = head - t;
        if (d >= 0 && d < halfWidth && t < this.pulseDisplacementFalloffEnd) {
          const n = d / halfWidth;
          const falloff = (this.pulseDisplacementFalloffEnd - t) / this.pulseDisplacementFalloffEnd;
          displacement += Math.sin(n * Math.PI * this.pulseWaveFrequency) * this.pulseDisplacementMax * falloff * Math.sin(n * Math.PI);
        }
      }
      const clamped = Math.min(1, intensity);
      lineIntensity.setX(2 * i, clamped);
      lineIntensity.setX(2 * i + 1, clamped);
      lineDisplacement.setX(2 * i, displacement);
      lineDisplacement.setX(2 * i + 1, displacement);
      dotIntensity.setX(i, clamped);
      dotDisplacement.setX(i, displacement);
    }
    lineIntensity.needsUpdate = true;
    lineDisplacement.needsUpdate = true;
    dotIntensity.needsUpdate = true;
    dotDisplacement.needsUpdate = true;
  }

  private clearPulseAttributes() {
    if (!this.linesGeometry || !this.dots) return;
    const attrs = [
      this.linesGeometry.getAttribute("pulseIntensity"),
      this.linesGeometry.getAttribute("pulseDisplacement"),
      this.dots.geometry.getAttribute("pulseIntensity"),
      this.dots.geometry.getAttribute("pulseDisplacement"),
    ] as THREE.BufferAttribute[];
    for (const a of attrs) {
      (a.array as Float32Array).fill(0);
      a.needsUpdate = true;
    }
  }

  /** Static slot layout (the cycling tween is never started on the homepage) plus depth-faded opacity. */
  private applyLinePositions() {
    if (!this.linesGeometry) return;
    const opacity = this.linesGeometry.getAttribute("lineOpacity") as THREE.BufferAttribute;
    for (let i = 0; i < this.totalLinesCount; i += 1) {
      const slot = this.lineToSlotIndex[i];
      const target = this.slotLinePositions[slot];
      this.originalPositions[i][0].copy(target[0]);
      this.originalPositions[i][1].copy(target[1]);
      const a = 0.8 * this.calculateDepthFade(this.slotTs[slot] ?? 0) * (this.lineFadeAlphas[i] ?? 1);
      opacity.setX(2 * i, a);
      opacity.setX(2 * i + 1, a);
    }
    opacity.needsUpdate = true;
    this.lineMaterial.uniforms.lineFadeBottom.value = this.lineFadeBottom;
    this.lineMaterial.uniforms.lineFadeTop.value = this.lineFadeTop;
  }

  updateAndRender = (time: number, dt: number) => {
    const seconds = 0.001 * time;
    this.lineMaterial.uniforms.time.value = seconds;
    this.dotsMaterial.uniforms.time.value = seconds;
    this.updatePulseWave(time);
    this.applyLinePositions();
    this.updatePhysics(dt);
    this.updateNoiseValuesAsPulse(seconds);
    this.updateDots();
    this.renderer.render(this.scene, this.camera);
  };

  resize(size: THREE.Vector2) {
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
  }

  getPoints() {
    if (!this.dots) return [];
    const pos = this.dots.geometry.getAttribute("position");
    const depth = this.dots.geometry.getAttribute("depthOpacity");
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i += 1) {
      if (depth.getX(i) < 0.01) continue;
      points.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
    return points;
  }

  reset() {
    this.lineMaterial.uniforms.animValue.value = 1;
    this.dotsMaterial.uniforms.animValue.value = 1;
    this.dotsMaterial.uniforms.opacity.value = 1;
  }

  animateIn(points: THREE.Vector3[], onComplete: (v: number) => void) {
    if (!this.dots) return new Tween(1.25);
    writeStartPoints(this.dots.geometry, points);
    const d = this.dotsMaterial.uniforms;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      this.lineMaterial.uniforms.animValue.value = Ease.inOutQuad(progress(0.3, 1, t));
      d.animValue.value = t;
      d.opacity.value = progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  animateOut(onComplete: (v: number) => void) {
    if (!this.dots) return new Tween(1.25);
    snapshotStartPoints(this.dots.geometry);
    const d = this.dotsMaterial.uniforms;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      this.lineMaterial.uniforms.animValue.value = 1 - Ease.outQuad(progress(0, 0.2, t));
      d.animValue.value = t;
      d.opacity.value = 1 - progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  updateColorUniforms(p: Palette) {
    if (!this.dots) return;
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
    this.linesGeometry?.dispose();
    this.dots?.geometry.dispose();
    this.lineMaterial.dispose();
    this.dotsMaterial.dispose();
  }
}
