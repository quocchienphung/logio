// QA for the /payments page-specific controllers: hero loop (frame sequence), Link replay, terminal scroll
// progress, global payment carousel, customer case-study carousel.
// node scripts/forensics/products/qa/pages-a-payments.mjs [width] [height] [outDir]
import { open, sleep } from "./pages-a-lib.mjs";

const [w = "1440", h = "900", out = ""] = process.argv.slice(2);
const { browser, page, errors } = await open("/payments", { width: +w, height: +h });
const vp = `${w}x${h}`;
const snap = async (name, sel) => {
  if (!out) return;
  if (sel) {
    const el = await page.$(sel);
    if (el) await el.screenshot({ path: `${out}/${vp}-${name}.png` }).catch(() => page.screenshot({ path: `${out}/${vp}-${name}.png` }));
  } else await page.screenshot({ path: `${out}/${vp}-${name}.png` });
};

const heroState = () =>
  page.evaluate(() => {
    const op = (sel) => {
      const e = document.querySelector(sel);
      return e ? Number(getComputedStyle(e).opacity).toFixed(2) : "-";
    };
    return {
      pe: op(".PaymentsHeroAnimationPaymentElements"),
      kl: op(".PaymentsHeroAnimationKlarna"),
      co: op(".PaymentsHeroAnimationCheckout"),
      email: document.querySelector("[data-js-target='PaymentsHeroAnimationLink.linkEmailText']")?.textContent,
      banks: op("[data-js-target='PaymentsHeroAnimationPaymentElements.paymentBanks']"),
    };
  });
const t0 = Date.now();
for (let i = 0; i < 14; i++) {
  console.log(((Date.now() - t0) / 1000).toFixed(1) + "s", JSON.stringify(await heroState()));
  if (i === 2) await snap("hero-pg-intro", ".PaymentsHeroAnimation");
  if (i === 5) await snap("hero-pg-klarna", ".PaymentsHeroAnimation");
  if (i === 10) await snap("hero-pg-checkout", ".PaymentsHeroAnimation");
  await sleep(1500);
}

// Online payments Link card: scroll into view and watch the typing.
await page.evaluate(() => document.querySelector(".PaymentsOnlinePaymentsLinkAnimation")?.scrollIntoView({ block: "center" }));
for (let i = 0; i < 6; i++) {
  await sleep(1000);
  const s = await page.evaluate(() => {
    const el = document.querySelector(".PaymentsOnlinePaymentsLinkAnimation");
    return {
      email: el?.querySelector("[data-js-target='PaymentsHeroAnimationLink.linkEmailText']")?.textContent,
      code: [...(el?.querySelectorAll("[data-js-target-list='PaymentsHeroAnimationLink.codeInputValueElements']") ?? [])].map((e) => e.textContent).join(""),
    };
  });
  console.log("link", i, JSON.stringify(s));
  if (i === 4) await snap("online-link-pg-code", ".PaymentsOnlinePaymentsLinkAnimation");
}

// Terminal: scroll so the graphic is fully visible, then further for the card progress.
const term = await page.evaluate(() => {
  const el = document.querySelector(".PaymentsTerminalAnimation");
  const r = el.getBoundingClientRect();
  return { top: r.top + scrollY, height: r.height };
});
await page.evaluate((y) => scrollTo(0, y), term.top - (+h - term.height) / 2);
await sleep(4500);
const cls = () => page.evaluate(() => document.querySelector(".PaymentsTerminalAnimation").className);
console.log("terminal after entry:", await cls());
for (const dy of [0, 100, 200, 260]) {
  await page.evaluate((y) => scrollTo(0, y), term.top - (+h - term.height) / 2 + dy);
  await sleep(700);
  const tr = await page.evaluate(() => document.querySelector("[data-js-target='PaymentsTerminalAnimation.card']").style.transform);
  console.log("terminal dy", dy, tr, await cls());
}
await sleep(3000);
await snap("terminal-pg-approved", ".PaymentsTerminalAnimation");

// Global payment carousel
await page.evaluate(() => document.querySelector(".PaymentMethodHubGlobalPaymentCarousel")?.scrollIntoView({ block: "center" }));
for (let i = 0; i < 3; i++) {
  await sleep(3100);
  console.log("global", await page.evaluate(() => document.querySelector(".PaymentMethodHubGlobalPaymentCarousel__track")?.style.getPropertyValue("--currentIndex")));
}

// Case study carousel
await page.evaluate(() => document.querySelector(".CustomersCaseStudyCarousel")?.scrollIntoView({ block: "center" }));
const cs = () =>
  page.evaluate(() => {
    const el = document.querySelector(".CustomersCaseStudyCarousel");
    const track = el.querySelector("[data-js-target='CustomersCaseStudyCarousel.track']");
    return {
      left: Math.round(track.scrollLeft),
      overlay: el.querySelector("[data-js-target='CustomersCaseStudyCarousel.overlay']").style.backgroundColor,
      active: [...el.querySelectorAll(".CustomersCaseStudyCarouselNavItem__indicator--active")].length,
      clip: el.querySelector(".CustomersCaseStudyCarouselNavGroup__coloredLine")?.style.clipPath,
    };
  });
console.log("case", JSON.stringify(await cs()));
await sleep(4000);
await snap("casestudy-pg-countdown", ".CustomersCaseStudyCarousel");
await sleep(4500);
console.log("case after autoplay", JSON.stringify(await cs()));
await page.evaluate(() => document.querySelectorAll(".CustomersCaseStudyCarouselNavItem__button")[3]?.click());
await sleep(1500);
console.log("case after click #4", JSON.stringify(await cs()));
await snap("casestudy-pg-clicked", ".CustomersCaseStudyCarousel");

const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
console.log("overflow", JSON.stringify(ov));
console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
