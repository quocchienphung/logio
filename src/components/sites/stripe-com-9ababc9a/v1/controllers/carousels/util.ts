// Helpers local to the "carousels" controller group. Each mirrors a small reference utility
// (module named in the comment) as clean TypeScript; nothing here is reference code.
import { prefersReducedMotion } from "../lib";

export const clamp = (v: number, min: number, max: number): number => Math.max(Math.min(v, max), min);

/** Default easing of the reference's WAAPI wrapper (v1-chunk-4Q7ZI5NX.js) — "easeOutQuart". */
export const EASE_OUT_QUART = "cubic-bezier(.165, .84, .44, 1)";

/**
 * Plays a Web Animation the way the reference wrapper does (v1-chunk-4Q7ZI5NX.js): fill "forwards",
 * duration 500 ms and easeOutQuart unless given. Returns the Animation so callers can cancel it.
 */
export function play(
  el: Element,
  keyframes: Keyframe[],
  opts: { duration?: number; delay?: number; easing?: string } = {},
): Animation {
  return el.animate(keyframes, {
    duration: opts.duration ?? 500,
    delay: opts.delay ?? 0,
    easing: opts.easing ?? EASE_OUT_QUART,
    fill: "forwards",
  });
}

/**
 * Scrolls a carousel track like the reference StripeScroll.scrollTo (v1-chunk-R4LGG24H.js): native
 * smooth scrolling, or an instant jump when `animate` is false or reduced motion is requested.
 */
export function scrollTrackTo(track: HTMLElement, left: number, animate = true): void {
  track.scrollTo({ left, top: 0, behavior: animate && !prefersReducedMotion() ? "smooth" : "auto" });
}

/**
 * IntersectionObserver with the reference's ScrollObserver semantics (v1-chunk-HMRIQCRQ.js):
 * every callback whose first entry reaches `threshold` counts as "intersect", anything below as
 * "separate" (including the initial callback).
 */
export function observeThreshold(el: Element, threshold: number, onIntersect: () => void, onSeparate: () => void): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].intersectionRatio >= threshold) onIntersect();
      else onSeparate();
    },
    { threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Trailing debounce (v1-chunk-423M6RNU.js). Returns [debounced, cancel]. */
export function debounce(fn: () => void, ms: number): [() => void, () => void] {
  let id: number | undefined;
  return [
    () => {
      window.clearTimeout(id);
      id = window.setTimeout(fn, ms);
    },
    () => window.clearTimeout(id),
  ];
}

/**
 * A pausable wait measured with performance.now() on requestAnimationFrame, like the reference
 * Delay step (v1-chunk-PCZ6HXRS.js): pausing keeps the remaining time, rAF stops in hidden tabs.
 */
export class Delay {
  private remaining: number;
  private start = 0;
  private raf = 0;
  playing = false;
  finished = false;
  constructor(
    private readonly duration: number,
    private readonly onEnd: () => void,
  ) {
    this.remaining = duration;
  }
  play(): void {
    if (this.playing || this.finished) return;
    this.playing = true;
    this.start = performance.now();
    const tick = (now: number) => {
      if (now - this.start >= this.remaining) {
        this.playing = false;
        this.finished = true;
        this.remaining = 0;
        this.onEnd();
      } else this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  pause(): void {
    if (!this.playing) return;
    cancelAnimationFrame(this.raf);
    this.playing = false;
    this.remaining = Math.max(0, this.remaining - (performance.now() - this.start));
  }
  cancel(): void {
    cancelAnimationFrame(this.raf);
    this.playing = false;
    this.finished = false;
    this.remaining = this.duration;
  }
}

// Monochrome (docs/research/MONOCHROME_SYSTEM.md): colours that the reference JS applies (testimonial
// backgrounds, case-study accent lines) are mapped with the same hue -> luminance curve the page
// generator used for inline colours (scripts/forensics/products/mono.py, mono_value()).
const LIGHT_KEYS: [number, number][] = [
  [0, 0.54], [25, 0.63], [45, 0.72], [70, 0.78], [150, 0.76], [200, 0.82], [235, 0.72], [255, 0.4],
  [270, 0.26], [290, 0.28], [310, 0.34], [330, 0.42], [350, 0.5], [360, 0.54],
];
function interp(x: number): number {
  for (let i = 1; i < LIGHT_KEYS.length; i++) {
    if (x <= LIGHT_KEYS[i][0]) {
      const [x0, y0] = LIGHT_KEYS[i - 1];
      const [x1, y1] = LIGHT_KEYS[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return LIGHT_KEYS[LIGHT_KEYS.length - 1][1];
}
function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function monoValue(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const c = mx - mn;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (c < 0.12) return lum;
  let h: number;
  if (mx === r) h = (((g - b) / c) % 6 + 6) % 6;
  else if (mx === g) h = (b - r) / c + 2;
  else h = (r - g) / c + 4;
  h *= 60;
  const l = (mx + mn) / 2;
  const w = smooth(0.08, 0.55, c);
  const hue = clamp(l * (1 - w) + interp(h) * (0.7 + 0.55 * l) * w, 0, 1);
  const t = smooth(0.12, 0.35, c);
  return lum * (1 - t) + hue * t;
}

/** "#RRGGBB" / "#RGB" -> the grey "#vvvvvv" of the project's monochrome curve. Other input is returned as is. */
export function monoHex(color: string): string {
  let hex = color.trim().replace("#", "");
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const n = Math.round(clamp(monoValue(r, g, b), 0, 1) * 255).toString(16).padStart(2, "0");
  return `#${n}${n}${n}`;
}

/**
 * Luminance role "dark surface under white text" (testimonial cards are all theme--Dark): the curve
 * value is compressed into #1a1a1a…#555555 so light brand colours (yellow, sky blue) keep white copy
 * legible while the slides still differ in tone and cross-fade.
 */
export function monoDarkSurface(color: string): string {
  const grey = monoHex(color);
  if (!/^#[0-9a-f]{6}$/.test(grey)) return color;
  const v = parseInt(grey.slice(1, 3), 16) / 255;
  const n = Math.round((0.1 + 0.235 * v) * 255).toString(16).padStart(2, "0");
  return `#${n}${n}${n}`;
}

/** Linear mix of two "#RRGGBB" colours, `amount` of `a` (reference: v1-chunk-SPVZY72M.js `a`). */
export function mixHex(a: string, b: string, amount: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  let out = "#";
  for (let i = 0; i <= 4; i += 2) {
    const va = parseInt(pa.slice(i, i + 2), 16);
    const vb = parseInt(pb.slice(i, i + 2), 16);
    out += Math.floor(vb + (va - vb) * amount).toString(16).padStart(2, "0");
  }
  return out;
}
