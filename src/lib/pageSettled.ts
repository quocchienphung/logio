/**
 * Scheduling help for work that runs as a page arrives, so it stays out of the way of the page-to-page
 * transition (src/components/page-transition/pageTransitionRuntime.ts), whose disc, lens and line
 * reveals are drawn on the main thread of the incoming document.
 */

type SettledWindow = Window & { __ptSettled?: Promise<void> };
type Yielding = { scheduler?: { yield?: () => Promise<void> } };

/** Resolves once the transition that revealed this document has finished, at once when there was none. */
export function pageSettled(): Promise<void> {
  return (typeof window !== "undefined" && (window as SettledWindow).__ptSettled) || Promise.resolve();
}

/** Gives the browser a chance to render a frame before the caller continues. */
export function yieldToMain(): Promise<void> {
  const s = (globalThis as Yielding).scheduler;
  if (s?.yield) return s.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Waits for an idle period (at most `timeout` ms), so the work after it does not land mid-animation or input. */
export function idle(timeout = 1000): Promise<void> {
  if (typeof requestIdleCallback === "function") return new Promise((resolve) => requestIdleCallback(() => resolve(), { timeout }));
  return new Promise((resolve) => setTimeout(resolve, 16));
}

/**
 * Runs `jobs` in order, in slices of at most `budget` ms of main-thread time (a job is never split), with
 * a break between slices: a yield to rendering, or with `whenIdle` a wait for the next idle period. Stops
 * early when `alive()` turns false.
 */
export async function runSliced(jobs: (() => void)[], alive: () => boolean, { budget = 6, whenIdle = false } = {}): Promise<void> {
  let sliceStart = whenIdle ? -Infinity : performance.now();
  for (const job of jobs) {
    if (performance.now() - sliceStart > budget) {
      await (whenIdle ? idle() : yieldToMain());
      sliceStart = performance.now();
    }
    if (!alive()) return;
    job();
  }
}

let lastInput = 0;
let tracking = false;
const markInput = () => {
  lastInput = performance.now();
};

/**
 * Resolves once the page transition is over and the visitor has not scrolled or touched the page for
 * `quiet` ms, and the browser is idle (or after `maxWait` ms regardless): the moment to start work that
 * blocks the main thread for tens of milliseconds, such as creating a WebGL context and compiling shaders.
 */
export async function calm(quiet = 160, maxWait = 3000): Promise<void> {
  if (!tracking) {
    tracking = true;
    for (const type of ["scroll", "wheel", "touchmove", "keydown"]) window.addEventListener(type, markInput, { passive: true, capture: true });
  }
  await pageSettled();
  const until = performance.now() + maxWait;
  for (;;) {
    await idle(500);
    const wait = lastInput + quiet - performance.now();
    if (wait <= 0 || performance.now() >= until) return;
    await new Promise((resolve) => setTimeout(resolve, Math.min(wait, until - performance.now())));
  }
}

let heavyChain: Promise<unknown> = Promise.resolve();

/**
 * Runs `task` when the page is calm, one heavy task at a time: the section renderers each create their own
 * GL context and compile their programs, and all of them used to do so together right after hydration.
 */
export function runHeavy<T>(task: () => T | Promise<T>): Promise<T> {
  const run = heavyChain.then(() => calm()).then(task);
  heavyChain = run.catch(() => {});
  return run;
}
