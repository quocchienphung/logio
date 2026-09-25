// Invoicing "How it works" autoplaying carousels and the demo button. Ports of:
//   InvoicingCustomizeCarousel ... v1-CustomizeCarousel-4K2FWKQK.js
//   InvoicingGlobalCarousel ...... v1-GlobalCarousel-5V6IRXVF.js
//   BillingInvoicingDemoButton ... v1-InvoicingDemoButton-MAND27CL.js
import type { Controller } from "../types";
import { childControllers, listen, onPageVisibility, target, targetList } from "../lib";
import { Clock, scrollObserver } from "../pg-tax/motion";
import { segmentedControlApi } from "../pg-tax/localizationGraphic";

const STEP_MS = 2500;
const ACTIVE_NAV = "InvoicingBrandNav__item--isActive";

/** setInterval(fn, ms) on a Clock, so it can be paused with the tab. Returns a stop function. */
function every(clock: Clock, ms: number, fn: () => void): () => void {
  let cancel = clock.after(ms, function tick() {
    fn();
    cancel = clock.after(ms, tick);
  });
  return () => cancel();
}

/** Tab-visibility pause for a clock (offscreen handling is the reference's own intersect/separate). */
function pauseWhenHidden(clock: Clock): () => void {
  if (document.hidden) clock.pause();
  return onPageVisibility((hidden) => (hidden ? clock.pause() : clock.resume()));
}

export const InvoicingCustomizeCarousel: Controller = (el) => {
  const N = "InvoicingCustomizeCarousel";
  const navItems = targetList(el, N, "navItems");
  const cartBackgrounds = targetList(el, N, "cartBackgrounds");
  if (!navItems.length) return;

  const clock = new Clock();
  let stepIndex = 0;
  let stopInterval: (() => void) | undefined;

  const goToStep = (e: number) => {
    stepIndex = e;
    el.style.setProperty("--brandIndex", String(e));
    cartBackgrounds.forEach((c, s) => (c.style.opacity = s > e ? "0" : "1"));
    navItems.forEach((n, s) => {
      n.classList.toggle(ACTIVE_NAV, s === e);
      n.setAttribute("aria-current", String(s === e));
    });
  };
  const nextStep = () => goToStep((stepIndex + 1) % navItems.length);
  const cycleSteps = () => {
    stopInterval?.();
    nextStep();
    stopInterval = every(clock, STEP_MS, nextStep);
  };

  const offs = [
    scrollObserver(el, 0.75, cycleSteps, () => stopInterval?.()),
    pauseWhenHidden(clock),
    ...navItems.map((n, i) =>
      listen(n, "click", (ev) => {
        ev.preventDefault();
        stopInterval?.();
        goToStep(i);
      }),
    ),
  ];

  return () => {
    offs.forEach((off) => off());
    stopInterval?.();
    clock.dispose();
    el.style.removeProperty("--brandIndex");
    cartBackgrounds.forEach((c) => c.style.removeProperty("opacity"));
    navItems.forEach((n, s) => {
      n.classList.toggle(ACTIVE_NAV, s === 0);
      n.removeAttribute("aria-current");
    });
  };
};

export const InvoicingGlobalCarousel: Controller = (el) => {
  const segEl = childControllers(el, "SegmentedControl")[0];
  if (!segEl) return;
  const stepCount = targetList(segEl, "SegmentedControl", "buttons").length || 1;

  const clock = new Clock();
  let stepIndex = 0;
  let stopInterval: (() => void) | undefined;

  const goToStep = (e: number, fromClick = false) => {
    stepIndex = e;
    el.style.setProperty("--countryIndex", String(e));
    if (!fromClick) segmentedControlApi(el)?.toggleButton(e);
  };
  const nextStep = () => goToStep((stepIndex + 1) % stepCount);
  const cycleSteps = () => {
    stopInterval?.();
    nextStep();
    stopInterval = every(clock, STEP_MS, nextStep);
  };

  const offs = [
    scrollObserver(el, 0.75, cycleSteps, () => stopInterval?.()),
    pauseWhenHidden(clock),
    listen(el, "SegmentedControl:buttonClicked", (ev) => {
      const index = (ev as CustomEvent<{ index: number }>).detail?.index;
      if (typeof index !== "number") return;
      stopInterval?.();
      goToStep(index, true);
    }),
  ];

  return () => {
    offs.forEach((off) => off());
    stopInterval?.();
    clock.dispose();
    el.style.removeProperty("--countryIndex");
  };
};

export const BillingInvoicingDemoButton: Controller = (el) => {
  const button = target(el, "BillingInvoicingDemoButton", "button");
  const url = el.dataset.submissionUrl;
  if (!button || !url) return;
  return listen(button, "click", () => {
    window.open(url, "invoice");
  });
};
