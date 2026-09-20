// Compare local top-level section topology against the frozen reference: node topology-check.mjs <vp> [<vp> ...]
import fs from "node:fs";
import { launch, newPage, sweep, VIEWPORTS } from "./browser.mjs";
const vps = process.argv.slice(2).length ? process.argv.slice(2) : ["1440", "1280", "1024", "768", "390"];
const browser = await launch();
for (const vpName of vps) {
  const ref = JSON.parse(fs.readFileSync(`docs/research/stripe-live/topology-${vpName}.json`, "utf8"));
  const { page, context } = await newPage(browser, VIEWPORTS[vpName]);
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 90000 });
  await sweep(page);
  const local = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll("body > div > header, body > div > main > *, main > section, main > div, header, footer")])]
      .map((el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: el.className, rect: { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height } }; }),
  );
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`\n== ${vpName}: reference ${ref.length} sections, local ${local.length}; local page height ${total}`);
  const n = Math.max(ref.length, local.length);
  for (let i = 0; i < n; i++) {
    const a = ref[i], b = local[i];
    const name = (a?.cls || b?.cls || "").replace("hds-color-mode ", "").split(" ").slice(0, 3).join(" ");
    if (!a || !b) { console.log(`  ${i} ${name}: ${a ? "MISSING LOCALLY" : "EXTRA LOCALLY"}`); continue; }
    const dy = b.rect.y - a.rect.y, dh = b.rect.h - a.rect.h;
    const flag = Math.abs(dy) > 1 || Math.abs(dh) > 1 ? "  <-- DIFF" : "";
    console.log(`  ${i} ${name.padEnd(40)} ref y=${a.rect.y.toFixed(1)} h=${a.rect.h.toFixed(1)} | local y=${b.rect.y.toFixed(1)} h=${b.rect.h.toFixed(1)} (dy ${dy.toFixed(1)}, dh ${dh.toFixed(1)})${flag}`);
  }
  await context.close();
}
await browser.close();
