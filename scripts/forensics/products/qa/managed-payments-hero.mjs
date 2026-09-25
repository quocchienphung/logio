// Hero globe QA for /managed-payments: loads the page on headless Chromium (SwiftShader WebGL, local
// only), waits for the globe, then captures a frame sequence of the hero and reports the globe state
// (lazy wrapper, visible flags, overlay card opacities) plus console errors.
// node scripts/forensics/products/qa/managed-payments-hero.mjs [width=1440] [height=900] [outPrefix] [frames=4] [gapMs=2500] [query=?__forceWebGL]
import { chromium } from "playwright";

const [w = "1440", h = "900", prefix = "", frames = "4", gap = "2500", query = "?__forceWebGL"] = process.argv.slice(2);
const url = `http://localhost:3101/managed-payments${query}`;
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});
const mobile = +w < 600;
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 300)));
p.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errs.push(m.type().toUpperCase() + " " + m.text().slice(0, 300));
});
const t0 = Date.now();
await p.goto(url, { waitUntil: "load", timeout: 180000 });
await p.waitForFunction(() => document.querySelector(".lazy-hero-globe.lazy-animation--loaded"), null, { timeout: 120000 }).catch(() => errs.push("globe never loaded"));
console.log("loaded after", Date.now() - t0, "ms");
const state = () =>
  p.evaluate(() => {
    const flags = [...document.querySelectorAll(".globe__flag-overlay")].filter((f) => f.style.display !== "none" && f.innerHTML);
    const cards = [...document.querySelectorAll(".managed-payments-hero__ui-anim-overlay")].map((c) => +getComputedStyle(c).opacity);
    const lazy = document.querySelector(".lazy-hero-globe");
    const canvas = document.querySelector(".globe__canvas");
    return {
      lazy: lazy?.className,
      canvas: canvas ? [canvas.width, canvas.height] : null,
      flags: flags.map((f) => `${f.style.getPropertyValue("--ui-x")},${f.style.getPropertyValue("--ui-y")} o=${f.style.getPropertyValue("--ui-opacity")}`),
      cards: cards.map((o) => o.toFixed(2)).join(" "),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
const hero = await p.$(".managed-payments-hero");
for (let i = 0; i < +frames; i += 1) {
  if (i) await p.waitForTimeout(+gap);
  console.log(`t+${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(await state()));
  if (prefix) await hero.screenshot({ path: `${prefix}-${i}.png` });
}
console.log([...new Set(errs)].slice(0, 20).join("\n"));
await b.close();
