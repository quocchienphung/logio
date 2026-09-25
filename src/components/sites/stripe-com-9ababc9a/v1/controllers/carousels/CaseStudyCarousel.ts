// CaseStudyCarousel — port of v1-CaseStudyCarousel-W42GOHLJ.js; CaseStudyCarouselNav — v1-chunk-OMTU4XFQ.js.
// Scroll-driven: the track is a native scroll-snap scroller (swipe on touch). The logo buttons below it
// smooth-scroll to a case study; while scrolling, the thin accent line above the logos is clipped to
// the scroll position, the current logo switches to its colour variant and videos are paused when the
// page changes. Mobile (< 450 px) shows indicator bars instead of logos.
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, listen, target, targetList } from "../lib";
import { clamp, monoHex, scrollTrackTo } from "./util";

const LOGO_FLAT = "variant--Flat";
const INDICATOR = "CaseStudyCarouselNav__indicator";
const INDICATOR_ACTIVE = "CaseStudyCarouselNav__indicator--active";
const SEGMENT = "CaseStudyCarouselNav__coloredLineSegment";

interface CaseStudyNavApi {
  currentIndex: number;
  scrollProgress: number;
}
interface VideoApi {
  pause(): void;
}

export const CaseStudyCarouselNav: Controller = (el) => {
  const N = "CaseStudyCarouselNav";
  const items = targetList(el, N, "items");
  const buttons = targetList<HTMLButtonElement>(el, N, "buttons");
  const coloredLine = target(el, N, "coloredLine");
  const indicatorContainer = target(el, N, "indicatorContainer");
  if (!items.length) return;

  const visibleItems = () => items.filter((it) => getComputedStyle(it).display !== "none");
  const visibleButtons = () => visibleItems().map((it) => it.querySelector("button")).filter((b): b is HTMLButtonElement => !!b);

  const indicators = items.map(() => {
    const li = document.createElement("li");
    li.className = INDICATOR;
    indicatorContainer?.appendChild(li);
    return li;
  });
  const segments = visibleItems().map((it) => {
    const seg = document.createElement("div");
    seg.className = SEGMENT;
    seg.style.backgroundColor = monoHex(it.dataset.jsAccentColor || "");
    coloredLine?.appendChild(seg);
    return seg;
  });

  let current = 0;
  const setCurrent = (t: number) => {
    items[current]?.querySelector("svg")?.classList.add(LOGO_FLAT);
    items[t]?.querySelector("svg")?.classList.remove(LOGO_FLAT);
    indicators[current]?.classList.remove(INDICATOR_ACTIVE);
    indicators[t]?.classList.add(INDICATOR_ACTIVE);
    items.forEach((it, i) => it.querySelector("button")?.setAttribute("aria-current", String(i === t)));
    current = t;
  };
  const setScrollProgress = (t: number) => {
    if (!coloredLine) return;
    const n = visibleItems().length || 1;
    coloredLine.style.clipPath = `inset(0 ${100 - (t + 1 / n) * 100}% 0 ${t * 100}%)`;
  };

  setCurrent(0);
  setScrollProgress(0);
  const offs = buttons.map((b) =>
    listen(b, "click", () => {
      const index = visibleButtons().indexOf(b);
      el.dispatchEvent(new CustomEvent("CaseStudyCarouselNav:buttonClick", { bubbles: true, detail: { index } }));
    }),
  );
  const api: CaseStudyNavApi = {
    get currentIndex() {
      return current;
    },
    set currentIndex(t: number) {
      setCurrent(t);
    },
    set scrollProgress(t: number) {
      setScrollProgress(t);
    },
    get scrollProgress() {
      return 0;
    },
  };
  exposeApi(el, N, api);

  return () => {
    offs.forEach((off) => off());
    indicators.forEach((li) => li.remove());
    segments.forEach((s) => s.remove());
    if (coloredLine) coloredLine.style.clipPath = "";
  };
};

export const CaseStudyCarousel: Controller = (el) => {
  const track = target(el, "CaseStudyCarousel", "track");
  if (!track) return;
  const nav = () => {
    const node = childControllers(el, "CaseStudyCarouselNav")[0];
    return node ? getApi<CaseStudyNavApi>(node, "CaseStudyCarouselNav") : undefined;
  };
  const pauseVideos = () => {
    childControllers(el, "Video").forEach((v) => {
      const api = getApi<VideoApi>(v, "Video");
      if (api) api.pause();
      else v.querySelectorAll("video").forEach((video) => video.pause());
    });
  };

  const updatePage = (page: number) => {
    const n = nav();
    if (page === n?.currentIndex) return;
    pauseVideos();
    if (n) n.currentIndex = page;
  };

  const onScroll = () => {
    const { scrollLeft: x, scrollWidth } = track;
    const { width } = el.getBoundingClientRect();
    const page = clamp(Math.floor((x - width / 2) / width) + 1, 0, track.children.length - 1);
    updatePage(page);
    const n = nav();
    if (n) n.scrollProgress = x / scrollWidth;
  };

  const onNavClick = (e: Event) => {
    const { index } = (e as CustomEvent<{ index: number }>).detail;
    if (index < 0) return;
    scrollTrackTo(track, index * el.getBoundingClientRect().width);
  };

  updatePage(0);
  const offs = [listen(track, "scroll", onScroll), listen(el, "CaseStudyCarouselNav:buttonClick", onNavClick)];
  return () => offs.forEach((off) => off());
};
