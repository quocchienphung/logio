// QA for the pg-terminal ports: hero entrance timeline, S700 screen loop, hover swaps, pointer tilt,
// device showcase parallax, unified-commerce card, device-management segmented layout.
// node scripts/forensics/products/qa/pages-b-terminal.mjs [width] [height] [shots=1]
import { OUT, open, scrollToEl, shotEl } from "./pages-b-lib.mjs";

const [w = "1440", h = "900", shots = "1"] = process.argv.slice(2);
const width = +w;
const dir = `${OUT}/terminal`;
const { browser, page, errors } = await open("/terminal", { width, height: +h });

const state = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const op = (s) => (q(s) ? (+getComputedStyle(q(s)).opacity).toFixed(2) : "-");
    return {
      entering: q(".TerminalHeroGraphic").classList.contains("TerminalHeroGraphic--isEntering"),
      s700Outline: op(".TerminalHeroGraphicS700"),
      png: op(".TerminalHeroGraphic3d__pngDevice"),
      shadow: op(".TerminalHeroGraphic3d__s700Shadow"),
      splash: op(".TerminalHeroGraphicS700UI__splash"),
      payment: op(".TerminalHeroGraphicS700UI__payment"),
      title: op(".TerminalHeroGraphicS700UI__paymentTitle"),
      tap: q(".TerminalHeroGraphicS700UI__paymentTapToPay").classList.contains("TerminalHeroGraphicS700UI__paymentTapToPay--isVisible"),
      ui: q(".TerminalHeroGraphicUI__s700").style.transform,
    };
  });
const t0 = Date.now();
for (const t of [200, 1500, 2600, 3400, 5000, 6500, 9000, 12500, 14500]) {
  await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
  console.log(`hero t=${t}`, JSON.stringify(await state()));
  if (shots === "1" && [1500, 3400, 6500, 9000].includes(t)) await shotEl(page, ".TerminalHeroGraphic", `${dir}/${w}-hero-pg-${t}ms.png`, 0);
}

if (width >= 900) {
  // hover swap on the M2 outline
  const hb = await page.evaluate(() => {
    const r = document.querySelector(".TerminalHeroGraphicUI__deviceHitboxM2").getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(hb.x, hb.y, { steps: 4 });
  await page.waitForTimeout(900);
  console.log(
    "hover m2:",
    await page.evaluate(() => ({
      outline: (+getComputedStyle(document.querySelector(".TerminalHeroGraphicM2")).opacity).toFixed(2),
      image: (+getComputedStyle(document.querySelector(".TerminalHeroGraphicUI__deviceHitboxM2 .TerminalHeroGraphicUI__deviceImage")).opacity).toFixed(2),
    })),
  );
  if (shots === "1") await shotEl(page, ".TerminalHeroGraphic", `${dir}/${w}-hero-pg-hover-m2.png`, 0);
  // tilt: pointer to the lower right of the S700
  await page.mouse.move(hb.x + 700, hb.y + 300, { steps: 6 });
  await page.waitForTimeout(300);
  console.log("tilt:", JSON.stringify(await state()), await page.evaluate(() => document.querySelector(".TerminalHeroGraphic3d__pngDevice").style.transform));
  if (shots === "1") await shotEl(page, ".TerminalHeroGraphic", `${dir}/${w}-hero-pg-tilt.png`, 0);
  await page.mouse.move(hb.x, hb.y + 900);
}

// Unified commerce card
await scrollToEl(page, '[data-js-controller="TerminalUnifiedCommerceS700Animation"]');
const card = () =>
  page.evaluate(() => getComputedStyle(document.querySelector('[data-js-target="TerminalUnifiedCommerceS700Animation.cardPicture"]')).transform);
console.log("unified card t=0", await card());
await page.waitForTimeout(900);
console.log("unified card t=900", await card());
await page.waitForTimeout(1500);
console.log("unified card t=2400", await card());
if (shots === "1") await shotEl(page, '[data-js-controller="TerminalUnifiedCommerceS700Animation"]', `${dir}/${w}-unified-pg-card.png`, 0);

// Device showcase parallax
const cols = () =>
  page.evaluate(() => [...document.querySelectorAll('[data-js-target-list="TerminalDeviceShowcaseGraphic.columns"]')].map((c) => c.style.transform).join(" | "));
await scrollToEl(page, '[data-js-controller="TerminalDeviceShowcaseGraphic"]', "start");
await page.waitForTimeout(600);
console.log("showcase at start:", await cols());
await scrollToEl(page, '[data-js-controller="TerminalDeviceShowcaseGraphic"]', "end");
await page.waitForTimeout(600);
console.log("showcase at end:", await cols());
if (shots === "1") await shotEl(page, '[data-js-controller="TerminalDeviceShowcaseGraphic"]', `${dir}/${w}-devices-pg-parallax.png`, 0);

// Device management segmented control
await scrollToEl(page, '[data-js-controller="TerminalDeviceManagementLayout"]');
console.log(
  "device mgmt:",
  await page.evaluate(() => {
    const el = document.querySelector('[data-js-controller="TerminalDeviceManagementLayout"]');
    const btn = el.querySelectorAll('[data-js-target-list="SegmentedControl.buttons"]')[1];
    if (btn) btn.click();
    else el.dispatchEvent(new CustomEvent("SegmentedControl:buttonClicked", { bubbles: true, detail: { index: 1 } }));
    return { via: btn ? "button" : "event", currentIndex: el.style.getPropertyValue("--currentIndex") };
  }),
);

console.log("overflow", await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
console.log("errors", JSON.stringify([...new Set(errors)].slice(0, 10)));
await browser.close();
