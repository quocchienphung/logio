// Chrome trace of one transition (renderer, compositor and GPU threads) for scripts/forensics analysis.
// node scripts/forensics/page-transition/trace.mjs [base] [from] [menuLabel] [out.json]
import { chromium } from "playwright";
const [base = "http://localhost:3000", from = "/billing", label = "Payments", out = "trace.json"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
// PT_OFF=lens-in|lens-out|text-fx|mask|all-fx switches parts of the effect off to see what each costs the GPU
const OFF = {
  "lens-in": "html::view-transition-image-pair(root){filter:none!important}",
  "lens-out": "html::view-transition-image-pair(pt-out){filter:none!important}",
  "text-fx": "html::view-transition-new(*){filter:none!important}",
  mask: "html::view-transition-group(*),html::view-transition-image-pair(*){mask:none!important}",
  "all-fx": "html::view-transition-image-pair(*),html::view-transition-new(*){filter:none!important}",
  cut: "@view-transition{navigation:none}",
}[process.env.PT_OFF || ""];
if (OFF)
  await ctx.addInitScript((css) => {
    const add = () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    };
    if (document.head) add();
    else document.addEventListener("readystatechange", add, { once: true });
  }, OFF);
const p = await ctx.newPage();
await p.goto(base + from, { waitUntil: "load" });
await p.waitForTimeout(1500);
const t = p.getByRole("button", { name: "Products" }).first();
const bb = await t.boundingBox();
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await p.waitForSelector(".navigation__content--products a", { state: "visible" });
const link = p.locator(".navigation__content--products a", { hasText: label }).first();
await link.hover();
await p.waitForTimeout(1500);
await b.startTracing(p, { path: out, screenshots: false, categories: ["toplevel", "devtools.timeline", "cc", "viz", "gpu", "blink", "benchmark", "disabled-by-default-devtools.timeline.frame"] });
await p.evaluate(() => { performance.mark("click"); });
await link.click({ noWaitAfter: true });
await p.waitForTimeout(2800);
await b.stopTracing();
await b.close();
