// FullWidthFeatureCarousel / FullWidthCarousel QA: prev/next buttons, mouse drag (threshold + snap),
// slide click, keyboard, mobile indicator (fractional index) and evidence frames.
// node scripts/forensics/products/qa/carousels-fullwidth.mjs <path> <slug> [width] [height] [index=0]
import { open, scrollToEl, overflow } from "./carousels-lib.mjs";

const [path = "/payments", slug = "payments", w = "1440", h = "900", idx = "0"] = process.argv.slice(2);
const index = +idx;
const out = `docs/design-references/products/${slug}`;
const vp = `${w}x${h}`;
const { browser, page, errors } = await open(path, { w: +w, h: +h });
const SEL = ".FullWidthFeatureCarousel";
await scrollToEl(page, SEL, 140, index);
await page.waitForTimeout(400);

const state = () =>
  page.evaluate(([s, i]) => {
    const el = document.querySelectorAll(s)[i];
    const track = el.querySelector(".FullWidthCarousel__track");
    const nav = [...el.querySelectorAll(".FullWidthFeatureCarouselNav__button")].map((b) => (b.classList.contains("FullWidthFeatureCarouselNav__button--inactive") ? "off" : "on"));
    const mob = [...el.querySelectorAll(".FullWidthFeatureCarouselMobileNav__indicatorControlListItem")].map(
      (li) => (li.classList.contains("FullWidthFeatureCarouselMobileNav__indicatorControlListItem--active") ? "A" : "-") + (li.style.getPropertyValue("--activeButtonXPosition") || "0"),
    );
    return { scrollLeft: Math.round(track.scrollLeft), snap: track.style.scrollSnapType, nav: nav.join("/"), mobile: mob.join(" ") };
  }, [SEL, index]);

console.log("initial", JSON.stringify(await state()));
const mobile = +w < 600;
if (!mobile) {
  await page.screenshot({ path: `${out}/${vp}-feature-carousel-initial.png` });
  const next = await page.evaluate(([s, i]) => {
    const r = document.querySelectorAll(s)[i].querySelectorAll(".FullWidthFeatureCarouselNav__button")[1].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [SEL, index]);
  await page.mouse.click(next.x, next.y);
  await page.waitForTimeout(160);
  console.log("next +160ms", JSON.stringify(await state()));
  await page.waitForTimeout(900);
  console.log("after next", JSON.stringify(await state()));
  await page.mouse.click(next.x, next.y);
  await page.waitForTimeout(1000);
  console.log("after next x2", JSON.stringify(await state()));
  await page.screenshot({ path: `${out}/${vp}-feature-carousel-end.png` });

  // Mouse drag right-to-left by 60 px from the start: > 7.5 % of an item → next slide.
  await page.evaluate(([s, i]) => (document.querySelectorAll(s)[i].querySelector(".FullWidthCarousel__track").scrollLeft = 0), [SEL, index]);
  await page.waitForTimeout(600);
  console.log("reset", JSON.stringify(await state()));
  const box = await page.evaluate(([s, i]) => {
    const r = document.querySelectorAll(s)[i].querySelector(".FullWidthCarousel__track").getBoundingClientRect();
    return { x: r.left + 300, y: r.top + r.height / 2 };
  }, [SEL, index]);
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) await page.mouse.move(box.x - k * 10, box.y);
  console.log("dragging 60px", JSON.stringify(await state()));
  await page.mouse.up();
  await page.waitForTimeout(1000);
  console.log("after drag release", JSON.stringify(await state()));
  // Small drag (20 px) back: < 7.5 % → stays.
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  for (let k = 1; k <= 2; k++) await page.mouse.move(box.x + k * 10, box.y);
  await page.mouse.up();
  await page.waitForTimeout(1000);
  console.log("after 20px drag back", JSON.stringify(await state()));
  // Keyboard: focus prev and press Enter.
  await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll(".FullWidthFeatureCarouselNav__button")[0].focus(), [SEL, index]);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  console.log("after keyboard prev", JSON.stringify(await state()));
  // Click on the partially visible third item → goes to it (clamped to the last in-bounds index).
  await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll(".FullWidthFeatureCarouselItemWrapper")[2].click(), [SEL, index]);
  await page.waitForTimeout(1000);
  console.log("after slide 3 click", JSON.stringify(await state()));
} else {
  await page.screenshot({ path: `${out}/${vp}-feature-carousel-initial.png` });
  // Native swipe equivalent: scroll the track in small steps and read the live indicator.
  const width = await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelector(".FullWidthFeatureCarouselItemWrapper").offsetWidth, [SEL, index]);
  for (const f of [0.25, 0.5, 0.75]) {
    await page.evaluate(([s, i, x]) => {
      const t = document.querySelectorAll(s)[i].querySelector(".FullWidthCarousel__track");
      t.style.scrollSnapType = "none";
      t.scrollLeft = x;
    }, [SEL, index, width * f]);
    await page.waitForTimeout(120);
    console.log(`scroll ${f}`, JSON.stringify(await state()));
    if (f === 0.5) await page.screenshot({ path: `${out}/${vp}-feature-carousel-midswipe.png` });
  }
  await page.evaluate(([s, i]) => {
    const t = document.querySelectorAll(s)[i].querySelector(".FullWidthCarousel__track");
    t.style.scrollSnapType = "";
    t.scrollLeft = 0;
  }, [SEL, index]);
  await page.waitForTimeout(300);
  await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll(".FullWidthFeatureCarouselMobileNav__controlButton")[2].click(), [SEL, index]);
  await page.waitForTimeout(1200);
  console.log("after mobile indicator 3", JSON.stringify(await state()));
  await page.screenshot({ path: `${out}/${vp}-feature-carousel-item3.png` });
}
console.log("overflow", JSON.stringify(await overflow(page)));
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
