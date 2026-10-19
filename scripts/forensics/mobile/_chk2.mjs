import { chromium } from "playwright";
const base = "http://localhost:3000";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const seen = [];
p.on("console", (m) => { if (m.type() === "warning") { const l = m.location(); seen.push(`[${p.url().replace(base, "")}] ${String(l.url).split("/").slice(-1)}:${l.lineNumber}:${l.columnNumber} :: ${m.text().slice(0, 200)}`); } });
for (const route of ["/", "/tax", "/payments", "/billing"]) {
  await p.goto(base + route, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  for (let y = 0; y < 6000; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(150); }
  console.log(route, "warnings so far", seen.length);
}
console.log([...new Set(seen)].slice(0, 8).join("\n"));
await b.close();
