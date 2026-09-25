// Motion helpers shared by the pg-invoicing / pg-tax / pg-revenue-recognition / pg-sigma /
// pg-data-pipeline ports. They mirror the reference's animation-step toolkit as clean TypeScript:
//   v1-chunk-4Q7ZI5NX.js  WAAPI step   (defaults: 500 ms, "cubic-bezier(.165, .84, .44, 1)", fill forwards)
//   v1-chunk-PCZ6HXRS.js  Delay step   (elapsed-time wait, pausable)
//   v1-chunk-E6JMO43D.js  parallel group, v1-chunk-DSWZA3DI.js sequence, v1-chunk-XUTPP436.js function step
// Instead of the reference's "AnimationStep:done" event bus, sequences are plain async code awaiting
// promises from a Clock. A Clock owns every Web Animation and timer a controller starts, so it can pause
// them all (offscreen / hidden tab) and resume them, and drop them on cleanup. Promises of work
// cancelled by dispose() never settle, so pending async sequences simply stop.

/** Default easing of the reference WAAPI step (v1-chunk-4Q7ZI5NX.js). */
export const EASE_DEFAULT = "cubic-bezier(.165, .84, .44, 1)";

export interface AnimateOptions {
  duration?: number | ((i: number) => number);
  delay?: number | ((i: number) => number);
  easing?: string;
  fill?: FillMode;
  iterations?: number;
  endDelay?: number;
}

/** Something that can be paused and resumed with the clock (e.g. another group's step object). */
export interface Pausable {
  pause(): void;
  play(): unknown;
}

type Target = Element | null | undefined;

interface Timer {
  id: number;
  remaining: number;
  startedAt: number;
  fn: () => void;
}

export class Clock {
  private readonly anims = new Set<Animation>();
  private readonly timers = new Set<Timer>();
  private readonly externals = new Set<Pausable>();
  private disposed = false;
  paused = false;
  /** Instant clocks (reduced motion) run every animation with 0 duration/delay and every wait as 0 ms. */
  readonly instant: boolean;

  constructor(opts: { instant?: boolean } = {}) {
    this.instant = !!opts.instant;
  }

  /**
   * Starts one Web Animation per element (reference WAAPI step). Keyframes, duration and delay may be
   * functions of the element index. Resolves when every animation has finished; never settles if the
   * clock is disposed or the animations are cancelled.
   */
  animate(targets: Target | Target[], keyframes: Keyframe[] | ((i: number) => Keyframe[]), opts: AnimateOptions = {}): Promise<void> {
    if (this.disposed) return new Promise(() => {});
    const els = (Array.isArray(targets) ? targets : [targets]).filter((t): t is Element => !!t);
    const list = els.map((el, i) => {
      const a = el.animate(typeof keyframes === "function" ? keyframes(i) : keyframes, {
        duration: this.instant ? 0 : typeof opts.duration === "function" ? opts.duration(i) : (opts.duration ?? 500),
        delay: this.instant ? 0 : typeof opts.delay === "function" ? opts.delay(i) : (opts.delay ?? 0),
        easing: opts.easing ?? EASE_DEFAULT,
        fill: opts.fill ?? "forwards",
        iterations: opts.iterations ?? 1,
        endDelay: this.instant ? 0 : (opts.endDelay ?? 0),
      });
      this.anims.add(a);
      if (this.paused) a.pause();
      return a;
    });
    return new Promise((resolve) => {
      Promise.all(list.map((a) => a.finished)).then(
        () => {
          list.forEach((a) => this.anims.delete(a));
          if (!this.disposed) resolve();
        },
        () => list.forEach((a) => this.anims.delete(a)),
      );
    });
  }

  /** Waits `ms` of unpaused time (reference Delay step). */
  wait(ms: number): Promise<void> {
    if (this.disposed) return new Promise(() => {});
    return new Promise((resolve) => this.after(this.instant ? 0 : ms, resolve));
  }

  /** Calls `fn` after `ms` of unpaused time. Returns a cancel function. */
  after(ms: number, fn: () => void): () => void {
    const t: Timer = { id: 0, remaining: Math.max(0, ms), startedAt: 0, fn };
    const fire = () => {
      this.timers.delete(t);
      if (!this.disposed) fn();
    };
    t.fn = fire;
    this.timers.add(t);
    if (!this.paused) this.startTimer(t);
    return () => {
      clearTimeout(t.id);
      this.timers.delete(t);
    };
  }

  /** Runs a step object owned elsewhere (e.g. the forms group's card field) under this clock. */
  async run(step: Pausable & { play(): Promise<void> | void }): Promise<void> {
    if (this.disposed) return new Promise(() => {});
    this.externals.add(step);
    const p = step.play();
    if (this.paused) step.pause();
    await p;
    this.externals.delete(step);
    if (this.disposed) return new Promise(() => {});
  }

  pause(): void {
    if (this.paused || this.disposed) return;
    this.paused = true;
    const now = performance.now();
    this.anims.forEach((a) => a.playState === "running" && a.pause());
    this.timers.forEach((t) => {
      clearTimeout(t.id);
      t.remaining = Math.max(0, t.remaining - (now - t.startedAt));
    });
    this.externals.forEach((s) => s.pause());
  }

  resume(): void {
    if (!this.paused || this.disposed) return;
    this.paused = false;
    this.anims.forEach((a) => a.playState === "paused" && a.play());
    this.timers.forEach((t) => this.startTimer(t));
    this.externals.forEach((s) => void s.play());
  }

  /** Stops timers; leaves finished fill effects in place unless `cancelAnimations`. */
  dispose(cancelAnimations = false): void {
    this.disposed = true;
    this.timers.forEach((t) => clearTimeout(t.id));
    this.timers.clear();
    this.anims.forEach((a) => (cancelAnimations ? a.cancel() : a.pause()));
    this.anims.clear();
    this.externals.forEach((s) => s.pause());
    this.externals.clear();
  }

  /** Jumps every running animation to its end (the reference step finish()). */
  finishAll(): void {
    this.anims.forEach((a) => {
      try {
        a.finish();
      } catch {
        /* infinite animations cannot finish */
      }
    });
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  private startTimer(t: Timer): void {
    t.startedAt = performance.now();
    t.id = window.setTimeout(t.fn, t.remaining);
  }
}

/**
 * Pauses `clock` while `el` is offscreen or the tab is hidden, resumes it otherwise. `onChange`
 * receives the combined state. The clock starts paused until the first intersection report.
 */
export function gateClock(clock: Clock, el: Element, onChange?: (active: boolean) => void, threshold = 0): () => void {
  let visible = false;
  let hidden = typeof document !== "undefined" && document.hidden;
  let active: boolean | null = null;
  const update = () => {
    const next = visible && !hidden;
    if (next === active) return;
    active = next;
    if (next) clock.resume();
    else clock.pause();
    onChange?.(next);
  };
  clock.pause();
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1];
      visible = threshold > 0 ? e.intersectionRatio >= threshold : e.isIntersecting;
      update();
    },
    { threshold },
  );
  io.observe(el);
  const onVis = () => {
    hidden = document.hidden;
    update();
  };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
}

/**
 * The reference ScrollObserver (v1-chunk-HMRIQCRQ.js) with requireThreshold: every callback whose
 * first entry reaches `threshold` is an "intersect", anything else (including the initial report of
 * an offscreen element) a "separate". `once` disconnects after the first intersect.
 */
export function scrollObserver(
  el: Element,
  threshold: number,
  onIntersect: () => void,
  onSeparate?: () => void,
  once = false,
): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].intersectionRatio >= threshold) {
        onIntersect();
        if (once) io.disconnect();
      } else onSeparate?.();
    },
    { threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Reference Environment.disableAmbientAnimations(): reduced motion (SwiftShader check omitted, see motion doc). */
export function disableAmbientAnimations(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
