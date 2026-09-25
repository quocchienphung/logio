// Small runtime helpers shared by the Revenue HDS pages (/billing, /billing/usage-based-billing,
// /billing/subscriptions). Every helper returns its own cleanup so page mounts can tear down fully.

export type Cleanup = () => void;

/** Collects cleanups and runs them in reverse order. */
export class Disposer {
  private fns: Cleanup[] = [];
  add(fn: Cleanup | void | null | undefined): void {
    if (fn) this.fns.push(fn);
  }
  run(): void {
    const fns = this.fns.splice(0).reverse();
    for (const fn of fns) {
      try {
        fn();
      } catch {
        // A failing cleanup must not prevent the others from running.
      }
    }
  }
}

/** Reference breakpoints (module 21010): tablet >= 640px, desktop >= 940px. */
export type Breakpoint = "mobile" | "tablet" | "desktop";
const TABLET_MQ = "(min-width: 640px)";
const DESKTOP_MQ = "(min-width: 940px)";

export function breakpoint(): Breakpoint {
  if (window.matchMedia(DESKTOP_MQ).matches) return "desktop";
  if (window.matchMedia(TABLET_MQ).matches) return "tablet";
  return "mobile";
}

/** Calls `cb(bp)` whenever the reference breakpoint changes. */
export function onBreakpointChange(cb: (bp: Breakpoint) => void): Cleanup {
  const a = window.matchMedia(TABLET_MQ);
  const b = window.matchMedia(DESKTOP_MQ);
  const h = () => cb(breakpoint());
  a.addEventListener("change", h);
  b.addEventListener("change", h);
  return () => {
    a.removeEventListener("change", h);
    b.removeEventListener("change", h);
  };
}

export function onMedia(query: string, cb: (matches: boolean) => void): Cleanup {
  const mq = window.matchMedia(query);
  const h = () => cb(mq.matches);
  mq.addEventListener("change", h);
  return () => mq.removeEventListener("change", h);
}

const REDUCED = "(prefers-reduced-motion: reduce)";
export function reducedMotion(): boolean {
  return window.matchMedia(REDUCED).matches;
}
export function onReducedMotionChange(cb: (reduced: boolean) => void): Cleanup {
  return onMedia(REDUCED, cb);
}

/** Reference `isTouchDevice` heuristic (touch events, touch points or a coarse pointer). */
export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

export function listen<E extends Event = Event>(
  target: EventTarget,
  type: string,
  fn: (e: E) => void,
  opts?: AddEventListenerOptions | boolean,
): Cleanup {
  target.addEventListener(type, fn as EventListener, opts);
  return () => target.removeEventListener(type, fn as EventListener, opts);
}

/**
 * IntersectionObserver with the reference `useIntersectionObserver` semantics (module 66725):
 * "intersecting" means isIntersecting && ratio >= threshold; `once` disconnects after the first hit.
 */
export function observeIntersection(
  el: Element,
  cb: (visible: boolean, entry: IntersectionObserverEntry) => void,
  opts: { threshold?: number; rootMargin?: string; once?: boolean } = {},
): Cleanup {
  const threshold = opts.threshold ?? 0;
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1];
      if (!e) return;
      const visible = e.isIntersecting && e.intersectionRatio >= threshold;
      cb(visible, e);
      if (visible && opts.once) io.disconnect();
    },
    { threshold, rootMargin: opts.rootMargin ?? "0%" },
  );
  io.observe(el);
  return () => io.disconnect();
}

export function onVisibilityChange(cb: (hidden: boolean) => void): Cleanup {
  return listen(document, "visibilitychange", () => cb(document.hidden));
}

type AnyFn = (...args: never[]) => void;

/** Leading + trailing throttle (reference module 95870 defaults). */
export function throttle<F extends AnyFn>(fn: F, wait: number): F & { cancel: () => void } {
  let last = -1e7;
  let timer: number | undefined;
  let pending: Parameters<F> | null = null;
  const run = (args: Parameters<F>) => {
    last = performance.now();
    pending = null;
    fn(...args);
  };
  const t = ((...args: Parameters<F>) => {
    const now = performance.now();
    pending = args;
    if (now - last >= wait) {
      run(args);
      return;
    }
    if (timer === undefined) {
      timer = window.setTimeout(() => {
        timer = undefined;
        if (pending) run(pending);
      }, wait - (now - last));
    }
  }) as F & { cancel: () => void };
  t.cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    pending = null;
  };
  return t;
}

/** Trailing debounce (reference module 20 defaults). */
export function debounce<F extends AnyFn>(fn: F, wait: number): F & { cancel: () => void } {
  let timer: number | undefined;
  const d = ((...args: Parameters<F>) => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, wait);
  }) as F & { cancel: () => void };
  d.cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };
  return d;
}

/** Page-relative rect (reference module 26847): fixed elements stay viewport-relative. */
export function pageRect(el: Element): DOMRect {
  const r = el.getBoundingClientRect();
  if (getComputedStyle(el).position === "fixed") return r;
  return new DOMRect(r.left + window.scrollX, r.top + window.scrollY, r.width, r.height);
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function qs<T extends Element = HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector<T>(sel);
}
export function qsa<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}
