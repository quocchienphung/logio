// Viewport frames of the first seconds after load on a phone (DPR 2), to catch pop-in, flashes and layout shifts.
// node scripts/forensics/mobile/first-seconds.mjs [base] [width] [out]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390", out = "docs/design-references/mobile/first"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
const p = await ctx.newPage();
const t0 = Date.now();
p.goto(base + "/", { waitUntil: "commit" });
const marks = [300, 700, 1200, 2000, 3500, 6000];
let i = 0;
for (const m of marks) {
  await p.waitForTimeout(Math.max(0, m - (Date.now() - t0)));
  await p.screenshot({ path: `${out}/t${String(i++).padStart(2, "0")}-${m}ms.jpg`, type: "jpeg", quality: 60 }).catch(() => {});
}
console.log(await p.evaluate(() => ({ drawn: document.querySelectorAll(".hero-wave-animation--drawn").length, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, sy: scrollY })));
await b.close();
