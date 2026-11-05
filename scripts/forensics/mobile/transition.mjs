// Records the page-to-page transition on a phone viewport (hamburger → Products → item), slowed with CDP
// Animation.setPlaybackRate so each screenshot lands at a known point. node transition.mjs [base] [from] [label] [out] [w] [h] [rate]
import fs from "node:fs";
import { chromium } from "playwright";
const [base = "http://localhost:3000", from = "/", label = "Tax", out = "docs/design-references/mobile/transition", w = "390", h = "844", rate = "0.1"] = process.argv.slice(2);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + from, { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await p.locator("header.navigation button.navigation-hamburger-button").first().tap();
await p.waitForTimeout(900);
await p.getByRole("button", { name: /^Products$/ }).first().tap();
await p.waitForTimeout(900);
const link = p.locator("#navigation-popup-mobile a", { hasText: label }).first();
console.log("link:", await link.evaluate((a) => a.getAttribute("href")));
const cdp = await ctx.newCDPSession(p);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: +rate });
await p.screenshot({ path: `${out}/before.jpg`, type: "jpeg", quality: 70 });
await link.tap({ noWaitAfter: true });
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < 1500 / +rate) {
  const ms = Math.round((Date.now() - t0) * +rate);
  await p.screenshot({ path: `${out}/${String(i++).padStart(3, "0")}_${ms}ms.jpg`, type: "jpeg", quality: 60 }).catch(() => {});
}
console.log("shots", i, "url", p.url(), "errors", errs.slice(0, 4));
await b.close();
