// Easing curves used by the Revenue pages. Values from the reference easing table (module 93326,
// export `xn`) and Motion's named easings (the defaults its sequence engine falls back to).

export type Bezier = readonly [number, number, number, number];
export type EaseFn = (t: number) => number;
export type Easing = Bezier | "linear" | "easeIn" | "easeOut" | "easeInOut" | EaseFn;

/** From source: module 93326 `xn`. */
export const EASE = {
  linear: [0, 0, 1, 1],
  easeInSine: [0.47, 0, 0.75, 0.72],
  easeOutSine: [0.39, 0.58, 0.57, 1],
  easeInOutSine: [0.45, 0.05, 0.55, 0.95],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInCubic: [0.55, 0.06, 0.68, 0.19],
  easeOutCubic: [0.22, 0.61, 0.36, 1],
  easeInOutCubic: [0.65, 0.05, 0.36, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  easeOutQuart: [0.165, 0.84, 0.44, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeInOutQuart: [0.78, 0, 0.22, 1],
  easeInOutQuint: [0.86, 0, 0.07, 1],
  easeOutQuadratic: [0.25, 0.46, 0.45, 0.94],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeSwift: [0.2, 0, 0, 1],
} as const satisfies Record<string, Bezier>;

const NAMED: Record<"easeIn" | "easeOut" | "easeInOut", Bezier> = {
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

const cache = new Map<string, EaseFn>();

/** Cubic-bezier timing function (binary subdivision on x, like CSS / Motion). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  const key = `${x1},${y1},${x2},${y2}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (x1 === y1 && x2 === y2) {
    const lin: EaseFn = (t) => t;
    cache.set(key, lin);
    return lin;
  }
  const calc = (t: number, a1: number, a2: number) => (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t;
  const solveT = (x: number) => {
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 14; i++) {
      const cx = calc(t, x1, x2) - x;
      if (Math.abs(cx) < 1e-7) break;
      if (cx > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  const fn: EaseFn = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : calc(solveT(t), y1, y2));
  cache.set(key, fn);
  return fn;
}

export function toEaseFn(e: Easing | undefined, fallback: Easing = "easeOut"): EaseFn {
  const v = e ?? fallback;
  if (typeof v === "function") return v;
  if (v === "linear") return (t) => t;
  if (typeof v === "string") return cubicBezier(...NAMED[v]);
  return cubicBezier(v[0], v[1], v[2], v[3]);
}

export function bezierCss(b: Bezier): string {
  return `cubic-bezier(${b.join(", ")})`;
}

/** From source: module 8734 `w2` (easeOutCubic polynomial used by the billing bento counter). */
export const easeOutCubicPoly: EaseFn = (t) => 1 - (1 - t) ** 3;
