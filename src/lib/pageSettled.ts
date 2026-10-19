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
