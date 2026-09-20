// Screenshot the local build and compare a region against the captured reference.
// node compare.mjs <viewport> <name> <y> <h> [--local http://localhost:3000/] [--ref-y Y] [--no-capture]
// Outputs <name>-<vp>-{reference,local,overlay,diff}.png under docs/design-references/compare.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { launch, newPage, sweep, VIEWPORTS } from "./browser.mjs";

const args = process.argv.slice(2);
const [vpName, name, y, h] = args;
const vp = VIEWPORTS[vpName];
const li = args.indexOf("--local");
const local = li >= 0 ? args[li + 1] : "http://localhost:3000/";
const ri = args.indexOf("--ref-y");
const refY = ri >= 0 ? +args[ri + 1] : +y;
const OUT = path.resolve("docs/design-references/compare");
fs.mkdirSync(OUT, { recursive: true });
const localPath = path.join(OUT, `full-${vpName}-implementation.png`);

if (!args.includes("--no-capture")) {
  const browser = await launch();
  const { page } = await newPage(browser, vp);
  await page.goto(local, { waitUntil: "networkidle", timeout: 90000 });
  await sweep(page);
  const wi = args.indexOf("--wait");
  if (wi >= 0) await page.waitForTimeout(+args[wi + 1]);
  await page.screenshot({ path: localPath, fullPage: true });
  await browser.close();
}

const crop = (png, Y, H) => {
  const W = png.width;
  const HH = Math.max(1, Math.min(H, png.height - Y));
  const d = new PNG({ width: W, height: HH });
  if (Y < png.height) PNG.bitblt(png, d, 0, Y, W, HH, 0, 0);
  return d;
};
const ref = crop(PNG.sync.read(fs.readFileSync(`docs/research/stripe-live/full-${vpName}.png`)), refY, +h);
const impFull = PNG.sync.read(fs.readFileSync(localPath));
const imp = crop(impFull, +y, +h);
const W = Math.min(ref.width, imp.width);
const H = Math.min(ref.height, imp.height);
const a = new PNG({ width: W, height: H });
const b = new PNG({ width: W, height: H });
PNG.bitblt(ref, a, 0, 0, W, H, 0, 0);
PNG.bitblt(imp, b, 0, 0, W, H, 0, 0);
const diff = new PNG({ width: W, height: H });
const n = pixelmatch(a.data, b.data, diff.data, W, H, { threshold: 0.12, includeAA: true });
const overlay = new PNG({ width: W, height: H });
for (let i = 0; i < W * H * 4; i += 4) {
  overlay.data[i] = (a.data[i] + b.data[i]) / 2;
  overlay.data[i + 1] = (a.data[i + 1] + b.data[i + 1]) / 2;
  overlay.data[i + 2] = (a.data[i + 2] + b.data[i + 2]) / 2;
  overlay.data[i + 3] = 255;
}
fs.writeFileSync(path.join(OUT, `${name}-${vpName}-reference.png`), PNG.sync.write(a));
fs.writeFileSync(path.join(OUT, `${name}-${vpName}-local.png`), PNG.sync.write(b));
fs.writeFileSync(path.join(OUT, `${name}-${vpName}-overlay.png`), PNG.sync.write(overlay));
fs.writeFileSync(path.join(OUT, `${name}-${vpName}-diff.png`), PNG.sync.write(diff));
console.log(`${name}@${vpName}: diff ${((100 * n) / (W * H)).toFixed(2)}% of ${W}x${H}px; local page height ${impFull.height}`);
