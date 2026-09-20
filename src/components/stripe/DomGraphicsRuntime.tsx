"use client";

import { useEffect } from "react";

type Dims = { w: number; h: number };
type Variants = { mobile: Dims; tablet: Dims; desktop: Dims };

// Source dimensions per breakpoint measured from the reference DOM at 390 / 768 / 1440
// (docs/research/stripe-live/dom-graphics.json). Keyed by the graphic's own class name.
const SOURCES: Record<string, Variants> = {
  "payments-terminal-dom-graphic": { mobile: { w: 300, h: 496 }, tablet: { w: 300, h: 496 }, desktop: { w: 280, h: 496 } },
  "payments-checkout-dom-graphic": { mobile: { w: 190, h: 580 }, tablet: { w: 200, h: 580 }, desktop: { w: 516, h: 580 } },
  "connect-platform-dom-graphic": { mobile: { w: 420, h: 457 }, tablet: { w: 400, h: 457 }, desktop: { w: 1000, h: 457 } },
  "platform-graphic__dom__phone": { mobile: { w: 356, h: 706 }, tablet: { w: 336, h: 686 }, desktop: { w: 336, h: 686 } },
};

const breakpoint = () => (window.matchMedia("(max-width: 639px)").matches ? "mobile" : window.matchMedia("(max-width: 939px)").matches ? "tablet" : "desktop");

/**
 * Runtime behaviour of the reference `dom-graphic` wrapper: every product mockup is authored at a
 * fixed source size and scaled down (never up) to the width it actually gets, via
 * `--graphic-scale = min(1, width / sourceWidth)`; some graphics swap their source size per breakpoint.
 */
export function DomGraphicsRuntime() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".dom-graphic")];
    const apply = (el: HTMLElement) => {
      const key = [...el.classList].find((c) => SOURCES[c]);
      if (key) {
        const d = SOURCES[key][breakpoint()];
        el.style.setProperty("--graphic-source-width", `${d.w}px`);
        el.style.setProperty("--graphic-source-height", `${d.h}px`);
        el.style.setProperty("--graphic-aspect-ratio", `${d.w} / ${d.h}`);
        el.style.setProperty("--graphic-max-width", `${d.w}px`);
      }
      const sourceWidth = parseFloat(el.style.getPropertyValue("--graphic-source-width")) || el.getBoundingClientRect().width;
      const width = el.getBoundingClientRect().width;
      if (width > 0) el.style.setProperty("--graphic-scale", String(Math.min(1, width / sourceWidth)));
      el.dataset.status = width > 0 ? "ready" : "measuring";
    };
    els.forEach(apply);
    let timer: number | undefined;
    const ro = new ResizeObserver((entries) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => entries.forEach((e) => apply(e.target as HTMLElement)), 100);
    });
    els.forEach((el) => ro.observe(el));
    const onResize = () => els.forEach(apply);
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return null;
}
