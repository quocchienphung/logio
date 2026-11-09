// Which element makes the workspace's <main> wider than its box? Lists the elements that stick out of main (and are not clipped by an inner scroller).
// node scripts/forensics/mobile/main-overflow.mjs [base] [width] [section urls...]
import { chromium } from "playwright";
const [base = "http://localhost:3000", width = "320", ...routes] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: +width, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem("logio-cookie-consent", JSON.stringify({ value: { necessary: true }, version: "1", updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  await page.goto(base + route, { waitUntil: "load" }); await page.waitForTimeout(2500);
  await page.evaluate(() => { window.__all = true; });
  const r = await page.evaluate(() => {
    const main = document.querySelector("main.ui-as-main"); if (!main) return { none: true };
    const box = main.getBoundingClientRect(), cs = getComputedStyle(main);
    const clipper = el => { for (let a = el.parentElement; a && a !== main; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflowX !== "visible" || s.contain.includes("paint")) return `${a.tagName.toLowerCase()}.${String(a.className).split(" ")[0]}:${s.overflowX} W${Math.round(a.getBoundingClientRect().width)}`; } return "none"; };
    const clipped = el => { for (let a = el.parentElement; a && a !== main; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflowX !== "visible" || s.contain.includes("paint")) return true; } return false; };
    const out = [];
    for (const el of main.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right <= box.right + 1) continue;
      const s = getComputedStyle(el);
      if (s.position === "fixed" || s.visibility === "hidden" || s.display === "none" || clipped(el)) continue;
      out.push(`[${clipper(el)}] ${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} R${Math.round(r.right)} W${Math.round(r.width)} (parent ${el.parentElement?.className?.toString().split(" ")[0]} ${getComputedStyle(el.parentElement).display})`);
      if (out.length >= 6) break;
    }
    return { overflowX: cs.overflowX, overflowY: cs.overflowY, client: main.clientWidth, scroll: main.scrollWidth, mainRight: Math.round(box.right), out };
  });
  console.log(route, JSON.stringify(r, null, 1));
  await context.close();
}
await browser.close();
