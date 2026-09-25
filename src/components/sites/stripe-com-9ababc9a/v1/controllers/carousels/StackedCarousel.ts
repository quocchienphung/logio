// StackedCarousel + StackedCarouselControl — port of v1-StackedCarousel-6EFTS2I2.js.
// Time-driven: once ≥ 75 % of the section is visible, the active step advances every 3.5 s
// (data-interval overrides); it stops when visibility drops below 75 %. Clicking a step (≥ 600 px
// only) selects it and stops the autoplay until the section re-enters. The step's image cross-fades:
// the old one fades/drops 50 px (500 ms, ease-in), the new one falls in from −50 px after 300 ms
// (500 ms, easeOutQuart).
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, listen, onPageVisibility, prefersReducedMotion, targetList } from "../lib";
import { EASE_OUT_QUART, observeThreshold, play } from "./util";

const ACTIVE = "StackedCarousel__detailContainer--isActive";
const IMAGE_OFFSET = 50;
const EASE_IN = "cubic-bezier(0.62, 0.05, 0.89, 0.97)";
const DEFAULT_INTERVAL = 3500;
const CLICK_MIN_WIDTH = 600;
const VISIBLE_THRESHOLD = 0.75;

interface StackedControlApi {
  readonly count: number;
  toggleButton(index: number): void;
}

export const StackedCarouselControl: Controller = (el) => {
  const N = "StackedCarouselControl";
  const buttons = targetList(el, N, "buttons");
  const images = targetList(el, N, "images");
  if (!buttons.length) return;
  let selected = Math.max(0, buttons.findIndex((b) => b.classList.contains(ACTIVE)));

  const updateImage = (next: number) => {
    const prev = selected;
    images.forEach((img, i) => {
      const isNew = i === next;
      const isOld = i === prev;
      if (!isNew && !isOld) return;
      play(
        img,
        [
          { opacity: isNew ? 0 : 1, transform: `translateY(${isNew ? -IMAGE_OFFSET : 0}px)` },
          { opacity: isNew ? 1 : 0, transform: `translateY(${isOld ? IMAGE_OFFSET : 0}px)` },
        ],
        { delay: isNew ? 300 : 0, easing: isNew ? EASE_OUT_QUART : EASE_IN, duration: prefersReducedMotion() ? 0 : 500 },
      );
    });
  };

  const handleToggle = (i: number) => {
    buttons[selected].classList.remove(ACTIVE);
    buttons[i].classList.add(ACTIVE);
    buttons.forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
    if (images.length) updateImage(i);
    selected = i;
  };

  const toggleButton = (i: number) => {
    const already = selected === i;
    handleToggle(i);
    if (!already) el.dispatchEvent(new CustomEvent("StackedCarouselControl:changed", { bubbles: true, detail: selected }));
  };

  const activate = (b: HTMLElement) => {
    if (window.innerWidth < CLICK_MIN_WIDTH) return;
    const index = buttons.indexOf(b);
    const alreadyActive = selected === index;
    toggleButton(index);
    el.dispatchEvent(new CustomEvent("StackedCarouselControl:buttonClicked", { bubbles: true, detail: { index, alreadyActive } }));
  };

  // Keyboard: the steps are focusable; Enter/Space on the step itself (not on a link inside it) selects it.
  const offs = buttons.flatMap((b) => {
    const hadTabIndex = b.hasAttribute("tabindex");
    if (!hadTabIndex) b.tabIndex = 0;
    return [
      listen(b, "click", () => activate(b)),
      listen(b, "keydown", (e: KeyboardEvent) => {
        if (e.target !== b || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        activate(b);
      }),
      () => {
        if (!hadTabIndex) b.removeAttribute("tabindex");
      },
    ];
  });
  buttons.forEach((b, k) => b.setAttribute("aria-current", String(k === selected)));

  const api: StackedControlApi = {
    get count() {
      return buttons.length;
    },
    toggleButton,
  };
  exposeApi(el, N, api);

  return () => {
    offs.forEach((off) => off());
    images.forEach((img) => img.getAnimations().forEach((a) => a.cancel()));
  };
};

export const StackedCarousel: Controller = (el) => {
  const control = () => {
    const node = childControllers(el, "StackedCarouselControl")[0] ?? (el.matches('[data-js-controller~="StackedCarouselControl"]') ? el : undefined);
    return node ? getApi<StackedControlApi>(node, "StackedCarouselControl") : undefined;
  };
  if (!control()) return;
  const interval = el.dataset.interval ? parseInt(el.dataset.interval, 10) : DEFAULT_INTERVAL;
  let stepIndex = 0;
  let timer: number | undefined;
  let cycling = false; // autoplay wanted (visible ≥ 75 % and not stopped by a click)
  let hidden = document.hidden;

  const goToStep = (i: number, fromClick = false) => {
    stepIndex = i;
    el.style.setProperty("--stackedCarouselItemIndex", String(i));
    if (!fromClick) control()?.toggleButton(i);
  };
  const stop = () => window.clearInterval(timer);
  const start = () => {
    stop();
    if (hidden) return;
    timer = window.setInterval(() => goToStep((stepIndex + 1) % (control()?.count || 1)), interval);
  };

  const offs = [
    observeThreshold(
      el,
      VISIBLE_THRESHOLD,
      () => {
        cycling = true;
        start();
        el.dispatchEvent(new CustomEvent("StackedCarousel:intersected", { detail: stepIndex }));
      },
      () => {
        cycling = false;
        stop();
        el.dispatchEvent(new CustomEvent("StackedCarousel:seperated", { detail: stepIndex }));
      },
    ),
    listen(el, "StackedCarouselControl:buttonClicked", (e: Event) => {
      cycling = false;
      stop();
      goToStep((e as CustomEvent<{ index: number }>).detail.index, true);
    }),
    // Not in the reference: the interval also pauses while the tab is hidden and resumes after.
    onPageVisibility((h) => {
      hidden = h;
      if (h) stop();
      else if (cycling) start();
    }),
  ];
  return () => {
    offs.forEach((off) => off());
    stop();
  };
};
