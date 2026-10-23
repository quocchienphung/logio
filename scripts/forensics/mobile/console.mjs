// Everything the page logs while loading and scrolling on a phone. node scripts/forensics/mobile/console.mjs [base] [route] [width]
import { chromium } from "playwright";
const [base = "http://localhost:3000", route = "/", width = "390"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const seen = new Map();
const add = (k) => seen.set(k, (seen.get(k) || 0) + 1);
p.on("console", (m) => { if (["error", "warning"].includes(m.type())) add(`${m.type()}: ${m.text().replace(/\s+/g, " ").slice(0, 600)}`); });
p.on("pageerror", (e) => add("pageerror: " + e.message.slice(0, 400)));
p.on("requestfailed", (r) => add("requestfailed: " + r.url().slice(0, 140) + " " + (r.failure()?.errorText || "")));
p.on("response", (r) => { if (r.status() >= 400) add(`http ${r.status()}: ${r.url().slice(0, 140)}`); });
await p.goto(base + route, { waitUntil: "load" });
await p.waitForTimeout(2500);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(140); }
await p.waitForTimeout(1500);
for (const [k, v] of seen) console.log(v + "x", k);
if (!seen.size) console.log("(nothing logged)");
await b.close();
