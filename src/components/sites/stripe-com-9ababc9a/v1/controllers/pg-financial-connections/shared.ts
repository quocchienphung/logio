// Helpers shared by the Financial Connections ports.
import { DEFAULT_EASING, Timeline, pressKeyframes } from "../pg-payment-methods/motion";

/** Reference button press (v1-chunk-LNF4ZVUH `a`): scale 1 → .92 @70% → 1, 600ms, default WAAPI easing. */
export const press = (tl: Timeline, el: Element | null, scale = 0.92): Promise<void> =>
  el ? tl.animate(el, pressKeyframes(scale), { duration: 600, easing: DEFAULT_EASING }) : Promise.resolve();

/** currency.js subset used by the reference (EB6IA2VL): parse "$52,024.42" and format with symbol/precision. */
export function parseCurrency(s: string | undefined): number {
  const n = parseFloat((s || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
export function formatCurrency(value: number, symbol: string, precision: number): string {
  const p = Math.pow(10, precision);
  const v = Math.round(value * p) / p;
  const [int, dec] = Math.abs(v).toFixed(precision).split(".");
  const grouped = int.replace(/(\d)(?=(\d{3})+\b)/g, "$1,");
  return `${v < 0 ? "-" : ""}${symbol}${grouped}${dec ? `.${dec}` : ""}`;
}
/** currency(a).add(b): both rounded to cents (currency.js default precision 2). */
export const addCents = (a: number, b: number): number => Math.round(a * 100 + Math.round(b * 100)) / 100;

/** Show an element that the reference hides with inline styles (opacity 0 + pointer-events none). */
export const reveal = (el: HTMLElement): void => {
  el.style.pointerEvents = "auto";
  el.style.opacity = "1";
};
export const conceal = (el: HTMLElement): void => {
  el.style.pointerEvents = "none";
  el.style.opacity = "0";
};

/** Inline style snapshot, restored on cleanup. */
export function snapshotStyles(els: (HTMLElement | null)[]): () => void {
  const saved = els.filter((e): e is HTMLElement => !!e).map((e) => [e, e.getAttribute("style")] as const);
  return () =>
    saved.forEach(([e, s]) => {
      if (s === null) e.removeAttribute("style");
      else e.setAttribute("style", s);
    });
}
