// Trace of a wheel scroll down a page; lists the slowest Layout / UpdateLayoutTree / Paint tasks with the
// scroll position they happened at. node scripts/forensics/page-transition/scroll-trace.mjs [base] [path] [maxY] [out.json]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3100", path = "/", maxY = "9000", out = "scroll-trace.json"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(base + path, { waitUntil: "load" });
await p.waitForTimeout(5000);
await b.startTracing(p, { path: out, categories: ["devtools.timeline", "blink.user_timing", "disabled-by-default-devtools.timeline", "v8.execute"] });
await p.mouse.move(700, 450);
for (let y = 0; y < +maxY; y += 90) {
  await p.mouse.wheel(0, 90);
  await p.evaluate((y) => performance.mark("y" + y), y);
  await p.waitForTimeout(16);
}
await p.waitForTimeout(400);
await b.stopTracing();
await b.close();
const d = JSON.parse(fs.readFileSync(out, "utf8"));
const ev = d.traceEvents || d;
const marks = ev.filter((e) => e.name && /^y\d+$/.test(e.name) && (e.ph === "R" || e.ph === "I" || e.ph === "i")).map((e) => [e.ts, +e.name.slice(1)]).sort((a, c) => a[0] - c[0]);
const yAt = (ts) => { let y = 0; for (const [t, v] of marks) { if (t > ts) break; y = v; } return y; };
const rows = ev.filter((e) => e.ph === "X" && e.dur > 20000 && ["Layout", "UpdateLayoutTree", "Paint", "Layerize", "PrePaint", "FunctionCall", "EvaluateScript", "v8.compile", "RunMicrotasks", "FireAnimationFrame"].includes(e.name));
rows.sort((a, c) => a.ts - c.ts);
for (const e of rows) {
  const a = e.args || {};
  const extra = a.beginData ? `dirty ${a.beginData.dirtyObjects}/${a.beginData.totalObjects}` : a.elementCount != null ? `elements ${a.elementCount}` : a.data?.functionName ? `${a.data.functionName} ${String(a.data.url || "").split("/").pop()}:${a.data.lineNumber}` : "";
  console.log(`y${String(yAt(e.ts)).padStart(5)} ${String(Math.round(e.dur / 1000)).padStart(4)}ms ${e.name.padEnd(18)} ${extra}`);
}
