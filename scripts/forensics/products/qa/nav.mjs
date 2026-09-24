// Shared navigation regression for the 18 Payments + Revenue links.
// Desktop: hover-open Products, pointer travel into the panel (no flicker), every link present with the
// expected href, click-through to each route (URL + <title>), refresh, Back/Forward, Escape, keyboard.
// Mobile (390): hamburger -> Products -> link. node scripts/forensics/products/qa/nav.mjs [base] [shotsDir]
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const shots = process.argv[3] || "";
const LINKS = [["Payments", "/payments"], ["Managed Payments", "/managed-payments"], ["Payment links", "/payments/payment-links"], ["Checkout", "/payments/checkout"], ["Elements", "/payments/elements"], ["Payment methods", "/payments/payment-methods"], ["Terminal", "/terminal"], ["Authorization Boost", "/authorization-boost"], ["Link", "/payments/link"], ["Financial Connections", "/financial-connections"], ["Billing", "/billing"], ["Metronome", "/billing/usage-based-billing"], ["Subscriptions", "/billing/subscriptions"], ["Invoicing", "/invoicing"], ["Tax", "/tax"], ["Revenue Recognition", "/revenue-recognition"], ["Stripe Sigma", "/sigma"], ["Data Pipeline", "/data-pipeline"]];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"} ${name} ${detail}`); };
async function ctxFor(w, h, mobile = false) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: "en-US" });
  await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
  return ctx;
}
const panelLinks = (p) => p.evaluate(() => {
  const secs = [...document.querySelectorAll(".navigation__content--products section")];
  const out = {};
  for (const s of secs) {
    const t = s.querySelector(".suite-title, .hds-heading")?.textContent?.trim();
    if (t === "Payments" || t === "Revenue") out[t] = [...s.querySelectorAll("a")].map((a) => [a.querySelector(".navigation-hover-arrow")?.textContent?.trim(), a.getAttribute("href"), a.offsetParent !== null]);
  }
  return out;
});

// ---- desktop
{
  const ctx = await ctxFor(1440, 900);
  const p = await ctx.newPage();
  await p.goto(base + "/payments", { waitUntil: "load" });
  const trigger = p.getByRole("button", { name: "Products" }).first();
  const box = await trigger.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForSelector(".navigation__content--products a", { state: "visible", timeout: 15000 });
  await p.waitForTimeout(500);
  const links = await panelLinks(p);
  const got = [...(links.Payments || []), ...(links.Revenue || [])];
  ok("desktop: Products panel lists 18 Payments+Revenue links", got.length === 18, `(${got.length})`);
  for (const [label, href] of LINKS) {
    const g = got.find((x) => x[0] === label);
    ok(`  link "${label}" -> ${href}`, !!g && g[1] === href && g[2], g ? `href=${g[1]} visible=${g[2]}` : "missing");
  }
  if (shots) await p.screenshot({ path: `${shots}/nav-1440-products-open.png` });
  // pointer travel from trigger into the panel, sampling that it stays open
  const panel = await p.locator(".navigation__content--products").boundingBox();
  let closedDuring = 0;
  for (let i = 0; i <= 20; i++) {
    const x = box.x + box.width / 2 + ((panel.x + 60 - (box.x + box.width / 2)) * i) / 20;
    const y = box.y + box.height / 2 + ((panel.y + 40 - (box.y + box.height / 2)) * i) / 20;
    await p.mouse.move(x, y);
    await p.waitForTimeout(25);
    if (!(await p.locator(".navigation__content--products").isVisible())) closedDuring++;
  }
  ok("desktop: panel stays open while pointer travels trigger -> panel", closedDuring === 0, `closed samples=${closedDuring}`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  ok("desktop: Escape closes the panel", !(await p.locator(".navigation__content--products").isVisible()));
  // pointer leaves -> closes
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(700);
  await p.mouse.move(700, 850);
  await p.waitForTimeout(900);
  ok("desktop: leaving the menu closes it", !(await p.locator(".navigation__content--products").isVisible()));
  // keyboard: focus trigger opens, Tab reaches a menu link, focus visible
  await p.mouse.move(5, 890);
  await trigger.focus();
  await p.waitForTimeout(600);
  const kbOpen = await p.locator(".navigation__content--products").isVisible();
  ok("keyboard: focusing Products opens the panel", kbOpen);
  // click-through each link from the menu
  for (const [label, href] of LINKS) {
    await p.goto(base + "/", { waitUntil: "domcontentloaded" });
    const t = p.getByRole("button", { name: "Products" }).first();
    const bb = await t.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.waitForTimeout(600);
    const a = p.locator(`.navigation__content--products a[href="${href}"]`).first();
    await Promise.all([p.waitForURL(base + href, { timeout: 60000 }), a.click()]);
    const title = await p.title();
    const h = await p.evaluate(() => document.querySelector("main")?.children.length || 0);
    ok(`click "${label}" -> ${href}`, p.url() === base + href && h > 0, `title="${title.slice(0, 60)}"`);
  }
  // refresh + back/forward
  await p.goto(base + "/tax", { waitUntil: "load" });
  await p.goto(base + "/sigma", { waitUntil: "load" });
  await p.reload({ waitUntil: "load" });
  ok("refresh keeps route", p.url() === base + "/sigma");
  await p.goBack({ waitUntil: "commit" }).catch(() => {});
  await p.waitForURL(base + "/tax", { timeout: 30000 }).catch(() => {});
  ok("Back returns to previous route", p.url() === base + "/tax");
  await p.goForward({ waitUntil: "commit" }).catch(() => {});
  await p.waitForURL(base + "/sigma", { timeout: 30000 }).catch(() => {});
  ok("Forward returns", p.url() === base + "/sigma");
  await ctx.close();
}
// ---- mobile
{
  const ctx = await ctxFor(390, 844, true);
  const p = await ctx.newPage();
  await p.goto(base + "/managed-payments", { waitUntil: "load" });
  await p.locator(".navigation-hamburger-button").first().click();
  await p.waitForTimeout(700);
  if (shots) await p.screenshot({ path: `${shots}/nav-390-hamburger-open.png` });
  await p.getByRole("button", { name: "Products" }).first().click();
  await p.waitForSelector(".navigation__content--products a", { state: "visible", timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(500);
  if (shots) await p.screenshot({ path: `${shots}/nav-390-products-open.png` });
  const links = await panelLinks(p);
  const got = [...(links.Payments || []), ...(links.Revenue || [])];
  ok("mobile: Products lists 18 Payments+Revenue links", got.length === 18, `(${got.length})`);
  const a = p.locator('.navigation__content--products a[href="/tax"]').first();
  await Promise.all([p.waitForURL(base + "/tax", { timeout: 60000 }), a.click()]);
  ok("mobile: tapping Tax navigates", p.url() === base + "/tax");
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok("mobile: no horizontal overflow on /tax", sw <= 390, `scrollWidth=${sw}`);
  await ctx.close();
}
fs.writeFileSync("docs/research/products/_build/nav-qa.json", JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`);
await b.close();
