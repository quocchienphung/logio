// Helpers shared by the page-specific ports (pg-payments, pg-checkout, pg-payment-links, pg-elements,
// pg-link).
import { prefersReducedMotion } from "../lib";
import type { Step } from "./motion";

/**
 * The reference ScrollObserver (v1-chunk-HMRIQCRQ): an IntersectionObserver with one threshold. Each
 * callback fires "intersect" when entries[0].intersectionRatio >= threshold (requireThreshold, the
 * default) and "separate" otherwise — including the initial callback after observe(). `once` disconnects
 * after the first intersect.
 */
export function scrollObserver(
  el: Element,
  threshold: number,
  handlers: { onIntersect?: () => void; onSeparate?: () => void; once?: boolean; rootMargin?: string },
): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].intersectionRatio >= threshold && entries[0].isIntersecting) {
        handlers.onIntersect?.();
        if (handlers.once) io.disconnect();
      } else handlers.onSeparate?.();
    },
    { threshold, rootMargin: handlers.rootMargin },
  );
  io.observe(el);
  return () => io.disconnect();
}

/**
 * Calls `cb(true)` while `el` is on screen and the tab is visible, `cb(false)` otherwise (only on changes).
 * Used to pause the free-running loops the reference leaves running offscreen.
 */
export function whileVisible(el: Element, cb: (visible: boolean) => void, rootMargin = "0px"): () => void {
  let onScreen = false;
  let state: boolean | null = null;
  const update = () => {
    const v = onScreen && !document.hidden;
    if (v !== state) {
      state = v;
      cb(v);
    }
  };
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    update();
  }, { rootMargin });
  io.observe(el);
  const onVis = () => update();
  document.addEventListener("visibilitychange", onVis);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
}

/**
 * Pauses the running steps returned by `getSteps()` while `el` is offscreen or the tab is hidden, and
 * resumes exactly those steps afterwards (unless something else cancelled or finished them meanwhile).
 */
export function pauseWhenHidden(el: Element, getSteps: () => (Step | undefined)[], rootMargin?: string): () => void {
  let paused: Step[] = [];
  return whileVisible(
    el,
    (visible) => {
      if (!visible) {
        paused = getSteps().filter((s): s is Step => !!s && s.isPlaying);
        paused.forEach((s) => s.pause());
      } else {
        const list = paused;
        paused = [];
        list.forEach((s) => {
          if (!s.isPlaying && !s.isFinished && s.isPaused !== false) s.play();
        });
      }
    },
    rootMargin,
  );
}

export const reducedMotion = prefersReducedMotion;

/** Pauses a setInterval-style ticker offscreen/hidden: returns start/stop that respect visibility. */
export function visibleInterval(el: Element, ms: number, fn: () => void): { start: () => void; stop: () => void; dispose: () => void } {
  let wanted = false;
  let visible = false;
  let id = 0;
  const sync = () => {
    const run = wanted && visible;
    if (run && !id) id = window.setInterval(fn, ms);
    if (!run && id) {
      clearInterval(id);
      id = 0;
    }
  };
  const off = whileVisible(el, (v) => {
    visible = v;
    sync();
  });
  return {
    start() {
      wanted = true;
      if (id) {
        clearInterval(id);
        id = 0;
      }
      sync();
    },
    stop() {
      wanted = false;
      sync();
    },
    dispose() {
      wanted = false;
      sync();
      off();
    },
  };
}

// ---- Monochrome ------------------------------------------------------------------------------------
// Same hue → luminance curve as scripts/forensics/products/mono.py (and build_css.mjs), so colours that
// come from JS match the greys the generated CSS already uses (docs/research/MONOCHROME_SYSTEM.md).
const LIGHT_KEYS: [number, number][] = [
  [0, 0.54], [25, 0.63], [45, 0.72], [70, 0.78], [150, 0.76], [200, 0.82], [235, 0.72], [255, 0.4],
  [270, 0.26], [290, 0.28], [310, 0.34], [330, 0.42], [350, 0.5], [360, 0.54],
];
const interp = (x: number) => {
  for (let i = 1; i < LIGHT_KEYS.length; i++) {
    if (x <= LIGHT_KEYS[i][0]) {
      const [x0, y0] = LIGHT_KEYS[i - 1];
      const [x1, y1] = LIGHT_KEYS[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return LIGHT_KEYS[LIGHT_KEYS.length - 1][1];
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function monoValue(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const c = mx - mn;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (c < 0.12) return lum;
  let h = mx === r ? ((((g - b) / c) % 6) + 6) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
  h *= 60;
  const l = (mx + mn) / 2;
  const hv = interp(h);
  const w = smooth(0.08, 0.55, c);
  const hue = Math.min(1, Math.max(0, l * (1 - w) + hv * (0.7 + 0.55 * l) * w));
  const t = smooth(0.12, 0.35, c);
  return lum * (1 - t) + hue * t;
}

/** Maps a #rgb / #rrggbb colour to its monochrome grey (#vvvvvv). Other strings are returned unchanged. */
export function monoHex(color: string): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const n = Math.round(Math.min(1, Math.max(0, monoValue(r, g, b))) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${n}${n}${n}`;
}

/** Reference colour lerp (v1-chunk-SPVZY72M `a`): returns `to + (from - to) * p` per channel, as #rrggbb. */
export function lerpHex(from: string, to: string, p: number): string {
  const a = from.replace("#", "");
  const b = to.replace("#", "");
  let out = "#";
  for (let i = 0; i <= 4; i += 2) {
    const x = parseInt(a.substr(i, 2), 16);
    const y = parseInt(b.substr(i, 2), 16);
    out += Math.floor(y + (x - y) * p)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
