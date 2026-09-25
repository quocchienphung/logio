// WebGL gate for the hero globe. Ports of:
// - module 18846 (chunk 1086), useGpuTier: a GPU whose renderer string is on the legacy blocklist (or
//   no WebGL at all) gets the static fallback. The reference then looks up benchmark FPS tiers; with
//   remote benchmarks disabled only Apple GPUs have data, and every listed Apple GPU except the
//   iPad mini 3 (A7, 10 fps) clears the bar, so that table is not ported.
// - module 49873: `?__disableWebGL` forces the fallback.
// - module 90126 `Us`: the renderer is created with failIfMajorPerformanceCaveat; a context that only
//   exists without it, or that lacks WebGL2 / vertex textures / 4096px textures / 256 uniforms / the
//   four extensions below, is rejected.
// QA hook (not in the reference): `?__forceWebGL` skips the blocklist and the performance-caveat test
// so headless Chromium on SwiftShader (which fails both) can render the globe for verification.

import * as THREE from "three";

const BLOCKLIST = [
  "geforce 320m", "geforce 8600", "geforce 8600m gt", "geforce 8800 gs", "geforce 8800 gt", "geforce 9400", "geforce 9400m g",
  "geforce 9400m", "geforce 9600m gt", "geforce 9600m", "geforce fx go5200", "geforce gt 120", "geforce gt 130", "geforce gt 330m",
  "geforce gtx 285", "google swiftshader", "intel g41", "intel g45", "intel gma 4500mhd", "intel gma x3100", "intel hd 3000",
  "intel q45", "legacy", "mali-2", "mali-3", "mali-4", "quadro fx 1500", "quadro fx 4", "quadro fx 5", "radeon hd 2400",
  "radeon hd 2600", "radeon hd 4670", "radeon hd 4850", "radeon hd 4870", "radeon hd 5670", "radeon hd 5750", "radeon hd 6290",
  "radeon hd 6300", "radeon hd 6310", "radeon hd 6320", "radeon hd 6490m", "radeon hd 6630m", "radeon hd 6750m", "radeon hd 6770m",
  "radeon hd 6970m", "sgx 543", "sgx543",
];
const REQUIRED_EXTENSIONS = ["EXT_color_buffer_float", "EXT_texture_filter_anisotropic", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders"];

const params = () => new URLSearchParams(window.location.search);
export const webglForced = () => params().has("__forceWebGL");
export const webglDisabled = () => params().has("__disableWebGL");

/** Renderer-name cleanup from the reference (ANGLE wrappers, memory sizes, API versions). */
function cleanRenderer(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/.*angle ?\((.+)\)(?: on vulkan [0-9.]+)?$/i, "$1")
    .replace(/\s(\d{1,2}gb|direct3d.+$)|\(r\)| \([^)]+\)$/g, "")
    .replace(/(?:vulkan|opengl) \d+\.\d+(?:\.\d+)?(?: \((.*)\))?/, "$1");
  const m = s.match(/angle metal renderer: apple (m\d+(?:\s+(?:pro|max|ultra))?)/i);
  if (m) s = `apple ${m[1]}`;
  return s;
}

/** useGpuTier() -> supportsWebGL: false when WebGL is missing or the GPU is blocklisted. */
export function gpuSupportsGlobe(): boolean {
  if (webglDisabled()) return false;
  const canvas = document.createElement("canvas");
  const gl = (canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" }) ||
    canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return false;
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const dbg = isFirefox ? null : gl.getExtension("WEBGL_debug_renderer_info");
  const raw = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) as string | null;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  if (!raw) return true; // tier LOW, confidence low -> still supported
  if (webglForced()) return true;
  const renderer = cleanRenderer(raw);
  return !BLOCKLIST.some((b) => renderer.includes(b));
}

/** Creates the globe renderer or throws "WebGL disabled based on capabilities check". */
export function createGlobeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  if (webglDisabled()) throw new Error("WebGL disabled by query param");
  const opts: THREE.WebGLRendererParameters = { canvas, antialias: true, alpha: false, powerPreference: "high-performance" };
  // The reference first creates the renderer with failIfMajorPerformanceCaveat and treats a failure as
  // "caveat". Probing a throwaway context gives the same answer without three.js logging a
  // console error for the failed attempt.
  const probe = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  const caveat = !probe;
  probe?.getExtension("WEBGL_lose_context")?.loseContext();
  if (caveat && !webglForced()) throw new Error("WebGL disabled based on capabilities check");
  let renderer: THREE.WebGLRenderer | undefined;
  try {
    renderer = new THREE.WebGLRenderer({ ...opts, failIfMajorPerformanceCaveat: !caveat });
  } catch {
    /* no context at all */
  }
  if (!renderer) throw new Error("WebGL disabled based on capabilities check");
  const caps = renderer.capabilities;
  const gl = renderer.getContext();
  const ok =
    caps.isWebGL2 &&
    caps.maxVertexTextures > 0 &&
    caps.maxTextureSize >= 4096 &&
    caps.maxVertexUniforms >= 256 &&
    caps.maxFragmentUniforms >= 256 &&
    REQUIRED_EXTENSIONS.every((e) => gl.getExtension(e) !== null);
  if (!ok) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw new Error("WebGL disabled based on capabilities check");
  }
  return renderer;
}
