// Build the per-breakpoint source-dimension table for every .dom-graphic from the captured DOMs.
import fs from "node:fs";
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.route("**/*", (r) => (r.request().url().startsWith("data:") ? r.continue() : r.abort()));
const table = {};
for (const vp of [1440, 768, 390]) {
  const html = fs.readFileSync(`docs/research/stripe-live/dom-${vp}.html`, "utf8");
  await page.setContent(html.replace(/<script[\s\S]*?<\/script>/g, ""));
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".dom-graphic")].map((el) => {
      const st = el.getAttribute("style") || "";
      const g = (k) => (st.match(new RegExp(k + ":\s*([^;]+)")) || [])[1]?.trim();
      const key = [...el.classList].filter((c) => !c.startsWith("dom-graphic")).join(" ") || el.getAttribute("aria-label");
      return { key, w: parseFloat(g("--graphic-source-width")), h: parseFloat(g("--graphic-source-height")), max: g("--graphic-max-width") };
    }),
  );
  for (const r of rows) {
    table[r.key] ||= {};
    table[r.key][vp] = { w: r.w, h: r.h, max: r.max };
  }
}
await browser.close();
fs.writeFileSync("docs/research/stripe-live/dom-graphics.json", JSON.stringify(table, null, 2));
for (const [k, v] of Object.entries(table)) console.log(k.padEnd(45), JSON.stringify(v));
