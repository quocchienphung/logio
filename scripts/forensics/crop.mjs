// node crop.mjs in.png out.png x y w h
import fs from "node:fs";
import { PNG } from "pngjs";
const [, , inp, out, x, y, w, h] = process.argv;
const src = PNG.sync.read(fs.readFileSync(inp));
const X = +x, Y = +y, W = Math.min(+w, src.width - X), H = Math.min(+h, src.height - Y);
const dst = new PNG({ width: W, height: H });
PNG.bitblt(src, dst, X, Y, W, H, 0, 0);
fs.writeFileSync(out, PNG.sync.write(dst));
