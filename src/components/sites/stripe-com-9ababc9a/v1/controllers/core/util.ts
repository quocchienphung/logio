// Helpers shared by the "core" controller ports. Each mirrors a small reference utility module
// (paths relative to the mirror's mkt-statics-srv/assets/):
//   scrollObserver      ← v1-chunk-HMRIQCRQ.js (IntersectionObserver wrapper with requireThreshold / onlyOnce)
//   motion flags        ← v1-chunk-W54ZCUX6.js (prefersReducedMotion, disableGPUAnimations, disableAmbientAnimations)
//   debounce            ← v1-chunk-423M6RNU.js
//   easings             ← v1-chunk-XZAD27SG.js (Penner signature: t, begin, change, duration)
//   rafDelay            ← v1-chunk-7LUJEHON.js (`delay`: rAF-driven timeout, so it stalls while the tab is hidden)
import { exposeApi, prefersReducedMotion } from "../lib";

let softwareRenderer: boolean | undefined;

/** The reference disables GPU-heavy animation when the WebGL renderer is SwiftShader (software). */
export function isSoftwareRenderer(): boolean {
  if (softwareRenderer !== undefined) return softwareRenderer;
  softwareRenderer = false;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "") : "";
    softwareRenderer = /swiftshade/i.test(renderer);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    softwareRenderer = false;
  }
  return softwareRenderer;
}

/** Reference `disableAmbientAnimations()`: reduced motion or a software GPU. */
export function disableAmbientAnimations(): boolean {
  return prefersReducedMotion() || isSoftwareRenderer();
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): ((...args: A) => void) & { cancel(): void } {
  let t: number | undefined;
  const d = (...args: A) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
  d.cancel = () => window.clearTimeout(t);
  return d;
}

export const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);

export function easeInOutCubic(t: number, b: number, c: number, d: number): number {
  let x = t / (d / 2);
  if (x < 1) return (c / 2) * x * x * x + b;
  x -= 2;
  return (c / 2) * (x * x * x + 2) + b;
}

export function easeOutQuart(t: number, b: number, c: number, d: number): number {
  const x = t / d - 1;
  return -c * (x * x * x * x - 1) + b;
}

/** rAF-based timeout (reference `delay`). Returns a cancel function. */
export function rafDelay(fn: () => void, ms: number): () => void {
  let cancelled = false;
  let id = 0;
  const start = performance.now();
  const tick = (now: number) => {
    if (cancelled) return;
    if (now - start >= ms) return fn();
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(id);
  };
}

export interface ScrollObserverOptions {
  threshold?: number;
  onlyOnce?: boolean;
  requireThreshold?: boolean;
  rootMargin?: string;
}

/**
 * Reference ScrollObserver: calls onIntersect when the first entry's ratio reaches `threshold`
 * (or on any callback when requireThreshold is false), otherwise onSeparate. Returns a disconnect.
 */
export function scrollObserver(
  el: Element,
  { threshold = 1, onlyOnce = false, requireThreshold = true, rootMargin = "0px 0px 0px 0px" }: ScrollObserverOptions,
  onIntersect: (entry: IntersectionObserverEntry) => void,
  onSeparate?: (entry: IntersectionObserverEntry) => void,
): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (!requireThreshold || e.intersectionRatio >= threshold) {
        onIntersect(e);
        if (onlyOnce) io.disconnect();
      } else onSeparate?.(e);
    },
    { threshold, rootMargin },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** The reference's `<body>` lives inside `.v1-root` as `.MktBody`; `<html>` as `.MktRoot`. */
export function v1Body(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>(".v1-root")?.querySelector<HTMLElement>(".MktBody") ?? null;
}
export function v1Html(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>(".v1-root")?.querySelector<HTMLElement>(".MktRoot") ?? null;
}

/** Collects cleanups; `run()` calls them in reverse order once. */
export class Disposer {
  private fns: (() => void)[] = [];
  add(fn: (() => void) | undefined | void): void {
    if (fn) this.fns.push(fn);
  }
  run = (): void => {
    const fns = this.fns.splice(0).reverse();
    fns.forEach((f) => f());
  };
}

/**
 * exposeApi() for the core ports. In development the API is also reachable from QA scripts as
 * `element.__v1CoreApi[name]`; production builds skip that handle.
 */
export function exposeCore<T>(el: Element, name: string, api: T): void {
  exposeApi(el, name, api);
  if (process.env.NODE_ENV === "production") return;
  const holder = el as Element & { __v1CoreApi?: Record<string, unknown> };
  (holder.__v1CoreApi ??= {})[name] = api;
}
