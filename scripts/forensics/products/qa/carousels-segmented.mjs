// SegmentedControl QA: click a tab and sample the clip-path pill animation, keyboard (Tab + Enter),
// focus ring mirroring, emitted events.
// node scripts/forensics/products/qa/carousels-segmented.mjs <path> <slug> [width] [height] [index=0] [target=2]
import { open, scrollToEl, overflow } from "./carousels-lib.mjs";

const [path = "/payments", slug = "payments", w = "1440", h = "900", idx = "0", tgt = "2"] = process.argv.slice(2);
const index = +idx;
const out = `docs/design-references/products/${slug}`;
const vp = `${w}x${h}`;
const { browser, page, errors } = await open(path, { w: +w, h: +h });
const SEL = '[data-js-controller~="SegmentedControl"]';
await scrollToEl(page, SEL, 200, index);
await page.evaluate(([s, i]) => {
  window.__segEvents = [];
  const el = document.querySelectorAll(s)[i];
  ["SegmentedControl:buttonClicked", "SegmentedControl:changed"].forEach((n) => el.addEventListener(n, (e) => window.__segEvents.push(n.split(":")[1] + " " + JSON.stringify(e.detail))));
}, [SEL, index]);

const state = () =>
  page.evaluate(([s, i]) => {
    const el = document.querySelectorAll(s)[i];
    const items = el.querySelector(".SegmentedControl__buttons");
    return {
      single: el.classList.contains("SegmentedControl--singleModeActive"),
      clip: getComputedStyle(items).clipPath,
      supporting: el.querySelectorAll(".SegmentedControl__backContainer button").length,
      pressed: [...el.querySelectorAll(".SegmentedControl__buttons .SegmentedControlButton")].map((b) => b.getAttribute("aria-pressed") === "true" ? 1 : 0).join(""),
    };
  }, [SEL, index]);

console.log("initial", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-segmented-carousel-initial.png` });
// A real click lands on the visible element under the pointer.
const pt = await page.evaluate(([s, i, t]) => {
  const r = document.querySelectorAll(s)[i].querySelectorAll(".SegmentedControl__buttons .SegmentedControlButton")[t].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, [SEL, index, +tgt]);
await page.mouse.click(pt.x, pt.y);
for (const t of [60, 120, 240, 400]) {
  await page.waitForTimeout(t === 60 ? 60 : t === 120 ? 60 : t === 240 ? 120 : 160);
  console.log(`+${t}ms`, JSON.stringify(await state()));
  if (t === 120) await page.screenshot({ path: `${out}/${vp}-segmented-carousel-mid.png` });
}
await page.screenshot({ path: `${out}/${vp}-segmented-carousel-selected.png` });
// Second click, via the supporting button now on top (pointer-events pass through the pill layer).
const pt0 = await page.evaluate(([s, i]) => {
  const r = document.querySelectorAll(s)[i].querySelectorAll(".SegmentedControl__buttons .SegmentedControlButton")[0].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, [SEL, index]);
const topEl = await page.evaluate(([x, y]) => {
  const e = document.elementFromPoint(x, y);
  return e.parentElement.className + " > " + e.className;
}, [pt0.x, pt0.y]);
console.log("element under pointer at tab 0:", topEl);
await page.mouse.click(pt0.x, pt0.y);
await page.waitForTimeout(500);
console.log("after click tab 0", JSON.stringify(await state()));
// Keyboard: focus tab 1 via focus() + Tab semantics, press Enter.
await page.evaluate(([s, i]) => document.querySelectorAll(s)[i].querySelectorAll(".SegmentedControl__buttons .SegmentedControlButton")[0].focus(), [SEL, index]);
await page.keyboard.press("Tab");
const focused = await page.evaluate(() => document.activeElement.textContent.trim() + " | " + document.activeElement.parentElement.className);
const mirror = await page.evaluate(([s, i]) => [...document.querySelectorAll(s)[i].querySelectorAll(".SegmentedControlButton--focusMirror")].map((b) => b.textContent).join(","), [SEL, index]);
console.log("focused after Tab:", focused, "| mirror ring on:", mirror);
await page.screenshot({ path: `${out}/${vp}-segmented-carousel-focus.png` });
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
console.log("after keyboard Enter", JSON.stringify(await state()));
console.log("events", JSON.stringify(await page.evaluate(() => window.__segEvents)));
console.log("overflow", JSON.stringify(await overflow(page)));
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
