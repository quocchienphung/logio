// Screenshot local/live with optional hover + scroll: node shot.mjs <url|live> <vp> <out.png> [--hover sel] [--scroll y] [--full] [--click sel]
import { launch, newPage, VIEWPORTS, sweep } from "./browser.mjs";
const a = process.argv.slice(2);
const url = a[0] === "live" ? "https://stripe.com/" : a[0];
const vp = VIEWPORTS[a[1]];
const out = a[2];
const get = (f) => (a.indexOf(f) >= 0 ? a[a.indexOf(f) + 1] : null);
const browser = await launch();
const { page } = await newPage(browser, vp);
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.addStyleTag({ content: "[class*=cookie-consent],[id*=cookie],[class*=CookieConsent],nextjs-portal{display:none!important}" });
if (a.includes("--sweep")) await sweep(page);
if (get("--scroll")) { await page.evaluate((y) => window.scrollTo(0, y), +get("--scroll")); await page.waitForTimeout(800); }
if (get("--hover")) { await page.locator(get("--hover")).first().hover(); await page.waitForTimeout(900); }
for (let i = 0; i < a.length; i++) if (a[i] === "--click") { await page.locator(a[i + 1]).first().click(); await page.waitForTimeout(900); }
if (get("--wait")) await page.waitForTimeout(+get("--wait"));
await page.screenshot({ path: out, fullPage: a.includes("--full") });
await browser.close();
console.log("saved", out);
