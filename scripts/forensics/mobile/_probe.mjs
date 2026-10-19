import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/", { waitUntil: "load" });
await p.waitForTimeout(2500);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
await p.evaluate((h) => scrollTo(0, h), h);
await p.waitForTimeout(1500);
const sy = await p.evaluate(() => scrollY);
console.log("height", h, "scrollY", sy);
const hits = await p.evaluate(() => {
  const out = [];
  for (const [x, y] of [[335, 795], [330, 780], [345, 805]]) {
    out.push(document.elementsFromPoint(x, y).slice(0, 6).map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${e.tagName.toLowerCase()}.${String(e.className).split(" ").slice(0, 3).join(".")} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} bg=${cs.backgroundColor} pos=${cs.position} tf=${cs.transform.slice(0, 40)}`; }));
  }
  return out;
});
console.log(hits.map((a) => a.join("\n   ")).join("\n--\n"));
await p.screenshot({ path: "docs/design-references/mobile/footer-bottom.png" });
await b.close();
