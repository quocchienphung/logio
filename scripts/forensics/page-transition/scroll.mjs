// Scroll smoothness through a whole page: rAF gaps while wheeling top to bottom, and which scripts / scroll
// positions the long frames belong to.
// node scripts/forensics/page-transition/scroll.mjs [base] [path ...]
import { chromium } from "playwright";
const [base = "http://localhost:3000", ...paths] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true, args: process.env.PT_SW ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.addInitScript(() => {
  window.__s = { loaf: [] };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__s.loaf.push({ start: e.startTime, dur: e.duration, y: window.scrollY, scripts: (e.scripts || []).filter((s) => s.duration > 8).map((s) => `${Math.round(s.duration)}ms ${s.invoker.split("/").pop()} ${(s.sourceURL || "").split("/").pop()}:${s.sourceFunctionName}`) });
  }).observe({ type: "long-animation-frame", buffered: true });
});
for (const path of paths.length ? paths : ["/", "/payments", "/billing"]) {
  await p.goto(base + path, { waitUntil: "load" });
  await p.waitForTimeout(3000);
  const height = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.evaluate(() => {
    const s = window.__s;
    s.loaf.length = 0;
    s.f = [];
    s.run = true;
    const loop = (t) => {
      s.f.push([t, window.scrollY]);
      if (s.run) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await p.mouse.move(700, 450);
  for (let y = 0; y < Math.min(height, 14000); y += 90) {
    await p.mouse.wheel(0, 90);
    await p.waitForTimeout(16);
  }
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const s = window.__s;
    s.run = false;
    const g = s.f.slice(1).map(([t, y], i) => [t - s.f[i][0], y]);
    const over = (n) => g.filter(([d]) => d > n).length;
    return { frames: s.f.length, over34: over(34), over50: over(50), over100: over(100), max: Math.round(Math.max(...g.map(([d]) => d))), worst: g.filter(([d]) => d > 60).sort((a, c) => c[0] - a[0]).slice(0, 5).map(([d, y]) => `${Math.round(d)}ms@y${Math.round(y)}`), loaf: s.loaf.filter((e) => e.dur > 60).sort((a, c) => c.dur - a.dur).slice(0, 5) };
  });
  console.log(path, `height ${height}`, JSON.stringify({ ...r, loaf: undefined }));
  for (const e of r.loaf) console.log("   loaf", Math.round(e.dur), "y" + Math.round(e.y), e.scripts.join(" | "));
}
await b.close();
