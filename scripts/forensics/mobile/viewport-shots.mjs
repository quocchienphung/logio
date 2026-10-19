// Viewport-sized screenshots down the page at DPR 2 (like a phone), after letting each viewport settle.
// node scripts/forensics/mobile/viewport-shots.mjs [base] [width] [out] [y0] [y1] [step]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390", out = "docs/design-references/mobile/vp", y0 = "0", y1 = "4000", step = "700"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(3000);
// hide the Next.js dev indicator so it does not cover the page
await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
let i = 0;
for (let y = +y0; y <= +y1; y += +step) {
  await p.evaluate((y) => scrollTo(0, y), y);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/y${String(y).padStart(5, "0")}.jpg`, type: "jpeg", quality: 70 });
  i++;
}
console.log("shots", i);
await b.close();
