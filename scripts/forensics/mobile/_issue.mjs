import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/", { waitUntil: "load" });
await p.waitForTimeout(4000);
const txt = await p.evaluate(() => {
  const portal = document.querySelector("nextjs-portal");
  if (!portal) return "no portal";
  const root = portal.shadowRoot;
  return root ? root.textContent.replace(/\s+/g, " ").slice(0, 1500) : "no shadow";
});
console.log("portal text:", txt);
// try to open the issue badge
const opened = await p.evaluate(() => {
  const root = document.querySelector("nextjs-portal")?.shadowRoot;
  const btn = root?.querySelector("[data-issues-open], [data-nextjs-dev-tools-button], button[aria-label*='Issue' i], [data-issues]");
  if (btn) { btn.click(); return btn.outerHTML.slice(0, 200); }
  return "no button: " + (root ? [...root.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || b.textContent).join(" | ") : "");
});
console.log("open:", opened);
await p.waitForTimeout(1200);
const after = await p.evaluate(() => document.querySelector("nextjs-portal")?.shadowRoot?.textContent.replace(/\s+/g, " ").slice(0, 2500));
console.log("after:", after);
await p.screenshot({ path: "docs/design-references/mobile/issue.png" });
await b.close();
