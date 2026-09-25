// Stepper (reference modules 73465 Stepper/StepperItem/StepperProgress + 89282 StepperGraphic):
//  - desktop: one active step; autoplay advances every `--stepper-interval` (6000 ms) while at least
//    50 % visible, not hovered/focused and motion is allowed; elapsed time survives pauses; the active
//    step shows a progress bar (clip-path wipe over interval - 300 - 1000 ms, 300 ms delay, linear);
//  - clicking a step selects it and stops autoplay for good; below desktop steps toggle independently
//    (the first starts open);
//  - step content cross-fades (300 ms, cubic-bezier(0.65, 0.05, 0.36, 1)); graphics get
//    is-within-stepper / is-animating / is-exiting / is-paused state classes (CSS does the motion).

import { breakpoint, Disposer, listen, observeIntersection, onBreakpointChange, onReducedMotionChange, onVisibilityChange, reducedMotion, type Cleanup } from "./env";

const FADE = 300; // from source: M = 300
const PROGRESS_TAIL = 1000; // from source: y = 1e3
const EASE = "cubic-bezier(0.65, 0.05, 0.36, 1)"; // from source: j
const DEFAULT_INTERVAL = 6000; // from source: k = 6e3

const GRAPHIC_SEL = ".llm-token-usage-graphic, .usage-revenue-graphic, .recovery-breakdown-graphic";

export function mountStepper(stepper: HTMLElement): Cleanup {
  const d = new Disposer();
  const acc = stepper.querySelector<HTMLElement>(".stepper__accordion");
  const items = Array.from(stepper.querySelectorAll<HTMLDetailsElement>(".stepper__accordion > details.stepper-item"));
  const graphics = Array.from(stepper.querySelectorAll<HTMLElement>(".stepper__graphics > .stepper-graphic"));
  if (!acc || !items.length) return () => {};
  const len = items.length;
  const interval = parseFloat(stepper.style.getPropertyValue("--stepper-interval")) || DEFAULT_INTERVAL;

  let activeIndex = 0;
  let openSet = new Set<number>([0]);
  let autoplay = true;
  let hoverPaused = false;
  let visible = false;
  let hasIntersected = false;
  let hidden = document.hidden;
  let reduced = reducedMotion();
  let desktop = breakpoint() === "desktop";

  const isActive = (i: number) => (desktop ? activeIndex === i : openSet.has(i));
  const paused = () => hoverPaused || !visible || hidden;
  const ctxAutoplay = () => autoplay && desktop && !reduced && hasIntersected;

  // Per-item state.
  const prevActive = items.map((_, i) => isActive(i));
  const fades: (Animation | null)[] = items.map(() => null);
  const progress: (Animation | null)[] = items.map(() => null);
  const progressWasActive = items.map(() => false);
  const graphicEls = graphics.map((g) => g.querySelector<HTMLElement>(GRAPHIC_SEL));
  const graphicPrev = graphics.map((_, i) => isActive(i));
  const exiting = graphics.map(() => false);
  const mobileGraphics = items.map((it) => it.querySelector<HTMLElement>(`.stepper-item__mobile-graphic ${GRAPHIC_SEL}`));

  const render = () => {
    const auto = ctxAutoplay();
    items.forEach((item, i) => {
      const act = isActive(i);
      item.open = act;
      item.querySelector(".stepper-item__mobile-toggle-button")?.classList.toggle("stepper-item__mobile-toggle-button--open", act);
      // Content cross-fade on change (not on first render).
      if (prevActive[i] !== act) {
        prevActive[i] = act;
        fades[i]?.cancel();
        fades[i] = null;
        const content = item.querySelector<HTMLElement>(":scope > .stepper-item__content");
        if (content && !reduced)
          fades[i] = content.animate([{ opacity: act ? 0 : 1 }, { opacity: act ? 1 : 0 }], { duration: FADE, easing: EASE, fill: "forwards" });
      }
      // Progress bar.
      const bar = item.querySelector<HTMLElement>(":scope > .stepper-progress");
      const barInner = bar?.querySelector<HTMLElement>(".stepper-progress__container");
      const on = act && auto;
      bar?.classList.toggle("stepper-progress--active", on);
      if (on && !progressWasActive[i] && barInner) {
        progress[i]?.cancel();
        progress[i] = barInner.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], {
          duration: interval - FADE - PROGRESS_TAIL,
          delay: FADE,
          fill: "forwards",
          easing: "linear",
        });
      }
      progressWasActive[i] = on;
      const pr = progress[i];
      if (pr) {
        if (paused() && pr.playState === "running") pr.pause();
        else if (!paused() && pr.playState === "paused") pr.play();
      }
      // Mobile copy of the graphic: outside the graphic context (active by default, never animates).
      mobileGraphics[i]?.classList.toggle("is-paused", paused());
    });
    graphics.forEach((g, i) => {
      const act = isActive(i);
      g.classList.toggle("stepper-graphic--active", act);
      const el = graphicEls[i];
      if (!el) return;
      if (!act && graphicPrev[i]) exiting[i] = true;
      if (act) exiting[i] = false;
      graphicPrev[i] = act;
      el.classList.add("is-within-stepper");
      el.classList.toggle("is-animating", act && !reduced && hasIntersected);
      el.classList.toggle("is-exiting", exiting[i]);
      el.classList.toggle("is-paused", paused() && act);
    });
  };

  graphicEls.forEach((el, i) => {
    if (!el) return;
    d.add(
      listen<TransitionEvent>(el, "transitionend", (e) => {
        if (e.target === el && exiting[i]) {
          exiting[i] = false;
          el.classList.remove("is-exiting");
        }
      }),
    );
  });

  // Autoplay timer with accumulated elapsed time (reference refs y/M/j).
  let elapsed = 0;
  let startedAt = 0;
  let timer: number | undefined;
  const disarm = () => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
      elapsed += performance.now() - startedAt;
    }
  };
  const arm = () => {
    disarm();
    if (reduced || paused() || !autoplay || !desktop) return;
    startedAt = performance.now();
    timer = window.setTimeout(() => {
      timer = undefined;
      elapsed = 0;
      activeIndex = (activeIndex + 1) % len;
      render();
      arm();
    }, Math.max(0, interval - elapsed));
  };
  d.add(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });

  const update = () => {
    render();
    arm();
  };

  items.forEach((item, i) => {
    const summary = item.querySelector<HTMLElement>(":scope > summary");
    if (!summary) return;
    d.add(
      listen<MouseEvent>(summary, "click", (e) => {
        e.preventDefault();
        disarm();
        activeIndex = i % len;
        const next = new Set(openSet);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        openSet = next;
        elapsed = 0;
        autoplay = false;
        hoverPaused = false;
        update();
      }),
    );
  });
  const setHover = (v: boolean) => {
    if (!autoplay) return;
    hoverPaused = v;
    update();
  };
  d.add(listen(acc, "mouseenter", () => setHover(true)));
  d.add(listen(acc, "mouseleave", () => setHover(false)));
  d.add(listen(acc, "focusin", () => setHover(true)));
  d.add(listen(acc, "focusout", () => setHover(false)));
  d.add(
    observeIntersection(
      stepper,
      (v) => {
        visible = v;
        if (v) hasIntersected = true;
        update();
      },
      { threshold: 0.5 },
    ),
  );
  d.add(
    onVisibilityChange((h) => {
      hidden = h;
      update();
    }),
  );
  d.add(
    onReducedMotionChange((r) => {
      reduced = r;
      update();
    }),
  );
  d.add(
    onBreakpointChange((bp) => {
      desktop = bp === "desktop";
      update();
    }),
  );
  d.add(() => {
    fades.forEach((a) => a?.cancel());
    progress.forEach((a) => a?.cancel());
  });
  render();
  return () => d.run();
}

export function mountSteppers(root: HTMLElement): Cleanup {
  const d = new Disposer();
  root.querySelectorAll<HTMLElement>(".stepper").forEach((s) => d.add(mountStepper(s)));
  return () => d.run();
}
