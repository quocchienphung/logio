import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const browser = await launch();
const { page } = await newPage(browser, VIEWPORTS[1440]);
await page.goto("https://stripe.com/", { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 4100));
const t0 = Date.now();
for (let i = 0; i < 16; i++) {
  const r = await page.evaluate(() => ({ idx: document.querySelector(".stats-section__active-indicator-container")?.getAttribute("style"), active: document.querySelector(".stats-menu__stat--active p")?.textContent, cls: document.querySelector(".stats-section")?.className.replace(/hds-color-mode |section |section--white |hds-mode--light/g, "") }));
  console.log(((Date.now() - t0) / 1000).toFixed(1) + "s", r.active, "|", r.idx?.slice(0, 60), "|", r.cls);
  await page.waitForTimeout(1000);
}
await browser.close();
