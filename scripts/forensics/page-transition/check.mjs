// Navigation checks for the page transition: menu link, logo (Next <Link>), Back/Forward; reports console
// errors/warnings (hydration) on every document and whether a cross-document view transition ran.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
await ctx.addInitScript(() => {
  window.addEventListener("pagereveal", (e) => { window.__ptRan = !!e.viewTransition; });
});
const p = await ctx.newPage();
const logs = [];
p.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
p.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 200)));
const report = async (label) => {
  await p.waitForTimeout(2500);
  const ran = await p.evaluate(() => window.__ptRan === true);
  const left = await p.evaluate(() => !!document.getElementById("pt-runtime-style") || !!document.querySelector("#pt-lens-out"));
  console.log(`${label}: url=${p.url().replace(base, "")} transition=${ran} leftovers=${left}`);
};
await p.goto(base + "/payments", { waitUntil: "load" });
await p.waitForTimeout(1500);
const t = p.getByRole("button", { name: "Products" }).first();
const bb = await t.boundingBox();
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await p.waitForSelector(".navigation__content--products a", { state: "visible" });
await p.waitForTimeout(500);
await p.locator(".navigation__content--products a", { hasText: "Tax" }).first().click();
await p.waitForURL(base + "/tax");
await report("menu Payments -> Tax");
await p.locator("a.navigation-menu-home-link").click();
await p.waitForURL(base + "/");
await report("logo Tax -> /");
await p.goBack();
await p.waitForURL(base + "/tax");
await report("Back -> /tax");
await p.goForward();
await p.waitForURL(base + "/");
await report("Forward -> /");
console.log(logs.length ? logs.join("\n") : "no console errors/warnings");
await b.close();
