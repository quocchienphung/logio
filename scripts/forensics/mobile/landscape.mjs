// Phone held sideways: hero + open menu + a scrolled section. node landscape.mjs [base] [w] [h] [out]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3000", w = "844", h = "390", out = "docs/design-references/mobile/landscape"] = process.argv.slice(2);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(3000);
await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await p.screenshot({ path: `${out}/1-hero.png` });
const burger = p.locator("header.navigation button.navigation-hamburger-button").first();
const hasBurger = await burger.isVisible().catch(() => false);
console.log("hamburger visible at", w, "x", h, ":", hasBurger);
if (hasBurger) {
  await burger.tap();
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/2-menu.png` });
  await p.getByRole("button", { name: /^Products$/ }).first().tap();
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/3-products.png` });
  const st = await p.evaluate(() => { const pop = document.querySelector("#navigation-popup-mobile"); const content = pop?.querySelector(".hds-navigation-menu__content, .navigation__content"); return { popupH: Math.round(pop?.getBoundingClientRect().height || 0), vh: innerHeight, scrollable: content ? content.scrollHeight > content.clientHeight : null, contentH: content ? Math.round(content.clientHeight) : null }; });
  console.log("menu", JSON.stringify(st));
  await p.getByRole("button", { name: /Back/ }).first().tap().catch(() => {});
  await p.waitForTimeout(500);
  await p.locator("header.navigation button.navigation-hamburger-button").first().tap().catch(() => {});
  await p.waitForTimeout(700);
}
await p.evaluate(() => scrollTo(0, 1400));
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/4-scrolled.png` });
console.log("scrollW", await p.evaluate(() => document.documentElement.scrollWidth), "innerW", await p.evaluate(() => innerWidth));
await b.close();
