// Decode glsl-loader style modules (module.exports = function(){ return "...shader source..." }) from a
// webpack chunk. node extract-shader-modules.mjs <chunk.js> <id> [<id>...] → writes docs/research/stripe-live/shaders/<id>.glsl
import fs from "node:fs";
import vm from "node:vm";

const [file, ...ids] = process.argv.slice(2);
const src = fs.readFileSync(file, "utf8");
fs.mkdirSync("docs/research/stripe-live/shaders", { recursive: true });
for (const id of ids) {
  const start = src.indexOf(`${id}:function`);
  if (start < 0) { console.error("missing", id); continue; }
  // find the function body by brace matching from the first "{" after "function(...)"
  let i = src.indexOf("{", src.indexOf(")", start));
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (ch === '"' || ch === "'" || ch === "`") { // skip strings
      const q = ch; j++;
      while (j < src.length && src[j] !== q) { if (src[j] === "\\") j++; j++; }
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) break; }
  }
  const body = src.slice(i, j + 1);
  // evaluate as a webpack module: function(e,t,a){...}
  const fn = vm.runInNewContext("(function(e,t,a)" + body + ")");
  const mod = { exports: {} };
  const req = (n) => { throw new Error("nested require " + n); };
  req.n = (m) => () => m;
  req.d = (t, defs) => { for (const k of Object.keys(defs)) Object.defineProperty(t, k, { get: defs[k], enumerable: true }); };
  req.r = () => {};
  try {
    fn(mod, mod.exports, req);
  } catch (e) {
    console.error(id, "eval error", e.message);
    continue;
  }
  const out = typeof mod.exports === "function" ? mod.exports() : typeof mod.exports.default === "function" ? mod.exports.default() : String(mod.exports);
  fs.writeFileSync(`docs/research/stripe-live/shaders/${id}.glsl`, out);
  console.log(id, out.length, "chars:", out.split("\n").find((l) => /void main|uniform/.test(l)));
}
