import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
for (const [label, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" }]]) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log(label, "pageerror:", e.message, "\n", (e.stack || "").split("\n").slice(0, 4).join("\n")));
  await p.goto("http://localhost:3000/", { waitUntil: "load" });
  await p.waitForTimeout(3000);
  await ctx.close();
}
await b.close();
