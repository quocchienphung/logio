// Presented-frame cadence of the whole transition, from the compositor (viz DrawAndSwap), which is what the
// eye sees: unlike rAF gaps it keeps counting when the page's main thread is busy.
// node scripts/forensics/page-transition/frames.mjs [base] [from] [menuLabel] [runs]
import { chromium } from "playwright";
const [base = "http://localhost:3000", from = "/billing", label = "Payments", runs = "3"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const all = [];
for (let run = 0; run < +runs; run++) {
  await p.goto(base + from, { waitUntil: "load" });
  await p.waitForTimeout(1500);
  const t = p.getByRole("button", { name: "Products" }).first();
  const bb = await t.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.waitForSelector(".navigation__content--products a", { state: "visible" });
  const link = p.locator(".navigation__content--products a", { hasText: label }).first();
  await link.hover();
  await p.waitForTimeout(1200);
  const path = `${process.env.TEMP || "/tmp"}/pt-frames-${run}.json`;
  await b.startTracing(p, { path, categories: ["viz", "gpu", "benchmark", "cc", "disabled-by-default-viz.quads"].slice(0, 4) });
  await link.click({ noWaitAfter: true });
  await p.waitForTimeout(3200);
  await b.stopTracing();
  const fs = await import("node:fs");
  const d = JSON.parse(fs.readFileSync(path, "utf8"));
  const ev = d.traceEvents || d;
  const swaps = ev.filter((e) => e.name === "Display::DrawAndSwap" || e.name === "Graphics.Pipeline.DrawAndSwap").map((e) => e.ts / 1000).sort((x, y) => x - y);
  const uniq = swaps.filter((v, i) => i === 0 || v - swaps[i - 1] > 1);
  // window: first frame after a 400 ms quiet gap … that is the click; take 2.2 s from the first swap after click
  const gaps = uniq.slice(1).map((v, i) => v - uniq[i]);
  const start = uniq.findIndex((v, i) => i > 0 && v - uniq[i - 1] > 0) ;
  const w = uniq.filter((v) => v >= uniq[0]);
  const n = w.length;
  const span = w[n - 1] - w[0];
  const r = { run, swaps: n, spanMs: Math.round(span), over25: gaps.filter((g) => g > 25 && g < 1500).length, over50: gaps.filter((g) => g > 50 && g < 1500).length, maxGap: Math.round(Math.max(0, ...gaps.filter((g) => g < 1500))) };
  all.push(r);
  console.log(JSON.stringify(r));
}
await b.close();
