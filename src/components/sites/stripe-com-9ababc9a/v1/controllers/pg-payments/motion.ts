// Animation steps for the page-specific ports (pg-payments, pg-checkout, pg-payment-links, pg-elements,
// pg-link). They reproduce the reference's step classes — AnimationSequence (v1-chunk-DSWZA3DI),
// AnimationGroup (v1-chunk-E6JMO43D), Delay (v1-chunk-PCZ6HXRS), ExecutionFunction (v1-chunk-XUTPP436),
// TypeAnimation (v1-chunk-FOMI4ROK), the WAAPI step (v1-chunk-4Q7ZI5NX) and the rAF tween
// (v1-chunk-YGF75VGH) — with the same play / pause / finish / restart semantics. Completion is a Promise
// instead of the reference's bubbling "AnimationStep:done" event.
//
// The Step shape matches the one the "forms" group exposes (ShippingField.playAnimation() etc.), so those
// steps can be dropped into these sequences unchanged.

/** A playable animation step. `play()` starts or resumes it and resolves when it completes. */
export interface Step {
  play(): Promise<void>;
  pause(): void;
  /** Jump to the end state (WAAPI jumps to its last frame, typing completes, functions are skipped). */
  finish(): void;
  /** Stop and reset to the initial state (the reference's restart()/cancel()). */
  cancel(): void;
  readonly isPlaying: boolean;
  readonly isFinished: boolean;
  /** Paused mid-way and not cancelled/finished since (optional for steps from other groups). */
  readonly isPaused?: boolean;
}

abstract class BaseStep implements Step {
  isPlaying = false;
  isFinished = false;
  /** Paused mid-way (and not cancelled or finished since). */
  isPaused = false;
  private resolveDone: (() => void) | null = null;
  private done: Promise<void> | null = null;

  play(): Promise<void> {
    if (this.isFinished) return Promise.resolve();
    if (!this.done) this.done = new Promise((res) => (this.resolveDone = res));
    const p = this.done;
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.isPaused = false;
      this.start();
    }
    return p;
  }
  protected end(): void {
    if (this.isFinished) return;
    this.isPlaying = false;
    this.isPaused = false;
    this.isFinished = true;
    this.settle();
  }
  private settle(): void {
    const res = this.resolveDone;
    this.resolveDone = null;
    this.done = null;
    res?.();
  }
  cancel(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.isFinished = false;
    this.stop(true);
    this.settle();
  }
  /** Alias of cancel(): the reference calls this before replaying a step. */
  restart(): void {
    this.cancel();
  }
  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.isPaused = true;
    this.stop(false);
  }
  abstract finish(): void;
  protected abstract start(): void;
  /** Halt timers; `reset` forgets progress (cancel) instead of keeping it (pause). */
  protected abstract stop(reset: boolean): void;
}

/** Runs a function (sync or async), then completes. finish() skips the function, like the reference. */
export class Exec extends BaseStep {
  private run = 0;
  constructor(private readonly fn: () => void | Promise<void>) {
    super();
  }
  protected start(): void {
    const run = ++this.run;
    Promise.resolve(this.fn()).then(() => {
      if (run === this.run) this.end();
    });
  }
  protected stop(reset: boolean): void {
    if (reset) this.run += 1;
  }
  finish(): void {
    this.run += 1;
    this.end();
  }
}

/** Waits `duration` ms of animation-frame time; pausing keeps the remaining time. */
export class Delay extends BaseStep {
  private remaining: number;
  private raf = 0;
  private startedAt = 0;
  constructor(private readonly duration: number) {
    super();
    this.remaining = duration;
  }
  protected start(): void {
    this.startedAt = performance.now();
    if (this.remaining <= 0) {
      queueMicrotask(() => this.isPlaying && this.end());
      return;
    }
    const tick = (t: number) => {
      if (t - this.startedAt >= this.remaining) this.end();
      else this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  protected stop(reset: boolean): void {
    cancelAnimationFrame(this.raf);
    this.remaining = reset ? this.duration : Math.max(0, this.remaining - (performance.now() - this.startedAt));
  }
  finish(): void {
    cancelAnimationFrame(this.raf);
    this.end();
  }
  protected override end(): void {
    cancelAnimationFrame(this.raf);
    this.remaining = this.duration;
    super.end();
  }
}

/**
 * Types `endString` one character every `speed` ms (reference TypeAnimation: the value for the current
 * position is emitted on play, then one more character per interval; the step ends one interval after the
 * last character. `humanizeSpeed` is always true in the reference, which makes the interval exactly `speed`).
 */
export class Type extends BaseStep {
  private position: number;
  private raf = 0;
  private base = 0;
  private t0 = 0;
  constructor(private readonly opts: { endString: string; startString?: string; speed?: number; onUpdate: (value: string) => void }) {
    super();
    this.position = (opts.startString ?? "").length;
  }
  protected start(): void {
    const speed = this.opts.speed ?? 40;
    const len = this.opts.endString.length;
    this.base = this.position;
    this.t0 = performance.now();
    let emitted = -1;
    const step = (now: number): boolean => {
      const pos = this.base + Math.floor(Math.max(0, now - this.t0) / speed);
      if (pos > len) {
        if (emitted !== len) this.opts.onUpdate(this.opts.endString);
        this.position = len + 1;
        this.end();
        return false;
      }
      if (pos !== emitted) {
        emitted = pos;
        this.opts.onUpdate(this.opts.endString.substring(0, pos));
      }
      this.position = pos;
      return true;
    };
    if (!step(this.t0)) return;
    const tick = (t: number) => {
      if (step(t)) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  protected stop(reset: boolean): void {
    cancelAnimationFrame(this.raf);
    if (reset) this.position = (this.opts.startString ?? "").length;
  }
  finish(): void {
    cancelAnimationFrame(this.raf);
    this.opts.onUpdate(this.opts.endString);
    this.end();
  }
}

type PerIndex<T> = T | ((i: number) => T);
const at = <T>(v: PerIndex<T>, i: number): T => (typeof v === "function" ? (v as (i: number) => T)(i) : v);

/** Reference WAAPI step defaults: 500 ms, cubic-bezier(.165,.84,.44,1), fill forwards. */
export const DEFAULT_EASING = "cubic-bezier(.165, .84, .44, 1)";

export interface WaapiOptions {
  el: Element | null | undefined | (Element | null | undefined)[];
  /** Evaluated when the step first plays (per element index), like the reference. */
  keyframes: PerIndex<Keyframe[]>;
  duration?: PerIndex<number>;
  delay?: PerIndex<number>;
  easing?: string;
  fill?: FillMode;
  iterations?: number;
}

/** Web Animations step. Animations are created on first play and cancelled (fill removed) on cancel(). */
export class Waapi extends BaseStep {
  readonly animations: Animation[] = [];
  private created = false;
  private pending = 0;
  constructor(private readonly opts: WaapiOptions) {
    super();
  }
  private create(): void {
    if (this.created) return;
    this.created = true;
    const els = (Array.isArray(this.opts.el) ? this.opts.el : [this.opts.el]).filter((e): e is Element => !!e);
    this.pending = els.length;
    els.forEach((el, i) => {
      const a = el.animate(at(this.opts.keyframes, i), {
        duration: at(this.opts.duration ?? 500, i),
        delay: at(this.opts.delay ?? 0, i),
        easing: this.opts.easing ?? DEFAULT_EASING,
        fill: this.opts.fill ?? "forwards",
        iterations: this.opts.iterations ?? 1,
      });
      a.pause();
      a.onfinish = () => {
        this.pending -= 1;
        if (this.pending <= 0) this.end();
      };
      this.animations.push(a);
    });
  }
  protected start(): void {
    this.create();
    if (this.pending <= 0) {
      queueMicrotask(() => this.isPlaying && this.end());
      return;
    }
    this.animations.forEach((a) => a.play());
  }
  protected stop(reset: boolean): void {
    if (reset) {
      this.animations.forEach((a) => {
        a.onfinish = null;
        a.cancel();
      });
      this.animations.length = 0;
      this.created = false;
    } else this.animations.forEach((a) => a.pause());
  }
  finish(): void {
    this.create();
    this.animations.forEach((a) => {
      a.onfinish = null;
      a.finish();
    });
    this.end();
  }
}

/** rAF tween from `start` to `end` over `duration` (reference v1-chunk-YGF75VGH, default easing [.25,1,.5,1]). */
export class Tween extends BaseStep {
  private raf = 0;
  private elapsed = 0;
  private t0 = 0;
  private readonly ease: (t: number) => number;
  constructor(
    private readonly opts: { duration?: number; from?: number; to?: number; easing?: [number, number, number, number]; onUpdate: (v: number) => void },
  ) {
    super();
    this.ease = cubicBezier(...(opts.easing ?? [0.25, 1, 0.5, 1]));
  }
  private value(p: number): number {
    const a = this.opts.from ?? 0;
    const b = this.opts.to ?? 1;
    return a + this.ease(p) * (b - a);
  }
  protected start(): void {
    const d = this.opts.duration ?? 500;
    this.t0 = performance.now() - this.elapsed;
    const tick = (t: number) => {
      this.elapsed = t - this.t0;
      const p = d > 0 ? Math.min(1, this.elapsed / d) : 1;
      this.opts.onUpdate(this.value(p));
      if (p >= 1) this.end();
      else this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  protected stop(reset: boolean): void {
    cancelAnimationFrame(this.raf);
    if (reset) this.elapsed = 0;
  }
  finish(): void {
    cancelAnimationFrame(this.raf);
    this.end();
  }
  protected override end(): void {
    cancelAnimationFrame(this.raf);
    this.elapsed = 0;
    this.opts.onUpdate(this.opts.to ?? 1);
    super.end();
  }
}

/** Plays steps together, optionally staggered (reference AnimationGroup). */
export class Group extends BaseStep {
  private timers: Delay[] = [];
  private run = 0;
  constructor(
    private readonly steps: (Step | null | undefined | false)[],
    private readonly stagger = 0,
  ) {
    super();
  }
  private get list(): Step[] {
    return this.steps.filter((s): s is Step => !!s);
  }
  protected start(): void {
    const run = this.run;
    const list = this.list;
    if (!this.timers.length && this.stagger) this.timers = list.map((_, i) => new Delay(this.stagger * i));
    const all = list.map((s, i) => {
      const t = this.timers[i];
      return t && !t.isFinished ? t.play().then(() => (run === this.run && this.isPlaying ? s.play() : undefined)) : s.play();
    });
    Promise.all(all).then(() => {
      if (run === this.run && list.every((s) => s.isFinished)) this.end();
    });
  }
  protected stop(reset: boolean): void {
    this.timers.forEach((t) => (reset ? t.cancel() : t.pause()));
    if (reset) {
      this.run += 1;
      this.timers = [];
    }
    this.list.forEach((s) => (reset ? s.cancel() : s.pause()));
  }
  finish(): void {
    this.run += 1;
    this.timers.forEach((t) => t.cancel());
    this.timers = [];
    this.list.forEach((s) => s.finish());
    this.end();
  }
}

/** Plays steps one after another (reference AnimationSequence). */
export class Sequence extends BaseStep {
  private index = 0;
  private looping = false;
  private run = 0;
  private readonly steps: Step[];
  constructor(steps: (Step | null | undefined | false)[]) {
    super();
    this.steps = steps.filter((s): s is Step => !!s);
  }
  protected start(): void {
    if (this.looping) {
      this.steps[this.index]?.play();
      return;
    }
    this.looping = true;
    const run = this.run;
    const next = (): void => {
      if (run !== this.run) return;
      if (this.index >= this.steps.length) {
        this.looping = false;
        this.end();
        return;
      }
      this.steps[this.index].play().then(() => {
        if (run !== this.run) return;
        if (!this.steps[this.index]?.isFinished) return; // cancelled from outside
        this.index += 1;
        if (this.isPlaying) next();
        else this.looping = false;
      });
    };
    next();
  }
  protected stop(reset: boolean): void {
    if (reset) {
      this.run += 1;
      this.looping = false;
      this.steps.forEach((s) => s.cancel());
      this.index = 0;
    } else this.steps[this.index]?.pause();
  }
  finish(): void {
    this.run += 1;
    this.looping = false;
    this.index = this.steps.length;
    this.steps.forEach((s) => s.finish());
    this.end();
  }
}

/** Resolves on the first frame at least `ms` after the call. */
export function sleep(ms: number): Promise<void> {
  return new Promise((res) => {
    const t0 = performance.now();
    const tick = (t: number) => (t - t0 >= ms ? res() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress (Newton–Raphson with bisection fallback). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  if (x1 === y1 && x2 === y2) return (t) => t;
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
      t = (hi - lo) / 2 + lo;
    }
    return t;
  };
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sy(solve(t)));
}

/** Named easings of the reference (v1-chunk-PE5OG4GE). */
export const EASE = {
  inSine: "cubic-bezier(0.12, 0, 0.39, 0)",
  outSine: "cubic-bezier(0.61, 1, 0.88, 1)",
  inOutSine: "cubic-bezier(0.45, 0, 0.55, 1)",
  inCubic: "cubic-bezier(0.32, 0, 0.67, 0)",
  outCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
  inOutCubic: "cubic-bezier(0.65, 0, 0.35, 1)",
  outQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
  inOutQuart: "cubic-bezier(0.76, 0, 0.24, 1)",
  inQuint: "cubic-bezier(0.64, 0, 0.78, 0)",
  outQuint: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOutQuint: "cubic-bezier(0.83, 0, 0.17, 1)",
  inExpo: "cubic-bezier(0.7, 0, 0.84, 0)",
  outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  outCirc: "cubic-bezier(0, 0.55, 0.45, 1)",
  inBack: "cubic-bezier(0.36, 0, 0.66, -0.56)",
  outBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Is `v` a Step (e.g. one returned by another group's controller API)? */
export function isStep(v: unknown): v is Step {
  return !!v && typeof (v as Step).play === "function" && typeof (v as Step).cancel === "function";
}
