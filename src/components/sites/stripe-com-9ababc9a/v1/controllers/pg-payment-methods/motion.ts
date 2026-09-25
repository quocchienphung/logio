// Small motion toolkit shared by the pg-payment-methods / pg-terminal / pg-authorization-boost /
// pg-financial-connections ports. It replaces the reference's step classes (v1-chunk-4Q7ZI5NX WAAPI step,
// v1-chunk-DSWZA3DI sequence, v1-chunk-E6JMO43D group, v1-chunk-PCZ6HXRS delay, v1-chunk-XUTPP436 exec,
// v1-chunk-YGF75VGH rAF tween, v1-chunk-FOMI4ROK type animation) with one async timeline:
//   - sequences are `await` chains, groups are Promise.all;
//   - every WAAPI animation, delay and tween started through a Timeline can be paused/resumed together
//     (offscreen / hidden tab) and aborted (pending awaits reject with Aborted);
//   - delays and tweens run on elapsed time, excluding paused time.

/** Reference WAAPI step defaults (v1-chunk-4Q7ZI5NX): 500ms, forwards fill, this easing. */
export const DEFAULT_EASING = "cubic-bezier(.165, .84, .44, 1)";
/** v1-chunk-PE5OG4GE exports, by the names the reference modules import. */
export const EASE = {
  outCubic: "cubic-bezier(0.33, 1, 0.68, 1)", // PE5OG4GE.e
  inOutCubic: "cubic-bezier(0.65, 0, 0.35, 1)", // PE5OG4GE.f
  outQuint: "cubic-bezier(0.22, 1, 0.36, 1)", // PE5OG4GE.j
  outQuart: "cubic-bezier(0.25, 1, 0.5, 1)", // PE5OG4GE.g
} as const;

export class Aborted extends Error {
  constructor() {
    super("aborted");
    this.name = "Aborted";
  }
}
export const isAborted = (e: unknown): boolean => e instanceof Aborted;
/** Swallow Aborted rejections of a fire-and-forget sequence; rethrow anything else to the console. */
export function run(p: Promise<unknown>): void {
  p.catch((e: unknown) => {
    if (!isAborted(e)) console.error(e);
  });
}

type PerIndex<T> = T | ((i: number) => T);
const at = <T>(v: PerIndex<T>, i: number): T => (typeof v === "function" ? (v as (i: number) => T)(i) : v);

export interface AnimateOptions {
  duration?: PerIndex<number>;
  delay?: PerIndex<number>;
  easing?: string;
  endDelay?: number;
  iterations?: number;
  fill?: FillMode;
}

interface Timer {
  remaining: number;
  start: number;
  id: number;
  resolve: () => void;
  reject: (e: Aborted) => void;
}
interface Tween {
  elapsed: number;
  start: number;
  raf: number;
  frame: (now: number) => void;
  reject: (e: Aborted) => void;
}

/** A group of cancellable, pausable animation primitives. */
export class Timeline {
  private readonly running = new Set<Animation>();
  private readonly settled = new Set<Animation>();
  private readonly timers = new Set<Timer>();
  private readonly tweens = new Set<Tween>();
  private _paused = false;
  /** Bumped by abort(): steps started under an older epoch are dropped. */
  private epoch = 0;

  get paused(): boolean {
    return this._paused;
  }

  /** WAAPI animation on one element or a list (per-index keyframes/duration/delay like the reference). */
  animate(targets: Element | Element[], keyframes: PerIndex<Keyframe[]>, opts: AnimateOptions = {}): Promise<void> {
    const els = Array.isArray(targets) ? targets : [targets];
    const epoch = this.epoch;
    const all = els.map((el, i) => {
      const a = el.animate(at(keyframes, i), {
        duration: opts.duration === undefined ? 500 : at(opts.duration, i),
        delay: opts.delay === undefined ? 0 : at(opts.delay, i),
        endDelay: opts.endDelay ?? 0,
        iterations: opts.iterations ?? 1,
        easing: opts.easing || DEFAULT_EASING,
        fill: opts.fill ?? "forwards",
      });
      if (this._paused) a.pause();
      this.running.add(a);
      return a.finished.then(
        () => {
          this.running.delete(a);
          this.settled.add(a);
          if (epoch !== this.epoch) throw new Aborted();
        },
        () => {
          this.running.delete(a);
          throw new Aborted();
        },
      );
    });
    return Promise.all(all).then(() => undefined);
  }

  /** Elapsed-time delay (reference Delay step). */
  wait(ms: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const t: Timer = { remaining: Math.max(0, ms), start: 0, id: 0, resolve, reject };
      this.timers.add(t);
      if (!this._paused) this.startTimer(t);
    });
  }

  /** rAF tween from `from` to `to` (reference v1-chunk-YGF75VGH): calls update(value) each frame and
   * update(to) at the end. `ease` maps linear progress 0..1. */
  tween(duration: number, ease: (t: number) => number, update: (v: number) => void, from = 0, to = 1): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (duration <= 0) {
        update(to);
        resolve();
        return;
      }
      const tw: Tween = {
        elapsed: 0,
        start: 0,
        raf: 0,
        reject,
        frame: (now) => {
          tw.elapsed = now - tw.start;
          const p = Math.min(1, tw.elapsed / duration);
          if (p >= 1) {
            this.tweens.delete(tw);
            update(to);
            resolve();
            return;
          }
          update(from + ease(p) * (to - from));
          tw.raf = requestAnimationFrame(tw.frame);
        },
      };
      this.tweens.add(tw);
      if (!this._paused) {
        tw.start = performance.now();
        tw.raf = requestAnimationFrame(tw.frame);
      }
    });
  }

  pause(): void {
    if (this._paused) return;
    this._paused = true;
    const now = performance.now();
    this.running.forEach((a) => a.pause());
    this.timers.forEach((t) => {
      clearTimeout(t.id);
      t.remaining -= now - t.start;
    });
    this.tweens.forEach((tw) => {
      cancelAnimationFrame(tw.raf);
      tw.elapsed = now - tw.start;
    });
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    const now = performance.now();
    this.running.forEach((a) => a.play());
    this.timers.forEach((t) => this.startTimer(t));
    this.tweens.forEach((tw) => {
      tw.start = now - tw.elapsed;
      tw.raf = requestAnimationFrame(tw.frame);
    });
  }

  /** Stops every pending step (their awaits reject with Aborted). `effects`: "cancel" removes the running
   * animations' effects, "keep" leaves them frozen where they are (a paused reference step). */
  abort(effects: "cancel" | "keep" = "cancel"): void {
    this.epoch += 1;
    const err = new Aborted();
    this.timers.forEach((t) => {
      clearTimeout(t.id);
      t.reject(err);
    });
    this.timers.clear();
    this.tweens.forEach((tw) => {
      cancelAnimationFrame(tw.raf);
      tw.reject(err);
    });
    this.tweens.clear();
    if (effects === "cancel") this.running.forEach((a) => a.cancel());
    else this.running.forEach((a) => a.pause());
    this.running.clear();
  }

  /** Removes the fill effects of finished animations (the reference's restart()). */
  clearFills(): void {
    this.settled.forEach((a) => a.cancel());
    this.settled.clear();
  }

  /** abort() + clearFills(): back to the CSS/inline state (reference sequence.restart()). */
  reset(): void {
    this.abort("cancel");
    this.clearFills();
  }

  private startTimer(t: Timer): void {
    t.start = performance.now();
    t.id = window.setTimeout(() => {
      this.timers.delete(t);
      t.resolve();
    }, t.remaining);
  }
}

/** cubic-bezier(x1,y1,x2,y2) timing function (the reference uses the bezier-easing package for tweens). */
export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) return t;
      if (x > v) lo = t;
      else hi = t;
      if (hi - lo < 1e-7) break;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
}

/** Reference button press (v1-chunk-LNF4ZVUH `a`): scale 1 → s @70% → 1, 600ms, default easing. */
export function pressKeyframes(scale = 0.92): Keyframe[] {
  return [{ transform: "scale(1.0)" }, { transform: `scale(${scale})`, offset: 0.7 }, { transform: "scale(1.0)" }];
}

/**
 * Reference TypeAnimation (v1-chunk-FOMI4ROK): writes endString one character at a time. The reference
 * passes humanizeSpeed `|| true`, so humanizeDuration (v1-chunk-7LUJEHON) always returns `speed` unchanged:
 * the first update ("") is immediate, then one character every `speed` ms, and the step ends one interval
 * after the last character: (length + 1) × speed in total.
 */
export async function typeText(tl: Timeline, write: (s: string) => void, endString: string, speed: number): Promise<void> {
  for (let pos = 0; pos <= endString.length; pos++) {
    write(endString.slice(0, pos));
    await tl.wait(speed);
  }
}

/**
 * Calls `cb(active)` when the element is on screen (IntersectionObserver, `threshold`) and the tab is
 * visible; `active` only changes on transitions. Returns a cleanup.
 */
export function whenActive(el: Element, cb: (active: boolean) => void, threshold = 0): () => void {
  let visible = false;
  let active = false;
  const update = () => {
    const next = visible && !document.hidden;
    if (next !== active) {
      active = next;
      cb(active);
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1];
      visible = e.isIntersecting && e.intersectionRatio >= threshold;
      update();
    },
    { threshold },
  );
  io.observe(el);
  document.addEventListener("visibilitychange", update);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", update);
  };
}

/** Pauses/resumes a timeline with the page visibility only (for work that the reference keeps running offscreen
 * but which would otherwise run in a hidden tab). */
export function pauseWhenHidden(tl: Timeline): () => void {
  const h = () => (document.hidden ? tl.pause() : tl.resume());
  document.addEventListener("visibilitychange", h);
  return () => document.removeEventListener("visibilitychange", h);
}
