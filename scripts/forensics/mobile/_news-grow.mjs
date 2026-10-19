import { chromium } from "playwright";
const [base = "http://localhost:3000"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(3000);
const grab = () => p.evaluate(() => {
  const s = [...document.querySelectorAll("main > section, main > div > section")].find((x) => x.querySelector(".events-carousel__header"));
  const out = {};
  s.querySelectorAll("*").forEach((e, i) => { const r = e.getBoundingClientRect(); out[i] = [`${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`, Math.round(r.height), Math.round(r.top + scrollY), e.tagName === "IMG" ? (e.getAttribute("loading") + " " + (e.complete ? "loaded" : "pending") + " " + e.naturalWidth + "x" + e.naturalHeight + " w=" + e.getAttribute("width") + " h=" + e.getAttribute("height")) : ""]; });
  return out;
});
const before = await grab();
for (let y = 0; y < 15000; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(150); }
await p.waitForTimeout(1500);
const after = await grab();
const rows = [];
for (const k of Object.keys(before)) if (after[k] && before[k][1] !== after[k][1]) rows.push([after[k][1] - before[k][1], before[k][0], before[k][1], after[k][1], after[k][3] || before[k][3]]);
rows.sort((a, c) => Math.abs(c[0]) - Math.abs(a[0]));
for (const r of rows.slice(0, 14)) console.log(r.join("  "));
await b.close();
