// Shared Playwright helpers for reference capture and local validation.
import { chromium } from "playwright";

export const VIEWPORTS = {
  1440: { width: 1440, height: 1000 },
  1280: { width: 1280, height: 900 },
  1024: { width: 1024, height: 768 },
  768: { width: 768, height: 1024 },
  390: { width: 390, height: 844, mobile: true },
};

export async function launch() {
  return chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
  });
}

export async function newPage(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
    locale: "en-US",
    userAgent: vp.mobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  const page = await context.newPage();
  return { context, page };
}

// Scroll through the page slowly so lazy content and IntersectionObserver-driven
// entrances have all fired, then return to top.
export async function sweep(page, step = 600, pause = 120) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total + step; y += step) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(pause);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}
