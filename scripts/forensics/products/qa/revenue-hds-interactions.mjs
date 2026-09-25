// Interaction checks for the Revenue HDS pages (localhost only).
// node scripts/forensics/products/qa/revenue-hds-interactions.mjs <base> <outDir>
// Exercises sub-nav (sticky + dropdown), logo marquee, carousels (drag + nav), stepper autoplay,
// accordions, the mobile billing dialog, bento hovers and scroll entrances; prints facts as JSON and
// saves evidence frames to <outDir>/<slug>/<viewport>-<section>-<state>.png.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [base = "http://localhost:3105", outDir = "docs/design-references/products"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars"] });
const facts = {};
const errors = [];

async function open(path, w, h) {
  const mobile = w < 640;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${path}@${w} PAGEERROR ${e.message.slice(0, 200)}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`${path}@${w} ${m.text().slice(0, 200)}`));
  await p.goto(base + path, { waitUntil: "load", timeout: 180000 });
  await p.waitForTimeout(800);
  return { p, ctx };
}
const shot = async (p, slug, name, sel) => {
  console.error("shot", slug, name);
  mkdirSync(`${outDir}/${slug}`, { recursive: true });
  const path = `${outDir}/${slug}/${name}.png`;
  if (sel) await p.locator(sel).first().screenshot({ path });
  else await p.screenshot({ path });
};
const center = (p, sel) => p.locator(sel).first().evaluate((n) => n.scrollIntoView({ block: "center" }));

// ---------- /billing desktop ----------
{
  const { p, ctx } = await open("/billing", 1440, 900);
  const f = (facts.billing1440 = {});
  // Dropdown hover.
  await p.hover(".hero-static-subnav .hero-subnav-dropdown-item__trigger");
  await p.waitForTimeout(200);
  f.dropdownHoverOpen = await p.evaluate(() => !document.querySelector(".hero-static-subnav .hero-subnav-dropdown-item__list").hidden);
  await shot(p, "billing", "1440x900-subnav-dropdown-open", ".billing-hero .product-hero-subnav");
  await p.keyboard.press("Escape");
  await p.mouse.move(10, 600);
  await p.waitForTimeout(200);
  f.dropdownClosed = await p.evaluate(() => document.querySelector(".hero-static-subnav .hero-subnav-dropdown-item__list").hidden);
  // Sticky sub-nav after the manifesto.
  await p.evaluate(() => {
    const m = document.querySelector(".manifesto-container").closest("section");
    scrollTo(0, m.getBoundingClientRect().top + scrollY + 50);
  });
  await p.waitForTimeout(700);
  f.stickyVisible = await p.evaluate(() => document.querySelector(".hero-sticky-subnav")?.classList.contains("hero-sticky-subnav--visible"));
  await shot(p, "billing", "1440x900-subnav-sticky-visible");
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(500);
  f.stickyHiddenAtTop = await p.evaluate(() => !document.querySelector(".hero-sticky-subnav").classList.contains("hero-sticky-subnav--visible"));
  // Bento hover (usage-based billing).
  await center(p, ".billing-bento .usage-based-billing-bento-graphic");
  await p.waitForTimeout(300);
  const card = ".billing-bento .feature-bento-card:has(.usage-based-billing-bento-graphic)";
  f.bentoBefore = await p.textContent(".usage-based-billing-bento-graphic__value");
  await p.hover(card);
  await p.waitForTimeout(1300);
  f.bentoAfter = await p.textContent(".usage-based-billing-bento-graphic__value");
  f.bentoBarTransform = await p.evaluate(() => document.querySelector(".usage-based-billing-bento-graphic__chart-bar--animated:last-of-type").style.transform);
  await shot(p, "billing", "1440x900-bento-usage-hover", card);
  await p.mouse.move(5, 5);
  await p.waitForTimeout(900);
  f.bentoBack = await p.textContent(".usage-based-billing-bento-graphic__value");
  // Gradient border mouse vars.
  const box = await p.locator(card).boundingBox();
  await p.mouse.move(box.x + box.width - 10, box.y + 10);
  await p.waitForTimeout(100);
  await p.mouse.move(box.x + box.width - 20, box.y + 12);
  f.gradientMouse = await p.evaluate((s) => document.querySelector(s + " .gradient-border-card__gradient").style.getPropertyValue("--gradient-border-card-mouse-x"), card);
  // Accordion: open second item, first closes (exclusive).
  await center(p, ".billing-accordion");
  await p.click(".billing-accordion-details:nth-of-type(2) > summary");
  await p.waitForTimeout(700);
  f.accordion = await p.evaluate(() => [...document.querySelectorAll(".billing-accordion-details")].map((d) => d.open));
  await shot(p, "billing", "1440x900-accordion-second-open", ".billing-accordion");
  // Revenue recovery visible class.
  await center(p, ".billing-accordion-details:nth-of-type(2) .revenue-recovery-graphic");
  await p.waitForTimeout(1500);
  f.recoveryVisible = await p.evaluate(() => document.querySelector(".billing-accordion-details:nth-of-type(2) .revenue-recovery-graphic")?.className);
  // Product eco carousel: next button drags scroll.
  await center(p, ".product-eco-carousel__scroller");
  const before = await p.evaluate(() => document.querySelector(".product-eco-carousel__scroller").scrollLeft);
  await p.click(".product-eco-carousel__nav button:last-child");
  await p.waitForTimeout(1200);
  f.ecoScroll = [before, await p.evaluate(() => document.querySelector(".product-eco-carousel__scroller").scrollLeft)];
  f.ecoPrevEnabled = await p.evaluate(() => !document.querySelector(".product-eco-carousel__nav button").disabled);
  // Drag.
  const sb = await p.locator(".product-eco-carousel__scroller").boundingBox();
  await p.mouse.move(sb.x + sb.width * 0.7, sb.y + 100);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(sb.x + sb.width * 0.7 - i * 40, sb.y + 100);
  await p.mouse.up();
  await p.waitForTimeout(1500);
  f.ecoAfterDrag = await p.evaluate(() => document.querySelector(".product-eco-carousel__scroller").scrollLeft);
  await shot(p, "billing", "1440x900-product-eco-dragged", ".product-eco-carousel");
  // Animated tag icon.
  await center(p, ".footer-cta-section .charm-icon");
  await p.waitForTimeout(600);
  f.tagAnimations = await p.evaluate(() => document.querySelector(".footer-cta-section .charm-icon svg > g").getAnimations().length);
  // Chippy offset var.
  f.chippyVar = await p.evaluate(() => document.querySelector(".hds-chippy")?.style.getPropertyValue("--hds-chippy-link-offset-y"));
  f.domGraphicsReady = await p.evaluate(() => [...document.querySelectorAll("main .dom-graphic")].filter((g) => g.dataset.status !== "ready").length);
  console.log(JSON.stringify(f));
  await ctx.close();
}

// ---------- /billing mobile dialog + mobile hero ----------
{
  const { p, ctx } = await open("/billing", 390, 844);
  const f = (facts.billing390 = {});
  await p.waitForTimeout(1500);
  await shot(p, "billing", "390x844-hero-mobile-animation", ".billing-mobile-hero-animation");
  f.mobileHeroPlansTransform = await p.evaluate(() => document.querySelector(".billing-mobile-hero-animation .m-plans").style.transform);
  await center(p, ".billing-accordion-mobile-trigger");
  await p.click(".billing-accordion-mobile-trigger");
  await p.waitForTimeout(1200);
  f.dialog = await p.evaluate(() => {
    const d = document.querySelector(".billing-accordion-dialog");
    return d && { status: d.dataset.status, title: d.querySelector("h3")?.textContent, focusInside: d.contains(document.activeElement) };
  });
  await shot(p, "billing", "390x844-accordion-dialog-open");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  f.dialogClosed = await p.evaluate(() => !document.querySelector(".billing-accordion-dialog-overlay"));
  // Mobile static sub-nav toggle.
  await p.evaluate(() => scrollTo(0, 0));
  await p.click(".hero-mobile-static-subnav .hero-subnav__mobile-toggle-button");
  await p.waitForTimeout(500);
  f.mobileNavOpen = await p.evaluate(() => document.querySelector(".hero-mobile-static-subnav").classList.contains("hero-mobile-static-subnav--open"));
  await shot(p, "billing", "390x844-subnav-mobile-open", ".billing-hero .product-hero-subnav");
  console.log(JSON.stringify(f));
  await ctx.close();
}

// ---------- /billing/usage-based-billing desktop ----------
{
  const { p, ctx } = await open("/billing/usage-based-billing", 1440, 900);
  const f = (facts.ubb1440 = {});
  const t1 = await p.evaluate(() => document.querySelector(".ubb-logo-bar .logo-carousel__marquee").style.transform);
  await p.waitForTimeout(1000);
  const t2 = await p.evaluate(() => document.querySelector(".ubb-logo-bar .logo-carousel__marquee").style.transform);
  f.marquee = [t1, t2];
  f.scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
  f.video = await p.evaluate(() => {
    const v = document.querySelector(".ubb-hero__graphic-background-video");
    return v && { ready: v.classList.contains("ubb-hero__graphic-background-video--ready"), paused: v.paused };
  });
  f.heroInvoiceOpacity = await p.evaluate(() => getComputedStyle(document.querySelector(".ubb-hero__graphic-invoice")).opacity);
  await shot(p, "metronome", "1440x900-hero-after-entrance", ".ubb-hero__graphic-container");
  // Stepper autoplay.
  await center(p, ".ubb-protect__stepper");
  await p.waitForTimeout(3000);
  f.stepperProgress = await p.evaluate(() => document.querySelector(".stepper-item .stepper-progress")?.classList.contains("stepper-progress--active"));
  await shot(p, "metronome", "1440x900-stepper-step1-progress", ".ubb-protect__stepper");
  await p.mouse.move(5, 5);
  await p.waitForTimeout(3600);
  f.stepperActiveAfter6s = await p.evaluate(() => [...document.querySelectorAll(".stepper-item")].map((d) => d.open));
  await p.waitForTimeout(700);
  await shot(p, "metronome", "1440x900-stepper-step2", ".ubb-protect__stepper");
  f.stepperGraphicClasses = await p.evaluate(() => [...document.querySelectorAll(".stepper__graphics .dom-graphic")].map((g) => g.className.replace(/dom-graphic[^ ]* ?/g, "")));
  // Click third step: autoplay stops.
  await p.click(".stepper-item:nth-of-type(3) > summary");
  await p.waitForTimeout(7000);
  f.stepperAfterClick = await p.evaluate(() => [...document.querySelectorAll(".stepper-item")].map((d) => d.open));
  // Customer stories drag carousel (5 cards).
  await center(p, ".customer-stories-carousel");
  const cs = ".customer-stories-carousel .carousel__scroller";
  f.storiesDragAttr = await p.evaluate((s) => document.querySelector(s).hasAttribute("data-carousel-drag"), cs);
  const firstCard = await p.locator(`${cs} .carousel__inner`).first().boundingBox();
  await p.mouse.move(firstCard.x + 50, firstCard.y + 50);
  await p.waitForTimeout(400);
  f.hoverScale = await p.evaluate((s) => document.querySelector(`${s} .carousel__inner`).style.getPropertyValue("--carousel-item-hover-scale"), cs);
  await shot(p, "metronome", "1440x900-customer-stories-hover", ".customer-stories-carousel");
  console.log(JSON.stringify(f));
  await ctx.close();
}

// ---------- /billing/usage-based-billing mobile ----------
{
  const { p, ctx } = await open("/billing/usage-based-billing", 390, 844);
  const f = (facts.ubb390 = {});
  f.scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
  await center(p, ".ubb-launch-graphics");
  await p.evaluate(() => {
    const s = document.querySelector(".ubb-launch-graphics .carousel__scroller");
    s.scrollLeft = s.scrollWidth;
  });
  await p.waitForTimeout(600);
  f.pagination = await p.evaluate(() => [...document.querySelectorAll(".ubb-launch-graphics .carousel-pagination__segment")].map((s) => s.classList.contains("carousel-pagination__segment--active")));
  await shot(p, "metronome", "390x844-launch-graphics-slide2", ".ubb-launch-graphics");
  f.video = await p.evaluate(() => !!document.querySelector(".ubb-hero__graphic-background-video"));
  console.log(JSON.stringify(f));
  await ctx.close();
}

// ---------- /billing/subscriptions ----------
{
  const { p, ctx } = await open("/billing/subscriptions", 1280, 800);
  const f = (facts.subs1280 = {});
  await center(p, ".faq-section-accordion");
  await p.click(".faq-section-accordion details:nth-of-type(2) > summary");
  await p.waitForTimeout(500);
  f.faq = await p.evaluate(() => [...document.querySelectorAll(".faq-section-accordion details")].map((d) => d.open));
  await p.focus(".faq-section-accordion details:nth-of-type(1) > summary");
  await p.keyboard.press("ArrowDown");
  f.faqArrowFocus = await p.evaluate(() => [...document.querySelectorAll(".faq-section-accordion summary")].indexOf(document.activeElement));
  await shot(p, "subscriptions", "1280x800-faq-two-open", ".faq-section-accordion");
  f.logoCentered = await p.evaluate(() => document.querySelector(".logo-carousel__marquee-container").classList.contains("logo-carousel__marquee-container--centered"));
  await center(p, ".revenue-recovery-graphic--animated");
  await p.waitForTimeout(2500);
  f.recovery = await p.evaluate(() => document.querySelector(".revenue-recovery-graphic--animated")?.classList.contains("revenue-recovery-graphic--visible"));
  await shot(p, "subscriptions", "1280x800-revenue-recovery-visible", ".revenue-recovery-graphic--animated");
  console.log(JSON.stringify(f));
  await ctx.close();
}

console.log(JSON.stringify(facts, null, 1));
console.log("ERRORS:\n" + [...new Set(errors)].join("\n"));
await b.close();
