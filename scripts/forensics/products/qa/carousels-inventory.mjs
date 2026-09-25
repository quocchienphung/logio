// Inventory of the carousels-group controller elements on one page: count, size, targets.
// node scripts/forensics/products/qa/carousels-inventory.mjs /payments [width]
import { open } from "./carousels-lib.mjs";

const [path = "/payments", w = "1440"] = process.argv.slice(2);
const NAMES = [
  "TestimonialCarousel", "FullWidthCarousel", "FullWidthFeatureCarousel", "FullWidthFeatureCarouselNav",
  "FullWidthFeatureCarouselMobileNav", "CaseStudyCarousel", "CaseStudyCarouselNav", "StackedCarousel",
  "StackedCarouselControl", "SegmentedControl", "CyclingCardsAnimation", "CyclingCard",
  "DetailCodeSnippetCarousel", "AnimationSequence",
];
const { browser, page, errors } = await open(path, { w: +w });
const out = await page.evaluate((names) => {
  const res = {};
  for (const n of names) {
    const els = Array.from(document.querySelectorAll(`.v1-root [data-js-controller~="${n}"]`));
    if (!els.length) continue;
    res[n] = els.map((el) => {
      const r = el.getBoundingClientRect();
      const targets = {};
      el.querySelectorAll(`[data-js-target*="${n}."], [data-js-target-list*="${n}."]`).forEach((t) => {
        const k = ((t.dataset.jsTarget || "") + " " + (t.dataset.jsTargetList || "")).split(" ").filter((s) => s.startsWith(n + ".")).join(",");
        targets[k] = (targets[k] || 0) + 1;
      });
      const data = {};
      for (const [k, v] of Object.entries(el.dataset)) if (k !== "jsController") data[k] = v.slice(0, 40);
      return { cls: el.className.toString().slice(0, 120), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), data, targets };
    });
  }
  return res;
}, NAMES);
console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log(errors.join("\n"));
await browser.close();
