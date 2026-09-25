// Interaction QA for /managed-payments (everything except the globe): DomGraphic scaling, sticky
// subnav, mobile subnav toggle, logo marquee (auto-scroll, hover hold), KSP gradient cards, whimsy
// dividers, merchant-of-record sequence + replay, testimonial carousel, FAQ keyboard nav, phone clock.
// node scripts/forensics/products/qa/managed-payments-interactions.mjs [width=1440] [outPrefix]
import { chromium } from "playwright";

const [w = "1440", prefix = ""] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--hide-scrollbars"] });
const mobile = +w < 600;
const ctx = await b.newContext({ viewport: { width: +w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile });
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 200)));
p.on("console", (m) => m.type() === "error" && errs.push("ERROR " + m.text().slice(0, 200)));
await p.goto("http://localhost:3101/managed-payments", { waitUntil: "load", timeout: 180000 });
await p.waitForTimeout(1500);
const log = (k, v) => console.log(k.padEnd(22), typeof v === "string" ? v : JSON.stringify(v));

log("domGraphics", await p.evaluate(() => [...document.querySelectorAll(".dom-graphic")].map((g) => `${g.dataset.status}:${(+g.style.getPropertyValue("--graphic-scale")).toFixed(3)}:${g.style.getPropertyValue("--graphic-source-width")}`)));

// Logo marquee
const tx = () => p.evaluate(() => getComputedStyle(document.querySelector(".logo-carousel__marquee")).transform);
const m0 = await tx();
await p.waitForTimeout(1000);
log("marquee moves", `${m0} -> ${await tx()}`);
if (!mobile) {
  await p.hover(".logo-carousel");
  const h0 = await tx();
  await p.waitForTimeout(800);
  log("marquee hover hold", (await tx()) === h0 ? "held" : "MOVED");
  await p.mouse.move(5, 5);
}

// Sticky subnav
await p.evaluate(() => { document.querySelector(".managed-payments-manifesto").scrollIntoView(); scrollBy(0, 50); });
await p.waitForTimeout(700);
log("sticky after manifesto", await p.evaluate(() => document.querySelector(".hero-sticky-subnav")?.className));
if (prefix) await p.screenshot({ path: `${prefix}-sticky.png`, clip: { x: 0, y: 0, width: +w, height: 140 } });
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(500);
log("sticky at top", await p.evaluate(() => document.querySelector(".hero-sticky-subnav")?.className));
if (mobile) {
  await p.click(".hero-mobile-static-subnav .hero-subnav__mobile-toggle-button");
  await p.waitForTimeout(400);
  log("mobile subnav open", await p.evaluate(() => [document.querySelector(".hero-mobile-static-subnav").className, document.querySelector(".hero-mobile-static-subnav__content-container").hasAttribute("inert")]));
  if (prefix) await p.screenshot({ path: `${prefix}-subnav-open.png`, clip: { x: 0, y: 0, width: +w, height: 400 } });
  await p.click(".hero-mobile-static-subnav .hero-subnav__mobile-toggle-button");
}

// KSP gradient card pointer tracking (desktop only)
if (!mobile) {
  const card = await p.$(".ksp-card");
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  await p.mouse.move(box.x + box.width - 5, box.y + 5);
  await p.waitForTimeout(120);
  await p.mouse.move(box.x + box.width - 4, box.y + 6);
  await p.waitForTimeout(1100);
  log("ksp gradient", await p.evaluate(() => { const g = document.querySelector(".ksp-card .gradient-border-card__gradient"); return [g.style.getPropertyValue("--gradient-border-card-mouse-x"), g.style.getPropertyValue("--gradient-border-card-mouse-y")]; }));
  if (prefix) await card.screenshot({ path: `${prefix}-ksp-hover.png` });
  await p.mouse.move(5, 5);
}

// Dividers
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
log("dividers", await p.evaluate(() => [...document.querySelectorAll(".divider-wrapper")].map((d) => d.firstElementChild?.className + (d.querySelector("canvas") ? "+canvas" : ""))));

// Merchant of record sequence
const mor = await p.$(".merchant-of-record-graphic-switch--desktop");
if (await mor.isVisible()) {
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(300);
  await mor.scrollIntoViewIfNeeded();
  const s = () => p.evaluate(() => { const c = document.querySelector(".merchant-of-record-graphic__filter-chip--active"); return [c.className.replace(/merchant-of-record-graphic__filter-chip/g, "chip"), [...document.querySelectorAll(".merchant-of-record-graphic__row-collapse")].map((r) => r.style.maxHeight).join("/"), document.querySelector(".merchant-of-record-graphic-frame__replay-button").className.includes("visible")]; });
  await p.waitForTimeout(500);
  log("mor t=0.5s", await s());
  if (prefix) await mor.screenshot({ path: `${prefix}-mor-spotlight.png` });
  await p.waitForTimeout(3200);
  log("mor t=3.7s", await s());
  if (prefix) await mor.screenshot({ path: `${prefix}-mor-filtered.png` });
  await p.click(".merchant-of-record-graphic-frame__replay-button");
  await p.waitForTimeout(500);
  log("mor replay t=0.5s", await s());
  await p.waitForTimeout(4200);
  log("mor replay t=4.7s", await s());
}

// Testimonials
await p.evaluate(() => document.querySelector(".testimonial-carousel-container").scrollIntoView({ block: "center" }));
await p.click(".testimonial-carousel__navigation-button:nth-child(2)");
await p.waitForTimeout(1200);
log("testimonial active", await p.evaluate(() => [[...document.querySelectorAll(".testimonial-carousel__navigation-button")].map((b) => b.className.includes("--active")), document.querySelector(".testimonial-carousel__navigation-selection-bar").style.transform]));

// FAQ keyboard
await p.focus(".hds-accordion .hds-summary");
await p.keyboard.press("ArrowDown");
log("faq arrow focus", await p.evaluate(() => [...document.querySelectorAll(".hds-accordion .hds-summary")].indexOf(document.activeElement)));

log("phone clock", await p.evaluate(() => document.querySelector(".phone-header")?.firstElementChild?.textContent));
log("mor first date", await p.evaluate(() => document.querySelector(".merchant-of-record-graphic__cell--date.tabular-nums--tight")?.textContent));
log("errors", errs.join(" | ") || "none");
await b.close();
