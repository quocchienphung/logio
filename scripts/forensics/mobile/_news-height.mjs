import { chromium } from "playwright";
const [base = "http://localhost:3000", mode = "idle"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "load" });
const read = () => p.evaluate(() => { const s = document.querySelector(".events-carousel")?.closest("section") || document.querySelector("section.hds-color-mode:has(.events-carousel__header)"); const c = document.querySelector(".events-carousel canvas, canvas.events-carousel__canvas, section canvas[class*=squeez]"); return { section: s ? Math.round(s.getBoundingClientRect().height) : null, canvas: c ? `${Math.round(c.getBoundingClientRect().width)}x${Math.round(c.getBoundingClientRect().height)} attr ${c.width}x${c.height}` : null, doc: document.documentElement.scrollHeight }; });
const t0 = Date.now();
let last = "";
for (let i = 0; i < 14; i++) {
  await p.waitForTimeout(1000);
  const r = JSON.stringify(await read());
  if (r !== last) { console.log(`${Date.now() - t0}ms`, r); last = r; }
}
await b.close();
