// Animation steps used by the form/code-editor ports. They mirror the reference's step classes
// (v1-chunk-DSWZA3DI AnimationSequence, v1-chunk-E6JMO43D AnimationGroup, v1-chunk-PCZ6HXRS Delay,
// v1-chunk-FOMI4ROK TypeAnimation, v1-chunk-XUTPP436 ExecutionFunction, v1-chunk-4Q7ZI5NX WAAPI step) with the
// same play/pause/finish/cancel semantics, but completion is a Promise instead of the reference's
// "AnimationStep:done" event bus. Timed steps run on requestAnimationFrame with elapsed time, so they stop
// in background tabs exactly like the reference's rAF-driven steps.

/** A playable animation step. `play()` starts or resumes it and resolves when it completes. */
export interface Step {
  play(): Promise<void>;
  pause(): void;
  /** Jump to the end state (the reference's finish(): typed text completes, WAAPI jumps to its last frame). */
  finish(): void;
  /** Stop and reset. A pending play() promise resolves; sequences stop advancing. */
  cancel(): void;
  readonly isPlaying: boolean;
  readonly isFinished: boolean;
}

abstract class BaseStep implements Step {
  isPlaying = false;
  isFinished = false;
  private resolveDone: (() => void) | null = null;
  private done: Promise<void> | null = null;

  play(): Promise<void> {
    if (this.isFinished) return Promise.resolve();
    if (!this.done) this.done = new Promise((res) => (this.resolveDone = res));
    const p = this.done;
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.start();
    }
    return p;
  }
  protected end(): void {
    if (this.isFinished) return;
    this.isPlaying = false;
    this.isFinished = true;
    this.settle();
  }
  protected settle(): void {
    const res = this.resolveDone;
    this.resolveDone = null;
    this.done = null;
    res?.();
  }
  cancel(): void {
    this.isPlaying = false;
    this.isFinished = false;
    this.stop(true);
    this.settle();
  }
  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stop(false);
  }
  abstract finish(): void;
  protected abstract start(): void;
  /** Halt timers; `reset` = cancel (forget progress) rather than pause. */
  protected abstract stop(reset: boolean): void;
}

/** Runs a function, then completes (reference ExecutionFunction step: finish() skips the function). */
export class Exec extends BaseStep {
  constructor(private readonly fn: () => void | Promise<void>) {
    super();
  }
  protected start(): void {
    Promise.resolve(this.fn()).then(() => this.end());
  }
  protected stop(): void {}
  finish(): void {
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
}

/**
 * Types `endString` one character per `speed` ms (reference TypeAnimation: the value for the current
 * position is emitted immediately on play, then one more character every `speed` ms; the step ends one
 * interval after the last character). `humanizeSpeed` is always on in the reference, which makes the
 * interval exactly `speed`.
 */
export class Type extends BaseStep {
  private position: number;
  private raf = 0;
  private base = 0;
  private t0 = 0;
  private lastEmitted = -1;
  constructor(
    private readonly opts: { endString: string; startString?: string; speed?: number; onUpdate: (value: string) => void },
  ) {
    super();
    const start = opts.startString ?? "";
    if (!opts.endString.startsWith(start)) throw new Error(`Can't type ${opts.endString} from ${start}`);
    this.position = start.length;
  }
  private get speed(): number {
    return this.opts.speed ?? 40;
  }
  private emit(pos: number): void {
    if (pos === this.lastEmitted) return;
    this.lastEmitted = pos;
    this.opts.onUpdate(this.opts.endString.substring(0, pos));
  }
  protected start(): void {
    const L = this.opts.endString.length;
    this.base = this.position;
    this.t0 = performance.now();
    const step = (now: number): boolean => {
      const k = this.speed > 0 ? Math.floor(Math.max(0, now - this.t0) / this.speed) : Infinity;
      const pos = this.base + k;
      if (pos > L) {
        this.emit(L);
        this.position = L + 1;
        this.end();
        return false;
      }
      this.emit(pos);
      this.position = pos + 1;
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
    if (reset) {
      this.position = 0;
      this.lastEmitted = -1;
    }
  }
  finish(): void {
    cancelAnimationFrame(this.raf);
    this.emit(this.opts.endString.length);
    this.end();
  }
}

type PerIndex<T> = T | ((i: number) => T);
const at = <T,>(v: PerIndex<T>, i: number): T => (typeof v === "function" ? (v as (i: number) => T)(i) : v);

export const DEFAULT_EASING = "cubic-bezier(.165, .84, .44, 1)";

/** Web Animations step (reference WAAPI step: 500ms, cubic-bezier(.165,.84,.44,1), fill forwards by default). */
export class Waapi extends BaseStep {
  readonly animations: Animation[] = [];
  private created = false;
  private pending = 0;
  constructor(
    private readonly opts: {
      el: Element | Element[];
      keyframes: PerIndex<Keyframe[]>;
      duration?: PerIndex<number>;
      delay?: PerIndex<number>;
      easing?: string;
      fill?: FillMode;
      iterations?: number;
    },
  ) {
    super();
  }
  private create(): void {
    if (this.created) return;
    this.created = true;
    const els = Array.isArray(this.opts.el) ? this.opts.el : [this.opts.el];
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
    if (els.length === 0) this.end();
  }
  protected start(): void {
    this.create();
    this.animations.forEach((a) => a.play());
  }
  protected stop(reset: boolean): void {
    this.animations.forEach((a) => (reset ? a.cancel() : a.pause()));
    if (reset) {
      this.animations.length = 0;
      this.created = false;
    }
  }
  finish(): void {
    this.create();
    this.animations.forEach((a) => a.finish());
  }
}

/** Plays steps together, optionally staggered (reference AnimationGroup). */
export class Group extends BaseStep {
  private timers: number[] = [];
  constructor(
    private readonly steps: Step[],
    private readonly stagger = 0,
  ) {
    super();
  }
  protected start(): void {
    const all = this.steps.map((s, i) =>
      this.stagger && !s.isPlaying
        ? new Promise<void>((res) => this.timers.push(window.setTimeout(() => s.play().then(res), this.stagger * i)))
        : s.play(),
    );
    Promise.all(all).then(() => {
      if (this.steps.every((s) => s.isFinished)) this.end();
    });
  }
  protected stop(reset: boolean): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.steps.forEach((s) => (reset ? s.cancel() : s.pause()));
  }
  finish(): void {
    this.timers.forEach(clearTimeout);
    this.steps.forEach((s) => s.finish());
    this.end();
  }
}

/** Plays steps one after another (reference AnimationSequence). */
export class Sequence extends BaseStep {
  private index = 0;
  private loop: Promise<void> | null = null;
  private generation = 0;
  constructor(private readonly steps: Step[]) {
    super();
  }
  protected start(): void {
    if (this.loop) {
      this.steps[this.index]?.play();
      return;
    }
    const gen = this.generation;
    this.loop = (async () => {
      while (this.index < this.steps.length) {
        await this.steps[this.index].play();
        if (gen !== this.generation) return;
        this.index += 1;
        if (!this.isPlaying) {
          this.loop = null;
          return;
        }
      }
      this.loop = null;
      this.end();
    })();
  }
  protected stop(reset: boolean): void {
    if (reset) {
      this.generation += 1;
      this.loop = null;
      this.steps.forEach((s) => s.cancel());
      this.index = 0;
    } else {
      this.steps[this.index]?.pause();
    }
  }
  finish(): void {
    this.generation += 1;
    this.loop = null;
    this.index = this.steps.length;
    this.steps.forEach((s) => s.finish());
    this.end();
  }
}

/** Resolves on the first animation frame at least `ms` after the call (reference sleep, v1-chunk-7LUJEHON). */
export function sleep(ms: number): Promise<void> {
  return new Promise((res) => {
    const t0 = performance.now();
    const tick = (t: number) => (t - t0 >= ms ? res() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

/** Reference humanizeDuration: ms plus up to half of it at random (unless `exact`). */
export function humanizeDuration(ms: number, exact = false): number {
  return exact ? ms : Math.round((Math.random() * ms) / 2) + ms;
}
