// With the phone menu open, what receives a tap on empty menu space, and does scrolling the menu scroll the page?
// node menu-hit.mjs [base] [w] [h]
import { chromium } from "playwright";
const [base = "http://localhost:3100", w = "390", h = "844"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.locator("header.navigation button.navigation-hamburger-button").first().tap();
await p.waitForTimeout(900);
const hits = await p.evaluate((h) => [[195, 560], [195, 300], [60, h - 150], [195, 40]].map(([x, y]) => { const e = document.elementFromPoint(x, y); return `(${x},${y}) -> ${e ? e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0] : "null"} inside-popup=${!!e?.closest("#navigation-popup-mobile")} inside-header=${!!e?.closest("header")}`; }), +h);
console.log(hits.join("\n"));
const before = await p.evaluate(() => scrollY);
await p.mouse.wheel(0, 600);
await p.waitForTimeout(500);
console.log("page scrollY before/after wheel over the open menu:", before, await p.evaluate(() => scrollY), "| body overflow:", await p.evaluate(() => getComputedStyle(document.body).overflow));
await b.close();
