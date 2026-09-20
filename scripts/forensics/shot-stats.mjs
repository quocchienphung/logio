// Frame-sample the stats section and click through the stat menu: node shot-stats.mjs <live|url> <vp> <outPrefix>
import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const a = process.argv.slice(2);
const url = a[0] === "live" ? "https://stripe.com/" : a[0];
const vp = VIEWPORTS[a[1]];
const prefix = a[2];
const browser = await launch();
const { page } = await newPage(browser, vp);
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console:", m.text().slice(0, 1500)); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.addStyleTag({ content: "[class*=cookie-consent],[id*=cookie],[class*=CookieConsent],nextjs-portal{display:none!important}" });
await page.evaluate(() => document.querySelector(".stats-section")?.scrollIntoView({ block: "start" }));
const sec = page.locator(".stats-section").first();
const shot = (n) => sec.screenshot({ path: `${prefix}-${n}.png` });
await page.waitForTimeout(1500);
await shot("a-1500");
await page.waitForTimeout(3000);
await shot("a-4500");
for (const i of [1, 2, 3]) {
  await page.locator(".stats-menu__stat").nth(i).click();
  await page.waitForTimeout(700);
  await shot(`s${i}-mid`);
  await page.waitForTimeout(2500);
  await shot(`s${i}-3200`);
}
await page.locator(".stats-menu__stat").nth(0).click();
await page.waitForTimeout(2500);
await sec.locator(".data-viz").hover({ position: { x: 600, y: 300 } });
await page.mouse.move(700, 400, { steps: 10 });
await page.waitForTimeout(600);
await shot("hover");
await browser.close();
