// Shared Playwright setup for the "forms" QA scripts (localhost only; every other request is aborted).
import { chromium } from "playwright";

export const BASE = process.env.BASE || "http://localhost:3104";

export async function open(path, { width = 1440, height = 900, reducedMotion = "no-preference" } = {}) {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars"] });
  const mobile = width < 600;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: "en-US", isMobile: mobile, hasTouch: mobile, reducedMotion });
  await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE " + m.text().slice(0, 300));
  });
  await page.goto(BASE + path, { waitUntil: "load", timeout: 300000 });
  // controllers are mounted after hydration; the dev-only accessor appears with the first forms controller
  await page.waitForFunction(() => typeof window.__v1FormsApi === "function", null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(300);
  return { browser, page, errors };
}

export function check(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) process.exitCode = 1;
}

/** Screenshot of an element's box (plus margin) as PNG. */
export async function shotEl(page, selector, path, margin = 24) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) return;
  const vp = page.viewportSize();
  const x = Math.max(0, box.x - margin);
  const y = Math.max(0, box.y - margin);
  await page.screenshot({ path, clip: { x, y, width: Math.min(vp.width - x, box.width + margin * 2), height: Math.min(vp.height - y, box.height + margin * 2) } });
}
