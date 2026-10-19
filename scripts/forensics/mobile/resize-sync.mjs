// "Sync" check for live resizing (DevTools responsive mode): load at one width, resize to another without reloading,
// and compare with a fresh load at the target width — page height, section tops and a pixel diff per band.
// node scripts/forensics/mobile/resize-sync.mjs [base] [fromWidth] [toWidth] [route]
import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { chromium } from "playwright";

const [base = "http://localhost:3000", from = "1440", to = "390", route = "/"] = process.argv.slice(2);
const out = "docs/design-references/mobile/resize";
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const mk = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { Math.random = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); });
  return { ctx, page };
};
const sweep = async (page) => {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total + 500; y += 500) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(110); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(900);
};
const measure = (page) => page.evaluate(() => ({
  height: document.documentElement.scrollHeight,
  scrollW: document.documentElement.scrollWidth,
  sections: [...document.querySelectorAll("main > section, main > div > section")].map((s) => [s.className.split(" ").filter((c) => !/^hds-|^section/.test(c))[0] || s.className.split(" ")[0], Math.round(s.getBoundingClientRect().top + scrollY), Math.round(s.getBoundingClientRect().height)]),
  canvases: [...document.querySelectorAll("canvas")].filter((c) => c.getBoundingClientRect().width > 0).length,
  stats: document.querySelector(".stats-section")?.className.replace(/hds-color-mode\s*/, ""),
}));

const fresh = await mk(+to, 844);
await fresh.page.goto(base + route, { waitUntil: "load" });
await fresh.page.waitForTimeout(2500);
await sweep(fresh.page);
const mFresh = await measure(fresh.page);
await fresh.page.screenshot({ path: `${out}/fresh-${to}.png`, fullPage: true });

const live = await mk(+from, 900);
await live.page.goto(base + route, { waitUntil: "load" });
await live.page.waitForTimeout(2500);
await sweep(live.page);
await live.page.setViewportSize({ width: +to, height: 844 });
await live.page.waitForTimeout(2500);
await sweep(live.page);
const mLive = await measure(live.page);
await live.page.screenshot({ path: `${out}/resized-${from}-to-${to}.png`, fullPage: true });

console.log(`fresh@${to}: height ${mFresh.height} canvases ${mFresh.canvases} stats=${mFresh.stats}`);
console.log(`${from}->${to}: height ${mLive.height} canvases ${mLive.canvases} stats=${mLive.stats}`);
const n = Math.max(mFresh.sections.length, mLive.sections.length);
for (let i = 0; i < n; i++) {
  const a = mFresh.sections[i], c = mLive.sections[i];
  if (!a || !c) { console.log("  section", i, a ? "missing after resize" : "extra after resize", a || c); continue; }
  const flag = Math.abs(a[1] - c[1]) > 2 || Math.abs(a[2] - c[2]) > 2 ? "  <-- DIFF" : "";
  console.log(`  ${String(i).padStart(2)} ${String(a[0]).padEnd(28)} fresh y${a[1]} h${a[2]} | resized y${c[1]} h${c[2]}${flag}`);
}
// pixel diff per 1000px band (first 16000px)
const A = PNG.sync.read(fs.readFileSync(`${out}/fresh-${to}.png`));
const B = PNG.sync.read(fs.readFileSync(`${out}/resized-${from}-to-${to}.png`));
const W = Math.min(A.width, B.width);
const bands = [];
for (let y = 0; y < Math.min(A.height, B.height, 16000); y += 1000) {
  const h = Math.min(1000, A.height - y, B.height - y);
  const ca = new PNG({ width: W, height: h }), cb = new PNG({ width: W, height: h });
  PNG.bitblt(A, ca, 0, y, W, h, 0, 0); PNG.bitblt(B, cb, 0, y, W, h, 0, 0);
  const d = pixelmatch(ca.data, cb.data, null, W, h, { threshold: 0.15 });
  bands.push(`${y}:${((100 * d) / (W * h)).toFixed(0)}%`);
}
console.log("pixel diff per 1000px band:", bands.join(" "));
await b.close();
