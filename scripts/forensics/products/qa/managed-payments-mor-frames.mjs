// Frame sequence of the merchant-of-record filter demo (first play): scrolls straight to the graphic and
// captures it at the given offsets (ms after it becomes >=50% visible).
// node scripts/forensics/products/qa/managed-payments-mor-frames.mjs <outPrefix> [offsets=300,1700,2300,3300]
import { chromium } from "playwright";

const [prefix, offsets = "300,1700,2300,3300"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
await p.goto("http://localhost:3101/managed-payments", { waitUntil: "load", timeout: 180000 });
await p.waitForTimeout(1000);
const g = await p.$(".merchant-of-record-graphic-switch--desktop");
await g.evaluate((el) => el.scrollIntoView({ block: "center" }));
const t0 = Date.now();
for (const [i, ms] of offsets.split(",").map(Number).entries()) {
  await p.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
  const s = await p.evaluate(() => document.querySelector(".merchant-of-record-graphic__filter-chip--active").className.replace(/merchant-of-record-graphic__filter-chip/g, "chip"));
  console.log(ms, s);
  await g.screenshot({ path: `${prefix}-${i}.png` });
}
await b.close();
