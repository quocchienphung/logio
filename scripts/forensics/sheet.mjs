// Contact sheet: node sheet.mjs <out.png> <scale> <cols> <img1> <img2> ...
import fs from "node:fs";
import { PNG } from "pngjs";
const [, , out, scaleArg, colsArg, ...files] = process.argv;
const f = +scaleArg, cols = +colsArg;
const imgs = files.map((p) => PNG.sync.read(fs.readFileSync(p)));
const w = Math.round(Math.max(...imgs.map((i) => i.width)) * f), h = Math.round(Math.max(...imgs.map((i) => i.height)) * f);
const rows = Math.ceil(imgs.length / cols);
const d = new PNG({ width: w * cols + 10 * (cols - 1), height: h * rows + 10 * (rows - 1) });
d.data.fill(255);
imgs.forEach((im, k) => {
  const ox = (k % cols) * (w + 10), oy = Math.floor(k / cols) * (h + 10);
  const iw = Math.round(im.width * f), ih = Math.round(im.height * f);
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
    const si = (Math.floor(y / f) * im.width + Math.floor(x / f)) * 4, di = ((oy + y) * d.width + ox + x) * 4;
    d.data[di] = im.data[si]; d.data[di + 1] = im.data[si + 1]; d.data[di + 2] = im.data[si + 2]; d.data[di + 3] = 255;
  }
});
fs.writeFileSync(out, PNG.sync.write(d));
console.log("saved", out);
