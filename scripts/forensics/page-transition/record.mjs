// Record a page-to-page transition on a local server, slowed down with CDP Animation.setPlaybackRate so
// each screenshot lands at a known point of the transition.
// node scripts/forensics/page-transition/record.mjs <base> <fromPath> <menuLabel|-> <outDir> [w] [h] [rate]
// menuLabel "-" navigates by clicking the first in-page link to another product route instead of the menu.
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3000", from = "/payments", label = "Tax", out = "/tmp/pt", w = "1152", h = "720", rate = "0.1"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(
  process.platform === "linux"
    ? { executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] }
    : { channel: "chrome", headless: true },
);
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(base + from, { waitUntil: "load" });
await p.waitForTimeout(1200);
const cdp = await ctx.newCDPSession(p);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: +rate });
let link;
if (label !== "-") {
  const t = p.getByRole("button", { name: "Products" }).first();
  const bb = await t.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.waitForSelector(".navigation__content--products a", { state: "visible" });
  await p.waitForTimeout(3000); // menu open animation is slowed too
  link = p.locator(".navigation__content--products a", { hasText: label }).first();
}
await p.screenshot({ path: `${out}/before.jpg`, quality: 80 });
await link.click({ noWaitAfter: true });
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < 1500 / +rate) {
  const ms = Math.round((Date.now() - t0) * +rate);
  await p.screenshot({ path: `${out}/${String(i++).padStart(3, "0")}_${ms}ms.jpg`, quality: 80 }).catch(() => {});
}
console.log("shots", i, "url", p.url(), "errors", errs.slice(0, 5));
await b.close();
