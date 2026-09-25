// CyclingCardsAnimation QA: intro stagger, step cadence, active card, offscreen hold, reduced motion.
// node scripts/forensics/products/qa/carousels-cycling.mjs <path> <slug> [width] [height] [reduced=0]
import { open, scrollToEl, overflow } from "./carousels-lib.mjs";

const [path = "/tax", slug = "tax", w = "1440", h = "900", reduced = "0"] = process.argv.slice(2);
const out = `docs/design-references/products/${slug}`;
const vp = `${w}x${h}${reduced === "1" ? "-reduced" : ""}`;
const { browser, page, errors } = await open(path, { w: +w, h: +h, reducedMotion: reduced === "1" ? "reduce" : "no-preference" });
const SEL = ".CyclingCardsAnimation";
const state = () =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    const cards = [...el.querySelectorAll(".CyclingCard")];
    const shown = cards
      .map((c, i) => {
        const cs = getComputedStyle(c);
        if (c.classList.contains("CyclingCard--isHidden") || +cs.opacity === 0 || cs.display === "none") return null;
        const m = cs.transform === "none" ? new DOMMatrix() : new DOMMatrix(cs.transform);
        return `${i}${c.classList.contains("CyclingCard--isActive") ? "*" : ""}:y${Math.round(m.m42)} s${m.a.toFixed(2)} o${(+cs.opacity).toFixed(2)}`;
      })
      .filter(Boolean);
    return { t: Math.round(performance.now()), height: el.style.height, maskTop: el.querySelector(".CyclingCardsAnimation__masked").style.top, shown: shown.join(" | ") };
  }, SEL);

await scrollToEl(page, SEL, 330);
// The intro starts on first visibility; sample it.
for (const t of [0, 200, 400, 700, 1200, 2500]) {
  if (t) await page.waitForTimeout(t - [0, 200, 400, 700, 1200, 2500][[0, 200, 400, 700, 1200, 2500].indexOf(t) - 1]);
  console.log(`+${t}ms`, JSON.stringify(await state()));
  if (t === 200) await page.screenshot({ path: `${out}/${vp}-cycling-carousel-intro.png` });
}
await page.screenshot({ path: `${out}/${vp}-cycling-carousel-rest.png` });
// Sync on the next step: wait for the active card to change, then sample mid-slide.
const activeNow = () => page.evaluate((s) => [...document.querySelector(s).querySelectorAll(".CyclingCard")].findIndex((c) => c.classList.contains("CyclingCard--isActive")), SEL);
const a0 = await activeNow();
const t0 = Date.now();
while ((await activeNow()) === a0 && Date.now() - t0 < 8000) await page.waitForTimeout(20);
console.log("next step began after", Date.now() - t0, "ms");
await page.waitForTimeout(200);
console.log("next step +200ms", JSON.stringify(await state()));
await page.screenshot({ path: `${out}/${vp}-cycling-carousel-sliding.png` });
await page.waitForTimeout(500);
console.log("step 2 settled", JSON.stringify(await state()));
// Offscreen hold: leave for 12 s, the loop must not advance more than the running step.
await page.evaluate(() => scrollTo(0, 0));
const before = await state();
await page.waitForTimeout(12000);
await scrollToEl(page, SEL, 330);
await page.waitForTimeout(100);
console.log("before leaving", JSON.stringify(before));
console.log("after 12 s offscreen, back +100ms", JSON.stringify(await state()));
console.log("overflow", JSON.stringify(await overflow(page)));
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
