// Layout shifts (Layout Instability API) while loading and scrolling the page like a reader: total score and the
// elements that moved. node scripts/forensics/mobile/cls.mjs [base] [width] [route]
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390", route = "/", delayMs = "0"] = process.argv.slice(2);
const w = +width;
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, deviceScaleFactor: 2, isMobile: w < 900, hasTouch: w < 900 });
// delayMs > 0 holds every image back that long (a slow network), so images arrive while their section is on screen
if (+delayMs > 0) {
  await ctx.route(/\.(png|jpe?g|webp|avif|gif)(\?|$)/i, async (r) => {
    const resp = await r.fetch();
    await new Promise((res) => setTimeout(res, +delayMs));
    await r.fulfill({ response: resp }).catch(() => {});
  });
}
const p = await ctx.newPage();
await p.addInitScript(() => {
  window.__cls = { total: 0, items: [] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__cls.total += e.value;
      window.__cls.items.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), y: Math.round(scrollY), src: (e.sources || []).slice(0, 3).map((s) => { const n = s.node; return n ? `${n.nodeType === 1 ? n.tagName.toLowerCase() + "." + String(n.className).split(" ")[0] : "#text"} ${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)} h${Math.round(s.previousRect.height)}→${Math.round(s.currentRect.height)}` : "?"; }) });
    }
  }).observe({ type: "layout-shift", buffered: true });
});
await p.goto(base + route, { waitUntil: "load" });
await p.waitForTimeout(2500);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const dwell = +delayMs > 0 ? 450 : 180;
for (let y = 0; y < total + 600; y += 350) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(dwell); }
await p.waitForTimeout(+delayMs + 1500);
const r = await p.evaluate(() => window.__cls);
console.log(`${route} @${w}${+delayMs ? " (images delayed " + delayMs + "ms)" : ""}: CLS ${r.total.toFixed(4)} over ${r.items.length} shifts`);
for (const it of r.items.sort((a, c) => c.v - a.v).slice(0, 12)) console.log(`  ${it.v}  t=${it.t}ms scrollY=${it.y}  ${it.src.join(" | ")}`);
await b.close();
