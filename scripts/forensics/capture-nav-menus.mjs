// Hover each desktop nav trigger on stripe.com, save the opened menu DOM + a screenshot.
import fs from "node:fs";
import path from "node:path";
import { launch, newPage, VIEWPORTS } from "./browser.mjs";

const OUT = "docs/research/stripe-live/nav";
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const { page } = await newPage(browser, VIEWPORTS[1440]);
await page.goto("https://stripe.com/", { waitUntil: "networkidle", timeout: 90000 });
await page.addStyleTag({ content: "[class*=cookie-consent],[id*=cookie],[class*=CookieConsent]{display:none!important}" });
await page.waitForTimeout(800);
for (const name of ["products", "solutions", "developers", "resources"]) {
  const trigger = page.locator(`li[value="${name}"] button`);
  await trigger.hover();
  await page.waitForTimeout(1200);
  const info = await page.evaluate((name) => {
    const btn = document.querySelector(`li[value="${name}"] button`);
    const id = btn.getAttribute("aria-controls");
    const panel = id ? document.getElementById(id) : null;
    const r = panel?.getBoundingClientRect();
    return { id, html: panel ? panel.outerHTML : null, rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null, parentCls: panel?.parentElement?.className, grandCls: panel?.parentElement?.parentElement?.className, parentHtmlHead: panel?.parentElement?.outerHTML.slice(0, 400) };
  }, name);
  if (info.html) fs.writeFileSync(path.join(OUT, `${name}.html`), info.html);
  console.log(name, info.id, info.rect, "| parent:", info.parentCls, "| grand:", info.grandCls);
  console.log(info.parentHtmlHead);
  await page.screenshot({ path: path.join(OUT, `${name}-1440.png`), clip: { x: 0, y: 0, width: 1440, height: 1000 } });
  await page.mouse.move(700, 700);
  await page.waitForTimeout(600);
}
// also grab the wrapper element that hosts the panels
const wrapper = await page.evaluate(() => {
  const el = document.querySelector(".navigation-menu__background")?.parentElement;
  const bg = document.querySelector(".navigation-menu__background");
  return { bgHtml: bg?.outerHTML.slice(0, 300), viewport: document.querySelector("[class*=navigation-menu__viewport],[class*=hds-navigation-menu__viewport]")?.outerHTML.slice(0, 600) };
});
console.log(wrapper);
await browser.close();
