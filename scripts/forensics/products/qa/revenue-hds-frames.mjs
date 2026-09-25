// Frame sequence of one region of a Revenue HDS page (localhost only).
// node scripts/forensics/products/qa/revenue-hds-frames.mjs <url> <selector> <outPrefix> <w> <h> <ms,ms,...> [force-webgl=0] [reduced=0]
// Scrolls <selector> into view (centre), then screenshots the element's box at each timestamp (ms after
// the scroll). Prints console errors and a few runtime facts.
import { chromium } from "playwright";

const [url, sel, out, w = "1440", h = "900", times = "0,1000", force = "0", reduced = "0"] = process.argv.slice(2);
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--hide-scrollbars", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const mobile = +w < 640;
const ctx = await b.newContext({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 1,
  isMobile: mobile,
  hasTouch: mobile,
  reducedMotion: reduced === "1" ? "reduce" : "no-preference",
});
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
if (force === "1") await ctx.addInitScript(() => (window.__qaForceWebgl = true));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 300)));
p.on("console", (m) => {
  if (m.type() === "error") errs.push("ERROR " + m.text().slice(0, 300));
});
await p.goto(url, { waitUntil: "load", timeout: 180000 });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const el = p.locator(sel).first();
await el.evaluate((n) => n.scrollIntoView({ block: "center" }));
const t0 = Date.now();
for (const t of times.split(",").map(Number)) {
  const wait = t - (Date.now() - t0);
  if (wait > 0) await p.waitForTimeout(wait);
  await el.screenshot({ path: `${out}-${String(t).padStart(5, "0")}.png` });
}
console.log(JSON.stringify(await p.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: innerWidth, drawn: !!document.querySelector(".hero-wave-animation--drawn"), canvas: !!document.querySelector(".billing-hero__wave canvas") }))));
console.log(errs.join("\n"));
await b.close();
