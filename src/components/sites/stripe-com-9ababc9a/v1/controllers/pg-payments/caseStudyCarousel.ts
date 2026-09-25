// /payments "in-person" customer stories carousel.
//   CustomersCaseStudyCarousel          ← v1-CustomersCaseStudyCarousel-F4LYKXWS.js
//   CustomersCaseStudyCarouselNavTrack  ← v1-chunk-LGD52VYU.js
//   CustomersCaseStudyCarouselNavGroup  ← v1-chunk-7UE4IH7Z.js
//   CustomersCaseStudyCarouselNavItem   ← v1-chunk-QZ775TWJ.js
// The cards sit in a natively scrollable track (swipe / smooth scrollTo). Scroll position drives the
// background/overlay cross-fade, card opacity and the nav's coloured progress line. Autoplay: each nav
// item runs a 7 s countdown bar (300 ms delay, linear), then 200 ms later the carousel scrolls to the next
// card. A nav click stops autoplay; it resumes 10 s after scrolling settles (500 ms without scroll events).
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, listen, prefersReducedMotion, target, targetList } from "../lib";
import { Delay, Exec, Group, Sequence, Waapi, type Step } from "./motion";
import { clamp, lerpHex, monoHex, pauseWhenHidden } from "./util";

const COUNTDOWN_MS = 7000;
const RESTART_DELAY = 500;
const RESTART_DELAY_AFTER_CLICK = 1e4;
const FLAT = "variant--Flat";
const INDICATOR_ACTIVE = "CustomersCaseStudyCarouselNavItem__indicator--active";

interface NavItemApi {
  active: boolean;
  inAnimation(): Step;
  outAnimation(): Step;
}
interface NavGroupApi {
  readonly items: HTMLElement[];
  scrollProgress: number;
}
interface NavTrackApi {
  scrollProgress: number;
  currentPageIndex: number;
}
interface SegmentedControlApi {
  toggleButton(index: number): void;
}

// ---- Nav item -------------------------------------------------------------------------------------
export const CustomersCaseStudyCarouselNavItem: Controller = (el) => {
  const N = "CustomersCaseStudyCarouselNavItem";
  const container = target(el, N, "countdownContainer");
  const bar = target(el, N, "countdownBar");
  const indicator = target(el, N, "indicator");
  const api: NavItemApi = {
    set active(on: boolean) {
      el.querySelector("svg")?.classList.toggle(FLAT, !on);
      indicator?.classList.toggle(INDICATOR_ACTIVE, on);
    },
    get active() {
      return !!indicator?.classList.contains(INDICATOR_ACTIVE);
    },
    inAnimation: () =>
      new Sequence([
        new Group([
          new Waapi({ el: container, keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 500 }),
          new Waapi({ el: bar, keyframes: [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], delay: 300, duration: COUNTDOWN_MS, easing: "linear" }),
        ]),
        new Delay(200),
        new Exec(() => {
          el.dispatchEvent(new CustomEvent("CustomersCaseStudyCarouselNavItem:CountdownComplete", { bubbles: true }));
        }),
      ]),
    outAnimation: () =>
      new Sequence([
        new Waapi({ el: container, keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: 500 }),
        new Waapi({ el: bar, keyframes: [{ transform: "scaleX(0)" }, { transform: "scaleX(0)" }], duration: 0 }),
      ]),
  };
  exposeApi(el, N, api);
};

// ---- Nav group ------------------------------------------------------------------------------------
export const CustomersCaseStudyCarouselNavGroup: Controller = (el) => {
  const N = "CustomersCaseStudyCarouselNavGroup";
  const items = targetList(el, N, "items");
  const buttons = targetList(el, N, "buttons");
  const line = target(el, N, "coloredLine");
  const original = line?.innerHTML ?? "";
  // One segment per item in the customer's accent colour (monochrome: mapped to its grey).
  if (line) {
    line.replaceChildren(
      ...items.map((it) => {
        const d = document.createElement("div");
        d.style.backgroundColor = monoHex(it.dataset.jsAccentColor || "");
        return d;
      }),
    );
  }
  const setProgress = (t: number) => {
    if (!line || !items.length) return;
    const clip = `inset(0 ${100 - (t + 1 / items.length) * 100}% 0 ${t * 100}%)`;
    line.style.clipPath = clip;
  };
  let progress = 0;
  setProgress(0);
  const offs = buttons.map((b) =>
    listen(b, "click", () => {
      el.dispatchEvent(new CustomEvent("CustomersCaseStudyCarouselNavGroup:buttonClick", { bubbles: true, detail: { index: buttons.indexOf(b) } }));
    }),
  );
  const api: NavGroupApi = {
    items,
    set scrollProgress(t: number) {
      progress = t;
      setProgress(t);
    },
    get scrollProgress() {
      return progress;
    },
  };
  exposeApi(el, N, api);
  return () => {
    offs.forEach((o) => o());
    if (line) {
      line.innerHTML = original;
      line.style.clipPath = "";
    }
  };
};

// ---- Nav track ------------------------------------------------------------------------------------
export const CustomersCaseStudyCarouselNavTrack: Controller = (el) => {
  const groups = childControllers(el, "CustomersCaseStudyCarouselNavGroup");
  const trackEl = childControllers(el, "Track")[0];
  const groupApi = (i: number) => (groups[i] ? getApi<NavGroupApi>(groups[i], "CustomersCaseStudyCarouselNavGroup") : undefined);
  let page = 0;
  let progress = 0;
  const off = listen(el, "CustomersCaseStudyCarouselNavGroup:buttonClick", (e) => {
    const index = (e as CustomEvent<{ index: number }>).detail.index;
    let across = index;
    for (let g = 0; g < page; g++) across += groupApi(g)?.items.length ?? 0;
    el.dispatchEvent(new CustomEvent("CustomersCaseStudyCarouselNavTrack:buttonClick", { bubbles: true, detail: { index, indexAcrossGroups: across } }));
  });
  const api: NavTrackApi = {
    set scrollProgress(t: number) {
      progress = t;
      const g = Math.floor(t);
      const f = t - g;
      const a = groupApi(g);
      if (a) a.scrollProgress = f;
      const b = groupApi(g + 1);
      if (b) b.scrollProgress = f - 1;
    },
    get scrollProgress() {
      return progress;
    },
    set currentPageIndex(i: number) {
      page = i;
      trackEl?.style.setProperty("--currentIndex", String(i));
    },
    get currentPageIndex() {
      return page;
    },
  };
  exposeApi(el, "CustomersCaseStudyCarouselNavTrack", api);
  return off;
};

// ---- Carousel ---------------------------------------------------------------------------------------
export const CustomersCaseStudyCarousel: Controller = (el) => {
  const N = "CustomersCaseStudyCarousel";
  const cards = targetList(el, N, "caseStudyCards");
  const backgrounds = targetList(el, N, "backgrounds");
  const overlay = target(el, N, "overlay");
  const track = target(el, N, "track");
  if (!track || !cards.length) return;

  const navTrackEl = childControllers(el, "CustomersCaseStudyCarouselNavTrack")[0];
  const navTrack = () => (navTrackEl ? getApi<NavTrackApi>(navTrackEl, "CustomersCaseStudyCarouselNavTrack") : undefined);
  const navItemEls = childControllers(el, "CustomersCaseStudyCarouselNavItem");
  const navItem = (i: number) => (navItemEls[i] ? getApi<NavItemApi>(navItemEls[i], "CustomersCaseStudyCarouselNavItem") : undefined);
  const metaTrack = childControllers(el, "Track").find((t) => !navTrackEl?.contains(t));
  const segEl = childControllers(el, "SegmentedControl")[0];

  const byCategory: Record<string, HTMLElement[]> = {};
  cards.forEach((c) => {
    const k = c.dataset.jsCategory;
    if (k) (byCategory[k] ||= []).push(c);
  });
  let currentCategory = cards[0].dataset.jsCategory || "";
  let prevIndex = -1;
  let isScrollingToDestination = false;
  let isAutoPlaying = !prefersReducedMotion();
  let countdown: Step | undefined;
  let scrollingTimeout = 0;
  let restartTimeout = 0;
  const outs = new Set<Step>();

  const categoryIndexForCurrentPage = () => Object.keys(byCategory).indexOf(cards[prevIndex]?.dataset.jsCategory || "");
  const updatePage = (i: number) => {
    if (i === prevIndex || !cards[i]) return;
    const prev = navItem(prevIndex);
    if (prev) prev.active = false;
    prevIndex = i;
    const cur = navItem(prevIndex);
    if (cur) cur.active = true;
    const nt = navTrack();
    if (nt) nt.currentPageIndex = categoryIndexForCurrentPage();
    metaTrack?.style.setProperty("--currentIndex", String(i));
    if (segEl && !isScrollingToDestination) getApi<SegmentedControlApi>(segEl, "SegmentedControl")?.toggleButton(categoryIndexForCurrentPage());
    currentCategory = cards[prevIndex].dataset.jsCategory || "";
  };
  const scrollProgress = () => {
    const left = track.scrollLeft;
    const width = track.getBoundingClientRect().width || 1;
    const total = Math.min(track.scrollWidth, width * (byCategory[currentCategory]?.length ?? cards.length));
    const index = Math.round(left / width);
    const rest = left - index * width;
    const nextIndex = rest > 0 ? index + 1 : index - 1;
    const p = Math.abs(rest) / width;
    return [{ index, progress: 1 - p }, { index: nextIndex, progress: p }, left / total] as const;
  };
  const brand = (i: number) => monoHex(cards[clamp(i, 0, cards.length - 1)].dataset.jsBrandColor || "#000000");
  const onScroll = () => {
    const [a, b, total] = scrollProgress();
    if (a.index !== prevIndex) updatePage(a.index);
    if (overlay) overlay.style.backgroundColor = lerpHex(brand(a.index), brand(b.index), a.progress);
    backgrounds.forEach((bg, i) => {
      if (i < a.index || i > b.index) bg.style.opacity = "0";
    });
    if (backgrounds[a.index]) backgrounds[a.index].style.opacity = String(a.progress);
    if (backgrounds[b.index]) backgrounds[b.index].style.opacity = String(b.progress);
    if (cards[a.index]) cards[a.index].style.opacity = String(a.progress);
    if (cards[b.index]) cards[b.index].style.opacity = String(b.progress);
    const nt = navTrack();
    if (nt) nt.scrollProgress = total;
    if (countdown) {
      countdown.cancel();
      const out = navItem(prevIndex)?.outAnimation();
      if (out) {
        outs.add(out);
        out.play().then(() => outs.delete(out));
      }
      countdown = undefined;
    }
    clearTimeout(scrollingTimeout);
    scrollingTimeout = window.setTimeout(didStopDecelerating, 500);
  };
  const startCountdown = () => {
    if (!isAutoPlaying) return;
    countdown?.cancel();
    countdown = navItem(prevIndex)?.inAnimation();
    countdown?.play();
  };
  const didStopDecelerating = () => {
    isScrollingToDestination = false;
    clearTimeout(restartTimeout);
    if (prefersReducedMotion()) return;
    restartTimeout = window.setTimeout(
      () => {
        isAutoPlaying = true;
        startCountdown();
      },
      isAutoPlaying ? RESTART_DELAY : RESTART_DELAY_AFTER_CLICK,
    );
  };
  const scrollTo = (i: number) => {
    const w = track.getBoundingClientRect().width;
    track.scrollTo({ left: i * w, top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  updatePage(0);
  const offs = [
    listen(track, "scroll", onScroll),
    listen(el, "CustomersCaseStudyCarouselNavTrack:buttonClick", (e) => {
      isAutoPlaying = false;
      scrollTo((e as CustomEvent<{ indexAcrossGroups: number }>).detail.indexAcrossGroups);
    }),
    listen(el, "SegmentedControl:buttonClicked", (e) => {
      const id = (e as CustomEvent<{ identifiers?: string[] }>).detail.identifiers?.[0];
      if (id && id !== currentCategory) {
        isScrollingToDestination = true;
        currentCategory = id;
        scrollTo(cards.findIndex((c) => c.dataset.jsCategory === currentCategory));
      }
    }),
    listen(el, "CustomersCaseStudyCarouselNavItem:CountdownComplete", () => scrollTo((prevIndex + 1) % cards.length)),
    pauseWhenHidden(el, () => [countdown]),
  ];
  if (isAutoPlaying) restartTimeout = window.setTimeout(startCountdown, RESTART_DELAY);
  return () => {
    offs.forEach((o) => o());
    clearTimeout(scrollingTimeout);
    clearTimeout(restartTimeout);
    countdown?.cancel();
    outs.forEach((s) => s.cancel());
  };
};
