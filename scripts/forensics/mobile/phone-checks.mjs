// Phone-specific sanity checks on the loaded homepage: viewport meta, input font sizes (iOS zooms the page when a
// focused field is under 16px), tap target sizes of links/buttons in the viewport, fixed/sticky overlays, fonts.
// node phone-checks.mjs [base] [width]
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(80); }
const r = await p.evaluate(() => {
  const meta = document.querySelector('meta[name="viewport"]')?.getAttribute("content");
  const fields = [...document.querySelectorAll("input, textarea, select")].filter((e) => e.type !== "hidden").map((e) => ({ el: `${e.tagName.toLowerCase()}${e.type ? "[" + e.type + "]" : ""}.${String(e.className).split(" ")[0]}`, fs: parseFloat(getComputedStyle(e).fontSize), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), vis: e.getBoundingClientRect().width > 0 }));
  const targets = [...document.querySelectorAll("a[href], button")].map((e) => { const r = e.getBoundingClientRect(); return { r, e }; }).filter(({ r }) => r.width > 0 && r.height > 0).map(({ r, e }) => ({ w: Math.round(r.width), h: Math.round(r.height), t: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 28), c: String(e.className).split(" ")[0] }));
  const small = targets.filter((t) => t.h < 32 && t.w < 44).slice(0, 12);
  const fixed = [...document.querySelectorAll("*")].filter((e) => { const cs = getComputedStyle(e); return cs.position === "fixed" && e.getBoundingClientRect().width > 0 && cs.visibility !== "hidden" && cs.display !== "none"; }).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} z=${getComputedStyle(e).zIndex}`).slice(0, 8);
  const fonts = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i);
  return { meta, fields, nTargets: targets.length, small, fixed, fonts, dpr: devicePixelRatio };
});
console.log("viewport meta:", r.meta);
console.log("fields:", JSON.stringify(r.fields));
console.log("fixed:", r.fixed.join(" | "));
console.log("fonts loaded:", r.fonts.join(", "));
console.log(`tap targets: ${r.nTargets}, small (<32px high and <44px wide): ${r.small.length}`);
for (const t of r.small) console.log("   ", JSON.stringify(t));
await b.close();
