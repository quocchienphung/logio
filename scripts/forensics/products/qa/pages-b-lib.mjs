// Shared Playwright setup for the pages-b QA scripts (localhost only; every other request is aborted).
import { chromium } from "playwright";

export const BASE = process.env.BASE || "http://localhost:3107";
export const OUT = "docs/design-references/products";

export async function open(path, { width = 1440, height = 900, reduced = false } = {}) {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--hide-scrollbars", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const mobile = width < 600;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
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

/** Screenshot of an element's box (clipped to the viewport width). */
export async function shotEl(page, selector, file, pad = 0) {
  const box = await page.evaluate(
    ([s, p]) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.left - p), y: Math.max(0, r.top + scrollY - p), w: Math.min(innerWidth, r.width + 2 * p), h: r.height + 2 * p };
    },
    [selector, pad],
  );
  if (!box) throw new Error("no element " + selector);
  const vw = page.viewportSize().width;
  await page.screenshot({ path: file, fullPage: true, clip: { x: box.x, y: box.y, width: Math.min(box.w, vw - box.x), height: box.h } });
}

export const scrollToEl = (page, selector, block = "center") =>
  page.evaluate(([s, b]) => document.querySelector(s)?.scrollIntoView({ block: b }), [selector, block]);
