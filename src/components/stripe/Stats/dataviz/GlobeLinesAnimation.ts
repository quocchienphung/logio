import * as THREE from "three";
import {
  applyPaletteUniforms,
  createNoise2D,
  documentRect,
  Ease,
  mapRange,
  Palette,
  progress,
  readPoints,
  SCATTER_POINTS,
  seededRandom,
  snapshotStartPoints,
  transitionPalette,
  Tween,
  writeStartPoints,
  type VizAnimation,
} from "./core";
import { GLOBE_DOTS_FRAG, GLOBE_DOTS_VERT, GLOBE_LINES_FRAG, GLOBE_LINES_VERT } from "./shaders";

const { clamp, lerp, degToRad } = THREE.MathUtils;
const { randFloat: rand } = seededRandom(0.0952847722928798);
const GLOBE_OFFSET = new THREE.Vector3(-0, -2.5, -1.4);
const GLOBE_EULER = new THREE.Euler(degToRad(40), degToRad(24), degToRad(24));

interface GlobePoint {
  line: THREE.Line;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  angleOffset: number;
  curveLengthTheta: number;
  curveRegion: number[];
  curveLengthOffset?: number;
  random: number;
}

interface SectionItem {
  shapeIndex: number;
  itemIndex: number;
}

interface AnimationSection {
  exitAnimationStartAt: number;
  enterAnimationStartAt: number;
  enterAnimationAngleOffset: number;
  currentAnimationItemIndex: number;
  currentAnimationItem: SectionItem;
  items: SectionItem[];
}

/**
 * Trailing meridian lines on a tilted sphere (class `Z`): 258 arcs, each drawn between two random
 * latitudes of its meridian, rotating 0.01°/frame; pairs of lines take turns exiting (3s) and
 * re-entering (8s) at a new meridian region, staggered by a seeded PRNG so every visit looks alike.
 */
class GlobeLines {
  globePoints: GlobePoint[] = [];
  totalLines: number;
  private totalGlobeLines: number;
  private globeRadius = 4;
  private totalGlobeCurvePoints = 32;
  private globeAngleOffset = 0;
  private itemsPerAnimationSection = 2;
  private animationSections: AnimationSection[] = [];
  private lineEnterAnimationDuration = 8000;
  private lineExitAnimationDuration = 3000;
  private shortLineEnterAnimationDuration = 6200;
  private shortLineExitAnimationDuration = 2000;
  private startLineAnimationStaggerRange = 15000;
  private lineAnimationStaggerRange = 900;
  private maxRingFullProgress = 0.47;
  private shortMaxRingMultiplier = 0.38;
  private enterDotScaleThreshold = 0.14;
  private dotSpawnScaleThreshold = 0.2;
  private lineFallOff = false;
  private enableGlobeRotation = true;
  private globeRotationSpeed = 0.01;
  private shapesCount = 1;
  private curvePointsBuffer: THREE.Vector3[] = [];
  private originPosition = new THREE.Vector3();
  private endPosition = new THREE.Vector3();
  private animationSectionMap = new Map<number, AnimationSection>();
  private currentLineTipsLocal: THREE.Vector3[] = [];
  private shortRingRangeStartIndex = 140;
  private shortRingRangeEndIndex = 216;
  private noise2D = createNoise2D();

  constructor(
    globeLines: number,
    private fallOffLineMaterial: THREE.ShaderMaterial,
    private linesGroup: THREE.Group,
  ) {
    this.totalGlobeLines = globeLines;
    this.totalLines = globeLines + globeLines * (this.shapesCount - 1) * 0.5;
    this.curvePointsBuffer = Array.from({ length: this.totalGlobeCurvePoints }, () => new THREE.Vector3());
    this.createLines();
  }

  private getCurveIndex(i: number) {
    if (i < this.totalGlobeLines) {
      return { curveIndex: i, isFirstShape: true, shapeIndex: 0, totalShapeLines: this.totalGlobeLines };
    }
    const rest = i - this.totalGlobeLines;
    return {
      curveIndex: rest % (this.totalGlobeLines / 2),
      isFirstShape: false,
      shapeIndex: 1 + Math.floor(rest / (this.totalGlobeLines / 2)),
      totalShapeLines: this.totalGlobeLines / 2,
    };
  }

  update({ dotsGeometry, isActive, now }: { dotsGeometry: THREE.BufferGeometry; isActive: boolean; now: number }) {
    const dotPos = dotsGeometry.getAttribute("position") as THREE.BufferAttribute;
    const dotScale = dotsGeometry.getAttribute("dotScale") as THREE.BufferAttribute;
    const dotOrigin = dotsGeometry.getAttribute("positionLineOrigin") as THREE.BufferAttribute;
    if (this.enableGlobeRotation) this.globeAngleOffset += this.globeRotationSpeed;
    this.globePoints.forEach((point, index) => {
      const { line, angleOffset } = point;
      const { curveIndex, isFirstShape, shapeIndex, totalShapeLines } = this.getCurveIndex(index);
      const angle = (curveIndex / totalShapeLines) * 360 + this.globeAngleOffset;
      const wrapped = angle % 360;
      const { maxCurveLength } = this.getCurveLengthRange((wrapped / 360) * totalShapeLines, isFirstShape);
      const section = this.getPointAnimationData(shapeIndex, curveIndex);
      const exitAt = section?.exitAnimationStartAt;
      const enterAt = section?.enterAnimationStartAt;
      let enter = 1;
      let exit = 0;
      const enterDuration = isFirstShape ? this.lineEnterAnimationDuration : this.shortLineEnterAnimationDuration;
      const exitDuration = isFirstShape ? this.lineExitAnimationDuration : this.shortLineExitAnimationDuration;
      const isExiting = !!exitAt && now > exitAt && now <= exitAt + exitDuration;
      const hasExited = !!exitAt && now > exitAt + exitDuration;
      const isEntering = !!enterAt && now > enterAt;
      const hasEntered = !!enterAt && now > enterAt + enterDuration;
      if (hasExited && !isEntering && section) {
        enter = 0;
        if (angleOffset !== section.enterAnimationAngleOffset) {
          point.angleOffset = section.enterAnimationAngleOffset;
          point.curveRegion = this.createCurveRegion();
          point.curveLengthOffset = 1;
        }
      }
      if (isEntering && enterAt) enter = Ease.inOutSine(Math.min((now - enterAt) / enterDuration, 1));
      if (isExiting && exitAt) exit = Ease.inSine(Math.min((now - exitAt) / exitDuration, 1));
      if (hasEntered && section) this.updateSectionAnimation(section, now);

      const region = point.curveRegion;
      const from = region[0] * maxCurveLength;
      const to = region[1] * maxCurveLength;
      const start = from + exit * (to - from);
      const end = from + enter * (to - from);
      const curve = this.getGlobeCurvePoints(angle, start, end);
      const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const opacity = line.geometry.getAttribute("opacity") as THREE.BufferAttribute;
      const percent = line.geometry.getAttribute("percent") as THREE.BufferAttribute;
      const originAttr = line.geometry.getAttribute("originPosition") as THREE.BufferAttribute;
      const endAttr = line.geometry.getAttribute("endPosition") as THREE.BufferAttribute;
      const fadeIn = clamp(0.01 + 0.1 * point.random, 0, 1);
      this.originPosition.copy(curve[0]).applyEuler(GLOBE_EULER).add(GLOBE_OFFSET);
      this.endPosition.copy(curve[curve.length - 1]).applyEuler(GLOBE_EULER).add(GLOBE_OFFSET);
      curve.forEach((p, t) => {
        p.applyEuler(GLOBE_EULER).add(GLOBE_OFFSET);
        pos.setXYZ(t, p.x, p.y, p.z);
        percent.setX(t, t / (curve.length - 1));
        originAttr.setXYZ(t, this.originPosition.x, this.originPosition.y, this.originPosition.z);
        endAttr.setXYZ(t, this.endPosition.x, this.endPosition.y, this.endPosition.z);
        if (this.lineFallOff) {
          opacity.setX(t, t / (curve.length - 1));
        } else {
          const along = start + (t / (curve.length - 1)) * (end - start);
          opacity.setX(t, along <= fadeIn ? (along / fadeIn) ** 2 : 1);
        }
      });
      line.geometry.setDrawRange(0, curve.length);
      pos.needsUpdate = true;
      opacity.needsUpdate = true;
      percent.needsUpdate = true;
      originAttr.needsUpdate = true;
      endAttr.needsUpdate = true;
      if (isActive) {
        dotPos.setXYZ(index, this.endPosition.x, this.endPosition.y, this.endPosition.z);
        dotOrigin.setXYZ(index, this.originPosition.x, this.originPosition.y, this.originPosition.z);
        dotPos.needsUpdate = true;
        dotOrigin.needsUpdate = true;
      }
      this.currentLineTipsLocal[index].copy(curve[curve.length - 1]);
      let scale = 1;
      if (end < this.enterDotScaleThreshold) scale = end / this.enterDotScaleThreshold;
      if (enter < this.dotSpawnScaleThreshold) scale *= enter / this.dotSpawnScaleThreshold;
      if (1 - exit < this.dotSpawnScaleThreshold) scale *= (1 - exit) / this.dotSpawnScaleThreshold;
      dotScale.setX(index, scale);
    });
  }

  private getGlobeCurvePoints(angleDeg: number, from: number, to = 0) {
    const theta = degToRad(angleDeg);
    const r = this.globeRadius;
    const a = Math.PI * clamp(from, 0, 1);
    const b = Math.PI * clamp(to, 0, 1);
    for (let i = 0; i < this.totalGlobeCurvePoints; i += 1) {
      const t = i / (this.totalGlobeCurvePoints - 1);
      const phi = lerp(a, b, t);
      this.curvePointsBuffer[i].set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    }
    return this.curvePointsBuffer;
  }

  private getPointAnimationData(shapeIndex: number, itemIndex: number) {
    return this.animationSectionMap.get(this.sectionKey(shapeIndex, itemIndex));
  }

  private sectionKey(shapeIndex: number, itemIndex: number) {
    return 10000 * shapeIndex + itemIndex;
  }

  private buildAnimationSectionMap() {
    this.animationSectionMap.clear();
    for (const s of this.animationSections) {
      this.animationSectionMap.set(this.sectionKey(s.currentAnimationItem.shapeIndex, s.currentAnimationItem.itemIndex), s);
    }
  }

  private updateSectionAnimation(section: AnimationSection, now: number) {
    const oldKey = this.sectionKey(section.currentAnimationItem.shapeIndex, section.currentAnimationItem.itemIndex);
    const nextIndex = (section.currentAnimationItemIndex + 1) % section.items.length;
    section.currentAnimationItemIndex = nextIndex;
    section.currentAnimationItem = section.items[nextIndex];
    const newKey = this.sectionKey(section.currentAnimationItem.shapeIndex, section.currentAnimationItem.itemIndex);
    this.animationSectionMap.delete(oldKey);
    this.animationSectionMap.set(newKey, section);
    const exitDuration =
      section.currentAnimationItem.shapeIndex === 0 ? this.lineExitAnimationDuration : this.shortLineExitAnimationDuration;
    const exitStagger = rand(0, 1) * this.lineAnimationStaggerRange;
    const enterStagger = rand(0, 1) * this.lineAnimationStaggerRange;
    const exitAt = now + exitStagger;
    section.exitAnimationStartAt = exitAt;
    section.enterAnimationStartAt = exitAt + exitDuration + enterStagger;
    section.enterAnimationAngleOffset = 2 * rand(0, 1);
  }

  private getCurveLengthRange(position: number, isFirstShape: boolean) {
    let max = this.maxRingFullProgress;
    const startIndex = isFirstShape ? this.shortRingRangeStartIndex : Math.floor(this.shortRingRangeStartIndex / 2);
    const endIndex = isFirstShape ? this.shortRingRangeEndIndex : Math.floor(this.shortRingRangeEndIndex / 2);
    const total = isFirstShape ? this.totalGlobeLines : this.totalGlobeLines / 2;
    const ramp = isFirstShape ? 40 : 20;
    const rampStart = startIndex - ramp - 1;
    if (position >= rampStart && position < startIndex) {
      max *= lerp(1, this.shortMaxRingMultiplier, Math.min((position - rampStart) / ramp, 1));
    }
    if (position >= startIndex && position <= endIndex) max *= this.shortMaxRingMultiplier;
    if (position > endIndex) {
      max *= lerp(this.shortMaxRingMultiplier, 1, Math.min((position - endIndex) / (total - (isFirstShape ? 4 : 2) - endIndex), 1));
    }
    if (!isFirstShape) max *= 0.9;
    return { minCurveLength: 0.7 * max, maxCurveLength: max };
  }

  private createCurveRegion() {
    let region = [rand(0, 0.75), rand(0.25, 1)];
    let tries = 0;
    while (Math.abs(region[1] - region[0]) < 0.3) {
      region = [rand(0, 0.75), rand(0.25, 1)];
      tries += 1;
      if (tries > 20) {
        region[1] = region[0] < 0.5 ? region[0] + 0.3 : region[0] - 0.3;
        break;
      }
    }
    return region;
  }

  private createLines() {
    this.currentLineTipsLocal = Array.from({ length: this.totalLines }, () => new THREE.Vector3());
    for (let i = 0; i < this.totalLines; i += 1) {
      const geometry = new THREE.BufferGeometry();
      const n = this.totalGlobeCurvePoints;
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * n), 3));
      geometry.setAttribute("opacity", new THREE.BufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute("percent", new THREE.BufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute("originPosition", new THREE.BufferAttribute(new Float32Array(3 * n), 3));
      geometry.setAttribute("endPosition", new THREE.BufferAttribute(new Float32Array(3 * n), 3));
      const line = new THREE.Line(geometry, this.fallOffLineMaterial);
      this.linesGroup.add(line);
      const noise = this.noise2D(0.5 * i, 0);
      this.globePoints.push({
        line,
        geometry,
        material: this.fallOffLineMaterial,
        angleOffset: 0,
        curveLengthTheta: mapRange(-1, 1, 0, 1, noise),
        curveRegion: this.createCurveRegion(),
        random: rand(0, 1),
      });
    }
    const groups: SectionItem[][] = [];
    for (let i = 0; i < this.totalLines; i += 1) {
      const { curveIndex, shapeIndex } = this.getCurveIndex(i);
      const g = Math.floor(i / this.itemsPerAnimationSection);
      if (!groups[g]) groups[g] = [];
      groups[g].push({ shapeIndex, itemIndex: curveIndex });
    }
    groups.forEach((g) => g?.sort(() => rand(0, 1) - 0.5));
    this.animationSections = groups.map((items) => {
      const first = items[0];
      const exitDuration = first.shapeIndex === 0 ? this.lineExitAnimationDuration : this.shortLineExitAnimationDuration;
      const exitAt = -5000 + rand(0, 1) * this.startLineAnimationStaggerRange;
      const stagger = rand(0, 1) * this.lineAnimationStaggerRange;
      return {
        exitAnimationStartAt: exitAt,
        enterAnimationStartAt: exitAt + exitDuration + stagger,
        enterAnimationAngleOffset: 0,
        currentAnimationItemIndex: 0,
        currentAnimationItem: first,
        items,
      };
    });
    this.buildAnimationSectionMap();
  }

  dispose() {
    this.globePoints.forEach((p) => p.line.geometry.dispose());
  }
}

/**
 * "$1.9T in payments volume" (class `U`): the trailing globe lines plus a depth-faded dot at every
 * line tip; the pointer (raycast) nudges dots and lines through the shaders.
 */
export class GlobeLinesAnimation implements VizAnimation {
  paused = true;
  colorPalette: Palette;
  colorAnimation: Tween | null = null;
  private scene = new THREE.Scene();
  private curvesGroup = new THREE.Group();
  private origin = new THREE.Vector3(0, 0, 0);
  private globeLines = 258;
  private totalDots = 0;
  private globeRadius = 4;
  private timeMultiplier = 4e-4;
  private globeViz: GlobeLines | null = null;
  private mousePower = 0;
  private targetMousePosition = new THREE.Vector2();
  private currentMousePosition = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private rect = new DOMRect();
  private dotsMaterial: THREE.ShaderMaterial;
  private fallOffLineMaterial: THREE.ShaderMaterial;
  private dotsGeometry!: THREE.BufferGeometry;
  private dotsObject!: THREE.Points;

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: THREE.WebGLRenderer,
    private camera: THREE.PerspectiveCamera,
    private circleTexture: THREE.Texture,
    palette: Palette,
  ) {
    this.colorPalette = palette;
    this.camera.updateProjectionMatrix();
    this.dotsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        gradientColorTop: { value: palette.colorTop },
        gradientColorBottom: { value: palette.colorBottom },
        gradientColorStop: { value: palette.colorStop },
        pointTexture: { value: this.circleTexture },
        size: { value: 12 },
        minOpacity: { value: 0.05 },
        maxOpacity: { value: 1 },
        customCameraPosition: { value: this.camera.position },
        sphereRadius: { value: this.globeRadius },
        zOrigin: { value: 0 },
        time: { value: 0 },
        animValue: { value: 1 },
        opacity: { value: 1 },
        resolution: { value: new THREE.Vector2(1, 1) },
        mouseRayDirection: { value: new THREE.Vector3() },
        mouseRayOrigin: { value: new THREE.Vector3() },
        mousePower: { value: 0 },
      },
      vertexShader: GLOBE_DOTS_VERT,
      fragmentShader: GLOBE_DOTS_FRAG,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      alphaTest: 0.1,
    });
    this.fallOffLineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        gradientColorTop: { value: palette.colorTop },
        gradientColorBottom: { value: palette.colorBottom },
        gradientColorStop: { value: palette.colorStop },
        customCameraPosition: { value: this.camera.position },
        sphereRadius: { value: this.globeRadius },
        minOpacity: { value: 0 },
        maxOpacity: { value: 1 },
        zOrigin: { value: 0 },
        animValue: { value: 1 },
        resolution: { value: new THREE.Vector2(1, 1) },
        mouseRayDirection: { value: new THREE.Vector3() },
        mouseRayOrigin: { value: new THREE.Vector3() },
        mousePower: { value: 0 },
      },
      vertexShader: GLOBE_LINES_VERT,
      fragmentShader: GLOBE_LINES_FRAG,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.scene.add(this.curvesGroup);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  }

  private mousemove = (e: MouseEvent) => {
    const x = ((e.clientX - (this.rect.left - window.scrollX)) / this.rect.width) * 2 - 1;
    const y = (-(e.clientY - (this.rect.top - window.scrollY)) / this.rect.height) * 2 + 1;
    this.mousePower = clamp(this.mousePower + 0.05, 0, 1);
    this.targetMousePosition.set(x, y);
  };

  initScene() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    size.multiplyScalar(this.renderer.getPixelRatio());
    this.fallOffLineMaterial.uniforms.resolution.value = size;
    this.dotsMaterial.uniforms.resolution.value = size;
    this.globeViz = new GlobeLines(this.globeLines, this.fallOffLineMaterial, this.curvesGroup);
    this.totalDots = this.globeViz.totalLines;
    this.initDots();
  }

  private initDots() {
    const n = this.totalDots;
    const at = (v: THREE.Vector3) => new Float32Array(Array(n).fill([v.x, v.y, v.z]).flat());
    const mids: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const m = SCATTER_POINTS[i % SCATTER_POINTS.length];
      mids.push(m.x, m.y, m.z);
    }
    this.dotsGeometry = new THREE.BufferGeometry();
    this.dotsGeometry.setAttribute("position", new THREE.BufferAttribute(at(this.origin), 3));
    this.dotsGeometry.setAttribute("positionStart", new THREE.BufferAttribute(at(this.origin), 3));
    this.dotsGeometry.setAttribute("positionMid", new THREE.Float32BufferAttribute(mids, 3));
    this.dotsGeometry.setAttribute("positionLineOrigin", new THREE.Float32BufferAttribute(at(this.origin), 3));
    this.dotsGeometry.setAttribute(
      "dotId",
      new THREE.BufferAttribute(new Float32Array(Array.from({ length: n }, () => Math.floor(1000 * Math.random()))), 1),
    );
    this.dotsGeometry.setAttribute("dotScale", new THREE.BufferAttribute(new Float32Array(n), 1));
    this.dotsObject = new THREE.Points(this.dotsGeometry, this.dotsMaterial);
    this.dotsObject.frustumCulled = false;
    this.curvesGroup.add(this.dotsObject);
  }

  private updateCameraUniforms() {
    (this.dotsMaterial.uniforms.customCameraPosition.value as THREE.Vector3).copy(this.camera.position);
    (this.fallOffLineMaterial.uniforms.customCameraPosition.value as THREE.Vector3).copy(this.camera.position);
  }

  private updateMousePhysics(dt: number) {
    const t = 1 - 0.9 ** (dt / 16.67);
    this.currentMousePosition.lerp(this.targetMousePosition, t);
    this.raycaster.setFromCamera(this.currentMousePosition, this.camera);
    const { ray } = this.raycaster;
    for (const m of [this.dotsMaterial, this.fallOffLineMaterial]) {
      m.uniforms.mouseRayDirection.value = ray.direction;
      m.uniforms.mouseRayOrigin.value = ray.origin;
      m.uniforms.mousePower.value = this.mousePower;
    }
    this.mousePower *= 1 - 0.25 * t;
  }

  updateAndRender = (time: number, dt: number) => {
    if (!this.globeViz) return;
    this.globeViz.update({ dotsGeometry: this.dotsGeometry, isActive: true, now: time });
    this.updateCameraUniforms();
    this.updateMousePhysics(dt);
    this.dotsMaterial.uniforms.time.value = time * this.timeMultiplier;
    (this.dotsGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.dotsGeometry.getAttribute("dotScale") as THREE.BufferAttribute).needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  };

  resize(size: THREE.Vector2) {
    this.rect = documentRect(this.canvas);
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
    this.fallOffLineMaterial.uniforms.resolution.value = size;
  }

  animateIn(points: THREE.Vector3[], onComplete: (v: number) => void) {
    writeStartPoints(this.dotsGeometry, points);
    const d = this.dotsMaterial.uniforms;
    const l = this.fallOffLineMaterial.uniforms;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      l.animValue.value = Ease.inOutQuad(progress(0.6, 1, t));
      d.animValue.value = t;
      d.opacity.value = progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  animateOut(onComplete: (v: number) => void) {
    snapshotStartPoints(this.dotsGeometry);
    const d = this.dotsMaterial.uniforms;
    const l = this.fallOffLineMaterial.uniforms;
    const tween = new Tween(1.25);
    tween.updateFn = (t) => {
      l.animValue.value = 1 - Ease.outQuad(progress(0, 0.15, t));
      d.animValue.value = t;
      d.opacity.value = 1 - progress(0, 0.5, t);
    };
    tween.completeFn = onComplete;
    return tween;
  }

  reset() {}

  getPoints() {
    return readPoints(this.dotsGeometry.getAttribute("position"));
  }

  updateColorUniforms(p: Palette) {
    applyPaletteUniforms(this.dotsMaterial.uniforms, p);
    applyPaletteUniforms(this.fallOffLineMaterial.uniforms, p);
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
    this.globeViz?.dispose();
    this.dotsGeometry?.dispose();
    this.dotsMaterial.dispose();
  }
}
