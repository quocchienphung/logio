// Interaction/frame checks for the "core" controller group (localhost only).
// node scripts/forensics/products/qa/core-qa.mjs <scenario> <baseUrl> [width=1440] [height=900] [outDir]
// Scenarios: gradient, sticky, mobile, tooltip, dropdown, video, globe, globe-static, icons, keyboard, stripes, guides, overflow
// `gradient` and `globe` spoof a hardware WebGL renderer string: the reference (and this port) skips the
// hero canvas / animates the globe statically on SwiftShader, which headless Chromium uses.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [scenario, base = "http://localhost:3102", w = "1440", h = "900", outDir = "/tmp/core-qa"] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const W = +w;
const H = +h;
const mobile = W < 600;
const spoof = ["gradient", "globe", "keyboard"].includes(scenario);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
await ctx.route("**/*", (r) => (/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url()) ? r.continue() : r.abort()));
if (spoof) {
  await ctx.addInitScript(() => {
    for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const orig = C.prototype.getParameter;
      C.prototype.getParameter = function (p) {
        if (p === 0x9246) return "ANGLE (QA hardware spoof)";
        return orig.call(this, p);
      };
    }
  });
}
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(m.type().toUpperCase() + " " + m.text().slice(0, 300));
});
const log = (...a) => console.log(...a);
const shot = async (name, clip) => {
  const path = `${outDir}/${name}.png`;
  await page.screenshot({ path, clip, fullPage: false });
  log("shot", path);
};
const go = async (path) => {
  await page.goto(base + path, { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1500);
};
const scrollTo = async (y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(400);
};

switch (scenario) {
  case "gradient": {
    await go("/payments");
    await page.waitForFunction(() => document.querySelector(".Gradient__canvas")?.classList.contains("isLoaded"), null, { timeout: 20000 });
    const info = await page.evaluate(() => {
      const c = document.querySelector(".Gradient__canvas");
      return { cls: c.className, w: c.width, h: c.height, css: c.getBoundingClientRect().toJSON(), opacity: getComputedStyle(c).opacity };
    });
    log(JSON.stringify(info));
    const clip = { x: 0, y: 0, width: W, height: H };
    await page.waitForTimeout(2000);
    await shot(`${W}x${H}-hero-core-gradient-a`, clip);
    await page.waitForTimeout(3000);
    await shot(`${W}x${H}-hero-core-gradient-b`, clip);
    await page.waitForTimeout(3200);
    log("parent isLoaded:", await page.evaluate(() => document.querySelector(".HeroSection__gradient").classList.contains("isLoaded")));
    // scroll pauses rendering; scroll-end (200 ms) resumes
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await shot(`${W}x${H}-hero-core-gradient-c`, clip);
    break;
  }
  case "sticky": {
    await go("/payments");
    const nav = await page.evaluate(() => {
      const n = document.querySelector(".PaymentsStickyNav");
      return window.scrollY + n.getBoundingClientRect().top;
    });
    log("PaymentsStickyNav doc top", nav);
    for (const y of [nav - 200, nav + 50, nav + 1500, nav + 4000, nav + 7000]) {
      await scrollTo(y);
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => {
        const f = document.querySelector(".PaymentsStickyNav__fixedNav");
        return {
          y: Math.round(scrollY),
          flags: Object.keys(f.dataset).filter((k) => k.startsWith("fixed")),
          active: [...document.querySelectorAll(".PaymentsStickyNav__item")].findIndex((i) => i.classList.contains("PaymentsStickyNav__item--active")),
          clip: document.querySelector(".PaymentsStickyNav__scrollIndicator").style.clipPath,
          trackScroll: Math.round(document.querySelector(".PaymentsStickyNav__track").scrollLeft),
          navTop: Math.round(f.getBoundingClientRect().top),
          opacity: getComputedStyle(f).opacity,
        };
      });
      log(JSON.stringify(s));
      if (y === nav + 1500) await shot(`${W}x${H}-stickynav-core-fixed`, { x: 0, y: 0, width: W, height: 160 });
    }
    // pricing StickyNav
    const pg = await page.evaluate(() => {
      const s = document.querySelector("[data-js-controller=StickyNav]");
      return window.scrollY + s.getBoundingClientRect().top;
    });
    for (const y of [pg - 300, pg + 100, pg + 2000]) {
      await scrollTo(y);
      log(JSON.stringify(await page.evaluate(() => {
        const s = document.querySelector("[data-js-controller=StickyNav]");
        return { y: Math.round(scrollY), flags: Object.keys(s.dataset).filter((k) => k.startsWith("sticky")), top: Math.round(s.getBoundingClientRect().top), h: s.parentElement.style.getPropertyValue("--stickyNavHeight") };
      })));
    }
    if (W < 600) {
      await scrollTo(nav + 1500);
      await page.click(".PaymentsStickyNav__dropdownArrow");
      await page.waitForTimeout(400);
      log("expanded", await page.evaluate(() => [document.querySelector(".PaymentsStickyNav__track").className, document.querySelector(".PaymentsStickyNav__track").style.maxHeight]));
      await shot(`${W}x${H}-stickynav-core-expanded`, { x: 0, y: 0, width: W, height: 420 });
    }
    break;
  }
  case "mobile": {
    await go("/payments");
    const read = () => page.evaluate(() => ({ y: Math.round(scrollY), cls: document.querySelector(".MobileStickyNav").className, pad: document.body.style.paddingBottom, rect: Math.round(document.querySelector(".MobileStickyNav").getBoundingClientRect().top) }));
    log(JSON.stringify(await read()));
    await scrollTo(H + 50);
    await page.waitForTimeout(400);
    log(JSON.stringify(await read()));
    await shot(`${W}x${H}-mobilestickynav-core-sticky`, { x: 0, y: H - 140, width: W, height: 140 });
    await scrollTo(H - 50);
    await page.waitForTimeout(400);
    log(JSON.stringify(await read()));
    break;
  }
  case "tooltip": {
    await go(process.env.QA_PATH || "/payments");
    const btn = page.locator("[data-js-controller=PortalTooltipItem]").first();
    await btn.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.waitForTimeout(300);
    const box = await btn.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => {
      const t = document.querySelector("[role=tooltip]");
      if (!t) return null;
      const r = t.getBoundingClientRect();
      const b = document.querySelector("[aria-describedby]")?.getBoundingClientRect();
      return { parent: t.parentElement.className, cls: t.className, rect: r.toJSON(), btn: b?.toJSON(), opacity: getComputedStyle(t).opacity, transform: getComputedStyle(t).transform };
    });
    log(JSON.stringify(s));
    if (s) await shot(`${W}x${H}-tooltip-core-open`, { x: Math.max(0, Math.min(s.rect.x, s.btn.x) - 40), y: Math.max(0, Math.min(s.rect.y, s.btn.y) - 40), width: Math.min(W - Math.max(0, Math.min(s.rect.x, s.btn.x) - 40), 420), height: 260 });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(700);
    log("after leave", JSON.stringify(await page.evaluate(() => { const t = document.querySelector("[role=tooltip]"); return t && [t.style.display, t.style.opacity, document.querySelectorAll("[aria-describedby]").length]; })));
    break;
  }
  case "dropdown": {
    await go("/invoicing");
    const trig = page.locator(".ProductNavDropdownItem__trigger");
    const box = await trig.boundingBox();
    log("trigger", JSON.stringify(box));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);
    const st = () => page.evaluate(() => {
      const p = document.querySelector(".ProductNavDropdownItem__panel");
      return { hidden: p.hidden, cls: p.className, parent: p.parentElement.className, expanded: document.querySelector(".ProductNavDropdownItem__trigger").getAttribute("aria-expanded"), rect: p.getBoundingClientRect().toJSON(), left: p.style.left, top: p.style.top };
    });
    const s = await st();
    log(JSON.stringify(s));
    await shot(`${W}x${H}-productnav-core-dropdown-open`, { x: Math.max(0, s.rect.x - 60), y: Math.max(0, box.y - 30), width: Math.min(420, W - Math.max(0, s.rect.x - 60)), height: 220 });
    await page.mouse.move(5, 600);
    await page.waitForTimeout(500);
    log("after leave", JSON.stringify(await st()));
    // keyboard: focus trigger, Enter opens, Escape closes
    await trig.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    log("after Enter", JSON.stringify(await st()));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    log("after Escape", JSON.stringify(await st()), await page.evaluate(() => document.activeElement.className));
    break;
  }
  case "video": {
    await go("/terminal");
    const v = page.locator("[data-js-controller=Video]").first();
    await v.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => document.querySelector("[data-js-controller=Video]").className);
    await page.locator("[data-js-controller=Video] .Video__overlay").first().click({ force: true });
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => { const e = document.querySelector("[data-js-controller=Video]"); const vid = e.querySelector("video"); return { cls: e.className, paused: vid.paused, ready: vid.readyState, err: vid.error && vid.error.code, api: Object.keys(e.__v1CoreApi || {}) }; });
    log(JSON.stringify({ before, after }));
    break;
  }
  case "globe":
  case "globe-static": {
    await go(process.env.QA_PATH || "/payments");
    const g = page.locator("[data-js-controller=BackgroundGlobe]").first();
    await g.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 150));
    await page.waitForTimeout(6000);
    const s = await page.evaluate(() => {
      const f = document.querySelector("[data-js-controller=BackgroundGlobe]");
      const c = f.querySelector("canvas");
      return { canvas: c ? [c.width, c.height, c.style.width, c.style.height] : null, rect: f.getBoundingClientRect().toJSON() };
    });
    log(JSON.stringify(s));
    const r = s.rect;
    const card = await page.evaluate(() => document.querySelector("[data-js-controller=BackgroundGlobe]").closest(".AccentedCard, .PaymentsAuthLifecycleManagementGraphic, section")?.getBoundingClientRect().toJSON());
    const cr = card || r;
    const clip = { x: Math.max(0, cr.x), y: Math.max(0, cr.y), width: Math.min(W - Math.max(0, cr.x), cr.width), height: Math.min(H - Math.max(0, cr.y), cr.height) };
    await shot(`${W}x${H}-globe-core-${scenario === "globe" ? "a" : "static"}`, clip);
    if (scenario === "globe") {
      await page.waitForTimeout(2500);
      await shot(`${W}x${H}-globe-core-b`, clip);
    }
    break;
  }
  case "icons": {
    await go(process.env.QA_PATH || "/payments");
    const names = ["FastForwardIcon", "DocumentWithArrowsIcon", "ShieldWithCheckmarkIcon", "NodesIcon", "DocumentWithCheckmarkIcon", "BlocksIcon", "GearsIcon", "HealthIcon", "PricingIcon", "TerminalIcon"];
    const found = await page.evaluate((ns) => ns.map((n) => { const e = document.querySelector(`[data-js-controller=${n}]`); return [n, !!e, e ? Object.keys(e.__v1CoreApi || {}) : null]; }), names);
    log(JSON.stringify(found));
    const name = process.env.QA_ICON || found.find((f) => f[1])?.[0];
    const el = page.locator(`[data-js-controller=${name}]`).first();
    await el.scrollIntoViewIfNeeded();
    const svgBox = await page.evaluate((n) => document.querySelector(`[data-js-controller=${n}]`).closest(".AnimatedIcon").getBoundingClientRect().toJSON(), name);
    const clip = { x: Math.max(0, svgBox.x - 30), y: Math.max(0, svgBox.y - 40), width: 130, height: 120 };
    await shot(`${W}x${H}-icon-core-${name}-0`, clip);
    const t0 = Date.now();
    const donePromise = page.evaluate((n) => new Promise((res) => {
      const e = document.querySelector(`[data-js-controller=${n}]`);
      let events = 0;
      e.addEventListener("AnimationStep:done", () => events++);
      e.__v1CoreApi[n].play().then(() => res({ events, anims: document.getAnimations().length }));
    }), name);
    await page.waitForTimeout(350);
    await shot(`${W}x${H}-icon-core-${name}-mid`, clip);
    const res = await donePromise;
    log("play resolved after", Date.now() - t0, "ms", JSON.stringify(res));
    await shot(`${W}x${H}-icon-core-${name}-end`, clip);
    // replay needs restart (reference semantics)
    const second = await page.evaluate((n) => { const api = document.querySelector(`[data-js-controller=${n}]`).__v1CoreApi[n]; api.restart(); const t = performance.now(); return api.play().then(() => Math.round(performance.now() - t)); }, name);
    log("second run ms", second);
    break;
  }
  case "keyboard": {
    await go("/payments");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    log("after Tab", await page.evaluate(() => document.querySelector(".MktBody").classList.contains("keyboard-navigation")));
    await page.mouse.down();
    await page.mouse.up();
    log("after mousedown", await page.evaluate(() => document.querySelector(".MktBody").classList.contains("keyboard-navigation")));
    log("escape event", await page.evaluate(() => new Promise((res) => { document.body.addEventListener("escape:keydown", () => res(true), { once: true }); document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); setTimeout(() => res(false), 200); })));
    break;
  }
  case "stripes": {
    await go(process.env.QA_PATH || "/payments");
    const y0 = await page.evaluate(() => { const s = document.querySelector(".StripeSet--layoutIntersecting"); return scrollY + s.getBoundingClientRect().top; });
    for (const dy of [-700, -400, -100, 200]) {
      await scrollTo(y0 + dy);
      log(JSON.stringify(await page.evaluate(() => { const s = document.querySelector(".StripeSet--layoutIntersecting"); return { top: Math.round(s.getBoundingClientRect().top), stripes: [...s.querySelectorAll("[data-js-target-list='StripeSet.stripes']")].map((e) => e.style.transform), inter: s.querySelector("[data-js-target='StripeSet.intersection']")?.style.transform }; })));
    }
    break;
  }
  case "guides": {
    await go(process.env.QA_PATH || "/tax");
    const card = page.locator("[data-js-controller=GuidesCard]").first();
    const before = await page.evaluate(() => [...document.querySelectorAll("[data-js-controller=GuidesCard] circle, [data-js-controller=GuidesCard] path")].slice(1, 4).map((e) => e.style.strokeDashoffset));
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await card.boundingBox();
    await shot(`${W}x${H}-guidescard-core-start`, { x: box.x, y: box.y, width: box.width, height: box.height });
    await page.waitForTimeout(1500);
    await shot(`${W}x${H}-guidescard-core-mid`, { x: box.x, y: box.y, width: box.width, height: box.height });
    await page.waitForTimeout(3500);
    const after = await page.evaluate(() => [...document.querySelectorAll("[data-js-controller=GuidesCard] circle, [data-js-controller=GuidesCard] path")].slice(1, 4).map((e) => [e.style.strokeDashoffset, e.style.transition]));
    await shot(`${W}x${H}-guidescard-core-end`, { x: box.x, y: box.y, width: box.width, height: box.height });
    log(JSON.stringify({ before, after }));
    break;
  }
  case "overflow": {
    await go(process.env.QA_PATH || "/payments");
    log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("[data-js-controller=ProductNav]")].map((n) => { const t = n.querySelector(".HorizontalOverflowContainer__track"); const a = n.querySelector("[data-js-active]"); return { scrollLeft: t.scrollLeft, sw: t.scrollWidth, cw: t.clientWidth, active: a?.textContent.trim(), activeLeft: a?.offsetLeft, api: Object.keys(n.querySelector("[data-js-controller=HorizontalOverflowContainer]").__v1CoreApi || {}) }; }))));
    break;
  }
  default:
    log("unknown scenario");
}
const info = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
log("overflow:", info.scrollWidth > info.width ? `YES ${info.scrollWidth}>${info.width}` : "no");
if (errors.length) log("ERRORS:\n" + [...new Set(errors)].join("\n"));
await browser.close();
