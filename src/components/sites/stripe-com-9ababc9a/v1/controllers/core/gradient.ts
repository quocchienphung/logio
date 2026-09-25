// Gradient — the animated WebGL mesh gradient behind the angled product heroes.
// Reference: v1-Gradient-LLG4DJZK.js → v1-chunk-EPX4ZC6Y.js (controller + "MiniGL" renderer + GLSL).
// A plane of (innerWidth·0.06 × 600·0.16) quads is displaced by simplex noise in the vertex shader and
// coloured by four noise-driven layers whose colours are read from --gradientColorZero…Three (the CSS
// build already maps them to greys). The canvas fades in (CSS `.isLoaded`), the CSS radial-gradient
// fallback (`.Gradient:after`) stays underneath until then, and stays alone when WebGL is unavailable.
import type { Controller } from "../types";
import { debounce, disableAmbientAnimations, isSoftwareRenderer, scrollObserver } from "./util";

// ---- constants (all from source) ------------------------------------------------------------
const START_TIME = 1253106;
const MAX_FRAME_STEP = 1000 / 15;
const HEIGHT = 600;
const DENSITY: [number, number] = [0.06, 0.16];
const AMP = 320;
const SEED = 5;
const FREQ_X = 14e-5;
const FREQ_Y = 29e-5;
const FREQ_DELTA = 1e-5;
const NOISE_SPEED = 5e-6;
const SCROLL_REFRESH_DELAY = 200;
const PARENT_LOADED_DELAY = 3000;
const RESIZE_DEBOUNCE = 250;
const MAX_CSS_VAR_RETRIES = 200;
const LEGEND_MIN_WIDTH = 1111;
const SCRUB_STEP = 160;
const COLOR_VARS = ["--gradientColorZero", "--gradientColorOne", "--gradientColorTwo", "--gradientColorThree"];
const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
/** Reference fallback when the CSS variables never resolve (red/red/magenta/green/blue), mapped to greys by luminance. */
const FALLBACK_COLORS: RGB[] = [0.2126, 0.2126, 0.2848, 0.7152, 0.0722].map((v) => [v, v, v]);

type RGB = [number, number, number];

// ---- shaders ----------------------------------------------------------------------------------
// 3D simplex noise: the public-domain/MIT "webgl-noise" algorithm by Ian McEwan & Stefan Gustavson
// (Ashima Arts), https://github.com/ashima/webgl-noise — the same noise the reference uses.
const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}`;

const LAYERS = 3; // sectionColors.length - 1 wave layers on top of the base colour

const VERTEX = /* glsl */ `
precision highp float;
attribute vec2 a_uv;
attribute vec2 a_uvNorm;
attribute float a_x;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_noiseFreq;
uniform float u_noiseSpeed;
// vertex deformation
uniform float u_incline;
uniform vec2 u_offset;       // (bottom, top)
uniform vec2 u_deformFreq;
uniform float u_deformAmp;
uniform float u_deformSpeed;
uniform float u_deformFlow;
uniform float u_deformSeed;
// colours
uniform vec4 u_active;       // x: base, yzw: layers
uniform vec3 u_baseColor;
uniform vec3 u_layerColor[${LAYERS}];
uniform vec2 u_layerFreq[${LAYERS}];
uniform vec3 u_layerMotion[${LAYERS}]; // (speed, flow, seed)
uniform vec2 u_layerRange[${LAYERS}];  // (floor, ceil)
varying vec3 v_color;
${SIMPLEX_NOISE}
void main() {
  float time = u_time * u_noiseSpeed;
  vec2 noiseCoord = u_resolution * a_uvNorm * u_noiseFreq;
  // tilt (front-to-back), incline (left-to-right) and the offset that compensates the incline
  float tilt = u_resolution.y / 2.0 * a_uvNorm.y;
  float incline = u_resolution.x * a_uvNorm.x / 2.0 * u_incline;
  float offset = u_resolution.x / 2.0 * u_incline * mix(u_offset.x, u_offset.y, a_uv.y);
  float noise = snoise(vec3(
    noiseCoord.x * u_deformFreq.x + time * u_deformFlow,
    noiseCoord.y * u_deformFreq.y,
    time * u_deformSpeed + u_deformSeed)) * u_deformAmp;
  noise *= 1.0 - pow(abs(a_uvNorm.y), 2.0); // fade to zero at the top/bottom edges
  noise = max(0.0, noise);
  float y = tilt + incline + noise - offset;

  vec3 color = vec3(0.0);
  if (u_active.x == 1.0) color = u_baseColor;
  for (int i = 0; i < ${LAYERS}; i++) {
    if (u_active[i + 1] == 1.0) {
      float n = smoothstep(u_layerRange[i].x, u_layerRange[i].y, snoise(vec3(
        noiseCoord.x * u_layerFreq[i].x + time * u_layerMotion[i].y,
        noiseCoord.y * u_layerFreq[i].y,
        time * u_layerMotion[i].x + u_layerMotion[i].z)) / 2.0 + 0.5);
      color = mix(color, u_layerColor[i], pow(n, 4.0));
    }
  }
  v_color = color;
  // orthographic camera over a (width x height) plane centred on the origin
  gl_Position = vec4(a_x * 2.0 / u_resolution.x, y * 2.0 / u_resolution.y, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec2 u_resolution;
uniform float u_darkenTop;
uniform float u_shadowPower;
varying vec3 v_color;
void main() {
  vec3 color = v_color;
  if (u_darkenTop == 1.0) {
    // The reference darkens the green channel only; in monochrome the same luminance drop is
    // applied to all channels (green carries 0.7152 of luminance).
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    color -= pow(st.y + sin(-12.0) * st.x, u_shadowPower) * 0.4 * 0.7152;
  }
  gl_FragColor = vec4(color, 1.0);
}`;

// ---- renderer ---------------------------------------------------------------------------------
class MeshGradientRenderer {
  readonly gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private shaders: WebGLShader[] = [];
  private buffers: Record<"x" | "uv" | "uvNorm" | "index", WebGLBuffer>;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private attr: Record<"x" | "uv" | "uvNorm", number>;
  private indexCount = 0;
  width = 1;
  height = 1;

  constructor(readonly canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.gl = gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
      this.shaders.push(s);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
    this.program = p;
    gl.useProgram(p);
    this.buffers = { x: gl.createBuffer()!, uv: gl.createBuffer()!, uvNorm: gl.createBuffer()!, index: gl.createBuffer()! };
    this.attr = { x: gl.getAttribLocation(p, "a_x"), uv: gl.getAttribLocation(p, "a_uv"), uvNorm: gl.getAttribLocation(p, "a_uvNorm") };
  }

  private u(name: string): WebGLUniformLocation | null {
    if (!(name in this.loc)) this.loc[name] = this.gl.getUniformLocation(this.program, name);
    return this.loc[name];
  }
  set1(name: string, v: number): void {
    this.gl.uniform1f(this.u(name), v);
  }
  set2(name: string, v: readonly number[]): void {
    this.gl.uniform2fv(this.u(name), v);
  }
  set3(name: string, v: readonly number[]): void {
    this.gl.uniform3fv(this.u(name), v);
  }
  set4(name: string, v: readonly number[]): void {
    this.gl.uniform4fv(this.u(name), v);
  }

  setSize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.set2("u_resolution", [w, h]);
  }

  /** Plane topology + positions (reference PlaneGeometry.setTopology/setSize, "xz" orientation). */
  setPlane(xSeg: number, ySeg: number, w: number): void {
    const gl = this.gl;
    const vCount = (xSeg + 1) * (ySeg + 1);
    const uv = new Float32Array(vCount * 2);
    const uvNorm = new Float32Array(vCount * 2);
    const xs = new Float32Array(vCount);
    const index = new Uint16Array(xSeg * ySeg * 6);
    for (let t = 0; t <= ySeg; t++) {
      for (let a = 0; a <= xSeg; a++) {
        const l = t * (xSeg + 1) + a;
        uv[l * 2] = a / xSeg;
        uv[l * 2 + 1] = 1 - t / ySeg;
        uvNorm[l * 2] = -1 + (a / xSeg) * 2;
        uvNorm[l * 2 + 1] = 1 - (t / ySeg) * 2;
        xs[l] = -w / 2 + a * (w / xSeg);
        if (a < xSeg && t < ySeg) {
          const q = (t * xSeg + a) * 6;
          index[q] = l;
          index[q + 1] = l + 1 + xSeg;
          index[q + 2] = l + 1;
          index[q + 3] = l + 1;
          index[q + 4] = l + 1 + xSeg;
          index[q + 5] = l + 2 + xSeg;
        }
      }
    }
    const bind = (buf: WebGLBuffer, data: Float32Array, loc: number, size: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      }
    };
    bind(this.buffers.x, xs, this.attr.x, 1);
    bind(this.buffers.uv, uv, this.attr.uv, 2);
    bind(this.buffers.uvNorm, uvNorm, this.attr.uvNorm, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    this.indexCount = index.length;
  }

  render(): void {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  dispose(): void {
    const gl = this.gl;
    Object.values(this.buffers).forEach((b) => gl.deleteBuffer(b));
    this.shaders.forEach((s) => gl.deleteShader(s));
    gl.deleteProgram(this.program);
    // The context itself is kept: the canvas stays in the DOM and a remount reuses it.
  }
}

function parseHexColor(value: string): RGB | null {
  let v = value.trim();
  if (!v.startsWith("#")) return null;
  if (v.length === 4) v = `#${v.slice(1).split("").map((c) => c + c).join("")}`;
  const n = parseInt(v.slice(1, 7), 16);
  if (Number.isNaN(n)) return null;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// ---- controller -------------------------------------------------------------------------------
export const Gradient: Controller = (el) => {
  if (!(el instanceof HTMLCanvasElement)) return;
  // Reference: no canvas at all on software GPUs; the CSS fallback gradient stays.
  if (isSoftwareRenderer()) return;
  const gl = el.getContext("webgl", { antialias: true });
  if (!gl || gl.isContextLost()) return;

  const isStatic = disableAmbientAnimations();
  const state = {
    playing: true,
    intersecting: false,
    loadedClass: false,
    initialized: false,
    disposed: false,
    frame: 0,
    t: START_TIME,
    last: 0,
    width: window.innerWidth,
    amp: AMP,
    freqX: FREQ_X,
    freqY: FREQ_Y,
    activeColors: [1, 1, 1, 1],
    konamiIndex: 0,
    legendVisible: false,
    mouseDown: false,
    metaKey: false,
  };
  let renderer: MeshGradientRenderer | null = null;
  let rafId = 0;
  let cssVarRaf = 0;
  let cssVarRetries = 0;
  let scrollTimer: number | undefined;
  let parentTimer: number | undefined;
  let windowListenersOn = false;
  let stopObserver: (() => void) | null = null;

  const requestFrame = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);
  };
  const play = () => {
    requestFrame();
    state.playing = true;
  };
  const pause = () => {
    state.playing = false;
  };

  const syncUniforms = () => {
    if (!renderer) return;
    renderer.set1("u_deformAmp", state.amp);
    renderer.set2("u_noiseFreq", [state.freqX, state.freqY]);
    renderer.set4("u_active", state.activeColors);
  };

  const resize = () => {
    if (!renderer) return;
    state.width = window.innerWidth;
    renderer.setSize(state.width, HEIGHT);
    renderer.setPlane(Math.ceil(state.width * DENSITY[0]), Math.ceil(HEIGHT * DENSITY[1]), state.width);
    renderer.set1("u_shadowPower", state.width < 600 ? 5 : 6);
    if (isStatic) renderer.render();
  };
  const debouncedResize = debounce(resize, RESIZE_DEBOUNCE);

  const shouldSkipFrame = () => document.hidden || !state.playing || state.frame % 2 === 0;

  function animate(now: number) {
    if (!renderer || state.disposed) return;
    if (!shouldSkipFrame() || state.mouseDown) {
      state.t += Math.min(now - state.last, MAX_FRAME_STEP);
      state.last = now;
      if (state.mouseDown) state.t += state.metaKey ? -SCRUB_STEP : SCRUB_STEP;
      renderer.set1("u_time", state.t);
      renderer.render();
    }
    if (state.last !== 0 && isStatic) {
      // Reference: a single frame, then the controller disconnects its scroll/key listeners.
      renderer.render();
      stopInteractive();
      return;
    }
    state.frame += 1;
    if ((state.intersecting && state.playing) || state.mouseDown) rafId = requestAnimationFrame(animate);
  }

  const addIsLoadedClass = () => {
    if (!state.intersecting || state.loadedClass || !state.initialized) return;
    state.loadedClass = true;
    el.classList.add("isLoaded");
    parentTimer = window.setTimeout(() => el.parentElement?.classList.add("isLoaded"), PARENT_LOADED_DELAY);
  };

  const init = (colors: RGB[]) => {
    let r: MeshGradientRenderer;
    try {
      r = new MeshGradientRenderer(el, gl);
    } catch {
      return; // shader/program failure: the CSS fallback gradient stays
    }
    renderer = r;
    // uniforms (reference initMaterial)
    r.set1("u_time", 0);
    r.set1("u_shadowPower", 5);
    r.set1("u_darkenTop", el.dataset.jsDarkenTop === "" ? 1 : 0);
    r.set4("u_active", state.activeColors);
    r.set2("u_noiseFreq", [state.freqX, state.freqY]);
    r.set1("u_noiseSpeed", NOISE_SPEED);
    r.set1("u_incline", 0); // Math.sin(0) / Math.cos(0)
    r.set2("u_offset", [-0.5, -0.5]);
    r.set2("u_deformFreq", [3, 4]);
    r.set1("u_deformAmp", state.amp);
    r.set1("u_deformSpeed", 10);
    r.set1("u_deformFlow", 3);
    r.set1("u_deformSeed", SEED);
    r.set3("u_baseColor", colors[0]);
    const n = colors.length;
    const layerColor: number[] = [];
    const layerFreq: number[] = [];
    const layerMotion: number[] = [];
    const layerRange: number[] = [];
    for (let i = 1; i <= LAYERS; i++) {
      layerColor.push(...(colors[i] ?? colors[0]));
      layerFreq.push(2 + i / n, 3 + i / n);
      layerMotion.push(11 + i * 0.3, 6.5 + i * 0.3, SEED + i * 10);
      layerRange.push(0.1, 0.63 + i * 0.07);
      if (!colors[i]) state.activeColors[i] = 0;
    }
    r.set3("u_layerColor", layerColor);
    r.set2("u_layerFreq", layerFreq);
    r.set3("u_layerMotion", layerMotion);
    r.set2("u_layerRange", layerRange);
    r.set4("u_active", state.activeColors);
    resize();
    state.initialized = true;
    requestFrame();
    window.addEventListener("resize", debouncedResize);
  };

  const waitForCssVars = () => {
    if (state.disposed) return;
    const cs = getComputedStyle(el);
    if (cs.getPropertyValue("--gradientColorOne").includes("#")) {
      const colors = COLOR_VARS.map((v) => parseHexColor(cs.getPropertyValue(v))).filter((c): c is RGB => c !== null);
      init(colors);
      addIsLoadedClass();
      return;
    }
    cssVarRetries += 1;
    if (cssVarRetries > MAX_CSS_VAR_RETRIES) {
      init(FALLBACK_COLORS);
      return;
    }
    cssVarRaf = requestAnimationFrame(waitForCssVars);
  };

  // ---- hidden gradient legend (Konami code), kept from the reference ----
  const updateFrequency = (d: number) => {
    state.freqX += d;
    state.freqY += d;
  };
  const toggleColor = (i: number) => {
    state.activeColors[i] = state.activeColors[i] === 0 ? 1 : 0;
  };
  const showLegend = () => {
    if (state.width > LEGEND_MIN_WIDTH) {
      state.legendVisible = true;
      document.body.classList.add("isGradientLegendVisible");
    }
  };
  const hideLegend = () => {
    state.legendVisible = false;
    document.body.classList.remove("isGradientLegendVisible");
  };
  const checkKonami = (e: KeyboardEvent) => {
    state.konamiIndex = e.key.toLowerCase() === KONAMI[state.konamiIndex] ? state.konamiIndex + 1 : 0;
    if (state.konamiIndex > 1) e.preventDefault();
    if (state.konamiIndex >= KONAMI.length) showLegend();
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    checkKonami(e);
    if (!state.legendVisible) return;
    switch (e.key) {
      case "1": toggleColor(1); break;
      case "2": toggleColor(2); break;
      case "3": toggleColor(3); break;
      case "4": toggleColor(0); break;
      case "-": case "_": updateFrequency(FREQ_DELTA); break;
      case "+": case "=": updateFrequency(-FREQ_DELTA); break;
      case "p": if (state.playing) pause(); else play(); break;
      case "ArrowUp": e.preventDefault(); state.amp += 10; break;
      case "ArrowDown": e.preventDefault(); state.amp -= 10; break;
      case "ArrowLeft": state.freqX += FREQ_DELTA; break;
      case "ArrowRight": state.freqX -= FREQ_DELTA; break;
      default: break;
    }
    syncUniforms();
    renderer?.render();
  };
  const handleMouseDown = (e: MouseEvent) => {
    if (!state.legendVisible) return;
    state.metaKey = e.metaKey;
    state.mouseDown = true;
    if (!state.playing) requestFrame();
  };
  const handleMouseUp = () => {
    state.mouseDown = false;
  };

  // ---- scroll: the reference pauses the gradient while the page scrolls ----
  const handleScrollEnd = () => {
    if (state.intersecting) play();
  };
  const handleScroll = () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(handleScrollEnd, SCROLL_REFRESH_DELAY);
    if (state.legendVisible) hideLegend();
    if (state.playing) pause();
  };

  const setWindowListeners = (on: boolean) => {
    if (on === windowListenersOn) return;
    windowListenersOn = on;
    const m = on ? "addEventListener" : "removeEventListener";
    window[m]("scroll", handleScroll as EventListener);
    window[m]("mousedown", handleMouseDown as EventListener);
    window[m]("mouseup", handleMouseUp as EventListener);
    window[m]("keydown", handleKeyDown as EventListener);
  };

  function stopInteractive() {
    setWindowListeners(false);
    stopObserver?.();
    stopObserver = null;
    window.clearTimeout(scrollTimer);
    // The reference also drops its resize listener here; a static frame is re-rendered on resize
    // instead (see resize()), so the listener is kept.
  }

  cssVarRaf = requestAnimationFrame(waitForCssVars);
  stopObserver = scrollObserver(
    el,
    { threshold: 0.1 },
    () => {
      setWindowListeners(true);
      state.intersecting = true;
      addIsLoadedClass();
      play();
    },
    () => {
      setWindowListeners(false);
      state.intersecting = false;
      if (state.playing) pause();
    },
  );

  return () => {
    state.disposed = true;
    stopInteractive();
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(cssVarRaf);
    window.clearTimeout(parentTimer);
    debouncedResize.cancel();
    window.removeEventListener("resize", debouncedResize);
    if (state.legendVisible) hideLegend();
    renderer?.dispose();
    renderer = null;
    el.classList.remove("isLoaded");
    el.parentElement?.classList.remove("isLoaded");
  };
};
