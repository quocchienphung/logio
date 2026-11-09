// Walks the phone menu: every top-level entry opens its panel, "Back" returns; screenshots + simple sanity checks.
// node scripts/forensics/mobile/menu-all.mjs [base] [width] [out]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390", out = "docs/design-references/mobile/menu-all"] = process.argv.slice(2);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 140)));
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await p.locator("header.navigation button.navigation-hamburger-button").first().tap();
await p.waitForTimeout(900);
const names = ["Products", "Solutions", "Developers", "Resources"];
let i = 0;
for (const n of names) {
  await p.getByRole("button", { name: new RegExp(`^${n}$`) }).first().tap();
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${++i}-${n}.png` });
  const st = await p.evaluate(() => {
    const pop = document.querySelector("#navigation-popup-mobile");
    const r = pop?.getBoundingClientRect();
    const ov = document.querySelector(".hds-navigation-menu__overlay");
    return { popup: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null, overlayBg: ov ? getComputedStyle(ov).backgroundColor : null, hscroll: document.documentElement.scrollWidth > innerWidth };
  });
  console.log(n, JSON.stringify(st));
  await p.getByRole("button", { name: /Back/ }).first().tap();
  await p.waitForTimeout(900);
}
console.log("errors", errs);
await b.close();
