// Reports what headless Chromium (SwiftShader) exposes for the globe's WebGL capability gate.
// node scripts/forensics/products/qa/managed-payments-webgl-caps.mjs [url]
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3101/managed-payments";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await b.newPage();
await p.route("**/*", (r) =>
  /^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort(),
);
await p.goto(url, { waitUntil: "domcontentloaded" });
const caps = await p.evaluate(() => {
  const out = {};
  for (const fail of [true, false]) {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: fail });
    out["webgl2_failIfCaveat_" + fail] = !!gl;
    if (gl && !fail) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      out.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      out.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      out.maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
      out.maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
      out.vertexTextureUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
      out.ext = ["EXT_color_buffer_float", "EXT_texture_filter_anisotropic", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders"].map(
        (n) => n + ":" + !!gl.getExtension(n),
      );
    }
  }
  return out;
});
console.log(JSON.stringify(caps, null, 1));
await b.close();
