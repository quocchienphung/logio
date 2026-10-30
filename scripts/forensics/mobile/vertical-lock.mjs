// "Locked vertical": no page may move sideways at any phone / tablet width. For every route (the site's pages, the guide, every workspace section, the Settings
// panel) and each width it checks: the document and body are not wider than the viewport, the page cannot be scrolled sideways (scrollTo and a touch-like wheel),
// no visible element sticks out of the viewport unclipped, and it lists inner horizontal scrollers (tables, the timeline, canvases) so each can be judged.
// node scripts/forensics/mobile/vertical-lock.mjs [base] [widths comma list] [filter regex]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const [base = "http://localhost:3000", list = "320,360,390,430,768", filter = ""] = process.argv.slice(2);
const sections = ["Home", "Companies", "Contacts", "Deals", "Reports", "New chat", "Files", "Run", "Mapping", "Process", "Tracing", "Orchestrator", "Invoice", "Usage", "Skilled", "Repo", "Storage", "New business", "Renewals", "Partnerships"];
const routes = [
  "/", "/guide", "/skilled", "/billing", "/billing/subscriptions", "/billing/usage-based-billing", "/managed-payments", "/authorization-boost", "/data-pipeline", "/financial-connections", "/invoicing",
  "/payments", "/payments/checkout", "/payments/elements", "/payments/link", "/payments/payment-links", "/payments/payment-methods", "/revenue-recognition", "/sigma", "/tax", "/terminal",
  ...sections.map(name => `/personalize?section=${name.toLowerCase().replaceAll(" ", "-")}`),
  "/personalize?section=usage&settings-tab=members", "/personalize?section=usage&settings-tab=billing", "/personalize?section=usage&settings-tab=keys",
  ...[1, 2, 3, 4, 5, 6, 7].map(n => `/personalize?section=home&settings=${n}`), "/personalize?section=home&settings=where-you-log",
].filter(route => !filter || new RegExp(filter, "i").test(route));
const widths = list.split(",");   // "390" or "844x390" (landscape)
const browser = await chromium.launch({ channel: "chrome" });
const out = [];

async function audit(route, size) {
  const [w, h = (+size >= 700 ? 1024 : 844)] = String(size).split("x").map(Number);
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 900, hasTouch: w < 900 });
  await context.addInitScript(() => localStorage.setItem("logio-cookie-consent", JSON.stringify({ value: { necessary: true }, version: "1", updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message.slice(0, 100)));
  try {
    await page.goto(base + route, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(2200);
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    // scroll down and up once so lazy parts exist
    for (let y = 0; y < 6000; y += 700) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(60); }
    await page.evaluate(() => window.scrollTo(0, 0));
    const result = await page.evaluate(() => {
      const vw = window.innerWidth, doc = document.documentElement, body = document.body;
      window.scrollTo(300, 0);
      const sideways = window.scrollX;
      window.scrollTo(0, 0);
      const clipped = el => {
        for (let a = el.parentElement; a && a !== doc; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX !== "visible" || cs.contain.includes("paint") || cs.clipPath !== "none") { const b = a.getBoundingClientRect(); if (b.right <= vw + 1 && b.left >= -1) return true; }
        }
        return false;
      };
      const culprits = [];
      for (const el of body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.right <= vw + 1 && r.left >= -1) continue;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
        if (el.closest("[inert], [aria-hidden='true'], dialog:not([open])")) continue;
        if (clipped(el)) continue;
        culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")} L${Math.round(r.left)} R${Math.round(r.right)}`);
        if (culprits.length >= 5) break;
      }
      const fixed = [];
      for (const el of body.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        if (cs.position !== "fixed" || cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
        if (el.closest("[inert], [aria-hidden='true']")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right > vw + 1 || r.left < -1) fixed.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")} L${Math.round(r.left)} R${Math.round(r.right)}`);
        if (fixed.length >= 4) break;
      }
      const scrollers = [];
      for (const el of body.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        if (cs.overflowX !== "auto" && cs.overflowX !== "scroll") continue;
        if (el.scrollWidth <= el.clientWidth + 1 || el.clientWidth === 0) continue;
        scrollers.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")} ${el.clientWidth}/${el.scrollWidth}`);
        if (scrollers.length >= 6) break;
      }
      const main = document.querySelector("main.ui-as-main");
      const mainSpill = main && main.scrollWidth > main.clientWidth + 2 ? `${main.clientWidth}/${main.scrollWidth}` : "";
      return { fixed, mainSpill, vw, docW: doc.scrollWidth, bodyW: body.scrollWidth, sideways, htmlOx: getComputedStyle(doc).overflowX, bodyOx: getComputedStyle(body).overflowX, culprits, scrollers };
    });
    return { route, w: size, ...result, errors };
  } catch (error) { return { route, w: size, failed: String(error.message).slice(0, 120) }; }
  finally { await context.close(); }
}

const jobs = routes.flatMap(route => widths.map(w => [route, w]));
let next = 0;
const workers = Array.from({ length: 4 }, async () => { while (next < jobs.length) { const [route, w] = jobs[next++]; out.push(await audit(route, w)); } });
await Promise.all(workers);
out.sort((a, b) => a.route.localeCompare(b.route) || a.w - b.w);
await fs.mkdir("docs/research/mobile-lock", { recursive: true });
await fs.writeFile("docs/research/mobile-lock/audit.json", JSON.stringify(out, null, 1));
let bad = 0;
for (const r of out) {
  if (r.failed) { bad += 1; console.log(`FAIL ${r.route} ${r.w}px: ${r.failed}`); continue; }
  const problems = [];
  if (r.docW > r.vw) problems.push(`document ${r.docW} > ${r.vw}`);
  if (r.bodyW > r.vw) problems.push(`body ${r.bodyW} > ${r.vw}`);
  if (r.fixed?.length) problems.push(`fixed outside the screen: ${r.fixed.join(" | ")}`);
  if (r.mainSpill) problems.push(`main content wider than its panel ${r.mainSpill}`);
  if (r.sideways > 0) problems.push(`scrolls sideways by ${r.sideways}`);
  if (r.culprits.length) problems.push(`sticks out: ${r.culprits.join(" | ")}`);
  if (problems.length) { bad += 1; console.log(`${r.route} ${r.w}px  ${problems.join("  ;  ")}`); }
}
console.log(`\n${out.length} audits, ${bad} with problems`);
const inner = new Map();
for (const r of out) for (const s of r.scrollers ?? []) { const key = `${r.route}  ${s.replace(/ \d+\/\d+$/, "")}`; if (!inner.has(key)) inner.set(key, []); inner.get(key).push(`${r.w}:${s.match(/\d+\/\d+$/)[0]}`); }
console.log("\ninner horizontal scrollers (judge each):");
for (const [key, v] of inner) console.log(`  ${key}  [${v.join(" ")}]`);
await browser.close();
