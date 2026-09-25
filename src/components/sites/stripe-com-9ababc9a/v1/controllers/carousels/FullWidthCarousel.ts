// FullWidthCarousel — port of v1-chunk-F635Q6IC.js (+ FullWidthFeatureCarousel, its Nav and MobileNav:
// v1-FullWidthFeatureCarousel-I3VPVACF.js, v1-chunk-6VKPSPK2.js, v1-chunk-B23EYDOT.js).
// Scroll-driven horizontal track with CSS scroll-snap. Desktop mouse users can drag it (8 px click
// threshold, snaps to the neighbour after 7.5 % of an item); clicking a slide or the prev/next buttons
// smooth-scrolls to it; touch uses native swipe. The mobile nav's indicator follows the live
// fractional scroll position.
import type { Controller } from "../types";
import { exposeApi, getApi, listen, target, targetList, childControllers } from "../lib";
import { clamp, scrollTrackTo } from "./util";

const DRAG_THRESHOLD = 0.075;
const CLICK_THRESHOLD = 8;
const SCROLL_IDLE_MS = 50;

export interface FullWidthCarouselApi {
  readonly currentItemIndex: number;
  readonly itemsInBoundsCount: number;
  goToSlide(index: number, animate?: boolean): void;
}

export const FullWidthCarousel: Controller = (el) => {
  const N = "FullWidthCarousel";
  const layout = target(el, N, "layout");
  const track = target(el, N, "track");
  const leftSpacer = target(el, N, "leftSpacer");
  if (!layout || !track || !leftSpacer) return;
  // The track's first and last children are the spacers.
  const items = Array.from(track.children).slice(1, -1) as HTMLElement[];
  if (!items.length) return;

  const enableItemsEnteringObserver = el.hasAttribute("data-enable-items-entering-observer");
  const enableLiveFractionalIndex = el.hasAttribute("data-enable-live-fractional-index");
  const isTouchDevice = "ontouchstart" in window;

  let isScrolling = false;
  let scrollTimeout: number | undefined;
  let leftSpacerWidth = leftSpacer.offsetWidth;
  let itemsInView = 0;
  let itemWidth = 0;
  let lastDispatchedIndex = -1;
  let isDragging = false;
  let isAnimatingAfterDrag = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let dragDirection = 0;
  let windowWidth = window.innerWidth;
  let windowHeight = window.innerHeight;

  const itemsInBoundsCount = () => items.length - itemsInView;

  const currentItemIndex = (): number => {
    const x = Math.round(track.scrollLeft);
    const exact = items.findIndex((it) => Math.abs(leftSpacerWidth + x - it.offsetLeft) <= 2);
    if (exact >= 0) return exact;
    const w = el.offsetWidth;
    for (let i = 0; i < items.length; i += 1) {
      const l = items[i].offsetLeft;
      if (l >= x && l + items[i].offsetWidth <= x + w) return i;
    }
    return 0;
  };

  const scrollProgress = () => {
    const { scrollLeft: x, scrollWidth } = track;
    const w = itemWidth || 1;
    const last = track.children.length - 1;
    const index = clamp(Math.floor((x - w / 2) / w) + 1, 0, last);
    const offset = x - index * w;
    const next = clamp(offset > 0 ? index + 1 : index - 1, 0, last);
    const nextProgress = Math.abs(offset) / w;
    return {
      current: { index, progress: 1 - nextProgress },
      next: { index: next, progress: nextProgress },
      totalPercentage: x / (scrollWidth - layout.offsetWidth),
    };
  };

  const updateItemWidth = (notify: boolean) => {
    const w = items[0].offsetWidth;
    itemsInView = w ? Math.round(el.offsetWidth / w) : 0;
    el.style.setProperty("--fullWidthCarouselItemWidth", `${w}px`);
    if (notify) el.dispatchEvent(new CustomEvent("FullWidthCarousel:itemWidthUpdated", { bubbles: true }));
  };

  const goToSlide = (index: number, animate = true) => {
    const i = index > itemsInBoundsCount() ? itemsInBoundsCount() : index;
    const item = items[i];
    if (!item || (isScrolling && !isAnimatingAfterDrag)) return;
    scrollTrackTo(track, item.offsetLeft - leftSpacer.offsetWidth, animate);
  };

  const onScroll = () => {
    isScrolling = true;
    window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => (isScrolling = false), SCROLL_IDLE_MS);
    if (enableLiveFractionalIndex && itemWidth) {
      const fractionalIndex = clamp(leftSpacerWidth - items[0].offsetLeft + track.scrollLeft / itemWidth, 0, itemsInBoundsCount());
      el.dispatchEvent(new CustomEvent("FullWidthCarousel:fractionalIndexUpdated", { bubbles: true, detail: { fractionalIndex } }));
    }
    const { current, totalPercentage } = scrollProgress();
    if (isAnimatingAfterDrag && (current.progress === 1 || totalPercentage === 1)) {
      isAnimatingAfterDrag = false;
      track.style.scrollSnapType = "";
    }
  };

  const onSlideClick = (e: MouseEvent) => {
    if (isDragging) {
      isDragging = false;
      return;
    }
    const t = e.target;
    const item = e.currentTarget as HTMLElement;
    if (!(t instanceof HTMLElement) || t.tagName === "A" || item.tagName === "A") return;
    const index = items.indexOf(item);
    goToSlide(index);
    el.dispatchEvent(new CustomEvent("FullWidthCarousel:slideClicked", { bubbles: true, detail: { index } }));
  };

  const onLinkClick = (e: MouseEvent) => {
    if (isDragging) e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (Math.abs(startX - e.clientX) > CLICK_THRESHOLD || Math.abs(startY - e.clientY) > CLICK_THRESHOLD) isDragging = true;
    const delta = lastX - e.clientX;
    lastX = e.clientX;
    if (delta !== 0) dragDirection = delta > 0 ? 1 : -1;
    track.scrollLeft += delta;
    if (e.clientX < 0 || e.clientX > windowWidth || e.clientY < 0 || e.clientY > windowHeight) stopDragging();
  };

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    isDragging = false;
    isAnimatingAfterDrag = false;
    startX = lastX = e.clientX;
    startY = e.clientY;
    track.style.scrollSnapType = "none";
    window.addEventListener("mousemove", onMouseMove, { passive: true });
  };

  const stopDragging = () => {
    window.removeEventListener("mousemove", onMouseMove);
    if (!isDragging) {
      track.style.scrollSnapType = "";
      return;
    }
    const { current, next } = scrollProgress();
    let index = current.index;
    if (dragDirection === 1 && current.index < next.index && next.progress > DRAG_THRESHOLD) index = next.index;
    if (dragDirection === -1 && current.index > next.index && current.progress < 1 - DRAG_THRESHOLD) index = next.index;
    isAnimatingAfterDrag = true;
    goToSlide(index);
  };

  const onResize = () => {
    const mr = parseFloat(getComputedStyle(items[0]).marginRight) || 0;
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    itemWidth = items[0].offsetWidth + mr;
    updateItemWidth(true);
  };

  const offs: (() => void)[] = [];
  if (enableItemsEnteringObserver) {
    const io = new IntersectionObserver(
      () => {
        const index = currentItemIndex();
        if (index === lastDispatchedIndex) return;
        lastDispatchedIndex = index;
        el.dispatchEvent(new CustomEvent("FullWidthCarousel:itemEntered", { bubbles: true, detail: { index } }));
      },
      { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    items.forEach((it) => io.observe(it));
    offs.push(() => io.disconnect());
  }

  // When the carousel leaves the viewport, snap it (without animation) onto the item it shows.
  const scrollIo = new IntersectionObserver(
    (entries) => {
      if (entries[0].intersectionRatio >= 1e-4) return;
      const i = currentItemIndex();
      const x = items[i].offsetLeft - leftSpacer.offsetWidth;
      if (Math.abs(track.scrollLeft - x) > 2) goToSlide(i, false);
    },
    { threshold: 1e-4 },
  );
  scrollIo.observe(el);
  offs.push(() => scrollIo.disconnect());

  offs.push(listen(track, "scroll", onScroll));
  if (!isTouchDevice) {
    offs.push(listen(track, "mousedown", onMouseDown));
    offs.push(listen(window, "mouseup", stopDragging, { capture: true }));
    offs.push(listen(window, "contextmenu", stopDragging));
    el.querySelectorAll("a").forEach((a) => offs.push(listen(a, "click", onLinkClick)));
  }
  items.forEach((it) => offs.push(listen(it, "click", onSlideClick)));

  const ro = new ResizeObserver(onResize);
  ro.observe(el);
  const spacerRo = new ResizeObserver(() => (leftSpacerWidth = leftSpacer.offsetWidth));
  spacerRo.observe(leftSpacer);
  updateItemWidth(false);
  track.scrollLeft = 0;

  const api: FullWidthCarouselApi = {
    get currentItemIndex() {
      return currentItemIndex();
    },
    get itemsInBoundsCount() {
      return itemsInBoundsCount();
    },
    goToSlide,
  };
  exposeApi(el, N, api);

  return () => {
    offs.forEach((off) => off());
    window.removeEventListener("mousemove", onMouseMove);
    window.clearTimeout(scrollTimeout);
    ro.disconnect();
    spacerRo.disconnect();
    track.style.scrollSnapType = "";
    isScrolling = false;
  };
};

// ---------------------------------------------------------------------------------------------------

const NAV_INACTIVE = "FullWidthFeatureCarouselNav__button--inactive";

interface FeatureNavApi {
  updateButtonState(index: number, maxIndex: number): void;
}
interface MobileNavApi {
  updateFractionalIndex(fractionalIndex: number): void;
}

/** Prev/next buttons (desktop ≥ 600 px): emit a direction; greyed out at either end. */
export const FullWidthFeatureCarouselNav: Controller = (el) => {
  const buttons = targetList<HTMLButtonElement>(el, "FullWidthFeatureCarouselNav", "buttons");
  const offs = buttons.map((b) =>
    listen(b, "click", () => {
      el.dispatchEvent(new CustomEvent("FullWidthFeatureCarouselNav:buttonClicked", { bubbles: true, detail: { direction: b.dataset.direction } }));
    }),
  );
  const api: FeatureNavApi = {
    updateButtonState(index, maxIndex) {
      const [prev, next] = buttons;
      if (!prev || !next) return;
      prev.classList.toggle(NAV_INACTIVE, index <= 0);
      next.classList.toggle(NAV_INACTIVE, index >= maxIndex);
      prev.setAttribute("aria-disabled", String(index <= 0));
      next.setAttribute("aria-disabled", String(index >= maxIndex));
    },
  };
  exposeApi(el, "FullWidthFeatureCarouselNav", api);
  return () => offs.forEach((off) => off());
};

const MOBILE_ACTIVE = "FullWidthFeatureCarouselMobileNav__indicatorControlListItem--active";
const MOBILE_SLIDE_PX = 24;

/** Indicator bars (mobile < 600 px): the active bar slides with the live fractional scroll index. */
export const FullWidthFeatureCarouselMobileNav: Controller = (el) => {
  const items = targetList(el, "FullWidthFeatureCarouselMobileNav", "listItemButtons");
  if (!items.length) return;
  items.forEach((it, i) => it.classList.toggle(MOBILE_ACTIVE, i === 0));
  const offs = items.map((it, i) =>
    listen(it, "click", () => {
      el.dispatchEvent(new CustomEvent("FullWidthFeatureCarouselMobileNav:buttonClicked", { bubbles: true, detail: { index: i } }));
    }),
  );
  const setActive = (a: number, b: number) => {
    items.forEach((it, i) => {
      const on = i === a || i === b;
      it.classList.toggle(MOBILE_ACTIVE, on);
      it.querySelector("button")?.setAttribute("aria-current", String(on));
    });
  };
  const api: MobileNavApi = {
    updateFractionalIndex(t) {
      const e = Math.floor(t);
      const frac = t % 1;
      const s = e + 1;
      if (!items[e]) return;
      items[e].style.setProperty("--activeButtonXPosition", `${frac * MOBILE_SLIDE_PX}px`);
      if (s < items.length) items[s].style.setProperty("--activeButtonXPosition", `-${(1 - frac) * MOBILE_SLIDE_PX}px`);
      setActive(e, frac === 0 ? e : Math.min(s, items.length - 1));
    },
  };
  exposeApi(el, "FullWidthFeatureCarouselMobileNav", api);
  return () => {
    offs.forEach((off) => off());
    items.forEach((it) => it.style.removeProperty("--activeButtonXPosition"));
  };
};

/** Wires the FullWidthCarousel to its desktop and mobile navs through bubbling events. */
export const FullWidthFeatureCarousel: Controller = (el) => {
  const child = <T>(name: string): T | undefined => {
    const node = childControllers(el, name)[0];
    return node ? getApi<T>(node, name) : undefined;
  };
  const carousel = () => child<FullWidthCarouselApi>("FullWidthCarousel");

  const onNav = (e: Event) => {
    const c = carousel();
    if (!c) return;
    const dir = (e as CustomEvent<{ direction?: string }>).detail.direction;
    const i = c.currentItemIndex;
    c.goToSlide(dir === "1" ? i + 1 : i - 1);
  };
  const onItemEntered = (e: Event) => {
    const c = carousel();
    const nav = child<FeatureNavApi>("FullWidthFeatureCarouselNav");
    const { index } = (e as CustomEvent<{ index?: number }>).detail;
    if (!c || !nav || index === undefined) return;
    nav.updateButtonState(index, c.itemsInBoundsCount);
  };
  const onMobile = (e: Event) => {
    carousel()?.goToSlide((e as CustomEvent<{ index: number }>).detail.index);
  };
  const onFraction = (e: Event) => {
    child<MobileNavApi>("FullWidthFeatureCarouselMobileNav")?.updateFractionalIndex((e as CustomEvent<{ fractionalIndex: number }>).detail.fractionalIndex);
  };
  const offs = [
    listen(el, "FullWidthFeatureCarouselNav:buttonClicked", onNav),
    listen(el, "FullWidthCarousel:itemEntered", onItemEntered),
    listen(el, "FullWidthFeatureCarouselMobileNav:buttonClicked", onMobile),
    listen(el, "FullWidthCarousel:fractionalIndexUpdated", onFraction),
  ];
  // The carousel's first itemEntered can fire before this parent listens (children mount first).
  const c = carousel();
  const nav = child<FeatureNavApi>("FullWidthFeatureCarouselNav");
  if (c && nav) nav.updateButtonState(c.currentItemIndex, c.itemsInBoundsCount);
  return () => offs.forEach((off) => off());
};
