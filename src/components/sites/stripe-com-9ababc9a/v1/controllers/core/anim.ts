// Small WAAPI animation framework used by the animated icons (and reusable by other groups):
//   Step     ← v1-chunk-4Q7ZI5NX.js (Element.animate wrapper; defaults 500 ms, "cubic-bezier(.165, .84, .44, 1)", fill forwards)
//   Group    ← v1-chunk-E6JMO43D.js (parallel, optional stagger)
//   Sequence ← v1-chunk-DSWZA3DI.js (serial)
//   Delay    ← v1-chunk-PCZ6HXRS.js (rAF-timed pause, resumable)
// The reference routes child completion through bubbling "AnimationStep:done" DOM events keyed by an
// owner UUID; here children report to their parent through a callback. A playable created with
// `dispatch: true` (or a `name`) still dispatches the bubbling "AnimationStep:done" CustomEvent
// (detail: { el, name }) from its element when it completes, like the reference.
// Semantics kept from the reference: a finished playable ignores play() until restart().

export interface Playable {
  readonly isPlaying: boolean;
  readonly isFinished: boolean;
  /** Resolves when the current run completes (renewed by restart()). */
  readonly finished: Promise<void>;
  play(): void;
  pause(): void;
  restart(): void;
  cancel(): void;
  finish(): void;
  /** Completion hook used by a parent Group/Sequence. */
  onDone: (() => void) | null;
}

interface BaseOptions {
  el: Element;
  name?: string;
  dispatch?: boolean;
}

abstract class Base implements Playable {
  isPlaying = false;
  isFinished = false;
  finished!: Promise<void>;
  onDone: (() => void) | null = null;
  private resolveFinished: (() => void) | null = null;
  protected readonly el: Element;
  readonly name?: string;
  private readonly dispatch: boolean;

  constructor(opts: BaseOptions) {
    this.el = opts.el;
    this.name = opts.name;
    this.dispatch = !!(opts.dispatch || opts.name);
    this.renewFinished();
  }
  protected renewFinished(): void {
    this.finished = new Promise((r) => (this.resolveFinished = r));
  }
  protected complete(from: Element = this.el): void {
    this.isPlaying = false;
    this.isFinished = true;
    if (this.dispatch) from.dispatchEvent(new CustomEvent("AnimationStep:done", { bubbles: true, detail: { el: from, name: this.name } }));
    this.resolveFinished?.();
    this.onDone?.();
  }
  abstract play(): void;
  abstract pause(): void;
  abstract restart(): void;
  abstract cancel(): void;
  abstract finish(): void;
}

type PerIndex<T> = T | ((index: number) => T);
const at = <T,>(v: PerIndex<T>, i: number): T => (typeof v === "function" ? (v as (index: number) => T)(i) : v);

export interface StepOptions {
  el: Element | Element[];
  keyframes: PerIndex<Keyframe[]>;
  duration?: PerIndex<number>;
  delay?: PerIndex<number>;
  endDelay?: number;
  easing?: string;
  fill?: FillMode;
  iterations?: number;
  name?: string;
  dispatch?: boolean;
}

export const DEFAULT_EASING = "cubic-bezier(.165, .84, .44, 1)";

export class Step extends Base {
  private readonly targets: Element[];
  private anims = new Set<Animation>();
  private done = new Set<Animation>();
  private initialized = false;

  constructor(private readonly opts: StepOptions) {
    super({ el: Array.isArray(opts.el) ? (opts.el[0] ?? document.body) : opts.el, name: opts.name, dispatch: opts.dispatch });
    this.targets = Array.isArray(opts.el) ? opts.el : [opts.el];
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;
    let count = 0;
    this.targets.forEach((node, i) => {
      const a = node.animate(at(this.opts.keyframes, i), {
        fill: this.opts.fill ?? "forwards",
        duration: at(this.opts.duration ?? 500, i),
        delay: at(this.opts.delay ?? 0, i),
        endDelay: this.opts.endDelay ?? 0,
        iterations: this.opts.iterations ?? 1,
        easing: this.opts.easing ?? DEFAULT_EASING,
      });
      a.pause();
      this.anims.add(a);
      a.onfinish = () => {
        count += 1;
        this.done.add(a);
        this.anims.delete(a);
        if (count === this.targets.length && this.anims.size === 0) this.complete(node);
      };
    });
  }

  play(): void {
    if (this.anims.size === 0 && this.initialized) return;
    this.init();
    this.isPlaying = true;
    if (this.targets.length === 0) {
      queueMicrotask(() => this.complete());
      return;
    }
    this.anims.forEach((a) => a.play());
  }
  pause(): void {
    this.isPlaying = false;
    this.anims.forEach((a) => a.pause());
  }
  cancel(): void {
    this.isPlaying = false;
    this.anims.forEach((a) => a.cancel());
  }
  restart(): void {
    this.initialized = false;
    this.isPlaying = false;
    this.isFinished = false;
    this.renewFinished();
    this.done.forEach((a) => a.cancel());
    this.anims.forEach((a) => {
      a.pause();
      a.cancel();
    });
    this.anims = new Set();
    this.done = new Set();
  }
  finish(): void {
    this.init();
    this.anims.forEach((a) => a.finish());
  }
}

export interface GroupOptions extends BaseOptions {
  animations: Playable[];
  stagger?: number;
}

export class Group extends Base {
  private listening = false;
  private count = 0;
  private timers: number[] = [];
  private readonly animations: Playable[];
  private readonly stagger?: number;

  constructor(opts: GroupOptions) {
    super(opts);
    this.animations = opts.animations;
    this.stagger = opts.stagger;
    this.animations.forEach((a) => {
      a.onDone = () => {
        if (!this.listening) return;
        this.count += 1;
        if (this.count === this.animations.length) {
          this.listening = false;
          this.complete();
        }
      };
    });
  }
  play(): void {
    if (this.name) this.el.dispatchEvent(new CustomEvent("AnimationStep:before", { bubbles: true, detail: { el: this.el, name: this.name } }));
    this.isPlaying = true;
    this.listening = true;
    this.animations.forEach((a, i) => {
      if (this.stagger) this.timers.push(window.setTimeout(() => a.play(), this.stagger * i));
      else a.play();
    });
  }
  pause(): void {
    this.isPlaying = false;
    this.listening = false;
    this.clearTimers();
    this.animations.forEach((a) => a.pause());
  }
  restart(): void {
    this.isPlaying = false;
    this.isFinished = false;
    this.count = 0;
    this.clearTimers();
    this.renewFinished();
    this.animations.forEach((a) => a.restart());
  }
  cancel(): void {
    this.isPlaying = false;
    this.isFinished = false;
    this.count = 0;
    this.listening = false;
    this.clearTimers();
    this.animations.forEach((a) => a.cancel());
  }
  finish(): void {
    this.animations.forEach((a) => a.finish());
  }
  private clearTimers() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }
}

export interface SequenceOptions extends BaseOptions {
  steps: Playable[];
}

export class Sequence extends Base {
  private listening = false;
  private index = 0;
  private readonly steps: Playable[];

  constructor(opts: SequenceOptions) {
    super(opts);
    this.steps = opts.steps;
    this.steps.forEach((s) => {
      s.onDone = () => {
        if (!this.listening) return;
        if (this.index < this.steps.length - 1) {
          this.index += 1;
          this.play();
        } else {
          this.listening = false;
          this.complete();
        }
      };
    });
  }
  get currentStep(): Playable | undefined {
    return this.steps[this.index];
  }
  play(): void {
    this.listening = true;
    this.isPlaying = true;
    this.currentStep?.play();
  }
  pause(): void {
    this.listening = false;
    this.currentStep?.pause();
    this.isPlaying = false;
  }
  restart(): void {
    this.isPlaying = false;
    this.isFinished = false;
    this.index = 0;
    this.renewFinished();
    this.steps.forEach((s) => s.restart());
  }
  cancel(): void {
    this.listening = false;
    this.isPlaying = false;
    this.isFinished = false;
    this.index = 0;
    this.currentStep?.cancel();
  }
  finish(): void {
    this.isPlaying = false;
    this.isFinished = true;
    this.index = this.steps.length - 1;
    this.steps.forEach((s) => s.finish());
  }
}

export class Delay extends Base {
  private remaining: number;
  private startTime = 0;
  private elapsed = 0;
  private raf = 0;

  constructor(private readonly opts: BaseOptions & { duration: number }) {
    super(opts);
    this.remaining = opts.duration;
  }
  private tick = (now: number) => {
    this.elapsed = now - this.startTime;
    if (this.elapsed >= this.remaining) this.end();
    else this.raf = requestAnimationFrame(this.tick);
  };
  play(): void {
    this.isPlaying = true;
    this.startTime = performance.now();
    this.elapsed = 0;
    this.raf = requestAnimationFrame(this.tick);
  }
  pause(): void {
    this.isPlaying = false;
    this.remaining -= this.elapsed;
    this.elapsed = 0;
    cancelAnimationFrame(this.raf);
  }
  restart(): void {
    cancelAnimationFrame(this.raf);
    this.elapsed = 0;
    this.isFinished = false;
    this.remaining = this.opts.duration;
    this.renewFinished();
  }
  cancel(): void {
    cancelAnimationFrame(this.raf);
    this.isPlaying = false;
    this.isFinished = false;
    this.elapsed = 0;
    this.remaining = this.opts.duration;
  }
  finish(): void {
    cancelAnimationFrame(this.raf);
    this.end();
  }
  private end() {
    this.complete();
  }
}
