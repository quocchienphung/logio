// Terminal page sections below the hero.
// Reference modules: v1-UnifiedCommerceS700Animation-HZ2M37XD.js (TerminalUnifiedCommerceS700Animation),
// v1-TerminalDeviceShowcaseGraphic-PHJWVPYW.js (TerminalDeviceShowcaseGraphic),
// v1-DeviceManagementLayout-2GITDOVB.js (TerminalDeviceManagementLayout).
// Behaviour notes: docs/research/products/motion/pages-b.md.
import { listen, prefersReducedMotion, target, targetList } from "../lib";
import type { Controller } from "../types";
import { EASE, Timeline, pauseWhenHidden, run } from "../pg-payment-methods/motion";

/** Card slides into the S700 once 75% of the graphic is visible: translateY → 0, 1600ms easeOutQuint, +500ms. */
export const TerminalUnifiedCommerceS700Animation: Controller = (el) => {
  const card = target<HTMLElement>(el, "TerminalUnifiedCommerceS700Animation", "cardPicture");
  if (!card) return;
  const tl = new Timeline();
  const offHidden = pauseWhenHidden(tl);
  const reduced = prefersReducedMotion();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].intersectionRatio < 0.75) return;
      io.disconnect(); // onlyOnce
      run(tl.animate(card, [{ transform: "translateY(0px)" }], { duration: reduced ? 0 : 1600, delay: reduced ? 0 : 500, easing: EASE.outQuint }));
    },
    { threshold: 0.75 },
  );
  io.observe(el);
  return () => {
    io.disconnect();
    offHidden();
    tl.reset();
  };
};

const SCROLL_SPEED = 140;
/** The reference eases the offset with lerp(current, target, 0.3) once per frame; the port applies the same
 * per-frame factor on elapsed time (0.3 per 1/60 s). */
const LERP_PER_FRAME = 0.3;

/** Two device columns drift in opposite directions with scroll (±140px across the element's pass), eased. */
export const TerminalDeviceShowcaseGraphic: Controller = (el) => {
  if (prefersReducedMotion()) return;
  const columns = targetList<HTMLElement>(el, "TerminalDeviceShowcaseGraphic", "columns");
  let inView = false;
  let isMobile = false;
  let windowHeight = 0;
  let targetOffset = 0;
  let currentOffset = 0;
  let raf = 0;
  let last = 0;

  const tick = (now: number) => {
    raf = 0;
    if (isMobile) {
      columns.forEach((c) => (c.style.transform = "translateY(0px)"));
      return;
    }
    const dt = last ? Math.min(now - last, 100) : 1000 / 60;
    last = now;
    const k = 1 - Math.pow(1 - LERP_PER_FRAME, dt / (1000 / 60));
    currentOffset = currentOffset * (1 - k) + targetOffset * k;
    columns.forEach((c, i) => {
      c.style.transform = `translateY(${currentOffset * (i === 0 ? 1 : -1)}px)`;
    });
    if (inView && !document.hidden) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const onScroll = () => {
    const { top, height } = el.getBoundingClientRect();
    // mapRange(top + h/2, -h, h + innerHeight, -140, 140) (unclamped)
    const v = top + height / 2;
    const inMin = -height;
    const inMax = height + windowHeight;
    targetOffset = -SCROLL_SPEED + ((SCROLL_SPEED * 2) * (v - inMin)) / (inMax - inMin);
  };
  const onResize = () => {
    windowHeight = window.innerHeight;
    isMobile = window.innerWidth < 900;
    kick();
  };
  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0].intersectionRatio >= 0.01;
      if (inView) kick();
    },
    { threshold: 0.01 },
  );
  const offs = [
    listen(window, "scroll", onScroll, { passive: true }),
    listen(window, "resize", onResize),
    listen(document, "visibilitychange", () => inView && !document.hidden && kick()),
  ];
  onResize();
  onScroll();
  io.observe(el);
  return () => {
    io.disconnect();
    offs.forEach((f) => f());
    if (raf) cancelAnimationFrame(raf);
    columns.forEach((c) => c.style.removeProperty("transform"));
  };
};

/** The segmented control's buttonClicked event selects the visible device-management chart (--currentIndex). */
export const TerminalDeviceManagementLayout: Controller = (el) => {
  const off = listen(el, "SegmentedControl:buttonClicked", (e: Event) => {
    const index = (e as CustomEvent<{ index: number }>).detail?.index;
    if (typeof index === "number") el.style.setProperty("--currentIndex", String(index));
  });
  return () => {
    off();
    el.style.removeProperty("--currentIndex");
  };
};
