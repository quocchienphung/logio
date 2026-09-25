// /payments section graphics:
//   PaymentsOnlinePaymentsLinkAnimation     ← v1-OnlinePaymentsLinkAnimation-IUVZRZ5C.js
//   PaymentsTerminalAnimation               ← v1-TerminalAnimation-CLOOYBYJ.js
//   PaymentMethodHubGlobalPaymentCarousel   ← v1-GlobalPaymentCarousel-ZIIH2NCF.js (also /payments/payment-methods)
import type { Controller } from "../types";
import { childControllers, getApi, listen, prefersReducedMotion, target, targetList } from "../lib";
import { Delay, EASE, Exec, Group, Sequence, Waapi, type Step } from "./motion";
import { scrollObserver, visibleInterval } from "./util";
import type { LinkApi } from "./heroAnimation";

// ---- PaymentsOnlinePaymentsLinkAnimation ---------------------------------------------------------------
// Scroll-triggered replay: every time the card enters the viewport (ratio >= 0.001) and the sequence is
// not running, the Link graphic is reset and the sequence restarts (1 s pause, Link flow, 1 s pause).
export const PaymentsOnlinePaymentsLinkAnimation: Controller = (el) => {
  const N = "PaymentsOnlinePaymentsLinkAnimation";
  const shippingForm = target(el, N, "shippingForm");
  const linkEl = childControllers(el, "PaymentsHeroAnimationLink")[0];
  const link = linkEl ? getApi<LinkApi>(linkEl, "PaymentsHeroAnimationLink") : undefined;
  if (!link) return;
  if (prefersReducedMotion()) return; // static initial state (email field, shipping form)

  const loose = new Set<Step>();
  const oneShot = (s: Step) => {
    loose.add(s);
    s.play().then(() => loose.delete(s));
  };
  const fadeDown = () =>
    oneShot(
      new Waapi({
        el: shippingForm,
        keyframes: [{ transform: "translateY(0px)", opacity: 1 }, { transform: "translateY(264px)", opacity: 0.4 }],
        duration: 300,
        easing: EASE.outSine,
      }),
    );
  const fadeOut = () => oneShot(new Waapi({ el: shippingForm, keyframes: [{ opacity: 0.4 }, { opacity: 0 }], duration: 300, easing: EASE.outSine }));
  const resetShippingForm = () => oneShot(new Waapi({ el: shippingForm, keyframes: [{ opacity: 1, transform: "translateY(0px)" }], duration: 0 }));

  const animation = new Sequence([new Delay(1000), link.createAnimation(fadeDown, fadeOut), new Delay(1000)]);
  let exit: Step | undefined;
  const off = scrollObserver(el, 0.001, {
    onIntersect: () => {
      if (animation.isPaused) {
        animation.play(); // resumed after we paused it offscreen
        return;
      }
      if (animation.isPlaying) return;
      exit?.cancel();
      exit = link.createExitAnimation();
      oneShot(exit);
      resetShippingForm();
      animation.cancel();
      animation.play();
    },
    // The reference keeps running offscreen; we pause instead (and resume on re-entry).
    onSeparate: () => animation.pause(),
  });
  const onVis = () => {
    if (document.hidden) animation.pause();
    else if (animation.isPaused && el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight) animation.play();
  };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    off();
    document.removeEventListener("visibilitychange", onVis);
    animation.cancel();
    loose.forEach((s) => s.cancel());
  };
};

// ---- PaymentsTerminalAnimation -------------------------------------------------------------------------
// Scroll-linked: while >= 75 % visible, a rAF loop maps window.scrollY between startScroll and
// startScroll + 200 px to progress p ∈ [0, 1] and sets the card to translateY(-200·p px). First entry adds
// --isEntering, 2 s later (once images are loaded) --isS700Visible, and 1.6 s after that the S700 counts
// as ready. p >= 1 activates the payment (--isPaymentActive + a 2 s "processing" → "approved" sequence);
// p <= 0.8 deactivates it (class removed, sequence paused). Reverse scroll therefore re-inserts the card.
const IS_ENTERING = "PaymentsTerminalAnimation--isEntering";
const IS_S700_VISIBLE = "PaymentsTerminalAnimation--isS700Visible";
const IS_PAYMENT_ACTIVE = "PaymentsTerminalAnimation--isPaymentActive";

export const PaymentsTerminalAnimation: Controller = (el) => {
  const N = "PaymentsTerminalAnimation";
  const card = target(el, N, "card");
  const s700 = target(el, N, "s700");
  const pictures = targetList(el, N, "pictures");
  if (!card || !s700) return;
  // Reference: disableAmbientAnimations() (reduced motion, or a SwiftShader GPU) skips everything and the
  // reduced-motion CSS shows the device statically. We only honour reduced motion.
  if (prefersReducedMotion()) return;

  const state = { isIntersecting: false, isActive: false, isEnterAnimationStarted: false, isEnterAnimationCompleted: false };
  let scrollY = window.scrollY;
  let startScroll = 0;
  let endScroll = 0;
  let raf = 0;
  let disposed = false;
  const EASE_O = EASE.outCubic;

  const payAnimation = new Sequence([
    new Delay(2000),
    new Group([
      new Waapi({ el: target(el, N, "processingLabel"), keyframes: [{ opacity: "1" }, { opacity: "0" }], duration: 500, easing: EASE_O }),
      new Waapi({ el: target(el, N, "approvedLabel"), keyframes: [{ opacity: "0" }, { opacity: "1" }], duration: 500, easing: EASE_O }),
      new Waapi({ el: target(el, N, "approvedIconEllipse"), keyframes: [{ transform: " scale(0, 0)" }, { transform: " scale(1, 1)" }], duration: 750, easing: EASE_O }),
      new Waapi({
        el: target(el, N, "approvedIconPath"),
        keyframes: [{ strokeDashoffset: "30" }, { strokeDashoffset: "0" }],
        duration: 750,
        delay: 350,
        easing: EASE_O,
      }),
    ]),
  ]);
  const imagesLoaded = () =>
    Promise.all(
      pictures.map((p) => {
        const img = p.querySelector("img");
        if (!img || img.complete) return Promise.resolve();
        return new Promise<void>((res) => {
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        });
      }),
    );
  const showS700 = new Sequence([
    new Exec(() => el.classList.add(IS_S700_VISIBLE)),
    new Delay(1600),
    new Exec(() => setState({ isEnterAnimationCompleted: true })),
  ]);
  const enter = new Sequence([
    new Exec(() => setState({ isEnterAnimationStarted: true })),
    new Exec(() => el.classList.add(IS_ENTERING)),
    new Delay(2000),
    new Exec(async () => {
      await imagesLoaded();
      if (!disposed) showS700.play();
    }),
  ]);

  const progress = () => (scrollY < startScroll ? 0 : scrollY > endScroll ? 1 : (scrollY - startScroll) / (endScroll - startScroll));
  const update = () => {
    const p = progress();
    if (p >= 1 && state.isEnterAnimationCompleted && !state.isActive) setState({ isActive: true });
    else if (p <= 0.8 && state.isActive) setState({ isActive: false });
    card.style.transform = `translateY(${-p * 200}px)`;
    raf = requestAnimationFrame(update);
  };
  function setState(patch: Partial<typeof state>) {
    const prev = { ...state };
    Object.assign(state, patch);
    if (state.isActive && !prev.isActive) {
      if (!payAnimation.isPlaying) {
        payAnimation.cancel();
        payAnimation.play();
      }
      el.classList.add(IS_PAYMENT_ACTIVE);
    }
    if (!state.isActive && prev.isActive) {
      el.classList.remove(IS_PAYMENT_ACTIVE);
      payAnimation.pause();
    }
    if (state.isIntersecting && !prev.isIntersecting) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
      if (!state.isEnterAnimationStarted) enter.play();
    }
    if (!state.isIntersecting && prev.isIntersecting) cancelAnimationFrame(raf);
  }
  const onScroll = () => (scrollY = window.scrollY);
  const onResize = () => {
    const top = el.getBoundingClientRect().top + scrollY;
    startScroll = top - window.innerHeight + s700.offsetHeight;
    endScroll = startScroll + 200;
  };
  onScroll();
  onResize();
  const offObs = scrollObserver(el, 0.75, {
    onIntersect: () => setState({ isIntersecting: true }),
    onSeparate: () => setState({ isIntersecting: false }),
  });
  const offScroll = listen(window, "scroll", onScroll);
  const offResize = listen(window, "resize", onResize);
  // Tab hidden: rAF stops on its own; pause the timed steps too.
  const onVis = () => {
    const list: Step[] = [enter, showS700, payAnimation];
    if (document.hidden) list.forEach((s) => s.pause());
    else list.forEach((s) => s.isPaused && (s !== payAnimation || state.isActive) && s.play());
  };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    disposed = true;
    offObs();
    offScroll();
    offResize();
    document.removeEventListener("visibilitychange", onVis);
    cancelAnimationFrame(raf);
    [enter, showS700, payAnimation].forEach((s) => s.cancel());
    el.classList.remove(IS_ENTERING, IS_S700_VISIBLE, IS_PAYMENT_ACTIVE);
    card.style.transform = "";
  };
};

// ---- Global payment carousel -----------------------------------------------------------------------------
interface SegmentedControlApi {
  toggleButton(index: number): void;
}

/**
 * PaymentMethodHubGlobalPaymentCarousel / ElementsGlobalPaymentCarousel: while the element is >= `threshold`
 * visible, advance every 3 s (Track --currentIndex + SegmentedControl.toggleButton). A click on the
 * segmented control jumps there and stops the timer until the next viewport entry.
 */
export function globalPaymentCarousel(el: HTMLElement, threshold: number): (() => void) | void {
  const segEl = childControllers(el, "SegmentedControl")[0];
  if (!segEl) return; // reference: no segmented controller → nothing
  const trackEl = childControllers(el, "Track")[0];
  const stepCount = () => targetList(segEl, "SegmentedControl", "buttons").length || 1;
  let stepIndex = 0;
  const goToStep = (i: number, fromClick = false) => {
    stepIndex = i;
    trackEl?.style.setProperty("--currentIndex", String(i));
    if (!fromClick) getApi<SegmentedControlApi>(segEl, "SegmentedControl")?.toggleButton(i);
  };
  const ticker = visibleInterval(el, 3000, () => goToStep((stepIndex + 1) % stepCount()));
  // Reduced motion: no auto-advance (clicks still switch).
  const auto = !prefersReducedMotion();
  const offObs = scrollObserver(el, threshold, { onIntersect: () => auto && ticker.start(), onSeparate: () => ticker.stop() });
  const offClick = listen(el, "SegmentedControl:buttonClicked", (e) => {
    const detail = (e as CustomEvent<{ index: number }>).detail;
    ticker.stop();
    goToStep(detail.index, true);
  });
  return () => {
    offObs();
    offClick();
    ticker.dispose();
  };
}

export const PaymentMethodHubGlobalPaymentCarousel: Controller = (el) => globalPaymentCarousel(el, 0.5);
