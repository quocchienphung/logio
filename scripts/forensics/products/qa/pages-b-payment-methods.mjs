// QA for the pg-payment-methods ports: hero carousel frames, country explorer (select → content/stats/donut),
// donut hover, grid card click. node scripts/forensics/products/qa/pages-b-payment-methods.mjs [width] [height] [shots=1]
import { OUT, open, scrollToEl, shotEl } from "./pages-b-lib.mjs";

const [w = "1440", h = "900", shots = "1"] = process.argv.slice(2);
const width = +w;
const vp = `${w}`;
const dir = `${OUT}/payment-methods`;
const { browser, page, errors } = await open("/payments/payment-methods", { width, height: +h });

const carousel = () =>
  page.evaluate(() => {
    const el = document.querySelector(".PaymentMethodHubHeroCarousel");
    const cards = [...el.querySelectorAll(".PaymentMethodHubHeroGraphicCardDomGraphic")];
    return cards.map((c) => {
      const cs = getComputedStyle(c);
      const m = new DOMMatrix(cs.transform);
      return `${Math.round(m.e)},${Math.round(m.f)}@${(+cs.opacity).toFixed(2)}`;
    });
  });
const t0 = Date.now();
for (const t of [300, 1200, 2500, 5200, 6400, 7400, 10500]) {
  await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
  console.log(`hero t=${t}ms`, JSON.stringify(await carousel()));
  if (shots === "1" && [300, 1200, 6400].includes(t))
    await shotEl(page, ".PaymentMethodHubHeroCarousel", `${dir}/${vp}-hero-pg-carousel-${t}ms.png`, 0);
}

// Countries explorer
await scrollToEl(page, ".PaymentMethodHubCountriesExplorer");
await page.waitForTimeout(500);
const readStats = () =>
  page.evaluate(() => ({
    numbers: [...document.querySelectorAll('[data-js-target-list="PaymentMethodHubCountryStats.numberEls"]')].map((n) => n.textContent.trim()).join(" "),
    bars: [...document.querySelectorAll(".PaymentMethodHubCountryStatsBarGraph")].map((b) => b.style.getPropertyValue("--paymentMethodHubCountryStatsBarPercent")).join(" "),
    first: document.querySelector(".PaymentMethodHubCountriesExplorer__content .CopyBody")?.textContent.trim().slice(0, 60),
    canvas: (() => {
      const c = document.querySelector(".PaymentMethodHubDonutChart__canvas");
      return c ? `${c.width}x${c.height}` : "none";
    })(),
  }));
console.log("stats US", JSON.stringify(await readStats()));
if (shots === "1") await shotEl(page, ".PaymentMethodHubCountriesExplorer", `${dir}/${vp}-countries-pg-us.png`, 8);
await page.selectOption('[data-js-target="CountrySelectInput.select"]', "JP");
await page.waitForTimeout(500);
console.log("stats JP @500ms", JSON.stringify(await readStats()));
if (shots === "1") await shotEl(page, ".PaymentMethodHubCountriesExplorer", `${dir}/${vp}-countries-pg-jp-mid.png`, 8);
await page.waitForTimeout(1500);
console.log("stats JP @2000ms", JSON.stringify(await readStats()));
if (shots === "1") await shotEl(page, ".PaymentMethodHubCountriesExplorer", `${dir}/${vp}-countries-pg-jp.png`, 8);

// Donut hover through the legend
const item = page.locator('[data-js-target-list="PaymentMethodHubCountryStats.splitItemEls"]').nth(1);
if (width >= 600) {
  await item.hover();
  await page.waitForTimeout(800);
  console.log("legend hover active:", await item.evaluate((n) => n.classList.contains("PaymentMethodHubCountryStats__listItem--isActive")));
  if (shots === "1") await shotEl(page, ".PaymentMethodHubCountriesExplorer", `${dir}/${vp}-countries-pg-hover.png`, 8);
  // hover the donut ring directly: first segment (card) at 12 o'clock + a few degrees
  const ring = await page.evaluate(() => {
    const r = document.querySelector(".PaymentMethodHubDonutChart").getBoundingClientRect();
    return { x: r.left + r.width / 2 + 10, y: r.top + 14 };
  });
  await page.mouse.move(ring.x, ring.y);
  await page.waitForTimeout(800);
  console.log(
    "ring hover active items:",
    await page.evaluate(() => [...document.querySelectorAll(".PaymentMethodHubCountryStats__listItem--isActive")].map((n) => n.dataset.jsId)),
  );
}

// Grid card click → link (navigation is intercepted)
const clicked = await page.evaluate(() => {
  const card = document.querySelector('[data-js-controller~="PaymentMethodHubCard"]');
  const link = card?.querySelector('[data-js-target~="PaymentMethodHubCard.link"]');
  if (!card || !link) return "no card";
  let hit = 0;
  link.addEventListener("click", (e) => {
    hit++;
    e.preventDefault();
  });
  card.querySelector("p, h2, h3, span")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return `link clicks: ${hit}`;
});
console.log("card click:", clicked);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log("overflow", overflow);
console.log("errors", JSON.stringify([...new Set(errors)].slice(0, 10)));
await browser.close();
