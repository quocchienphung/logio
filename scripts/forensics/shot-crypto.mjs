// Frame-sample the crypto bento card: node shot-crypto.mjs <live|url> <vp> <outPrefix> [--hover] [--times 0,1000,2000]
import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const a = process.argv.slice(2);
const url = a[0] === "live" ? "https://stripe.com/" : a[0];
const vp = VIEWPORTS[a[1]];
const prefix = a[2];
const get = (f) => (a.indexOf(f) >= 0 ? a[a.indexOf(f) + 1] : null);
const times = (get("--times") || "0,1000,2000,3000,5000,8000").split(",").map(Number);
const browser = await launch();
const { page } = await newPage(browser, vp);
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.addStyleTag({ content: "[class*=cookie-consent],[id*=cookie],[class*=CookieConsent],nextjs-portal{display:none!important}" });
await page.evaluate(() => document.querySelector(".modular-solutions-bento__card-crypto")?.scrollIntoView({ block: "center" }));
const card = page.locator(".modular-solutions-bento__card-crypto").first();
if (a.includes("--hover")) await card.hover();
let last = 0;
for (const t of times) {
  await page.waitForTimeout(t - last);
  last = t;
  await card.screenshot({ path: `${prefix}-${t}.png` });
  const ui = await page.evaluate(() => [...document.querySelectorAll(".modular-solutions-bento__card-crypto .globe__arc-ui")].filter((e) => e.style.display !== "none").map((e) => ({ x: e.style.getPropertyValue("--ui-x"), y: e.style.getPropertyValue("--ui-y"), o: e.style.getPropertyValue("--ui-opacity"), s: e.style.getPropertyValue("--ui-scale"), text: e.textContent })));
  console.log(t, JSON.stringify(ui));
}
await browser.close();
