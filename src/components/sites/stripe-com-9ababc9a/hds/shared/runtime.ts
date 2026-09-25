// Generic runtime helpers for the HDS-stack page behaviours. Ports of the reference hooks used across
// the mkt-ssr pages (chunk 30365: useBreakpoint 21010, useDebounce 20, useThrottle 95870,
// useResizeObserver 20825; chunk 99449: useIntersectionObserver 66725, useTouchDevice 90786;
// page bundle: usePrefersReducedMotion 88690). Framework-free: they operate on server-rendered DOM.

export type Cleanup = () => void;

/** Runs every cleanup in reverse order, swallowing nothing (a throwing cleanup is a bug). */
export function combine(cleanups: (Cleanup | void | undefined | null)[]): Cleanup {
  return () => {
    for (let i = cleanups.length - 1; i >= 0; i -= 1) cleanups[i]?.();
  };
}

// ------------------------------------------------------------------ breakpoints (module 21010)

export type Breakpoint = "mobile" | "tablet" | "desktop";

/** min-width thresholds of the HDS layout grid (module 21010: tablet 640, desktop 940). */
export const BREAKPOINTS = { tablet: 640, desktop: 940 } as const;

const tabletMq = () => window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px)`);
const desktopMq = () => window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px)`);

export function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined" || !window.matchMedia) return "mobile";
  if (desktopMq().matches) return "desktop";
  if (tabletMq().matches) return "tablet";
  return "mobile";
}

/** Calls `cb` with the new breakpoint whenever it changes. */
export function onBreakpointChange(cb: (bp: Breakpoint) => void): Cleanup {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const t = tabletMq();
  const d = desktopMq();
  let last = getBreakpoint();
  const handler = () => {
    const next = getBreakpoint();
    if (next !== last) {
      last = next;
      cb(next);
    }
  };
  t.addEventListener("change", handler);
  d.addEventListener("change", handler);
  return () => {
    t.removeEventListener("change", handler);
    d.removeEventListener("change", handler);
  };
}

// --------------------------------------------------------------- environment (88690, 90786)

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function onReducedMotionChange(cb: (reduced: boolean) => void): Cleanup {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const h = () => cb(mq.matches);
  mq.addEventListener("change", h);
  return () => mq.removeEventListener("change", h);
}

/** Coarse pointer + touch events (modules 21919 / 90786). */
export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && "ontouchstart" in window;
}

// -------------------------------------------------------------- timing (modules 20, 95870)

export interface Cancelable<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
}

/** Trailing-edge debounce (module 20 defaults: leading false, trailing true). */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, delay: number): Cancelable<A> {
  let timer: number | undefined;
  const d = ((...args: A) => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delay);
  }) as Cancelable<A>;
  d.cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };
  return d;
}

/** Leading + trailing throttle (module 95870 defaults). */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, delay: number): Cancelable<A> {
  let timer: number | undefined;
  let last = -1e7;
  let pending: A | undefined;
  let first = true;
  const run = (args: A) => {
    pending = undefined;
    last = performance.now();
    fn(...args);
  };
  const flush = () => {
    timer = undefined;
    if (pending) run(pending);
  };
  const t = ((...args: A) => {
    const now = performance.now();
    pending = args;
    if (first || now - last >= delay) {
      first = false;
      run(args);
      if (timer === undefined) timer = window.setTimeout(flush, delay);
    } else if (timer === undefined) {
      timer = window.setTimeout(flush, delay - (now - last));
    }
  }) as Cancelable<A>;
  t.cancel = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  return t;
}

// ------------------------------------------------------------- observers (20825, 66725)

export interface Size {
  width: number;
  height: number;
}

/**
 * ResizeObserver on the border box. `delay` 0 = every entry; otherwise debounced (default) or
 * throttled, like the reference hook. The first observation fires too.
 */
export function observeResize(
  el: Element,
  cb: (size: Size) => void,
  opts: { delay?: number; mode?: "debounce" | "throttle" } = {},
): Cleanup {
  if (typeof ResizeObserver === "undefined") return () => {};
  const { delay = 0, mode = "debounce" } = opts;
  const call = delay ? (mode === "throttle" ? throttle(cb, delay) : debounce(cb, delay)) : null;
  const ro = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1];
    const box = entry.borderBoxSize?.[0];
    const size = box ? { width: box.inlineSize, height: box.blockSize } : { width: entry.contentRect.width, height: entry.contentRect.height };
    if (call) call(size);
    else cb(size);
  });
  ro.observe(el);
  return () => {
    ro.disconnect();
    call?.cancel();
  };
}

/**
 * IntersectionObserver with the reference hook's semantics: `visible` is isIntersecting AND the
 * ratio reached `threshold`; `once` disconnects after the first positive.
 */
export function observeIntersection(
  el: Element,
  cb: (visible: boolean) => void,
  opts: { threshold?: number; rootMargin?: string; once?: boolean } = {},
): Cleanup {
  if (typeof IntersectionObserver === "undefined") {
    cb(true);
    return () => {};
  }
  const { threshold = 0, rootMargin = "0%", once = false } = opts;
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (!e) return;
      const visible = e.isIntersecting && e.intersectionRatio >= threshold;
      cb(visible);
      if (visible && once) io.disconnect();
    },
    { threshold, rootMargin },
  );
  io.observe(el);
  return () => io.disconnect();
}

export function listen<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  fn: (e: HTMLElementEventMap[K]) => void,
  opts?: AddEventListenerOptions,
): Cleanup;
export function listen<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions): Cleanup;
export function listen<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  fn: (e: DocumentEventMap[K]) => void,
  opts?: AddEventListenerOptions,
): Cleanup;
export function listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): Cleanup {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}
