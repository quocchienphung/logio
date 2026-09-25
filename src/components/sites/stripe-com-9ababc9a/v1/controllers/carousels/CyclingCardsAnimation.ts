// CyclingCardsAnimation + CyclingCard — port of v1-CyclingCardsAnimation-NB6257W4.js.
// Time-driven loop of stacked cards (Tax "facts", Revenue Recognition "rules"). Intro: the visible
// cards rise 40 px and fade in, staggered 150 ms (500 ms each, easeInOutCubic) inside a 2 s step.
// Then every data-js-step-delay ms (5 s on both pages) the stack slides by one card: the top card
// fades out upwards, a new card fades in at the bottom, the next card becomes active (full scale,
// large shadow, full-opacity body) and the others sit at scale 0.92. A step that is running when
// the stack leaves the viewport completes, but the next one only starts once it is visible again.
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, onPageVisibility, prefersReducedMotion, target } from "../lib";
import { debounce, Delay, play } from "./util";

const CARD_ACTIVE = "CyclingCard--isActive";
const CARD_INACTIVE = "CyclingCard--isInactive";
const CARD_HIDDEN = "CyclingCard--isHidden";
const IS_ANIMATING = "CyclingCardsAnimation--isAnimating";
const ACTIVE_IS_CENTER = "CyclingCardsAnimation--activeIsCenter";
const INTRO_MS = 2000;
const INTRO_STAGGER = 150;
const INTRO_OFFSET = 40;
const SLIDE_MS = 500;
const EASING = "cubic-bezier(0.645, 0.045, 0.355, 1.000)";
const INACTIVE_SCALE = 0.92;
const DEFAULT_STEP_DELAY = 3000;
const DEFAULT_SPACING = 24;
const Direction = { Up: 1, Down: -1 } as const;

interface CardApi {
  readonly el: HTMLElement;
  height: number;
  readonly isActive: boolean;
  updateHeight(): void;
  activate(zIndex: number): void;
  deactivate(): void;
  show(): void;
  hide(): void;
}

export const CyclingCard: Controller = (el) => {
  const api: CardApi = {
    el,
    height: el.offsetHeight,
    get isActive() {
      return el.classList.contains(CARD_ACTIVE);
    },
    updateHeight() {
      api.height = el.offsetHeight;
    },
    activate(z) {
      el.classList.remove(CARD_INACTIVE);
      el.classList.add(CARD_ACTIVE);
      el.style.setProperty("--index", String(z));
    },
    deactivate() {
      el.classList.remove(CARD_ACTIVE);
      el.classList.add(CARD_INACTIVE);
    },
    show() {
      el.classList.remove(CARD_HIDDEN);
    },
    hide() {
      el.classList.add(CARD_HIDDEN);
    },
  };
  exposeApi(el, "CyclingCard", api);
  return () => {
    el.classList.remove(CARD_ACTIVE, CARD_HIDDEN);
    el.classList.add(CARD_INACTIVE);
    el.style.removeProperty("--index");
  };
};

/** One step = WAAPI card animations running alongside a Delay; the step ends when both are done. */
class Step {
  private pending = 0;
  private readonly delay: Delay;
  private readonly anims: Animation[] = [];
  playing = false;
  finished = false;
  started = false;
  constructor(
    duration: number,
    private readonly build: () => Animation[],
    private readonly onDone: () => void,
  ) {
    this.delay = new Delay(duration, () => this.part());
  }
  private part() {
    this.pending -= 1;
    if (this.pending > 0) return;
    this.playing = false;
    this.finished = true;
    this.onDone();
  }
  play() {
    if (this.finished || this.playing) return;
    this.playing = true;
    if (!this.started) {
      this.started = true;
      this.anims.push(...this.build());
      this.pending = 1 + this.anims.length;
      this.anims.forEach((a) => a.finished.then(() => this.part(), () => undefined));
    } else this.anims.forEach((a) => a.play());
    this.delay.play();
  }
  cancel() {
    this.delay.cancel();
    this.anims.forEach((a) => a.cancel());
    this.playing = false;
  }
}

export const CyclingCardsAnimation: Controller = (el) => {
  const cards = childControllers(el, "CyclingCard")
    .map((c) => getApi<CardApi>(c, "CyclingCard"))
    .filter((c): c is CardApi => !!c);
  const mask = target(el, "CyclingCardsAnimation", "mask");
  if (!cards.length) return;

  const direction = Direction[(el.dataset.jsDirection || "").trim() as keyof typeof Direction] ?? Direction.Up;
  const visibleCardCount = parseInt((el.dataset.jsVisibleCardCount || "").trim(), 10) || 69;
  const centerIsActive = (el.dataset.jsAlign || "").toLowerCase() === "center";
  const stepDelay = parseInt((el.dataset.jsStepDelay || "").trim(), 10) || DEFAULT_STEP_DELAY;
  const isUp = direction === Direction.Up;
  const offsetIndex = centerIsActive ? Math.floor(visibleCardCount / 2) : 0;

  const spacing = () => {
    const v = getComputedStyle(el).getPropertyValue("--cyclingCardsAnimationSpacing").trim();
    return v ? parseInt(v, 10) : DEFAULT_SPACING;
  };
  const viewportState = () => {
    const activeIndex = isUp ? 1 + offsetIndex : visibleCardCount;
    return { activeIndex, enteringIndex: visibleCardCount, leavingIndex: 0, wasActiveIndex: isUp ? offsetIndex : activeIndex - 1 };
  };

  let currentIndex = 0;
  let zIndex = 1;
  const currentCards = () => {
    const start = currentIndex;
    const end = currentIndex + visibleCardCount + 1;
    return end >= cards.length ? [...cards.slice(start), ...cards.slice(0, end - cards.length)] : cards.slice(start, end);
  };
  const distanceTop = (list: CardApi[], i: number, gap: number) => list.slice(0, i).reduce((sum, c) => sum + c.height + gap, 0);
  /** [from, to] translateY of each card for one slide step. */
  const positions = (list: CardApi[]): [number, number][] => {
    const gap = spacing();
    const from = isUp ? distanceTop(list, list.length - 1, gap) - gap : 0;
    const to = isUp ? distanceTop(list, list.length, gap) - gap : list[0].height + gap;
    return list.map((c, r) => {
      const own = isUp ? c.height : 0;
      const top = distanceTop(list, r, gap);
      return [direction * (top + own - from), direction * (top + own - to)];
    });
  };
  /** [from, to] scale of each card for one slide step. */
  const scales = (list: CardApi[]): [number, number][] => {
    const { activeIndex, wasActiveIndex } = viewportState();
    return list.map((_, r) => {
      if (centerIsActive) {
        const d = r - activeIndex;
        const h = Math.abs(d);
        return [d < 0 ? 1 - (h - direction) * 0.08 : 1 - (h + direction) * 0.08, 1 - h * 0.08];
      }
      return [r === wasActiveIndex ? 1 : INACTIVE_SCALE, r === activeIndex ? 1 : INACTIVE_SCALE];
    });
  };

  const tallestHeightPossible = () => {
    const ring = [...cards, ...cards.slice(0, visibleCardCount)];
    return Math.max(...cards.map((_, i) => ring.slice(i, i + visibleCardCount + 1).reduce((s, c) => s + c.height, 0)));
  };

  // Reduced motion: static stack of the first visible cards (reference setupNoMotion; the CSS switches
  // the cards to position: relative under prefers-reduced-motion).
  if (prefersReducedMotion()) {
    const list = currentCards().slice(0, visibleCardCount);
    const sc = scales(list);
    const activeAt = isUp ? offsetIndex : list.length - 1;
    list[activeAt]?.activate(zIndex);
    list.forEach((c, r) => {
      c.el.style.opacity = "1";
      c.el.style.display = "block";
      c.el.style.transform = `scale(${sc[r][0]})`;
      if (r === activeAt - 1) c.el.style.marginBottom = "0px";
    });
    return () => list.forEach((c) => (c.el.style.opacity = c.el.style.display = c.el.style.transform = c.el.style.marginBottom = ""));
  }

  let isIntersecting = false;
  let hidden = document.hidden;
  let intro: Step | undefined;
  let step: Step | undefined;
  const canRun = () => isIntersecting && !hidden;

  const slideAnimations = (list: CardApi[]) => {
    const pos = positions(list);
    const sc = scales(list);
    const { enteringIndex, leavingIndex } = viewportState();
    return () =>
      list.map((c, r) =>
        play(
          c.el,
          [
            { transform: `translateY(${pos[r][0]}px) scale(${sc[r][0]})`, opacity: r === enteringIndex ? 0 : 1 },
            { transform: `translateY(${pos[r][1]}px) scale(${sc[r][1]})`, opacity: r === leavingIndex ? 0 : 1 },
          ],
          { duration: SLIDE_MS, easing: EASING },
        ),
      );
  };

  const showOnly = (list: CardApi[]) => {
    cards.filter((c) => !list.includes(c)).forEach((c) => c.hide());
    list.forEach((c) => c.show());
  };

  const animate = () => {
    cards.find((c) => c.isActive)?.deactivate();
    zIndex += 1;
    const list = currentCards();
    list[viewportState().activeIndex]?.activate(zIndex);
    showOnly(list);
    step = new Step(stepDelay, slideAnimations(list), () => {
      if (!canRun()) return;
      currentIndex = (currentIndex + 1) % cards.length;
      animate();
    });
    if (canRun()) step.play();
  };

  const playIntro = () => {
    const all = currentCards();
    const list = all.slice(0, visibleCardCount);
    const pos = positions(all);
    const sc = scales(all);
    list[isUp ? offsetIndex : list.length - 1]?.activate(zIndex);
    showOnly(list);
    intro = new Step(
      INTRO_MS,
      () =>
        list.map((c, r) =>
          play(
            c.el,
            [
              { transform: `translateY(${pos[r][0] + INTRO_OFFSET * direction}px) scale(${sc[r][0]})`, opacity: 0 },
              { transform: `translateY(${pos[r][0]}px) scale(${sc[r][0]})`, opacity: 1 },
            ],
            { delay: INTRO_STAGGER * r, duration: SLIDE_MS, easing: EASING },
          ),
        ),
      () => {
        if (canRun()) animate();
      },
    );
    if (canRun()) intro.play();
  };

  // Entering the viewport (or the tab becoming visible) resumes where the loop stopped: an unstarted
  // intro plays, and a finished step that could not advance is replayed.
  const resume = () => {
    if (!canRun()) return;
    if (intro && !intro.finished && !intro.playing) intro.play();
    if (!step && intro?.finished) animate();
    if (step && step.finished) animate();
  };

  let elWidth = -1;
  const [onResize, cancelResize] = debounce(() => {
    const w = el.offsetWidth;
    if (w === elWidth) return;
    elWidth = w;
    cards.forEach((c) => c.updateHeight());
    const visibleHeight = cards.slice(0, visibleCardCount).reduce((s, c) => s + c.height, 0);
    el.style.height = `${visibleHeight + spacing() * (visibleCardCount - 1)}px`;
    if (!centerIsActive && mask) mask.style.top = `${-(tallestHeightPossible() - visibleHeight)}px`;
  }, 300);

  if (centerIsActive) el.classList.add(ACTIVE_IS_CENTER);
  el.classList.add(IS_ANIMATING);
  const io = new IntersectionObserver(
    (entries) => {
      isIntersecting = entries[0].intersectionRatio >= 0.001;
      resume();
    },
    { threshold: 0.001 },
  );
  io.observe(el);
  const ro = new ResizeObserver(onResize);
  ro.observe(el);
  const offVisibility = onPageVisibility((h) => {
    hidden = h;
    resume();
  });
  // The reference polls every 100 ms until its CSS custom properties resolve before the intro.
  const introTimer = window.setTimeout(playIntro, 100);

  return () => {
    window.clearTimeout(introTimer);
    cancelResize();
    io.disconnect();
    ro.disconnect();
    offVisibility();
    intro?.cancel();
    step?.cancel();
    el.classList.remove(IS_ANIMATING, ACTIVE_IS_CENTER);
    el.style.height = "";
    if (mask) mask.style.top = "";
  };
};
