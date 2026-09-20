// Sample an element's transform/opacity over time: node sample-transform.mjs <url|live> <vp> "<selector>" [ms] [n]
import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const [u, vp, sel, ms = "250", n = "12"] = process.argv.slice(2);
const browser = await launch();
const { page } = await newPage(browser, VIEWPORTS[vp]);
await page.goto(u === "live" ? "https://stripe.com/" : u, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1500);
const rows = [];
for (let i = 0; i < +n; i++) {
  rows.push(await page.evaluate((sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return { t: performance.now().toFixed(0), transform: cs.transform, opacity: cs.opacity, style: el.getAttribute("style") }; }, sel));
  await page.waitForTimeout(+ms);
}
await browser.close();
console.table(rows);
