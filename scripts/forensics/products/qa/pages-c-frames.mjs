// Frame-sequence capture for the pages-c controller ports (localhost only).
// usage: node pages-c-frames.mjs <url> <selector> <outPrefix|-> <t1,t2,...ms> [w=1440] [h=900] [--reduced] [--eval=<js run after scroll>]
// Scrolls <selector> to the viewport centre, then screenshots it at each elapsed time (ms since scroll).
// Prints console errors, page errors and a JSON probe of the element's inline/animated state per frame.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const [url, selector, outPrefix, times, w = "1440", h = "900"] = args.filter((a) => !a.startsWith("--"));
const reduced = flags.includes("--reduced");
const evalFlag = flags.find((f) => f.startsWith("--eval="));
const probeFlag = flags.find((f) => f.startsWith("--probe="));

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: reduced ? "reduce" : "no-preference" });
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
const p = await ctx.newPage();
const errors = [];
p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await p.goto(url, { waitUntil: "load" });
await p.waitForTimeout(600);
await p.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return;
  const r = el.getBoundingClientRect();
  window.scrollTo(0, window.scrollY + r.top - (window.innerHeight - Math.min(r.height, window.innerHeight)) / 2);
}, selector);
if (evalFlag) await p.evaluate(evalFlag.slice(7));
const t0 = Date.now();
for (const t of times.split(",").map(Number)) {
  const wait = t - (Date.now() - t0);
  if (wait > 0) await p.waitForTimeout(wait);
  const el = await p.$(selector);
  if (!el) {
    console.log("missing", selector);
    break;
  }
  if (outPrefix !== "-") await el.screenshot({ path: `${outPrefix}-${t}.png` });
  if (probeFlag) console.log(t, JSON.stringify(await p.evaluate(probeFlag.slice(8))));
}
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(JSON.stringify({ errors, overflow }));
await b.close();
