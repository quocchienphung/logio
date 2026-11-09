// Touch-swipes every horizontally scrollable region on a phone (real touch gestures via CDP) and reports whether
// it moved; also checks the page itself does not scroll sideways. node swipe.mjs [base] [width]
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
// a finger drag as raw touch events (works where synthesizeScrollGesture does not in headless Chrome)
const swipe = async (x, y, dx, dy, steps = 12) => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps }] });
    await p.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60); }
await p.evaluate(() => scrollTo(0, 0));
const regions = await p.evaluate(() => [...document.querySelectorAll("*")].filter((e) => { const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 8 && e.clientWidth > 120 && e.getBoundingClientRect().height > 40; }).map((e, i) => { e.setAttribute("data-swipe", i); const r = e.getBoundingClientRect(); return { i, cls: `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`, w: Math.round(r.width), sw: e.scrollWidth, top: Math.round(r.top + scrollY), snap: getComputedStyle(e).scrollSnapType }; }));
console.log("scrollable regions:", regions.length);
for (const r of regions) {
  await p.evaluate((top) => scrollTo(0, top - 200), r.top);
  await p.waitForTimeout(500);
  const box = await p.evaluate((i) => { const e = document.querySelector(`[data-swipe="${i}"]`); const rr = e.getBoundingClientRect(); return { x: rr.left + rr.width / 2, y: rr.top + Math.min(rr.height / 2, 200), sl: e.scrollLeft }; }, r.i);
  await swipe(box.x + 110, box.y, -220, 0);
  await p.waitForTimeout(900);
  const after = await p.evaluate((i) => document.querySelector(`[data-swipe="${i}"]`).scrollLeft, r.i);
  console.log(`  ${r.cls.padEnd(48)} w${r.w} scrollW${r.sw} snap=${r.snap.split(" ")[0]}  scrollLeft ${Math.round(box.sl)} -> ${Math.round(after)} ${after > box.sl + 5 ? "OK" : "DID NOT MOVE"}`);
}
await p.evaluate(() => scrollTo(0, 0));
await swipe(200, 600, 0, -300);
await p.waitForTimeout(700);
console.log("sanity: vertical swipe moved the page to scrollY", await p.evaluate(() => Math.round(scrollY)));
console.log("page scrolls sideways:", await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || window.scrollX !== 0));
await b.close();
