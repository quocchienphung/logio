// CaseStudyCarousel QA: logo button clicks (smooth scroll), accent-line clip progress, logo colour
// variant, mobile indicators, keyboard.
// node scripts/forensics/products/qa/carousels-casestudy.mjs <path> <slug> [width] [height]
import { open, scrollToEl, overflow } from "./carousels-lib.mjs";

const [path = "/terminal", slug = "terminal", w = "1440", h = "900"] = process.argv.slice(2);
const out = `docs/design-references/products/${slug}`;
const vp = `${w}x${h}`;
const { browser, page, errors } = await open(path, { w: +w, h: +h });
const SEL = ".CaseStudyCarousel";
await scrollToEl(page, ".CaseStudyCarouselNav", +h - 200);
await page.waitForTimeout(300);

const state = () =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    const track = el.querySelector(".CaseStudyCarousel__track");
    const line = el.querySelector(".CaseStudyCarouselNav__coloredLine");
    return {
      scrollLeft: Math.round(track.scrollLeft),
      clip: line.style.clipPath,
      segments: [...line.children].map((c) => c.style.backgroundColor).join(" "),
      colourLogo: [...el.querySelectorAll(".CaseStudyCarouselNavItem svg")].map((s) => (s.classList.contains("variant--Flat") ? 0 : 1)).join(""),
      indicators: [...el.querySelectorAll(".CaseStudyCarouselNav__indicator")].map((c) => (c.classList.contains("CaseStudyCarouselNav__indicator--active") ? 1 : 0)).join(""),
    };
  }, SEL);

console.log("initial", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-casestudy-carousel-initial.png` });
const mobile = +w < 450;
if (!mobile) {
  await page.evaluate((s) => document.querySelector(s).querySelectorAll(".CaseStudyCarouselNavItem__button")[2].click(), SEL);
  await page.waitForTimeout(150);
  console.log("click logo 3 +150ms", JSON.stringify(await state()));
  await page.screenshot({ path: `${out}/${vp}-casestudy-carousel-mid.png` });
  await page.waitForTimeout(900);
  console.log("after logo 3", JSON.stringify(await state()));
  await page.screenshot({ path: `${out}/${vp}-casestudy-carousel-item3.png` });
  await page.evaluate((s) => document.querySelector(s).querySelectorAll(".CaseStudyCarouselNavItem__button")[0].focus(), SEL);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  console.log("keyboard Enter logo 1", JSON.stringify(await state()));
} else {
  // Swipe equivalent on touch: one page of native scroll.
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    el.querySelector(".CaseStudyCarousel__track").scrollLeft = el.getBoundingClientRect().width;
  }, SEL);
  await page.waitForTimeout(400);
  console.log("after swipe to 2", JSON.stringify(await state()));
  await scrollToEl(page, ".CaseStudyCarouselNav__mobileNav", +h - 150);
  await page.screenshot({ path: `${out}/${vp}-casestudy-carousel-item2.png` });
}
console.log("overflow", JSON.stringify(await overflow(page)));
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
