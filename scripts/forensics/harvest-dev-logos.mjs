// Record, per developer-systems tile, the logo SVGs in order of first appearance while the live
// scenarios cycle (enterprise → startups → smb → commercial). Output: docs/research/stripe-live/dev-logos.json
import fs from "node:fs";
import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const browser = await launch();
const { page } = await newPage(browser, VIEWPORTS[1440]);
await page.goto("https://stripe.com/", { waitUntil: "networkidle", timeout: 90000 });
await page.evaluate(() => window.scrollTo(0, 9800));
await page.waitForSelector(".developer-systems-animation__app", { timeout: 30000 });
await page.waitForTimeout(500);
const slots = {};
for (let i = 0; i < 40; i++) {
  const found = await page.evaluate(() =>
    [...document.querySelectorAll(".developer-systems-animation__app")].map((app, n) => {
      const face = (sel) => {
        const el = app.querySelector(sel + " .developer-systems-logo");
        return el ? el.innerHTML.trim() : null;
      };
      return { n, front: face(".developer-systems-animation__app-logo__front"), back: face(".developer-systems-animation__app-logo__back") };
    }),
  );
  for (const f of found) {
    slots[f.n] ||= [];
    for (const html of [f.front, f.back]) {
      const key = html === null || html.includes("placeholder") ? "placeholder" : html;
      if (!slots[f.n].includes(key)) slots[f.n].push(key);
    }
  }
  await page.waitForTimeout(500);
}
await browser.close();
fs.writeFileSync("docs/research/stripe-live/dev-logos.json", JSON.stringify(slots, null, 2));
for (const [n, arr] of Object.entries(slots)) console.log("slot", n, arr.length, arr.map((a) => (a === "placeholder" ? "placeholder" : a.slice(0, 60).replace(/\s+/g, " "))).join(" | "));
