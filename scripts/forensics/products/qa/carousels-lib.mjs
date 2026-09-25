// Shared helpers for the carousels-group QA scripts (localhost only; every other request is aborted).
import { chromium } from "playwright";

export const BASE = process.env.BASE || "http://localhost:3103";

export async function open(path, { w = 1440, h = 900, reducedMotion = "no-preference" } = {}) {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars"] });
  const mobile = w < 600;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "en-US", isMobile: mobile, hasTouch: mobile, reducedMotion });
  await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("ERROR " + m.text().slice(0, 300));
  });
  await page.goto(BASE + path, { waitUntil: "load", timeout: 300000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  return { browser, ctx, page, errors };
}

/** Scroll so the element's top sits `offset` px below the viewport top. */
export async function scrollToEl(page, selector, offset = 80, index = 0) {
  await page.evaluate(
    ([s, o, i]) => {
      const el = document.querySelectorAll(s)[i];
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o);
    },
    [selector, offset, index],
  );
  await page.waitForTimeout(300);
}

/** Screenshot the part of the viewport covered by an element (plus padding). */
export async function shotEl(page, selector, path, index = 0, pad = 0) {
  const box = await page.evaluate(
    ([s, i]) => {
      const r = document.querySelectorAll(s)[i].getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    },
    [selector, index],
  );
  const vw = page.viewportSize();
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const clip = { x, y, width: Math.min(vw.width - x, box.width + pad * 2), height: Math.min(vw.height - y, box.height + pad * 2) };
  await page.screenshot({ path, clip });
}

export async function overflow(page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
}
