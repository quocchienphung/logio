// Billing hero product animation (reference: billing page module 39828, components `ef`
// "HeroAnimation" (desktop/tablet) and `eH` "MobileHeroAnimation"). Both are Motion sequences driven by
// useAnimate; every segment below is transcribed from the source (targets, keyframes, durations,
// easings, `at` offsets and staggers). Colours are CSS-side (monochrome in the page stylesheet).
//
// Desktop: starts when 10 % of the graphic is visible (once). A browser intro plays alongside the
// choreography; the choreography loops by re-running itself on completion (the first run includes the
// card/plan entrance). Mobile (< 640 px): the 368x624 card cycles plans -> UBB plans -> invoice ->
// drawer forever (repeat: Infinity). Reduced motion: nothing runs (CSS shows the static state).

import { EASE } from "../revenue-shared/easing";
import { breakpoint, Disposer, observeIntersection, onBreakpointChange, onReducedMotionChange, onVisibilityChange, reducedMotion, type Cleanup } from "../revenue-shared/env";
import { playSequence, stagger, type Keyframes, type Segment, type SegmentOptions, type SequenceControls } from "../revenue-shared/sequence";

// ---- desktop geometry (from source: et / es / en / er / el) ----
interface Box {
  w: number;
  h: number;
  x: number;
  y: number;
}
const START: Pick<Box, "w" | "h"> = { w: 290, h: 332 };
const END_L: Pick<Box, "w" | "h"> = { w: 320, h: 171 };
const END_R: Pick<Box, "w" | "h"> = { w: 320, h: 227 };
type Stage = "start" | "middle" | "end" | "invoice";
const LEFT: Record<Stage, Box> = {
  start: { ...START, x: 30, y: 0 },
  middle: { w: 452, h: 318, x: 23, y: 0 },
  end: { ...END_L, x: 322, y: -45 },
  invoice: { ...END_L, x: 166, y: -45 },
};
const RIGHT: Record<Stage, Box> = {
  start: { ...START, x: 643, y: 0 },
  middle: { w: 452, h: 326, x: 491, y: -8 },
  end: { ...END_R, x: 322, y: 139 },
  invoice: { ...END_R, x: 166, y: 139 },
};
const BASE_W = 452; // from source: e.w / 452
const BASE_H = 340; // from source: e.h / 340

/** Morphing card: outer translate, wrap scale, inner counter-scale (reference `ep`). */
function morph(side: "left" | "right", stage: Stage, t: SegmentOptions): Segment[] {
  const box = (side === "left" ? LEFT : RIGHT)[stage];
  const sx = box.w / BASE_W;
  const sy = box.h / BASE_H;
  const r: SegmentOptions = { duration: t.duration, at: "<", ...(t.ease ? { ease: t.ease } : {}) };
  return [
    [`.m-card-${side}`, { x: box.x, y: box.y }, t],
    [`.m-card-${side}-wrap`, { scaleX: sx, scaleY: sy }, r],
    [`.m-card-${side}-inner`, { scaleX: 1 / sx, scaleY: 1 / sy, "--morph-card-inner-sx": sx, "--morph-card-inner-sy": sy }, r],
  ];
}
/** Two segments on one target, the second starting with the first (reference `eu`). */
function pair(target: string | readonly string[], a: Keyframes, b: Keyframes, ta: SegmentOptions, tb: SegmentOptions): Segment[] {
  return [
    [target, a, ta],
    [target, b, { at: "<", ...tb }],
  ];
}
/** UBB plan parts (reference `eb`). */
const ubb = (p: "pro" | "starter") => [`.m-ubb-plan-${p}-header`, `.m-ubb-plan-${p}-body`, `.m-ubb-plan-${p}-footer-total`, `.m-ubb-plan-${p}-footer-cta`] as const;

const { easeSwift, easeOutCubic, easeInOutExpo, easeInOutQuart } = EASE;

/** Browser intro (reference `e`), played once alongside the first choreography run. */
const BROWSER_INTRO: Segment[] = [
  [".m-browser", { y: 100 }, { duration: 0 }],
  [".m-browser .browser-graphic__window", { opacity: 0 }, { duration: 0 }],
  [".m-browser .browser-graphic__page", { opacity: 0 }, { duration: 0 }],
  [".m-browser .browser-graphic__window", { opacity: 1 }, { duration: 0.5, ease: easeSwift }],
  [".m-browser .browser-graphic__page", { opacity: 1 }, { duration: 0.5, ease: easeSwift, at: "<" }],
  [".m-browser", { y: 0 }, { duration: 1, ease: easeSwift, at: "<" }],
];

/** Card and plan entrance (reference `i`), prepended to the first run only. */
const ENTRANCE: Segment[] = [
  [".m-container", { opacity: 0 }, { duration: 0 }],
  [".m-card", { opacity: 0, y: 40, scale: 1 }, { duration: 0 }],
  [".m-plan", { opacity: 0, x: 0, y: 60, scale: 1 }, { duration: 0 }],
  [".m-container", { opacity: 1 }, { duration: 0.5, ease: easeOutCubic }],
  [".m-card", { opacity: 1, y: 0 }, { duration: 1, ease: easeSwift, delay: stagger(0.125), at: "<0.1" }],
  [".m-plan", { opacity: 1, y: 0 }, { duration: 1, ease: easeSwift, delay: stagger(0.125), at: "<0.1" }],
];

/** The looping choreography (reference `a`). */
const CHOREOGRAPHY: Segment[] = [
  ...morph("right", "start", { duration: 0 }),
  ...morph("left", "start", { duration: 0 }),
  [".m-card-center", { opacity: 1, scale: 1, y: 0 }, { duration: 0 }],
  [".m-plan-starter", { opacity: 1, x: 0, y: 0 }, { duration: 0 }],
  [".m-plan-pro", { opacity: 1, scale: 1, x: 0, y: 0 }, { duration: 0 }],
  [".m-plan-enterprise", { opacity: 1, x: 0, y: 0 }, { duration: 0 }],
  [ubb("pro"), { opacity: 0, x: 0, y: 0 }, { duration: 0 }],
  [ubb("starter"), { opacity: 0, x: 0, y: 0 }, { duration: 0 }],
  [".m-background", { opacity: 0.94 }, { duration: 0 }],
  [".m-brand", { x: 0, y: 0 }, { duration: 0 }],
  [".m-title", { opacity: 1, y: 0 }, { duration: 0 }],
  [".m-nav-item", { opacity: 1, y: 0 }, { duration: 0 }],
  [".m-url", { y: 0 }, { duration: 0 }],
  [".m-card-top-border", { opacity: 1 }, { duration: 0 }],
  [".m-card-right-top-border", { opacity: 0 }, { duration: 0 }],
  [".m-ubb-plan-starter", { clipPath: "inset(0 154px 0 0)" }, { duration: 0 }],
  [".m-ubb-plan-pro", { clipPath: "inset(0 316px 0 0)" }, { duration: 0 }],
  [".m-invoice-card", { opacity: 0, x: 0, y: 16 }, { duration: 0 }],
  [".m-invoice-payment-card", { opacity: 0, x: 0, y: 16 }, { duration: 0 }],
  [".m-invoice-view-cta", { scale: 1 }, { duration: 0 }],
  [".m-invoice-drawer", { opacity: 0, x: 100 }, { duration: 0 }],
  // Pricing page -> usage-based plans.
  [".m-card-center", { opacity: 0, scale: 0.9 }, { duration: 0.5, ease: easeOutCubic, at: "+1.25" }],
  [".m-plan-pro", { opacity: 0, scale: 0.9 }, { duration: 0.5, ease: easeOutCubic, at: "<" }],
  ...morph("right", "middle", { duration: 1, at: "<", ease: easeInOutExpo }),
  ...morph("left", "middle", { duration: 1, ease: easeInOutExpo, at: "<" }),
  [".m-card-right-top-border", { opacity: 1 }, { duration: 1, at: "<", ease: easeInOutExpo }],
  ...pair(".m-plan-enterprise", { opacity: 0 }, { x: -100 }, { duration: 0.5, at: "<", ease: easeOutCubic }, { duration: 1, ease: easeInOutExpo }),
  [".m-ubb-plan-pro", { clipPath: "inset(0 0 0 0)" }, { duration: 1, ease: easeInOutExpo, at: "<" }],
  ...pair(".m-plan-starter", { opacity: 0 }, { x: 100 }, { duration: 0.5, at: "<", ease: easeOutCubic }, { duration: 1, ease: easeInOutExpo }),
  [".m-ubb-plan-starter", { clipPath: "inset(0 0 0 0)" }, { duration: 1, ease: easeInOutExpo, at: "<" }],
  [ubb("starter"), { opacity: [0, 1], x: [40, 0] }, { duration: 0.75, at: "<0.75", ease: easeSwift, delay: stagger(0.1) }],
  [ubb("pro"), { opacity: [0, 1], x: [40, 0] }, { duration: 0.75, at: "<0.25", ease: easeSwift, delay: stagger(0.1) }],
  [".m-card-center", { opacity: 0, scale: 0.9, y: 0 }, { duration: 0 }],
  [".m-plan-pro", { opacity: 0, scale: 1, y: 0 }, { duration: 0 }],
  [".m-plan-enterprise", { opacity: 0, x: 0, y: 0 }, { duration: 0 }],
  [".m-plan-starter", { opacity: 0, x: 0, y: 0 }, { duration: 0 }],
  // Usage-based plans -> invoice.
  ...pair(ubb("pro"), { opacity: [1, 0] }, { y: [0, 100] }, { duration: 0.3, ease: easeOutCubic, at: "+2" }, { duration: 0.6, ease: easeInOutExpo }),
  ...morph("right", "end", { duration: 1, at: "<", ease: easeInOutExpo }),
  [".m-background", { opacity: 0.84 }, { duration: 1, at: "<", ease: easeOutCubic }],
  [".m-card-right-top-border", { opacity: 0 }, { duration: 1, at: "<", ease: easeInOutExpo }],
  [".m-card-top-border", { opacity: 0 }, { duration: 1, at: "<", ease: easeInOutExpo }],
  [".m-url", { y: "-50%" }, { duration: 1, at: "<", ease: easeInOutExpo }],
  ...pair(ubb("starter"), { opacity: [1, 0] }, { x: [0, 100] }, { duration: 0.3, at: "<", ease: easeOutCubic }, { duration: 0.6, ease: easeInOutExpo }),
  ...morph("left", "end", { duration: 1, at: "<", ease: easeInOutExpo }),
  [".m-brand", { x: 322, y: 4 }, { duration: 1, at: "<", ease: easeInOutExpo }],
  [".m-title", { opacity: 0, y: "-101%" }, { duration: 1, at: "<", ease: easeInOutExpo }],
  [".m-nav-item", { opacity: 0, y: "-101%" }, { duration: 1, at: "<", ease: easeInOutExpo, delay: stagger(0.1, { startDelay: 0.1 }) }],
  [".m-invoice-card", { opacity: 1, y: 0 }, { at: "-0.3", duration: 0.75, ease: easeSwift }],
  [".m-invoice-payment-card", { opacity: 1, y: 0 }, { at: "<0.2", duration: 0.75, ease: easeSwift }],
  [".m-invoice-view-cta", { scale: [1, 0.95, 1] }, { duration: 0.5, ease: easeOutCubic, delay: 1 }],
  // Invoice -> drawer.
  [".m-invoice-drawer", { opacity: 1, x: 0 }, { duration: 0.75, ease: easeInOutQuart }],
  [".m-brand", { x: 166, y: 4 }, { duration: 0.75, at: "<", ease: easeInOutQuart }],
  [".m-invoice-card", { x: -156 }, { duration: 0.75, at: "<", ease: easeInOutQuart }],
  [".m-invoice-payment-card", { x: -156 }, { duration: 0.75, at: "<", ease: easeInOutQuart }],
  ...morph("left", "invoice", { duration: 0.75, at: "<", ease: easeInOutQuart }),
  ...morph("right", "invoice", { duration: 0.75, at: "<", ease: easeInOutQuart }),
  // Back to the pricing page.
  [".m-invoice-drawer", { opacity: 0, x: 100 }, { duration: 0.75, ease: easeInOutQuart, at: "+6" }],
  [".m-background", { opacity: 0.94 }, { duration: 1, at: "<", ease: easeOutCubic }],
  [".m-url", { y: 0 }, { duration: 1, at: "<", ease: easeInOutExpo }],
  [".m-brand", { x: 0, y: 0 }, { duration: 1, at: "<", ease: easeInOutExpo }],
  [".m-title", { opacity: 1, y: 0 }, { duration: 1, at: "<", ease: easeInOutExpo }],
  [".m-nav-item", { opacity: 1, y: 0 }, { duration: 1, at: "<", ease: easeInOutExpo, delay: stagger(0.1, { startDelay: 0.1 }) }],
  [".m-invoice-card", { opacity: 0 }, { duration: 0.3, at: "<", ease: easeOutCubic }],
  [".m-invoice-payment-card", { opacity: 0 }, { duration: 0.3, at: "<", ease: easeOutCubic }],
  ...morph("left", "start", { duration: 1, at: "<", ease: easeInOutExpo }),
  ...morph("right", "start", { duration: 1, at: "<", ease: easeInOutExpo }),
  [".m-card-center", { opacity: [0, 1], scale: 1 }, { duration: 1, ease: easeOutCubic, at: "<0.5" }],
  [".m-plan-starter", { opacity: [0, 1], x: [0, 0], y: [30, 0] }, { duration: 1, ease: easeSwift, at: "<0.3" }],
  [".m-plan-pro", { opacity: [0, 1], scale: [1, 1], y: [30, 0] }, { duration: 1, ease: easeSwift, at: "<0.1" }],
  [".m-plan-enterprise", { opacity: [0, 1], x: [0, 0], y: [30, 0] }, { duration: 1, ease: easeSwift, at: "<0.1" }],
];

// ---- mobile (reference `eH`) ----
const M_OUT = { opacity: 0, y: 80 }; // from source: ek
const M_IN = { opacity: 1, y: 0 }; // from source: eZ
const MOBILE: Segment[] = [
  [".m-plans", M_OUT, { duration: 0 }],
  [".m-ubb-plans", M_OUT, { duration: 0 }],
  [".m-invoice", M_OUT, { duration: 0 }],
  [".m-invoice-drawer", M_OUT, { duration: 0 }],
  [".m-plans", M_IN, { duration: 0.75, ease: easeSwift }],
  [".m-plan-ui", { opacity: 1 }, { duration: 0.3, ease: easeOutCubic, at: "<" }],
  [".m-plans", M_OUT, { duration: 0.5, ease: easeSwift, at: "+3" }],
  [".m-ubb-plans", M_IN, { duration: 0.75, ease: easeSwift }],
  [".m-ubb-plans", M_OUT, { duration: 0.5, ease: easeSwift, at: "+3" }],
  [".m-invoice", M_IN, { duration: 0.75, ease: easeSwift }],
  [".m-plan-ui", { opacity: 0 }, { duration: 0.3, ease: easeOutCubic, at: "<" }],
  [".m-invoice", M_OUT, { duration: 0.5, ease: easeSwift, at: "+3" }],
  [".m-invoice-drawer", M_IN, { duration: 0.75, ease: easeSwift }],
  [".m-invoice-drawer", M_OUT, { duration: 0.5, ease: easeSwift, at: "+6" }],
];

/** Keeps a set of sequences paused while the hero is offscreen or the tab is hidden. */
function pauser(target: Element, get: () => (SequenceControls | null)[]): Cleanup {
  const d = new Disposer();
  let visible = true;
  let hidden = document.hidden;
  const sync = () => get().forEach((c) => (visible && !hidden ? c?.resume() : c?.pause()));
  d.add(
    observeIntersection(target, (v) => {
      visible = v;
      sync();
    }),
  );
  d.add(
    onVisibilityChange((h) => {
      hidden = h;
      sync();
    }),
  );
  return () => d.run();
}

export function mountBillingHeroAnimation(root: HTMLElement): Cleanup {
  const d = new Disposer();
  const desktop = root.querySelector<HTMLElement>(".billing-hero-animation");
  const mobile = root.querySelector<HTMLElement>(".billing-mobile-hero-animation");
  let reduced = reducedMotion();

  // ---- desktop / tablet ----
  if (desktop) {
    let seen = false;
    let browser: SequenceControls | null = null;
    let loop: SequenceControls | null = null;
    let firstRun = true;
    let token = 0;
    const stop = () => {
      token++;
      browser?.cancel();
      loop?.cancel();
      browser = loop = null;
    };
    const run = () => {
      if (!seen) return;
      if (reduced || breakpoint() === "mobile") {
        stop();
        return;
      }
      if (loop) return;
      const my = ++token;
      browser = playSequence(desktop, BROWSER_INTRO);
      const cycle = () => {
        loop = playSequence(desktop, firstRun ? [...ENTRANCE, ...CHOREOGRAPHY] : CHOREOGRAPHY);
        loop.finished.then(() => {
          if (my !== token || reduced || breakpoint() === "mobile") return;
          firstRun = false;
          cycle();
        });
      };
      cycle();
    };
    d.add(
      observeIntersection(
        desktop,
        (v) => {
          if (!v) return;
          seen = true;
          run();
        },
        { threshold: 0.1, once: true },
      ),
    );
    d.add(onBreakpointChange(run));
    d.add(
      onReducedMotionChange((r) => {
        reduced = r;
        run();
      }),
    );
    d.add(pauser(desktop, () => [browser, loop]));
    d.add(stop);
  }

  // ---- mobile ----
  if (mobile) {
    let seen = false;
    let seq: SequenceControls | null = null;
    const run = () => {
      if (!seen) return;
      if (reduced || breakpoint() !== "mobile") {
        seq?.cancel();
        seq = null;
        return;
      }
      if (!seq) seq = playSequence(mobile, MOBILE, { repeat: Infinity });
    };
    d.add(
      observeIntersection(
        mobile,
        (v) => {
          if (!v) return;
          seen = true;
          run();
        },
        { threshold: 0.1, once: true },
      ),
    );
    d.add(onBreakpointChange(run));
    d.add(
      onReducedMotionChange((r) => {
        reduced = r;
        run();
      }),
    );
    d.add(pauser(mobile, () => [seq]));
    d.add(() => seq?.cancel());
  }
  return () => d.run();
}
