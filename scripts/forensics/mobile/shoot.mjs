// Full-page screenshot of the local homepage at a phone width, after a slow scroll sweep (lazy content, scroll
// reveals), as <out>/full-<w>.png. node scripts/forensics/mobile/shoot.mjs [base] [width] [out] [path]
import fs from "node:fs";
import path from "node:path";
import { launch, newPage, sweep } from "../browser.mjs";

const [base = "http://localhost:3000", width = "390", out = "docs/design-references/mobile", route = "/"] = process.argv.slice(2);
const w = +width;
const h = w >= 700 ? 1024 : 844;
fs.mkdirSync(out, { recursive: true });
const browser = await launch();
const { page, context } = await newPage(browser, { width: w, height: h, mobile: true });
const logs = [];
page.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 200)));
page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && logs.push(`${m.type()}: ${m.text().slice(0, 200)}`));
await page.goto(base + route, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(2500);
await sweep(page, 500, 150);
await page.waitForTimeout(1500);
const file = path.join(out, `full-${w}${route === "/" ? "" : route.replace(/\W+/g, "-")}.png`);
await page.screenshot({ path: file, fullPage: true });
const m = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth }));
console.log(file, JSON.stringify(m), logs.length ? "\n" + logs.join("\n") : "");
await context.close();
await browser.close();
