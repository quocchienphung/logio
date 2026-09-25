// TestimonialCarousel — port of v1-TestimonialCarousel-GEEHKJ2T.js.
// Scroll-driven: the track is a native scroll-snap scroller (swipe / trackpad); the nav logos and the
// indicator bars smooth-scroll it to a page. On every scroll event the card background colour is
// interpolated between the two pages in view and the photos/cards cross-fade by scroll progress.
import type { Controller } from "../types";
import { listen, target, targetList } from "../lib";
import { clamp, mixHex, monoDarkSurface, scrollTrackTo } from "./util";

const NAV_FLAT = "variant--Flat";
const INDICATOR_ACTIVE = "TestimonialCarousel__indicator--active";
const SWIPEABLE_MAX_WIDTH = 750; // two-testimonial carousels become swipeable below this width

export const TestimonialCarousel: Controller = (el) => {
  const N = "TestimonialCarousel";
  const carousel = target(el, N, "carousel");
  const track = target(el, N, "track");
  const testimonials = targetList(el, N, "testimonials");
  const images = targetList(el, N, "images");
  const indicators = targetList<HTMLButtonElement>(el, N, "indicators");
  const navButtons = targetList<HTMLButtonElement>(el, N, "navButtons");
  if (!carousel || !track || !testimonials.length) return;

  const orientation = el.dataset.jsOrientation === "Vertical" ? "VERTICAL" : "HORIZONTAL";
  const colors = testimonials.map((t) => monoDarkSurface(t.dataset.jsBackgroundColor || "#000000"));
  let lastPageIndex = 0;

  const isSwipeable = () => el.dataset.jsSwipeable === "";
  const setSwipeable = (on: boolean) => {
    if (on) {
      el.dataset.jsSwipeable = "";
      carousel.style.backgroundColor = colors[lastPageIndex];
    } else {
      delete el.dataset.jsSwipeable;
      carousel.style.backgroundColor = "transparent";
    }
  };

  const updatePage = (page: number) => {
    navButtons.forEach((b, i) => {
      b.querySelector("svg")?.classList.toggle(NAV_FLAT, i !== page);
      b.setAttribute("aria-current", i === page ? "true" : "false");
    });
    indicators.forEach((b, i) => {
      b.classList.toggle(INDICATOR_ACTIVE, i === page);
      b.setAttribute("aria-current", i === page ? "true" : "false");
    });
    lastPageIndex = page;
  };

  // Pages are one carousel width apart; `current` is the page nearest the scroll position and
  // `next` the neighbour it is moving towards, each with its visible share (0..1).
  const scrollProgress = () => {
    const x = track.scrollLeft;
    const { width } = el.getBoundingClientRect();
    const page = Math.floor((x - width / 2) / width) + 1;
    const offset = x - page * width;
    const next = offset > 0 ? page + 1 : page - 1;
    const nextProgress = Math.abs(offset) / width;
    return { current: { page, progress: 1 - nextProgress }, next: { page: next, progress: nextProgress } };
  };

  const fade = (list: HTMLElement[], page: number, progress: number) => {
    if (list[page]) list[page].style.opacity = `${progress}`;
  };

  const onScroll = () => {
    const { current, next } = scrollProgress();
    if (current.page !== lastPageIndex) updatePage(current.page);
    const last = testimonials.length - 1;
    const a = clamp(current.page, 0, last);
    const b = clamp(next.page, 0, last);
    carousel.style.backgroundColor = mixHex(colors[a], colors[b], current.progress);
    fade(images, current.page, current.progress);
    fade(images, next.page, next.progress);
    fade(testimonials, current.page, current.progress);
    fade(testimonials, next.page, next.progress);
  };

  const scrollToPage = (i: number) => {
    if (i < 0) return;
    scrollTrackTo(track, i * el.getBoundingClientRect().width);
  };

  const onResize = (entries: ResizeObserverEntry[]) => {
    entries.forEach((entry) => {
      const should = orientation === "HORIZONTAL" || (testimonials.length === 2 && entry.contentRect.width < SWIPEABLE_MAX_WIDTH);
      if (!isSwipeable() && should) setSwipeable(true);
      else if (isSwipeable() && !should) setSwipeable(false);
    });
  };

  carousel.style.backgroundColor = colors[0];
  updatePage(0);
  const offs = [
    listen(track, "scroll", onScroll),
    ...navButtons.map((b) => listen(b, "click", () => scrollToPage(navButtons.indexOf(b)))),
    ...indicators.map((b) => listen(b, "click", () => scrollToPage(indicators.indexOf(b)))),
  ];
  const ro = new ResizeObserver(onResize);
  ro.observe(el);

  return () => {
    offs.forEach((off) => off());
    ro.disconnect();
  };
};
