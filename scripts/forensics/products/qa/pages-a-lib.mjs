// Shared Playwright helpers for the pages-a QA scripts (/payments, /payments/checkout, /payments/payment-links,
// /payments/elements, /payments/link). Offline: every non-localhost request is aborted.
import { chromium } from "playwright";

export const BASE = process.env.BASE || "http://localhost:3106";

export async function open(path, { width = 1440, height = 900, reducedMotion = "no-preference" } = {}) {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--hide-scrollbars", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const mobile = width < 600;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion });
  await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE " + m.text().slice(0, 300));
  });
  await page.goto(BASE + path, { waitUntil: "load", timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  return { browser, page, errors };
}

/** Screenshot of `selector`'s box (plus margin), clipped to the viewport-scrolled element. */
export async function shotEl(page, selector, path, margin = 24) {
  const box = await page.evaluate(
    ([sel, m]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.left - m), y: Math.max(0, r.top - m), width: Math.min(innerWidth, r.width + 2 * m), height: Math.min(innerHeight, r.height + 2 * m) };
    },
    [selector, margin],
  );
  if (!box) return false;
  await page.screenshot({ path, clip: box });
  return true;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
