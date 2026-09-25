// Low-cost sweep for a machine under memory pressure: one page load per route, then the viewport is
// resized through 1440×900, 1280×800, 768×1024, 390×844; at each size the page is scrolled through and
// console errors, controller failures and horizontal overflow are collected.
// node scripts/forensics/products/qa/carousels-sweep.mjs /route [/route ...]
import { chromium } from "playwright";

const routes = process.argv.slice(2);
const sizes = [[1440, 900], [1280, 800], [768, 1024], [390, 844]];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars"] });
for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("ERROR " + m.text().slice(0, 200));
  });
  try {
    await page.goto("http://localhost:3103" + route, { waitUntil: "load", timeout: 300000 });
    const lines = [];
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(500);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += h) {
        await page.evaluate((v) => scrollTo(0, v), y);
        await page.waitForTimeout(60);
      }
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
      lines.push(`${w}x${h} overflow=${o.sw > o.w ? `YES (${o.sw})` : "no"}`);
    }
    console.log(`${route}: ${lines.join(", ")}`);
  } catch (e) {
    console.log(`${route}: FAILED ${String(e).slice(0, 160)}`);
  }
  console.log("  " + (errors.length ? [...new Set(errors)].join("\n  ") : "no console errors"));
  await ctx.close();
}
await browser.close();
