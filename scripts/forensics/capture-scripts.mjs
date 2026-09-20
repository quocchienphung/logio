// Record every JS chunk the live homepage loads during a full scroll sweep and download the ones we lack.
import fs from "node:fs";
import path from "node:path";
import { launch, newPage, sweep, VIEWPORTS } from "./browser.mjs";
const DIR = "docs/research/stripe-com-9ababc9a/root-8a5edab2/scripts";
const seen = new Set();
const browser = await launch();
const { page } = await newPage(browser, VIEWPORTS[1440]);
page.on("response", (r) => {
  const u = r.url();
  if (u.endsWith(".js") && u.includes("_next/static/chunks")) seen.add(u);
});
await page.goto("https://stripe.com/", { waitUntil: "networkidle", timeout: 90000 });
await sweep(page, 400, 250);
await page.waitForTimeout(3000);
// hover bento cards + nav to trigger lazy chunks
for (const sel of [".modular-solutions-bento__card-payments", ".modular-solutions-bento__card-billing", ".modular-solutions-bento__card-connect", 'li[value="products"] button']) {
  try {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.locator(sel).first().hover();
    await page.waitForTimeout(800);
  } catch {}
}
await page.waitForTimeout(2000);
await browser.close();
let n = 0;
for (const u of seen) {
  const name = path.basename(u);
  const dest = path.join(DIR, name);
  if (fs.existsSync(dest)) continue;
  const res = await fetch(u);
  if (!res.ok) continue;
  fs.writeFileSync(dest, await res.text());
  n++;
  console.log("downloaded", name);
}
console.log(`observed ${seen.size} chunks, downloaded ${n} new`);
