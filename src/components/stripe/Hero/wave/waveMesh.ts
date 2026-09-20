import * as THREE from "three";
import { WAVE_DARK_FRAG, WAVE_LIGHT_FRAG, WAVE_VERT } from "./shaders";
import type { WaveMaterialProps } from "./config";

/** Folded plane geometry exactly as built by the reference (PlaneGeometry 400×400, 128×256 segments). */
export function foldedGeometry(
  width = 400,
  height = 400,
  segX = 128,
  segY = 256,
) {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const p = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const parabola = (x: number, k: number) => Math.pow(4 * x * (1 - x), k);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const r = 4 - 2 * parabola(uv.getY(i), 9.5);
    if (p.x < -16) p.z += r;
    else if (p.x < 16) {
      p.z = Math.cos(THREE.MathUtils.mapLinear(p.x, -16, 16, 0, Math.PI)) * r;
      p.x =
        Math.cos(
          THREE.MathUtils.mapLinear(p.x, -16, 16, -Math.PI / 2, Math.PI / 2),
        ) *
          r -
        16;
    } else {
      p.z -= r;
      p.x = -p.x;
    }
    p.x += width / 4;
    p.applyAxisAngle(xAxis, -Math.PI / 2);
    p.applyAxisAngle(yAxis, -Math.PI / 2);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Wave ShaderMaterial with the reference defaults (mesh module 82401). */
export function createWaveMaterial(
  theme: "light" | "dark",
  palette: THREE.Texture,
  clearColor: THREE.Vector3,
  resolution: THREE.Vector2,
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_speed: { value: 4e-5 },
      u_resolution: { value: resolution },
      u_paletteTexture: { value: palette },
      u_lutTexture: { value: palette },
      u_blueNoiseTexture: { value: palette },
      u_colorContrast: { value: 1 },
      u_colorSaturation: { value: 1 },
      u_colorHueShift: { value: 0 },
      u_monoRange: { value: new THREE.Vector2(0, 1) },
      u_monoGamma: { value: 1 },
      u_monoDeep: { value: 0 },
      u_monoLit: { value: new THREE.Vector4(0, 0, 0, 0) },
      u_monoLitFeather: { value: new THREE.Vector2(0.25, 0.25) },
      u_canvasSize: { value: new THREE.Vector2(1, 1) },
      u_displaceFrequencyX: { value: 2.25 },
      u_displaceFrequencyZ: { value: 2.25 },
      u_displaceAmount: { value: 0 },
      u_twistFrequencyY: { value: 0 },
      u_twistFrequencyX: { value: 0 },
      u_twistFrequencyZ: { value: 0 },
      u_twistPowerY: { value: 1 },
      u_twistPowerX: { value: 1 },
      u_twistPowerZ: { value: 1 },
      u_glowAmount: { value: 0.01 },
      u_glowPower: { value: 0.01 },
      u_glowRamp: { value: 1 },
      u_mousePosition: { value: new THREE.Vector2(0, 0) },
      u_lineAmount: { value: 450 },
      u_lineThickness: { value: 0.01 },
      u_lineDerivativePower: { value: 0.9 },
      u_maxWidth: { value: 1232 },
      u_clearColor: { value: clearColor },
    },
    vertexShader: WAVE_VERT,
    fragmentShader: theme === "dark" ? WAVE_DARK_FRAG : WAVE_LIGHT_FRAG,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
    ...(theme === "dark"
      ? { transparent: true }
      : {
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcColorFactor,
          blendDst: THREE.ZeroFactor,
        }),
  });
}

/** Push a decoded materialProps config onto the material/mesh (mesh module updateConfig). */
export function applyWaveConfig(
  material: THREE.ShaderMaterial,
  mesh: THREE.Mesh,
  m: WaveMaterialProps,
) {
  const u = material.uniforms;
  u.u_speed.value = m.speed;
  u.u_colorContrast.value = m.colorContrast;
  u.u_colorSaturation.value = m.colorSaturation;
  u.u_colorHueShift.value = m.colorHueShift;
  u.u_displaceFrequencyX.value = m.displaceFrequencyX;
  u.u_displaceFrequencyZ.value = m.displaceFrequencyZ;
  u.u_displaceAmount.value = m.displaceAmount;
  u.u_twistFrequencyX.value = m.twistFrequencyX;
  u.u_twistFrequencyY.value = m.twistFrequencyY;
  u.u_twistFrequencyZ.value = m.twistFrequencyZ;
  u.u_twistPowerX.value = m.twistPowerX;
  u.u_twistPowerY.value = m.twistPowerY;
  u.u_twistPowerZ.value = m.twistPowerZ;
  u.u_glowAmount.value = m.glowAmount;
  u.u_glowPower.value = m.glowPower;
  u.u_glowRamp.value = m.glowRamp;
  u.u_lineAmount.value = m.lineAmount;
  u.u_lineThickness.value = m.lineThickness;
  u.u_lineDerivativePower.value = m.lineDerivativePower;
  mesh.position.set(m.positionX, m.positionY, m.positionZ);
  mesh.rotation.set(m.rotationX, m.rotationY, m.rotationZ);
  mesh.scale.set(m.scaleX, m.scaleY, m.scaleZ);
}

/** Shared render-loop bookkeeping used by every reference renderer (frameInterval 2, pause accounting). */
export class PausableLoop {
  private rafId: number | null = null;
  private frameCount = 0;
  firstDrawTime: number | null = null;
  lastDrawTime: number | null = null;
  private pausedAtTime: number | null = null;
  private resumedAtTime: number | null = null;
  pausedTime = 0;
  private _paused = true;

  constructor(
    private tick: (t: number, elapsed: number, dt: number) => void,
    private frameInterval = 2,
  ) {}

  get paused() {
    return this._paused;
  }
  set paused(v: boolean) {
    if (v) {
      this.resumedAtTime = null;
      this.pausedAtTime = this.lastDrawTime;
      this.lastDrawTime = null;
    }
    this._paused = v;
  }

  start() {
    if (this.rafId != null) return;
    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      this.frameCount++;
      if (this.frameCount % this.frameInterval !== 0 || this._paused) return;
      if (this.firstDrawTime === null) this.firstDrawTime = t;
      if (this.resumedAtTime === null) {
        this.resumedAtTime = t;
        if (this.pausedAtTime != null) {
          this.pausedTime += this.resumedAtTime - this.pausedAtTime;
          this.pausedAtTime = null;
        }
      }
      if (this.lastDrawTime === null) this.lastDrawTime = t;
      const dt = t - this.lastDrawTime;
      const elapsed = t - this.firstDrawTime - this.pausedTime;
      this.lastDrawTime = t;
      this.tick(t, elapsed, dt);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
