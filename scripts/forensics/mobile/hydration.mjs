// Loads routes (phone viewport by default) and prints every console error / warning in full with its script location:
// hydration mismatches ("not in sync" markup) and invalid animation keyframes.
// node scripts/forensics/mobile/hydration.mjs [base] [width] [route ...]
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "390", ...routes] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const route of routes.length ? routes : ["/", "/payments", "/tax", "/billing"]) {
  const ctx = await b.newContext({ viewport: { width: +width, height: 844 }, deviceScaleFactor: 2, isMobile: +width < 900, hasTouch: +width < 900 });
  const p = await ctx.newPage();
  const seen = new Map();
  p.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    const loc = m.location();
    const k = `${m.type()} @ ${String(loc.url || "").split("/").slice(-2).join("/")}:${loc.lineNumber}\n${m.text().slice(0, 1400)}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  });
  p.on("pageerror", (e) => seen.set("pageerror\n" + e.message.slice(0, 500), 1));
  await p.goto(base + route, { waitUntil: "load" });
  await p.waitForTimeout(3000);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, 12000); y += 800) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(120); }
  await p.waitForTimeout(800);
  console.log(`\n=== ${route} @${width}: ${seen.size ? seen.size + " distinct" : "clean"}`);
  for (const [k, n] of seen) console.log(`[x${n}] ${k}`);
  await ctx.close();
}
await b.close();
