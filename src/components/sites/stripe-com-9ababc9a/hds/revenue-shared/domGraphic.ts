// Port of the reference DomGraphic wrapper (module 8470): every product mock-up is authored at a fixed
// source size and scaled down (never up) to the width it gets: --graphic-scale = min(1, width / source).
// Status goes "measuring" -> "ready" on the first non-zero measurement and a bubbling
// "domgraphicready" event is dispatched once. Resize measurements are throttled (500 ms, leading and
// trailing — the reference defaults resizeMode "throttle", resizeDelay 500).

import { breakpoint, Disposer, onBreakpointChange, throttle, type Breakpoint, type Cleanup } from "./env";

interface Dims {
  w: number;
  h: number;
}
/**
 * Graphics whose source size differs per breakpoint (from source: `mobileWidth`/`mobileHeight` props
 * passed to DomGraphic in the billing page module 39828). Everything else keeps the server values.
 */
const VARIANTS: { match: (el: HTMLElement) => boolean; dims: Partial<Record<Breakpoint, Dims>> & { desktop: Dims } }[] = [
  {
    match: (el) => el.classList.contains("usage-based-billing-bento-graphic"),
    dims: { desktop: { w: 497, h: 356 }, tablet: { w: 497, h: 356 }, mobile: { w: 497, h: 380 } },
  },
  {
    match: (el) => !!el.querySelector(":scope > .dom-graphic__content > .billing-platform-ui-graphic__container"),
    dims: { desktop: { w: 640, h: 428 }, tablet: { w: 640, h: 428 }, mobile: { w: 411, h: 398 } },
  },
];

export const DOM_GRAPHIC_READY = "domgraphicready";

export function mountDomGraphics(root: HTMLElement): Cleanup {
  const d = new Disposer();
  const graphics = Array.from(root.querySelectorAll<HTMLElement>(".dom-graphic"));
  const state = new Map<HTMLElement, { src: Dims; width: number; ready: boolean }>();

  const sourceFor = (el: HTMLElement): Dims => {
    const v = VARIANTS.find((x) => x.match(el));
    if (v) return v.dims[breakpoint()] ?? v.dims.desktop;
    const w = parseFloat(el.style.getPropertyValue("--graphic-source-width")) || el.getBoundingClientRect().width || 1;
    const h = parseFloat(el.style.getPropertyValue("--graphic-source-height")) || 1;
    return { w, h };
  };

  const apply = (el: HTMLElement) => {
    const s = state.get(el);
    if (!s) return;
    el.style.setProperty("--graphic-source-width", `${s.src.w}px`);
    el.style.setProperty("--graphic-source-height", `${s.src.h}px`);
    el.style.setProperty("--graphic-aspect-ratio", `${s.src.w} / ${s.src.h}`);
    el.style.setProperty("--graphic-max-width", `${s.src.w}px`);
    const scale = s.width > 0 ? Math.min(1, s.width / s.src.w) : 1;
    el.style.setProperty("--graphic-scale", String(scale));
    const ready = s.width > 0;
    el.dataset.status = ready ? "ready" : "measuring";
    if (ready && !s.ready) {
      s.ready = true;
      el.dispatchEvent(new CustomEvent(DOM_GRAPHIC_READY, { bubbles: true }));
    }
  };

  for (const el of graphics) {
    state.set(el, { src: sourceFor(el), width: Math.round(el.getBoundingClientRect().width), ready: false });
    apply(el);
  }

  const measure = throttle((entries: ResizeObserverEntry[]) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      const s = state.get(el);
      if (!s) continue;
      const box = e.borderBoxSize?.[0];
      const w = Math.round(box ? box.inlineSize : e.contentRect.width);
      if (w !== s.width) {
        s.width = w;
        apply(el);
      }
    }
  }, 500);
  // Collect entries between throttled flushes so no graphic misses its final size.
  const pending = new Map<Element, ResizeObserverEntry>();
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) pending.set(e.target, e);
    measure([...pending.values()]);
  });
  graphics.forEach((g) => ro.observe(g));
  d.add(() => {
    ro.disconnect();
    measure.cancel();
    pending.clear();
  });

  d.add(
    onBreakpointChange(() => {
      for (const el of graphics) {
        const s = state.get(el);
        if (!s) continue;
        s.src = sourceFor(el);
        s.width = Math.round(el.getBoundingClientRect().width);
        apply(el);
      }
    }),
  );
  return () => d.run();
}
