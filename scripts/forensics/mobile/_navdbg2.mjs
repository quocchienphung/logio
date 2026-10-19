import { chromium } from "playwright";
const [base = "http://localhost:3000"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.locator("header.navigation button.navigation-hamburger-button").first().tap();
await p.waitForTimeout(1200);
console.log(await p.evaluate(() => {
  return [...document.querySelectorAll(".hds-navigation-menu__overlay, .navigation-menu__background, .hds-navigation-menu__backdrop")].map((el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return `${el.tagName.toLowerCase()}.${el.className} data-status=${el.dataset.status} bg=${cs.background.slice(0, 120)} op=${cs.opacity} pos=${cs.position} z=${cs.zIndex} rect=${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} parent=${el.parentElement?.tagName}.${el.parentElement?.className}`;
  }).join("\n") || "no overlay elements";
}));
await b.close();
