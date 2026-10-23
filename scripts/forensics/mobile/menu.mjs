// Opens the phone navigation: closed → menu → Products (and any other top-level sections), screenshots each state.
// node scripts/forensics/mobile/menu.mjs [base] [width] [out]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390", out = "docs/design-references/mobile/menu"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + "/", { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/0-closed.png` });
const burger = p.locator("button[aria-label*='menu' i], .navigation__mobile-toggle, button.navigation-menu-mobile-toggle, header.navigation button").first();
console.log("burger:", await burger.evaluate((el) => el.outerHTML.slice(0, 180)).catch(() => "none"));
await burger.tap();
await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/1-open.png` });
const items = await p.evaluate(() => [...document.querySelectorAll("header.navigation [role=menu] button, header.navigation nav button, .navigation__mobile button, .navigation-mobile button")].map((b) => (b.textContent || "").trim()).filter(Boolean).slice(0, 12));
console.log("buttons in open menu:", items);
const products = p.getByRole("button", { name: /^Products$/ }).first();
if (await products.count()) {
  await products.tap().catch(() => {});
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/2-products.png` });
}
console.log("errors", errs);
await b.close();
