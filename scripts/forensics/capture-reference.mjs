// Capture the live Stripe homepage: full DOM, section topology, full-page and
// per-section screenshots at one viewport. Usage: node capture-reference.mjs 1440
import fs from "node:fs";
import path from "node:path";
import { launch, newPage, sweep, VIEWPORTS } from "./browser.mjs";

const w = process.argv[2] || "1440";
const vp = VIEWPORTS[w];
const OUT = path.resolve("docs/research/stripe-live");
fs.mkdirSync(OUT, { recursive: true });

const browser = await launch();
const { page } = await newPage(browser, vp);
await page.goto("https://stripe.com/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1500);
// dismiss cookie banner if present
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /accept all|accept/i.test(x.textContent || ""));
  if (b && b.closest("[class*=cookie],[id*=cookie],[class*=Cookie]")) b.click();
});
await sweep(page);

const dom = await page.evaluate(() => document.documentElement.outerHTML);
fs.writeFileSync(path.join(OUT, `dom-${w}.html`), dom);

const topology = await page.evaluate(() => {
  const secs = [...document.querySelectorAll("body > div > header, body > div > main > *, main > section, main > div, header, footer")];
  const seen = new Set();
  return secs
    .filter((el) => (seen.has(el) ? false : (seen.add(el), true)))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: el.className && typeof el.className === "string" ? el.className : "",
        id: el.id,
        rect: { x: r.x, y: r.y + scrollY, w: r.width, h: r.height },
        bg: cs.backgroundColor,
        text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 160),
      };
    });
});
fs.writeFileSync(path.join(OUT, `topology-${w}.json`), JSON.stringify(topology, null, 2));

await page.screenshot({ path: path.join(OUT, `full-${w}.png`), fullPage: true });
await browser.close();
console.log(`captured ${w}:`, topology.length, "top-level nodes");
