// /payments/checkout card graphics. Each card is a "CheckoutSubanimation" (reference base class,
// v1-chunk-S3QDRR3A) driven either by CheckoutStickyAnimation (desktop: enter/leave/skip as the page
// scrolls through the sections) or by CheckoutStandaloneAnimation (per-section copy: intersect/separate).
//   CheckoutHeroCard     ← v1-chunk-23UR7HOB.js
//   CheckoutCardInfoCard ← v1-chunk-D3DAGFFL.js
//   CheckoutAddressCard  ← v1-chunk-GXK4CC35.js
//   CheckoutMobileCard   ← v1-chunk-KKFFVFGG.js
//   CheckoutGlobalCard   ← v1-chunk-TB6ADM53.js
//   CheckoutBrandCard    ← v1-chunk-2V6DHF3D.js
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, listen, target, targetList } from "../lib";
import { Delay, Exec, Group, Sequence, Waapi, isStep, type Step } from "../pg-payments/motion";
import { visibleInterval } from "../pg-payments/util";
import type { ApplePaySheetApi } from "./faceId";

export type Direction = "forwards" | "backwards";
export interface SubanimationApi {
  intersect(): void;
  separate(): void;
  enter(direction: Direction): void;
  /** Resolves when the (named) leave animation finished, for the directions that have one. */
  leave(direction: Direction): Promise<void> | void;
  skip(): void;
}
export const CARD_CONTROLLERS = [
  "CheckoutHeroCard",
  "CheckoutCardInfoCard",
  "CheckoutAddressCard",
  "CheckoutMobileCard",
  "CheckoutGlobalCard",
  "CheckoutBrandCard",
] as const;
export const SUBANIMATION = "CheckoutSubanimation";

const DURATION = 600;
const EASE = "cubic-bezier(0.25,0.1,0.25,1)";

const expose = (el: HTMLElement, name: string, api: SubanimationApi) => {
  exposeApi(el, name, api);
  exposeApi(el, SUBANIMATION, api);
};
const fade = (el: Element | null, from: number, to: number, duration = 150) =>
  new Waapi({ el, keyframes: [{ opacity: from }, { opacity: to }], duration, easing: EASE });
const set = (el: Element | null | undefined, frame: Keyframe) => new Waapi({ el, keyframes: [frame], duration: 0 });
/** finish() the steps that are mid-flight (reference finishActiveAnimations). */
const finishActive = (steps: Step[]) => steps.forEach((s) => s.isPlaying && !s.isFinished && s.finish());
const replay = (s: Step) => {
  s.cancel();
  return s.play();
};

// Forms-group APIs (CheckoutCardField / ShippingField), consumed defensively: the card still animates if
// those ports are absent.
interface CardFieldApi {
  reset(): void;
  playAnimation(): unknown;
}
interface ShippingFieldApi {
  playAnimation(): unknown;
  resetAnimation(): unknown;
}
const cardField = (el: HTMLElement) => {
  const f = childControllers(el, "CheckoutCardField")[0];
  return f ? getApi<CardFieldApi>(f, "CheckoutCardField") : undefined;
};
const playCardField = (el: HTMLElement) => {
  const s = cardField(el)?.playAnimation();
  if (isStep(s) && !s.isPlaying && !s.isFinished) s.play();
};

// ---- CheckoutHeroCard ----------------------------------------------------------------------------------
export const CheckoutHeroCard: Controller = (el) => {
  const N = "CheckoutHeroCard";
  const t = (n: string) => target(el, N, n);
  const shop = t("shop");
  const shopCart = t("shopCart");
  const shopCartButton = t("shopCartButton");
  const content = t("content");
  const browserBar = t("browserBar");
  const fieldList = t("fieldList");
  const standalone = !!el.closest("[data-js-standalone]");

  const windowScaling = (dir: Direction, instant = false) => {
    const frames: Keyframe[] = [
      { transform: "translate(0, var(--heroCardOffsetY)) scale(1)", opacity: 1 },
      { transform: "translate(0, 0) scale(calc(1 / var(--scaleGraphicScale, 1)))", opacity: 1 },
    ];
    return new Waapi({ el, keyframes: dir === "forwards" ? frames : frames.reverse(), duration: instant ? 0 : DURATION, easing: EASE });
  };
  const browserZooming = (dir: Direction, instant = false) =>
    new Waapi({
      el: content,
      keyframes: () => {
        const y = -((browserBar?.offsetHeight ?? 0) + (fieldList?.offsetTop ?? 0) - 24);
        const frames: Keyframe[] = [
          { transform: "translate(0, 0) scale(var(--browserContentScale))", opacity: 1 },
          { transform: `translate(0, calc(${y}px * var(--scaleGraphicScale, 1))) scale(var(--scaleGraphicScale, 1))`, opacity: 1 },
        ];
        return dir === "forwards" ? frames : frames.reverse();
      },
      duration: instant ? 0 : DURATION,
      easing: EASE,
    });
  const resetShop = () => new Group([set(shopCart, { opacity: 0 }), set(shop, { opacity: 0 })]);

  const enterBackwards = new Group([windowScaling("backwards"), browserZooming("backwards"), resetShop()]);
  const leaveForwards = new Group([windowScaling("forwards"), browserZooming("forwards"), resetShop()]);
  const skipAnimation = new Group([windowScaling("forwards", true), browserZooming("forwards", true), resetShop()]);
  const intro = new Sequence([
    standalone
      ? null
      : new Waapi({
          el,
          keyframes: [
            { transform: "translate(50px, var(--heroCardOffsetY)) scale(1)", opacity: 0 },
            { transform: "translate(0px, var(--heroCardOffsetY)) scale(1)", opacity: 1 },
          ],
          duration: DURATION,
          easing: EASE,
        }),
    new Waapi({
      el: shopCart,
      keyframes: [{ transform: "rotateX(-30deg) scale(0.9)", opacity: 0 }, { opacity: 1, offset: 0.5 }, { transform: "rotateX(0deg) scale(1)", opacity: 1 }],
      duration: DURATION,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    }),
    new Group([
      new Waapi({ el: shopCartButton, keyframes: [{ transform: "scale(1)" }, { transform: "scale(0.94)", offset: 0.5 }, { transform: "scale(1)" }], duration: 750 }),
      new Waapi({ el: shopCart, keyframes: [{ transform: "translate(0, 0)", opacity: 1 }, { transform: "translate(0, 20px)", opacity: 0 }], delay: 600, duration: DURATION, easing: EASE }),
      new Waapi({ el: shop, keyframes: [{ opacity: 1 }, { opacity: 0 }], delay: 500, duration: 600, easing: EASE }),
    ]),
  ]);
  const sticky = [intro, enterBackwards, leaveForwards];
  const playIntro = () => {
    if (!intro.isPlaying && !intro.isFinished) intro.play();
  };
  const finishAll = (includeIntro = false) =>
    sticky.forEach((s) => {
      if ((includeIntro && s === intro) || (!includeIntro && s.isPlaying && !s.isFinished)) s.finish();
    });
  expose(el, N, {
    intersect: playIntro,
    separate: () => {},
    skip() {
      finishAll();
      replay(skipAnimation);
    },
    enter(dir) {
      finishAll();
      if (dir === "forwards") playIntro();
      else replay(enterBackwards);
    },
    leave(dir) {
      finishAll(true);
      if (dir === "forwards") return replay(leaveForwards);
    },
  });
  return () => [...sticky, skipAnimation].forEach((s) => s.cancel());
};

// ---- CheckoutCardInfoCard ------------------------------------------------------------------------------
export const CheckoutCardInfoCard: Controller = (el) => {
  const reset = () => new Exec(() => cardField(el)?.reset());
  const play = () => new Exec(() => playCardField(el));
  const enterForwards = new Sequence([reset(), fade(el, 0, 1), play()]);
  const enterBackwards = new Sequence([reset(), fade(el, 1, 1), play()]);
  const leaveBackwards = new Sequence([fade(el, 1, 0)]);
  const sticky = [enterForwards, enterBackwards, leaveBackwards];
  let mobile: Step | undefined;
  const runMobile = (s: Step) => {
    if (mobile?.isPlaying) mobile.finish();
    mobile = s;
    s.play();
  };
  expose(el, "CheckoutCardInfoCard", {
    intersect: () => runMobile(new Sequence([reset(), play()])),
    separate: () => runMobile(new Sequence([reset()])),
    skip: () => finishActive(sticky),
    enter(dir) {
      finishActive(sticky);
      replay(dir === "forwards" ? enterForwards : enterBackwards);
    },
    leave(dir) {
      finishActive(sticky);
      if (dir === "backwards") return replay(leaveBackwards);
    },
  });
  return () => {
    sticky.forEach((s) => s.cancel());
    mobile?.cancel();
  };
};

// ---- CheckoutAddressCard -------------------------------------------------------------------------------
export const CheckoutAddressCard: Controller = (el) => {
  const innerFieldList = target(el, "CheckoutAddressCard", "innerFieldList");
  const fieldEl = childControllers(el, "ShippingField")[0];
  const field = fieldEl ? getApi<ShippingFieldApi>(fieldEl, "ShippingField") : undefined;
  const step = (v: unknown): Step | undefined => (isStep(v) ? v : undefined);
  const hidden = "translate(0, calc(-1 * (var(--formFieldGap) + var(--shippingFieldHeight))))";
  // Reference: without its ShippingField child the card defines no animations. We keep the card's own
  // motion so it still appears/disappears when the forms port is missing.
  const enterForwards = new Sequence([
    fade(el, 0, 1),
    new Waapi({ el: innerFieldList, keyframes: [{ transform: hidden }, { transform: "translate(0, 0)" }], duration: DURATION, easing: EASE }),
    step(field?.playAnimation()),
  ]);
  const enterBackwards = new Sequence([
    new Group([set(el, { opacity: 1 }), set(innerFieldList, { transform: "translate(0, 0)" })]),
    step(field?.playAnimation()),
  ]);
  const leaveForwards = step(field?.resetAnimation()) ?? new Sequence([]);
  const leaveBackwards = new Sequence([
    step(field?.resetAnimation()),
    new Waapi({ el: innerFieldList, keyframes: [{ transform: "translate(0, 0)" }, { transform: hidden }], duration: DURATION, easing: EASE }),
    fade(el, 1, 0),
  ]);
  const skipAnimation = set(el, { opacity: 0 });
  const sticky = [enterForwards, enterBackwards, leaveForwards, leaveBackwards];
  let mobile: Step | undefined;
  const loose = new Set<Step>();
  expose(el, "CheckoutAddressCard", {
    intersect() {
      if (!field) return;
      if (mobile?.isPlaying) mobile.pause();
      mobile = step(field.playAnimation());
      mobile?.play();
    },
    separate() {
      if (!field) return;
      if (mobile?.isPlaying) mobile.pause();
      mobile = undefined;
      const r = step(field.resetAnimation());
      if (r) {
        loose.add(r);
        r.play().then(() => loose.delete(r));
      }
    },
    skip() {
      finishActive(sticky);
      replay(skipAnimation);
    },
    enter(dir) {
      finishActive(sticky);
      replay(dir === "forwards" ? enterForwards : enterBackwards);
    },
    leave(dir) {
      finishActive(sticky);
      if (dir === "forwards") replay(leaveForwards);
      else return replay(leaveBackwards);
    },
  });
  return () => {
    [...sticky, skipAnimation].forEach((s) => s.cancel());
    mobile?.cancel();
    loose.forEach((s) => s.cancel());
  };
};

// ---- CheckoutMobileCard --------------------------------------------------------------------------------
export const CheckoutMobileCard: Controller = (el) => {
  const N = "CheckoutMobileCard";
  const fieldList = target(el, N, "fieldList");
  const phone = target(el, N, "phone");
  const sheetEl = childControllers(el, "ApplePaySheet")[0];
  const sheet = sheetEl ? getApi<ApplePaySheetApi>(sheetEl, "ApplePaySheet") : undefined;
  const phoneTransform = "translate(0, -60px)";
  const scrolledTransform = `translate(0, ${el.offsetHeight - (24 + (fieldList?.offsetHeight ?? 0) + 28)}px)`;
  el.style.setProperty("--fieldListTransform", scrolledTransform);
  const activateFace = (ms: number) => new Exec(() => sheet?.faceAnimation?.activate(ms));
  const deactivateFace = () => new Exec(() => sheet?.faceAnimation?.deactivate());
  const phoneFade = (from: number, to: number) =>
    new Waapi({ el: phone, keyframes: [{ transform: phoneTransform, opacity: from }, { transform: phoneTransform, opacity: to }], duration: DURATION, easing: EASE });

  const enterForwards = new Sequence([
    fade(el, 0, 1),
    new Group([
      new Waapi({ el: fieldList, keyframes: [{ transform: "translate(0, 0)" }, { transform: scrolledTransform }], duration: DURATION, easing: EASE }),
      new Waapi({ el: phone, keyframes: [{ transform: "translate(0, 0)", opacity: 0 }, { transform: phoneTransform, opacity: 1 }], duration: DURATION, easing: EASE }),
    ]),
    sheet && new Group([sheet.animateIn(0), activateFace(750)]),
  ]);
  const enterBackwards = new Sequence([
    new Group([set(el, { opacity: 1 }), set(fieldList, { transform: scrolledTransform }), phoneFade(0, 1)]),
    sheet && new Group([sheet.animateIn(0), activateFace(750)]),
  ]);
  const leaveForwards = new Sequence([new Group([set(fieldList, { transform: scrolledTransform }), phoneFade(1, 0), deactivateFace()]), sheet?.animateOut()]);
  const leaveBackwards = new Sequence([
    new Group([
      new Waapi({ el: fieldList, keyframes: [{ transform: scrolledTransform }, { transform: "translate(0, 0)" }], duration: DURATION, easing: EASE }),
      phoneFade(1, 0),
      deactivateFace(),
    ]),
    sheet && new Group([sheet.animateOut(), fade(el, 1, 0)]),
  ]);
  const skipAnimation = set(el, { opacity: 0 });
  const sticky = [enterForwards, enterBackwards, leaveForwards, leaveBackwards];
  let mobile: Step | undefined;
  expose(el, N, {
    intersect() {
      if (!sheet) return;
      if (mobile?.isPlaying) mobile.pause();
      mobile = new Sequence([sheet.animateIn(), activateFace(1e3)]);
      mobile.play();
    },
    separate() {
      if (!sheet) return;
      mobile?.pause();
      mobile = new Group([sheet.animateOut(), deactivateFace()]);
      mobile.play();
    },
    skip() {
      finishActive(sticky);
      replay(skipAnimation);
    },
    enter(dir) {
      finishActive(sticky);
      replay(dir === "forwards" ? enterForwards : enterBackwards);
    },
    leave(dir) {
      finishActive(sticky);
      if (dir === "forwards") replay(leaveForwards);
      else return replay(leaveBackwards);
    },
  });
  return () => {
    [...sticky, skipAnimation].forEach((s) => s.cancel());
    mobile?.cancel();
    el.style.removeProperty("--fieldListTransform");
  };
};

// ---- CheckoutGlobalCard --------------------------------------------------------------------------------
interface SegmentedControlApi {
  toggleButton(index: number): void;
}
export const CheckoutGlobalCard: Controller = (el) => {
  const nav = childControllers(el, "SegmentedControl")[0];
  if (!nav) return;
  const track = target(el, "CheckoutGlobalCard", "track");
  const stepCount = () => targetList(nav, "SegmentedControl", "buttons").length || 1;
  let stepIndex = 0;
  const goToStep = (i: number, fromClick = false) => {
    stepIndex = i;
    el.style.setProperty("--countryIndex", String(i));
    if (!fromClick) getApi<SegmentedControlApi>(nav, "SegmentedControl")?.toggleButton(i);
  };
  const ticker = visibleInterval(el, 2500, () => goToStep((stepIndex + 1) % stepCount()));
  // Reference cycleSteps(): advance immediately, then every 2.5 s.
  const cycleSteps = () => {
    goToStep((stepIndex + 1) % stepCount());
    ticker.start();
  };
  const navUp = "translate(0, calc(-32px - 100%))";
  const enter = (dir: Direction) =>
    new Sequence([
      dir === "forwards" ? fade(el, 0, 1) : null,
      new Waapi({ el: nav, keyframes: [{ transform: "translate(0, 0)", opacity: 1 }, { transform: navUp, opacity: 1 }], duration: DURATION, easing: EASE }),
      new Delay(500),
      new Exec(cycleSteps),
    ]);
  const enterForwards = enter("forwards");
  const enterBackwards = enter("backwards");
  const leaveForwards = new Sequence([
    new Waapi({ el: nav, keyframes: [{ transform: navUp, opacity: 1 }, { transform: "translate(0, 0)", opacity: 1 }], duration: DURATION, easing: EASE }),
    new Exec(() => {
      if (stepIndex === 0 || !track) {
        goToStep(0);
        return;
      }
      // Wait for the track's slide back to the first country (its CSS transition).
      return new Promise<void>((res) => {
        const done = () => {
          clearTimeout(fallback);
          res();
        };
        const fallback = window.setTimeout(done, 1500);
        track.addEventListener("transitionend", done, { once: true });
        goToStep(0);
      });
    }),
  ]);
  const leaveBackwards = new Sequence([
    new Group([
      new Waapi({ el: nav, keyframes: [{ transform: navUp, opacity: 1 }, { transform: navUp, opacity: 0 }], duration: DURATION, easing: EASE }),
      fade(el, 1, 0),
    ]),
    new Exec(() => goToStep(0)),
  ]);
  const skipAnimation = new Group([set(nav, { transform: "translate(0, 0)", opacity: 1 }), set(el, { opacity: 0 }), new Exec(() => goToStep(0))]);
  const sticky = [enterForwards, enterBackwards, leaveForwards, leaveBackwards];
  const finishAll = () => {
    ticker.stop();
    finishActive(sticky);
  };
  const offClick = listen(el, "SegmentedControl:buttonClicked", (e) => {
    ticker.stop();
    goToStep((e as CustomEvent<{ index: number }>).detail.index, true);
  });
  expose(el, "CheckoutGlobalCard", {
    intersect: cycleSteps,
    separate: () => ticker.stop(),
    skip() {
      finishAll();
      replay(skipAnimation);
    },
    enter(dir) {
      finishAll();
      replay(dir === "forwards" ? enterForwards : enterBackwards);
    },
    leave(dir) {
      finishAll();
      if (dir === "forwards") return replay(leaveForwards);
      replay(leaveBackwards);
    },
  });
  return () => {
    offClick();
    ticker.dispose();
    [...sticky, skipAnimation].forEach((s) => s.cancel());
    el.style.removeProperty("--countryIndex");
  };
};

// ---- CheckoutBrandCard ---------------------------------------------------------------------------------
export const CheckoutBrandCard: Controller = (el) => {
  const N = "CheckoutBrandCard";
  const t = (n: string) => target(el, N, n);
  const content = t("content");
  const nav = t("nav");
  const modal = t("modal");
  const browserBar = t("browserBar");
  const fieldList = t("fieldList");
  const navItems = targetList(el, N, "navItems");
  const cartBackgrounds = targetList(el, N, "cartBackgrounds");
  const browserBarURLs = targetList(el, N, "browserBarURLs");
  const buttons = targetList(el, N, "buttons");
  let stepIndex = 0;
  const zoomedIn = (): Keyframe => ({ transform: `translate(0, ${-((browserBar?.offsetHeight ?? 0) + (fieldList?.offsetTop ?? 0) - 24)}px) scale(1)` });
  const zoomedOut: Keyframe = { transform: "translate(0, 0) scale(0.5)" };
  const goToStep = (i: number) => {
    stepIndex = i;
    el.style.setProperty("--brandIndex", String(i));
    cartBackgrounds.forEach((b, n) => (b.style.opacity = n > i ? "0" : "1"));
    browserBarURLs.forEach((u, n) => (u.style.opacity = n === i ? "1" : "0"));
    buttons.forEach((b, n) => (b.style.opacity = n > i ? "0" : "1"));
    navItems.forEach((it, n) => it.classList.toggle("CheckoutBrandNav__item--isActive", n === i));
  };
  const ticker = visibleInterval(el, 2500, () => goToStep((stepIndex + 1) % (navItems.length || 1)));
  const cycleSteps = () => {
    goToStep((stepIndex + 1) % (navItems.length || 1));
    ticker.start();
  };
  const enterForwards = new Sequence([
    new Group([fade(el, 0, 1), new Waapi({ el: content, keyframes: () => [zoomedIn(), zoomedOut], duration: DURATION, easing: EASE })]),
    new Group([
      new Waapi({ el: nav, keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: DURATION, easing: EASE }),
      new Waapi({ el: modal, keyframes: [{ transform: "translate(0, 0)", opacity: 0 }, { transform: "translate(-32px, 0)", opacity: 1 }], duration: DURATION, easing: EASE }),
    ]),
    new Delay(500),
    new Exec(cycleSteps),
  ]);
  const leaveBackwards = new Sequence([
    new Group([
      new Waapi({ el: content, keyframes: () => [zoomedOut, zoomedIn()], duration: DURATION, easing: EASE }),
      new Waapi({ el: nav, keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: DURATION, easing: EASE }),
      new Waapi({ el: modal, keyframes: [{ transform: "translate(-32px, 0)", opacity: 1 }, { transform: "translate(0, 0)", opacity: 0 }], duration: DURATION, easing: EASE }),
    ]),
    fade(el, 1, 0),
    new Exec(() => goToStep(0)),
  ]);
  const skipAnimation = new Group([set(el, { opacity: 0 }), set(nav, { opacity: 0 }), set(modal, { opacity: 0 }), new Exec(() => goToStep(0))]);
  const sticky = [enterForwards, leaveBackwards];
  const finishAll = () => {
    ticker.stop();
    finishActive(sticky);
  };
  // Nav items are links in the markup: a click selects that brand and stops the rotation.
  const offs = navItems.map((it) =>
    listen(it, "click", (e) => {
      e.preventDefault();
      ticker.stop();
      goToStep(navItems.indexOf(it));
    }),
  );
  expose(el, N, {
    intersect: cycleSteps,
    separate: () => ticker.stop(),
    skip() {
      finishAll();
      replay(skipAnimation);
    },
    enter(dir) {
      finishAll();
      if (dir === "forwards") replay(enterForwards);
    },
    leave(dir) {
      finishAll();
      if (dir === "backwards") return replay(leaveBackwards);
    },
  });
  return () => {
    offs.forEach((o) => o());
    ticker.dispose();
    [...sticky, skipAnimation].forEach((s) => s.cancel());
  };
};
