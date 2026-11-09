// The Book of the week cover must end up exactly as big as it was without the reserved box: loaded size with the
// override vs with the reference's own rules (width/height/aspect-ratio forced back to auto), at many widths.
import { chromium } from "playwright";
const [base = "http://localhost:3100"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const w of [360, 390, 639, 640, 768, 939, 940, 1100, 1296, 1440, 1920]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(base + "/", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector(".book-of-the-week__image").scrollIntoView({ block: "center" }));
  await p.waitForFunction(() => { const i = document.querySelector(".book-of-the-week__image"); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(700);
  const rect = () => p.evaluate(() => { const r = document.querySelector(".book-of-the-week__image").getBoundingClientRect(); const s = document.querySelector(".book-of-the-week").getBoundingClientRect(); return `${(r.width).toFixed(1)}x${(r.height).toFixed(1)} section h${Math.round(s.height)}`; });
  const withFix = await rect();
  await p.addStyleTag({ content: ".book-of-the-week__image{aspect-ratio:auto!important;height:auto!important;width:auto!important}" });
  await p.waitForTimeout(300);
  const without = await rect();
  console.log(String(w).padStart(5), "with fix", withFix.padEnd(28), "reference rules", without.padEnd(28), withFix === without ? "same" : "DIFFERENT");
  await ctx.close();
}
await b.close();
