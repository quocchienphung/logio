// Small helpers shared by the forms ports (on top of ../lib.ts).
import { exposeApi, getApi } from "../lib";
import type { Controller } from "../types";

/** Last element under `el` whose data-js-target includes `${ctrl}.${name}`. The reference base class assigns
 * targets in document order, so when two nodes carry the same target the last one wins. */
export function lastTarget<T extends Element = HTMLElement>(el: Element, ctrl: string, name: string): T | null {
  let found: T | null = null;
  for (const node of el.querySelectorAll<HTMLElement>(`[data-js-target*="${ctrl}."]`)) {
    if ((node.dataset.jsTarget || "").split(" ").includes(`${ctrl}.${name}`)) found = node as unknown as T;
  }
  return found;
}

/** API of the first descendant (or `el` itself) mounted as controller `ctrl` (the reference's childController). */
export function childApi<T>(el: Element, ctrl: string): T | undefined {
  if (el.matches(`[data-js-controller~="${ctrl}"]`)) {
    const own = getApi<T>(el, ctrl);
    if (own) return own;
  }
  for (const node of el.querySelectorAll(`[data-js-controller~="${ctrl}"]`)) {
    const api = getApi<T>(node, ctrl);
    if (api) return api;
  }
  return undefined;
}

/** All descendant APIs of controller `ctrl`, in document order (the reference's childControllers). */
export function childApis<T>(el: Element, ctrl: string): T[] {
  return Array.from(el.querySelectorAll(`[data-js-controller~="${ctrl}"]`))
    .map((n) => getApi<T>(n, ctrl))
    .filter((a): a is T => a !== undefined);
}

/** A port written as a class with connect()/disconnect(), exposed to parents under its controller name. */
export interface Connectable {
  connect(): void;
  disconnect(): void;
}
declare global {
  interface Window {
    /** Development-only accessor used by the QA scripts (scripts/forensics/products/qa/forms-*). */
    __v1FormsApi?: (el: Element, name: string) => unknown;
  }
}

export function classController<T extends Connectable>(name: string, make: (el: HTMLElement) => T): Controller {
  return (el) => {
    if (process.env.NODE_ENV !== "production") window.__v1FormsApi ??= (node, ctrl) => getApi(node, ctrl);
    const inst = make(el);
    exposeApi(el, name, inst);
    inst.connect();
    return () => inst.disconnect();
  };
}

export function cssNumber(el: Element, prop: string): number {
  return parseFloat(getComputedStyle(el).getPropertyValue(prop));
}

/** Reference Motion.disableAmbientAnimations(): prefers-reduced-motion (the reference also treats a
 * SwiftShader GPU as "reduced"; that heuristic is not ported so headless QA exercises the real motion). */
export function disableAmbientAnimations(): boolean {
  const q = "(prefers-reduced-motion: reduce)";
  if (typeof matchMedia !== "function") return false;
  const m = matchMedia(q);
  return m.media === q && m.matches;
}

/** Tiny event emitter (reference v1-chunk-UIYSND3Y). */
export class Emitter<E> {
  private handlers = new Set<(e: E) => void>();
  listen(fn: (e: E) => void): () => void {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }
  emit(e: E): void {
    this.handlers.forEach((h) => h(e));
  }
  clear(): void {
    this.handlers.clear();
  }
}

/** Trailing debounce (reference v1-chunk-423M6RNU). Returns the debounced function and a cancel. */
export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): [(...a: A) => void, () => void] {
  let t = 0;
  return [
    (...a: A) => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn(...a), ms);
    },
    () => window.clearTimeout(t),
  ];
}

/** Read the `language` code from the reference's html lang ("en-US" -> "US"), as Motion.getSiteLang(). */
export function siteLocale(): string {
  const [, locale] = (document.documentElement.lang || "en-US").split("-");
  return locale ?? "";
}
