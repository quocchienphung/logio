// StackedCarousel QA: autoplay (3.5 s) only while ≥ 75 % visible, image cross-fade frames, click
// stops autoplay, keyboard, pause when scrolled away.
// node scripts/forensics/products/qa/carousels-stacked.mjs <path> <slug> [width] [height]
import { open, scrollToEl, overflow } from "./carousels-lib.mjs";

const [path = "/payments/payment-methods", slug = "payments--payment-methods", w = "1440", h = "900"] = process.argv.slice(2);
const out = `docs/design-references/products/${slug}`;
const vp = `${w}x${h}`;
const { browser, page, errors } = await open(path, { w: +w, h: +h });
const SEL = ".StackedCarousel";
const state = () =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    const vis = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height;
    return {
      t: Math.round(performance.now()),
      visible: vis.toFixed(2),
      active: [...el.querySelectorAll(".StackedCarousel__detailContainer")].findIndex((d) => d.classList.contains("StackedCarousel__detailContainer--isActive")),
      index: el.style.getPropertyValue("--stackedCarouselItemIndex"),
      images: [...el.querySelectorAll(".StackedCarousel__imageContainer")].map((i) => {
        const c = getComputedStyle(i);
        return `${(+c.opacity).toFixed(2)}@${c.transform === "none" ? 0 : Math.round(new DOMMatrix(c.transform).m42)}`;
      }).join(" "),
    };
  }, SEL);

const height = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().height, SEL);
console.log("section height", Math.round(height), "viewport", h, "max ratio", (Math.min(1, +h / height)).toFixed(2));
await scrollToEl(page, SEL, Math.max(0, (+h - height) / 2));
console.log("in view", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-stacked-carousel-step1.png` });
await page.waitForTimeout(3500 + 100);
console.log("+3.6s", JSON.stringify(await state()));
await page.waitForTimeout(150);
console.log("+3.75s (old image leaving, new delayed 300ms)", JSON.stringify(await state()));
await page.waitForTimeout(250);
console.log("+4.0s", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-stacked-carousel-crossfade.png` });
await page.waitForTimeout(600);
console.log("+4.6s", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-stacked-carousel-step2.png` });
await page.waitForTimeout(3500);
console.log("+8.1s", JSON.stringify(await state()));

// Click step 1 → selects it and stops autoplay.
await page.evaluate((s) => document.querySelector(s).querySelectorAll(".StackedCarousel__detailContainer")[0].click(), SEL);
await page.waitForTimeout(900);
console.log("after click step 1", JSON.stringify(await state()));
await page.waitForTimeout(4000);
console.log("4 s later (autoplay stopped)", JSON.stringify(await state()));
// Keyboard: focus step 3, press Enter.
await page.evaluate((s) => document.querySelector(s).querySelectorAll(".StackedCarousel__detailContainer")[2].focus({ preventScroll: true }), SEL);
await page.keyboard.press("Enter");
await page.waitForTimeout(900);
console.log("keyboard Enter step 3", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-stacked-carousel-keyboard.png` });
// Scroll away and back: autoplay restarts on re-entry.
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(4000);
console.log("offscreen 4 s", JSON.stringify(await state()));
await scrollToEl(page, SEL, Math.max(0, (+h - height) / 2));
await page.waitForTimeout(3700);
console.log("back in view +3.7s", JSON.stringify(await state()));
console.log("overflow", JSON.stringify(await overflow(page)));
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
