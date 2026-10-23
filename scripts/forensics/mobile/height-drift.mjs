// Does the layout change while the page is used? Section tops/heights right after load, after a slow scroll sweep,
// and back at the top, on a phone (a shift under the reader is a visible "jump"). node height-drift.mjs [base] [width]
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
const snap = () => p.evaluate(() => ({ h: document.documentElement.scrollHeight, secs: [...document.querySelectorAll("main > section, main > div > section, footer")].map((s) => [(s.className.match(/[\w-]*(?:section|stats|business)[\w-]*/g) || [s.tagName])[0], Math.round(s.getBoundingClientRect().top + scrollY), Math.round(s.getBoundingClientRect().height)]) }));
const a = await snap();
const total = a.h;
const marks = [];
for (let y = 0; y < total + 800; y += 400) {
  await p.evaluate((y) => scrollTo(0, y), y);
  await p.waitForTimeout(120);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  marks.push([y, h]);
}
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(1500);
const c = await snap();
console.log("height at load", a.h, "after sweep", c.h);
let last = a.h;
for (const [y, h] of marks) if (h !== last) { console.log(`  height changed ${last} -> ${h} while scrolled to y=${y}`); last = h; }
for (let i = 0; i < Math.max(a.secs.length, c.secs.length); i++) {
  const x = a.secs[i], z = c.secs[i];
  if (!x || !z) continue;
  if (x[1] !== z[1] || x[2] !== z[2]) console.log(`  section ${i} ${x[0]}: load y${x[1]} h${x[2]}  ->  after y${z[1]} h${z[2]}`);
}
await b.close();
