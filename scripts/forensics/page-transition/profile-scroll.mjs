// CPU profile of a wheel scroll down a page (CDP Profiler): top self-time functions, run it on `next dev` so
// names are readable. node scripts/forensics/page-transition/profile-scroll.mjs [base] [path] [maxY]
import { chromium } from "playwright";
const [base = "http://localhost:3000", path = "/", maxY = "8000"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await p.goto(base + path, { waitUntil: "load" });
await p.waitForTimeout(6000);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
await cdp.send("Profiler.start");
await p.mouse.move(700, 450);
for (let y = 0; y < +maxY; y += 90) {
  await p.mouse.wheel(0, 90);
  await p.waitForTimeout(16);
}
await p.waitForTimeout(500);
const { profile } = await cdp.send("Profiler.stop");
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const cf = n.callFrame;
  const key = `${cf.functionName || "(anon)"} ${(cf.url || "").split("/").slice(-2).join("/").slice(0, 70)}:${cf.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);
});
const total = [...self.values()].reduce((a, c) => a + c, 0);
console.log("total sampled ms", Math.round(total));
for (const [k, v] of [...self.entries()].sort((a, c) => c[1] - a[1]).slice(0, 28)) console.log(String(Math.round(v)).padStart(6), k);
await b.close();
