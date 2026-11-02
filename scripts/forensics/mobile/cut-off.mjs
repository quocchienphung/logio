// Content cut off by an overflow:hidden/clip ancestor (what vertical-lock.mjs cannot see, because the page itself does not move): text and controls whose box
// reaches past the edge of the nearest clipping ancestor. Scrollers (overflow auto/scroll) are skipped: their content is reachable.
// node scripts/forensics/mobile/cut-off.mjs [base] [widths] [route filter]
import { chromium } from "playwright";
const [base = "http://localhost:3000", list = "320,390", filter = ""] = process.argv.slice(2);
const routes = ["/", "/guide", "/skilled", "/billing", "/billing/subscriptions", "/billing/usage-based-billing", "/managed-payments", "/authorization-boost", "/data-pipeline", "/financial-connections", "/invoicing", "/payments", "/payments/checkout", "/payments/elements", "/payments/link", "/payments/payment-links", "/payments/payment-methods", "/revenue-recognition", "/sigma", "/tax", "/terminal",
  ...["home", "companies", "contacts", "deals", "reports", "new-chat", "files", "run", "mapping", "process", "tracing", "orchestrator", "invoice", "usage", "skilled", "repo", "storage", "new-business", "renewals", "partnerships"].map(s => `/personalize?section=${s}`)].filter(r => !filter || new RegExp(filter, "i").test(r));
const browser = await chromium.launch({ channel: "chrome" });
let next = 0; const jobs = routes.flatMap(r => list.split(",").map(w => [r, +w])); const out = [];
await Promise.all(Array.from({ length: 4 }, async () => { while (next < jobs.length) {
  const [route, w] = jobs[next++];
  const context = await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem("logio-cookie-consent", JSON.stringify({ value: { necessary: true }, version: "1", updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  try {
    await page.goto(base + route, { waitUntil: "load", timeout: 60000 }); await page.waitForTimeout(2200);
    for (let y = 0; y < 5000; y += 800) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(50); }
    const found = await page.evaluate(() => {
      const res = new Map();
      const root = document.querySelector("main.ui-as-main") ?? document.body;
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue;
        const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0" || cs.position === "fixed") continue;
        if (el.closest("[inert], [aria-hidden='true'], .sr-only, [class*='srOnly'], [class*='sr-only']")) continue;
        let clip = null, scrolls = false;
        for (let a = el.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflowX === "auto" || s.overflowX === "scroll") { scrolls = true; break; } if (s.overflowX === "hidden" || s.overflowX === "clip") { clip = a; break; } }
        if (scrolls || !clip || clip === document.documentElement) continue;
        const c = clip.getBoundingClientRect(); if (c.width < 20) continue;
        const over = r.right - c.right, under = c.left - r.left;
        if (over > 3 || under > 3) {
          // only text-bearing or interactive leaves count
          const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) || /^(A|BUTTON|INPUT|SELECT|IMG|SVG|LABEL)$/i.test(el.tagName);
          if (!hasText) continue;
          const key = `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} in ${clip.tagName.toLowerCase()}.${String(clip.className).split(" ")[0]}`;
          if (!res.has(key)) res.set(key, `${Math.round(Math.max(over, under))}px "${(el.textContent || "").trim().slice(0, 30)}"`);
        }
      }
      return [...res.entries()].slice(0, 8);
    });
    out.push({ route, w, found });
  } catch (e) { out.push({ route, w, found: [[`FAILED ${String(e.message).slice(0, 60)}`, ""]] }); }
  await context.close();
} }));
out.sort((a, b) => a.route.localeCompare(b.route) || a.w - b.w);
let n = 0;
for (const o of out) if (o.found.length) { n += 1; console.log(`${o.route} ${o.w}px`); for (const [k, v] of o.found) console.log(`    ${k}  ${v}`); }
console.log(`\n${out.length} pages, ${n} with cut-off content`);
await browser.close();
