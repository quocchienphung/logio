// The homepage in WebKit (Safari's engine) as an iPhone: console errors, viewport shots down the page, the menu.
// node webkit.mjs [base] [out] [device]
import fs from "node:fs";
import { devices, webkit } from "playwright";
const [base = "http://localhost:3100", out = "docs/design-references/mobile/webkit", device = "iPhone 14"] = process.argv.slice(2);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const b = await webkit.launch();
const ctx = await b.newContext({ ...devices[device] });
const p = await ctx.newPage();
const logs = new Map();
const add = (k) => logs.set(k, (logs.get(k) || 0) + 1);
p.on("console", (m) => { if (["error", "warning"].includes(m.type())) add(`${m.type()}: ${m.text().slice(0, 300)}`); });
p.on("pageerror", (e) => add("pageerror: " + e.message.slice(0, 300)));
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(3500);
const vp = p.viewportSize();
console.log(device, JSON.stringify(vp), "UA", (await p.evaluate(() => navigator.userAgent)).slice(0, 90));
const total = await p.evaluate(() => document.documentElement.scrollHeight);
console.log("document height", total, "scrollW", await p.evaluate(() => document.documentElement.scrollWidth), "innerW", await p.evaluate(() => innerWidth));
const ys = [0, 800, 1600, 2400, 3200, 4000, 5200, 6600, 8200, 9800, 11600, 13400, 15200, 17000, 19000, total - vp.height];
let i = 0;
for (const y of ys) {
  await p.evaluate((y) => scrollTo(0, y), y);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${out}/s${String(i++).padStart(2, "0")}-y${y}.png` });
}
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(800);
const burger = p.locator("header.navigation button.navigation-hamburger-button").first();
await burger.tap();
await p.waitForTimeout(1000);
await p.screenshot({ path: `${out}/menu-open.png` });
await p.getByRole("button", { name: /^Products$/ }).first().tap();
await p.waitForTimeout(1000);
await p.screenshot({ path: `${out}/menu-products.png` });
for (const [k, v] of logs) console.log(`[x${v}] ${k}`);
if (!logs.size) console.log("console: clean");
await b.close();
