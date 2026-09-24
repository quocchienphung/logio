// Helpers shared by the legacy controller ports. They mirror the reference base class
// (v1-chunk-TKEHEMW6.js): targets are resolved inside the controller element from
// data-js-target="Controller.name" (single) and data-js-target-list="Controller.name" (lists).

/** First element under `el` whose data-js-target includes `${ctrl}.${name}`. */
export function target<T extends Element = HTMLElement>(el: Element, ctrl: string, name: string): T | null {
  for (const node of el.querySelectorAll<HTMLElement>(`[data-js-target*="${ctrl}."]`)) {
    const names = (node.dataset.jsTarget || "").split(" ").filter((t) => t.startsWith(`${ctrl}.`)).map((t) => t.split(".")[1]);
    if (names.includes(name)) return node as unknown as T;
  }
  return null;
}

/** All elements under `el` whose data-js-target-list includes `${ctrl}.${name}`, in document order. */
export function targetList<T extends Element = HTMLElement>(el: Element, ctrl: string, name: string): T[] {
  return Array.from(el.querySelectorAll<HTMLElement>(`[data-js-target-list*="${ctrl}."]`)).filter((node) =>
    (node.dataset.jsTargetList || "").split(" ").includes(`${ctrl}.${name}`),
  ) as unknown as T[];
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Calls `cb(true|false)` as `el` enters/leaves the viewport. Returns a cleanup. */
export function onIntersect(el: Element, cb: (visible: boolean, entry: IntersectionObserverEntry) => void, init?: IntersectionObserverInit): () => void {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting, e)), init);
  io.observe(el);
  return () => io.disconnect();
}

/** Calls `cb(hidden)` when the tab visibility changes. Returns a cleanup. */
export function onPageVisibility(cb: (hidden: boolean) => void): () => void {
  const h = () => cb(document.hidden);
  document.addEventListener("visibilitychange", h);
  return () => document.removeEventListener("visibilitychange", h);
}

/** Adds an event listener and returns its removal. */
export function listen<K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): () => void {
  el.addEventListener(type, fn as EventListener, opts);
  return () => el.removeEventListener(type, fn as EventListener, opts);
}

// Parent/child controller communication (the reference's childController()). Children are mounted
// before parents (see registry.ts), so a parent can read the API its children exposed.
const apis = new WeakMap<Element, Map<string, unknown>>();
export function exposeApi<T>(el: Element, ctrl: string, api: T): void {
  let m = apis.get(el);
  if (!m) apis.set(el, (m = new Map()));
  m.set(ctrl, api);
}
export function getApi<T>(el: Element, ctrl: string): T | undefined {
  return apis.get(el)?.get(ctrl) as T | undefined;
}
/** Child controller elements of `ctrl` type under `el` (document order). */
export function childControllers(el: Element, ctrl: string): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(`[data-js-controller~="${ctrl}"]`));
}
