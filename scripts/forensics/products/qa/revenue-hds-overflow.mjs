// Find elements that really cause horizontal page overflow (not clipped by an overflow:hidden/clip ancestor).
// node scripts/forensics/products/qa/revenue-hds-overflow.mjs <url> [width] [height]
import { chromium } from "playwright";

const [url, w = "1440", h = "900"] = process.argv.slice(2);
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const mobile = +w < 600;
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: mobile, hasTouch: mobile });
await ctx.route("**/*", (r) =>
  /^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort(),
);
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "load", timeout: 180000 });
await p.waitForTimeout(1500);
const res = await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const clips = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflowX) || cs.contain.includes("paint")) {
        const r = a.getBoundingClientRect();
        if (r.right <= vw + 0.5) return true;
      }
      if (cs.position === "fixed") return true;
    }
    return false;
  };
  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 0.5 && !clips(el)) {
      out.push({ cls: (el.className && el.className.baseVal === undefined ? el.className : el.tagName).toString().slice(0, 90), right: Math.round(r.right), left: Math.round(r.left) });
    }
  }
  return { vw, scrollWidth: document.documentElement.scrollWidth, offenders: out.slice(0, 25) };
});
console.log(JSON.stringify(res, null, 1));
await b.close();
