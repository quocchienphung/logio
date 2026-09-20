// node scale.mjs in.png out.png factor [y h]  — box-filter downscale, optional crop first
import fs from "node:fs";
import { PNG } from "pngjs";
const [, , inp, out, f, y0, h0] = process.argv;
const src = PNG.sync.read(fs.readFileSync(inp));
const F = +f;
const Y = y0 ? +y0 : 0, H = h0 ? Math.min(+h0, src.height - Y) : src.height - Y;
const W2 = Math.floor(src.width * F), H2 = Math.floor(H * F);
const dst = new PNG({ width: W2, height: H2 });
const k = 1 / F;
for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
  let r = 0, g = 0, b = 0, n = 0;
  const sx0 = Math.floor(x * k), sy0 = Math.floor(y * k) + Y, sx1 = Math.min(src.width, Math.floor((x + 1) * k)), sy1 = Math.min(Y + H, Math.floor((y + 1) * k) + Y);
  for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) { const i = (sy * src.width + sx) * 4; r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++; }
  const o = (y * W2 + x) * 4; dst.data[o] = r / n; dst.data[o + 1] = g / n; dst.data[o + 2] = b / n; dst.data[o + 3] = 255;
}
fs.writeFileSync(out, PNG.sync.write(dst));
