// Samples the public Gradient Floor preview: panel geometry, both layers' path data over time (the morph), the
// SVG/viewBox sizes and a few screenshots. Measurement evidence for a clean-room rebuild.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const out = "docs/research/gradient-floor";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("https://www.affectui.com/motion/gradient-floor", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const panel = page.locator(".gradient-floor-demo__panel");
const info = await panel.evaluate(el => {
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height, bg: getComputedStyle(el).backgroundColor, vars: el.getAttribute("style"), cls: el.className };
});
console.log(info);
const samples = await page.evaluate(async () => {
  const root = document.querySelector(".gradient-floor-demo__panel");
  const color = root.querySelector(".ui-gf-layer--color path"), light = root.querySelector(".ui-gf-layer--light path");
  const rows = []; const t0 = performance.now();
  while (performance.now() - t0 < 9000) {
    rows.push({ t: Math.round(performance.now() - t0), c: color.getAttribute("d"), l: light.getAttribute("d") });
    await new Promise(r => setTimeout(r, 125));
  }
  return rows;
});
await fs.writeFile(`${out}/path-samples.json`, JSON.stringify(samples));
console.log(samples.length, "samples");
console.log(samples[0].c); console.log(samples[8].c); console.log(samples[16].c); console.log(samples[24].c);
const uniq = new Set(samples.map(s => s.c)).size; console.log("unique color paths", uniq);
for (const [i, ms] of [[0, 0], [1, 700], [2, 700], [3, 700]]) { await page.waitForTimeout(ms); await panel.screenshot({ path: `${out}/source-frame-${i}.png` }); }
await page.locator(".stage__theme-btn[aria-label='Dark theme']").click();
await page.waitForTimeout(500);
await panel.screenshot({ path: `${out}/source-dark.png` });
// other CSS var defaults
console.log(await page.evaluate(() => getComputedStyle(document.querySelector(".gradient-floor-demo__panel")).getPropertyValue("--ui-gf-bg")));
await browser.close();
