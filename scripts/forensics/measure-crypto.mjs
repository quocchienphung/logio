// Measure the crypto bento card + globe canvas rects on live vs local at a viewport.
import { launch, newPage, VIEWPORTS } from "./browser.mjs";
const [vpName = "1440", which = "both"] = process.argv.slice(2);
const vp = VIEWPORTS[vpName];
const browser = await launch();
const measure = async (url) => {
  const { page, context } = await newPage(browser, vp);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate(() => document.querySelector(".modular-solutions-bento__card-crypto")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const q = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), w_attr: e.width, h_attr: e.height, transform: cs.transform, inset: cs.inset }; };
    return {
      card: q(".modular-solutions-bento__card-crypto"),
      title: q("#bento-card-title-crypto"),
      bg: q(".modular-solutions-bento__card-crypto .modular-solutions-bento-card__background"),
      globe: q(".modular-solutions-bento__card-crypto .globe"),
      canvas: q(".modular-solutions-bento__card-crypto canvas"),
      staticImg: q(".modular-solutions-bento__card-crypto .globe__static img"),
      ui: [...document.querySelectorAll(".modular-solutions-bento__card-crypto .globe__arc-ui")].map((e) => ({ display: e.style.display, x: e.style.getPropertyValue("--ui-x"), y: e.style.getPropertyValue("--ui-y"), o: e.style.getPropertyValue("--ui-opacity"), text: e.textContent })),
      scrollY: window.scrollY,
    };
  });
  await context.close();
  return r;
};
if (which !== "local") console.log("LIVE", JSON.stringify(await measure("https://stripe.com/"), null, 1));
if (which !== "live") console.log("LOCAL", JSON.stringify(await measure("http://localhost:3000/"), null, 1));
await browser.close();
