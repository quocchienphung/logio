// Frame-sample an element: node shot-el.mjs <live|url> <vp> "<selector>" <outPrefix> [--times 0,1000] [--hover] [--block start|center]
import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const a = process.argv.slice(2);
const url = a[0] === "live" ? "https://stripe.com/" : a[0];
const vp = VIEWPORTS[a[1]];
const selector = a[2];
const prefix = a[3];
const get = (f) => (a.indexOf(f) >= 0 ? a[a.indexOf(f) + 1] : null);
const times = (get("--times") || "0,1000,2000,4000").split(",").map(Number);
const block = get("--block") || "center";
const browser = await launch();
const { page } = await newPage(browser, vp);
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.addStyleTag({ content: "[class*=cookie-consent],[id*=cookie],[class*=CookieConsent],nextjs-portal{display:none!important}" });
await page.evaluate(([s, b]) => document.querySelector(s)?.scrollIntoView({ block: b }), [selector, block]);
const el = page.locator(selector).first();
if (a.includes("--hover")) await el.hover();
let last = 0;
for (const t of times) {
  await page.waitForTimeout(t - last);
  last = t;
  await el.screenshot({ path: `${prefix}-${t}.png` });
}
await browser.close();
console.log("done", prefix);
