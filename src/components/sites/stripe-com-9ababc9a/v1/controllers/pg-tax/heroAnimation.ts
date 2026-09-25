// Tax hero checkout animation. Ports of:
//   TaxHeroAnimation ................... v1-HeroAnimation-ZV52N72E.js
//   TaxHeroAnimationScene .............. v1-chunk-A3FRQ2D2.js
//   TaxHeroAnimationPlusIcon ........... v1-chunk-EPBOTBUD.js
//   TaxHeroAnimationCountryIndiciator .. v1-chunk-MJC5QQ6Q.js
// Time-driven loop: scene 1 computes its tax, holds 3 s, then each scene fades out while the next fades
// in with the flag track sliding to its country; loops forever (US → ES → US → NL → US …).
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, prefersReducedMotion, target, targetList } from "../lib";
import { Clock, gateClock } from "./motion";

const EASE_ARM = "cubic-bezier(.25, .46, .45, .94)";
const EASE_FADE_IN = "cubic-bezier(.895, .03, .685, .22)";
const MOBILE_BREAKPOINT = 1300; // Scene.isMobile: window.innerWidth < 1300
const HOLD_MS = 3000;

// ---- PlusIcon ------------------------------------------------------------------------------------
interface PlusIconApi {
  readonly type: string | undefined;
  animateIn(clock: Clock, delay?: number): Promise<void>;
  animateOut(clock: Clock, duration?: number): Promise<void>;
}

export const TaxHeroAnimationPlusIcon: Controller = (el) => {
  const N = "TaxHeroAnimationPlusIcon";
  const fill = target(el, N, "fill");
  const plus = target(el, N, "plusIcon");
  const check = target(el, N, "checkIcon");
  const api: PlusIconApi = {
    get type() {
      return el.dataset.jsType;
    },
    animateIn: (clock, delay = 0) =>
      Promise.all([
        clock.animate(fill, [{ transform: "scale(0.85)", opacity: 0 }, { opacity: 1, offset: 0.01 }, { transform: "scale(1.1)", offset: 0.9 }, { transform: "scale(1)" }], { duration: 500, delay }),
        clock.animate(plus, [{ transform: "rotate(0deg)", opacity: 1 }, { transform: "rotate(-30deg)", opacity: 0 }], { delay: delay + 120, duration: 300 }),
        clock.animate(check, [{ transform: "rotate(30deg)", opacity: 0 }, { transform: "rotate(0deg)", opacity: 1 }], { delay: delay + 120, duration: 300 }),
      ]).then(() => undefined),
    animateOut: (clock, duration = 300) =>
      Promise.all([
        clock.animate(fill, [{ transform: "scale(1)" }, { transform: "scale(0)" }], { duration }),
        clock.animate(plus, [{ transform: "rotate(-30deg)", opacity: 0 }, { transform: "rotate(0deg)", opacity: 1 }], { duration }),
        clock.animate(check, [{ transform: "rotate(0deg)", opacity: 1 }, { transform: "rotate(30deg)", opacity: 0 }], { duration }),
      ]).then(() => undefined),
  };
  exposeApi(el, N, api);
};

// ---- CountryIndicator ----------------------------------------------------------------------------
interface CountryIndicatorApi {
  animateToFlag(clock: Clock, country: string | undefined): Promise<void>;
}

export const TaxHeroAnimationCountryIndiciator: Controller = (el) => {
  const N = "TaxHeroAnimationCountryIndiciator";
  const track = target(el, N, "track");
  const flags = targetList(el, N, "flags");
  let current = 0;
  const api: CountryIndicatorApi = {
    animateToFlag(clock, country) {
      const next = flags.findIndex((f) => f.dataset.jsCountry === country);
      if (next === -1) return Promise.resolve();
      const from = current;
      current = next;
      return clock.animate(track, [{ transform: `translateX(${-100 * from}%)` }, { transform: `translateX(${-100 * next}%)` }], { duration: 800 });
    },
  };
  exposeApi(el, N, api);
};

// ---- Scene ---------------------------------------------------------------------------------------
interface SceneApi {
  readonly country: string | undefined;
  animateIn(clock: Clock): Promise<void>;
  animateOut(clock: Clock): Promise<void>;
  animateTax(clock: Clock): Promise<void>;
}

export const TaxHeroAnimationScene: Controller = (el) => {
  const N = "TaxHeroAnimationScene";
  const fadeIn = targetList(el, N, "fadeInElements");
  const taxNode = target(el, N, "taxNode");
  const arm = target(el, N, "taxNodeArm");
  const points = targetList(el, N, "taxNodePoints");
  const price = target(el, N, "taxNodePrice");
  const obfuscator = target(el, N, "taxObfuscator");
  const checkoutTax = target(el, N, "checkoutTax");
  const mobileOverlay = target(el, N, "mobileTaxOverlay");
  const totalDue = target(el, N, "totalDueToday");
  const pre = el.dataset.jsTotalDuePreTax ?? "";
  const post = el.dataset.jsTotalDuePostTax ?? "";

  const checkmarks = () =>
    childControllers(el, "TaxHeroAnimationPlusIcon")
      .map((c) => getApi<PlusIconApi>(c, "TaxHeroAnimationPlusIcon"))
      .filter((a): a is PlusIconApi => !!a);

  // Hidden scenes start with their content transparent so animateIn can fade it up.
  const wasHidden = el.hasAttribute("hidden");
  const initialTotal = totalDue?.innerText;
  if (wasHidden) fadeIn.forEach((f) => (f.style.opacity = "0"));

  const taxNodeIn = (clock: Clock) =>
    Promise.all([
      clock.animate(taxNode, [{ opacity: 0, transform: "scale(0.8)" }, { opacity: 1, transform: "scale(1.03)", offset: 0.9 }, { opacity: 1, transform: "scale(1.0)" }], { duration: 800, fill: "both" }),
      clock.animate(arm, [{ transform: "scaleX(0.0)" }, { transform: "scaleX(1.0)" }], { duration: 1000, delay: 1200, easing: EASE_ARM, fill: "both" }),
      clock.animate([...points].reverse(), [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }], { easing: EASE_ARM, duration: 500, delay: (i) => (1 + i) * 700, fill: "both" }),
      clock.animate(mobileOverlay, [{ opacity: 0, transform: "translate(-50%, 100%)" }, { opacity: 1, transform: "translate(-50%, -10px)" }], { duration: 500, delay: 400, fill: "both" }),
    ]);

  const animateCheckmarks = (clock: Clock) => {
    const all = checkmarks();
    const mobile = all.filter((c) => c.type === "Mobile");
    const desktop = all.filter((c) => c.type === "Desktop");
    return Promise.all([...mobile.map((c, i) => c.animateIn(clock, i * 800)), ...desktop.map((c, i) => c.animateIn(clock, i * 800))]);
  };

  const animatePrice = async (clock: Clock) => {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    const dx = -1 * ((arm?.offsetWidth ?? 0) - 16 - (price?.offsetWidth ?? 0));
    await clock.animate(price, [{ transform: "scale(0.8)", opacity: 0 }, { opacity: 1, transform: "scale(1.03)", offset: 0.9 }, { opacity: 1, transform: "scale(1.0)" }], { duration: mobile ? 0 : 800, fill: "both" });
    await clock.animate(price, [{ transform: "scale(1.0)" }, { transform: `scale(1.0) translateX(${dx}px)` }], { duration: mobile ? 0 : 1000, fill: "both" });
    await Promise.all([
      clock.animate(price, [{ transform: `translateX(${dx}px) scale(1.0)`, opacity: 1 }, { transform: `translateX(${dx}px) scale(0.8)`, opacity: 0 }], { duration: mobile ? 0 : 800, fill: "both" }),
      clock.animate(obfuscator, [{ opacity: 1 }, { opacity: 0 }], { duration: 800 }),
      clock.animate(checkoutTax, [{ transform: "scale(0.8)", opacity: 0 }, { transform: "scale(1.04)", opacity: 1, offset: 0.9 }, { transform: "scale(1)", opacity: 1 }], { duration: 800 }),
    ]);
    if (totalDue) totalDue.innerText = post;
  };

  const animateTax = async (clock: Clock) => {
    await taxNodeIn(clock);
    await animateCheckmarks(clock);
    await animatePrice(clock);
  };

  const api: SceneApi = {
    get country() {
      return el.dataset.jsCountry;
    },
    async animateIn(clock) {
      el.removeAttribute("hidden");
      await clock.animate(fadeIn, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: (i) => i * 50, easing: EASE_FADE_IN });
      await animateTax(clock);
    },
    async animateOut(clock) {
      await clock.animate([...fadeIn, mobileOverlay], [{ opacity: 1 }, { opacity: 0 }], { delay: (i) => i * 50, duration: 500, fill: "both" });
      await clock.animate(taxNode, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
      for (const c of checkmarks()) await c.animateOut(clock, 0);
      await clock.animate(arm, [{ transform: "scaleX(1.0)" }, { transform: "scaleX(0.0)" }], { duration: 0 });
      await clock.animate(points, [{ opacity: 1 }, { opacity: 0 }], { duration: 0 });
      await clock.animate(obfuscator, [{ opacity: 0 }, { opacity: 1 }], { duration: 0 });
      if (totalDue) totalDue.innerText = pre;
    },
    animateTax,
  };
  exposeApi(el, N, api);
  return () => {
    el.toggleAttribute("hidden", wasHidden);
    fadeIn.forEach((f) => f.style.removeProperty("opacity"));
    if (totalDue && initialTotal !== undefined) totalDue.innerText = initialTotal;
  };
};

// ---- TaxHeroAnimation ----------------------------------------------------------------------------
export const TaxHeroAnimation: Controller = (el) => {
  const scenes = childControllers(el, "TaxHeroAnimationScene")
    .map((s) => getApi<SceneApi>(s, "TaxHeroAnimationScene"))
    .filter((a): a is SceneApi => !!a);
  const indicatorEl = childControllers(el, "TaxHeroAnimationCountryIndiciator")[0];
  const indicator = indicatorEl ? getApi<CountryIndicatorApi>(indicatorEl, "TaxHeroAnimationCountryIndiciator") : undefined;
  if (!scenes.length) return;

  const reduced = prefersReducedMotion();
  // Reduced motion: the first scene jumps to its computed-tax state and stays (the reference has no
  // reduced-motion branch for this graphic).
  const clock = new Clock({ instant: reduced });

  const run = async () => {
    // Intro: scene 1 computes its tax, then holds.
    await scenes[0].animateTax(clock);
    if (reduced) return;
    await clock.wait(HOLD_MS);
    let index = 0;
    for (;;) {
      const next = (index + 1) % scenes.length;
      await scenes[index].animateOut(clock);
      await Promise.all([indicator?.animateToFlag(clock, scenes[next].country), scenes[next].animateIn(clock)]);
      await clock.wait(HOLD_MS);
      index = next;
    }
  };

  const ungate = reduced ? () => undefined : gateClock(clock, el);
  void run();
  return () => {
    ungate();
    clock.dispose(true);
  };
};
