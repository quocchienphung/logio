// TestimonialCarousel QA: click an indicator and a nav logo, sample the scroll-driven colour/opacity
// cross-fade, keyboard-activate an indicator, and save evidence frames.
// node scripts/forensics/products/qa/carousels-testimonial.mjs <path> <slug> [width] [height] [index=0]
import { open, scrollToEl, overflow } from "./carousels-lib.mjs";

const [path = "/payments", slug = "payments", w = "1440", h = "900", idx = "0"] = process.argv.slice(2);
const index = +idx;
const out = `docs/design-references/products/${slug}`;
const vp = `${w}x${h}`;
const { browser, page, errors } = await open(path, { w: +w, h: +h });
const SEL = ".TestimonialCarousel";
await scrollToEl(page, SEL, 120, index);

const state = () =>
  page.evaluate(([s, i]) => {
    const el = document.querySelectorAll(s)[i];
    const track = el.querySelector(".TestimonialCarousel__track");
    return {
      bg: el.querySelector(".TestimonialCarousel__carousel").style.backgroundColor,
      scrollLeft: Math.round(track.scrollLeft),
      active: [...el.querySelectorAll(".TestimonialCarousel__indicator")].findIndex((b) => b.classList.contains("TestimonialCarousel__indicator--active")),
      nonFlatLogo: [...el.querySelectorAll(".CarouselNavItem svg")].map((s) => !s.classList.contains("variant--Flat")).indexOf(true),
      cardOpacity: [...el.querySelectorAll(".TestimonialCard")].map((c) => (+c.style.opacity || 0).toFixed(2)).join(","),
    };
  }, [SEL, index]);

console.log("initial", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-testimonial-carousel-initial.png` });

// Click the third indicator and sample the smooth scroll.
await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll(".TestimonialCarousel__indicator")[2].click(), [SEL, index]);
for (let k = 0; k < 6; k++) {
  await page.waitForTimeout(70);
  console.log(`t+${(k + 1) * 70}ms`, JSON.stringify(await state()));
  if (k === 2) await page.screenshot({ path: `${out}/${vp}-testimonial-carousel-mid.png` });
}
await page.waitForTimeout(800);
console.log("after indicator 3", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-testimonial-carousel-page3.png` });

// Nav logo (desktop) → page 2.
const hasNav = await page.evaluate(([s, i]) => !!document.querySelectorAll(s)[i].querySelector(".CarouselNavItem")?.offsetParent, [SEL, index]);
if (hasNav) {
  await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll(".CarouselNavItem")[1].click(), [SEL, index]);
  await page.waitForTimeout(1000);
  console.log("after nav logo 2", JSON.stringify(await state()));
}

// Keyboard: focus indicator 1 and press Enter.
await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll(".TestimonialCarousel__indicator")[0].focus(), [SEL, index]);
await page.keyboard.press("Enter");
await page.waitForTimeout(1000);
console.log("after keyboard Enter on indicator 1", JSON.stringify(await state()));

// Swipe-like: set scrollLeft half a page and read the interpolated state.
await page.evaluate(([s, i]) => {
  const el = document.querySelectorAll(s)[i];
  const t = el.querySelector(".TestimonialCarousel__track");
  t.style.scrollSnapType = "none";
  t.scrollLeft = el.getBoundingClientRect().width * 0.5;
}, [SEL, index]);
await page.waitForTimeout(200);
console.log("half-way (snap off)", JSON.stringify(await state()));
await page.evaluate(([s, i]) => {
  const t = document.querySelectorAll(s)[i].querySelector(".TestimonialCarousel__track");
  t.style.scrollSnapType = "";
  t.scrollLeft = 0;
}, [SEL, index]);

console.log("overflow", JSON.stringify(await overflow(page)));
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
