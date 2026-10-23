// Pixel comparison of the local Gradient Floor (the selector page's background, stage hidden, 804 x 360) against the
// public preview panel (804 x 360). Both are rendered with reduced motion so the still first frame is compared; the
// moving shape is checked separately by sampling the path data (scripts/qa/gradient-floor.mjs).
// Usage: node scripts/forensics/gradient-floor-compare.mjs [base-url]
import { chromium } from "playwright";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/research/gradient-floor/comparison";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const results = {};
const read = buffer => PNG.sync.read(buffer);

for (const name of ["light"]) {
  const refCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const ref = await refCtx.newPage();
  await ref.goto("https://www.affectui.com/motion/gradient-floor", { waitUntil: "networkidle" });
  await ref.waitForTimeout(800);
  const refShot = read(await ref.locator(".gradient-floor-demo__panel").screenshot());

  const locCtx = await browser.newContext({ viewport: { width: 804, height: 360 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const loc = await locCtx.newPage();
  await loc.goto(`${base}/personalize?browse=1&group=agent-chat`, { waitUntil: "networkidle" });
  await loc.addStyleTag({ content: ".guide-stage{display:none!important}nextjs-portal{display:none!important}.guide-floor{--gf-bg:#fafafa}" });
  await loc.waitForTimeout(800);
  const box = await loc.locator(".guide-floor").boundingBox();
  const locShot = read(await loc.locator(".guide-floor").screenshot());
  const width = Math.min(refShot.width, locShot.width), height = Math.min(refShot.height, locShot.height);
  const crop = png => { const c = new PNG({ width, height }); PNG.bitblt(png, c, 0, 0, width, height, 0, 0); return c; };
  const diff = new PNG({ width, height });
  const bad = pixelmatch(crop(refShot).data, crop(locShot).data, diff.data, width, height, { threshold: 0.1 });
  // Mean absolute channel difference: a soft gradient can differ by a few levels everywhere without any visible change.
  const a = crop(refShot).data, b = crop(locShot).data;
  let sum = 0, max = 0;
  for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) { const d = Math.abs(a[i + c] - b[i + c]); sum += d; if (d > max) max = d; }
  await fs.writeFile(`${out}/${name}-reference.png`, PNG.sync.write(refShot));
  await fs.writeFile(`${out}/${name}-local.png`, PNG.sync.write(locShot));
  await fs.writeFile(`${out}/${name}-diff.png`, PNG.sync.write(diff));
  results[name] = { reference: `${refShot.width}x${refShot.height}`, local: `${locShot.width}x${locShot.height}`, box, differentPixels: bad, percent: +(bad / (width * height) * 100).toFixed(2), meanChannelDiff: +(sum / (width * height * 3)).toFixed(2), maxChannelDiff: max };
  console.log(name, JSON.stringify(results[name]));
  await refCtx.close(); await locCtx.close();
}
await fs.writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
await browser.close();
