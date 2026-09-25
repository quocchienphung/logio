// Navigation controllers of the legacy product pages.
//   StickyNav                    ← v1-StickyNav-AARYF6LX.js
//   FixedNav                     ← v1-FixedNav-TKD4FODF.js
//   PaymentsStickyNav            ← v1-StickyNav-7JLTRUYL.js (+ scrollTo helper v1-chunk-R4LGG24H.js)
//   MobileStickyNav              ← v1-MobileStickyNav-BAAQGNR6.js
//   HorizontalOverflowContainer  ← v1-chunk-FKZYSESR.js
//   ProductNav                   ← v1-ProductNav-OLNZ42IK.js
//   ProductNavDropdownItem       ← v1-ProductNavDropdownItem-5OM23LUB.js
// Offsets are measured against the viewport/document exactly like the reference (sticky/fixed bars use
// top: 0); the shared site header is in normal flow, so no header height is involved.
import type { Controller } from "../types";
import { getApi, listen, prefersReducedMotion, target, targetList } from "../lib";
import { clamp, disableAmbientAnimations, easeInOutCubic, exposeCore } from "./util";

const setFlag = (el: HTMLElement, key: string, on: boolean) => {
  if (on) el.dataset[key] = "";
  else delete el.dataset[key];
};

// ---- StickyNav ----------------------------------------------------------------------------------
export const StickyNav: Controller = (el) => {
  const parent = el.parentElement;
  const updateHeight = () => parent?.style.setProperty("--stickyNavHeight", `${el.getBoundingClientRect().height}px`);
  const onScroll = () => {
    const top = Math.floor(el.getBoundingClientRect().top);
    setFlag(el, "stickyBefore", top > 0);
    setFlag(el, "stickyStuck", top === 0);
    setFlag(el, "stickyAfter", top < 0);
  };
  const onResize = () => {
    onScroll();
    updateHeight();
    el.style.setProperty("--viewportFullWidth", String(document.documentElement.clientWidth));
  };
  const offScroll = listen(window, "scroll", onScroll);
  const offResize = listen(window, "resize", onResize);
  onResize();
  return () => {
    offScroll();
    offResize();
  };
};

// ---- FixedNav -----------------------------------------------------------------------------------
export const FixedNav: Controller = (el) => {
  const parent = el.parentElement;
  if (!parent) return;
  const peeking = el.hasAttribute("data-js-peeking-content-experiment");
  const nextSiblings = el.dataset.jsScrollTarget === "NextSiblings";
  let height = 0;
  const targetRect = () => {
    const r = parent.getBoundingClientRect();
    return nextSiblings ? { top: r.top, bottom: Infinity } : { top: r.top, bottom: r.bottom };
  };
  const handleScroll = () => {
    const { top, bottom } = targetRect();
    if (peeking) {
      const threshold = window.innerHeight * 0.2;
      setFlag(el, "fixedBefore", window.scrollY < threshold);
      setFlag(el, "fixed", window.scrollY >= threshold);
    } else {
      setFlag(el, "fixedBefore", top > 0);
      setFlag(el, "fixed", top <= 0 && bottom > height);
    }
    setFlag(el, "fixedAfter", bottom < height);
  };
  const handleResize = () => {
    handleScroll();
    height = el.getBoundingClientRect().height;
  };
  const offScroll = listen(window, "scroll", handleScroll);
  const offResize = listen(window, "resize", handleResize);
  handleResize();
  return () => {
    offScroll();
    offResize();
  };
};

// ---- PaymentsStickyNav --------------------------------------------------------------------------
const PSN_ACTIVE = "PaymentsStickyNav__item--active";
const PSN_EXPANDED = "PaymentsStickyNav__track--isExpanded";
const PSN_SECTION_OFFSET = 64;
const PSN_COLLAPSED_HEIGHT = 64;
const PSN_MOBILE_ITEM_HEIGHT = 50;
const PSN_MOBILE_BREAKPOINT = 600;

export const PaymentsStickyNav: Controller = (el) => {
  const scrollIndicator = target(el, "PaymentsStickyNav", "scrollIndicator");
  const itemList = target(el, "PaymentsStickyNav", "itemList");
  const track = target(el, "PaymentsStickyNav", "track");
  const dropdownArrow = target(el, "PaymentsStickyNav", "dropdownArrow");
  const items = targetList(el, "PaymentsStickyNav", "stickyNavItems");
  const content = el.closest("#MktContent");
  if (!scrollIndicator || !itemList || !track || !dropdownArrow || !content) return;
  const sections = Array.from(content.querySelectorAll<HTMLElement>(".Section")).filter((s) => s.hasAttribute("id"));
  let offsets: number[] = [];
  let currentIndex = -1;
  let expanded = false;
  let windowWidth = window.innerWidth;

  const setSectionsOffsetTop = () => {
    offsets = sections.map((s) => window.scrollY + s.getBoundingClientRect().top - PSN_SECTION_OFFSET);
  };
  const navItemsState = (index: number) => items.forEach((item, i) => item.classList.toggle(PSN_ACTIVE, i === index));
  const toggleDropdownState = () => {
    track.classList.toggle(PSN_EXPANDED, !expanded);
    expanded = !expanded;
    track.style.maxHeight = `${expanded ? track.scrollHeight : PSN_COLLAPSED_HEIGHT}px`;
    if (expanded) itemList.style.transform = "translateY(0px)";
  };
  const navScrollToActiveItem = () => {
    if (currentIndex < 0) return;
    if (expanded) toggleDropdownState();
    if (windowWidth < PSN_MOBILE_BREAKPOINT) {
      itemList.style.transform = `translateY(${-PSN_MOBILE_ITEM_HEIGHT * currentIndex}px)`;
    } else {
      const item = items[currentIndex];
      if (!item) return;
      const left = Math.max(0, Math.min(itemList.scrollWidth - itemList.offsetWidth, item.offsetLeft - (itemList.offsetWidth - item.offsetWidth) / 2));
      track.scrollTo({ left, top: 0, behavior: disableAmbientAnimations() ? "auto" : "smooth" });
    }
  };
  const handleScroll = () => {
    const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    scrollIndicator.style.clipPath = `inset(0 ${100 * (1 - progress)}% 0 0)`;
    const prev = currentIndex;
    currentIndex = offsets.findLastIndex((o) => window.scrollY >= o);
    if (prev !== currentIndex) {
      navScrollToActiveItem();
      navItemsState(currentIndex);
    }
  };
  const handleResize = () => {
    windowWidth = window.innerWidth;
    setSectionsOffsetTop();
    handleScroll();
    if (windowWidth > PSN_MOBILE_BREAKPOINT) itemList.style.transform = "translateY(0px)";
  };
  const handleItemClick = (e: Event) => {
    currentIndex = items.indexOf(e.currentTarget as HTMLElement);
    navItemsState(currentIndex);
    navScrollToActiveItem();
  };

  setSectionsOffsetTop();
  const ro = new ResizeObserver(handleResize);
  ro.observe(document.body);
  const offs = [
    ...items.map((item) => listen(item, "click", handleItemClick)),
    listen(window, "scroll", handleScroll),
    listen(dropdownArrow, "click", toggleDropdownState),
  ];
  if (el.getBoundingClientRect().top <= 0) handleScroll();
  return () => {
    ro.disconnect();
    offs.forEach((f) => f());
  };
};

// ---- MobileStickyNav ----------------------------------------------------------------------------
const MSN_STICKY = "MobileStickyNav--isSticky";

function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp(`(?:^|;)\\s*${name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export const MobileStickyNav: Controller = (el) => {
  const mq = window.matchMedia("(min-width: 900px)");
  if (mq.matches) return;
  if (readCookie("__Secure-has_logged_in") === "true") {
    el.classList.add("MobileStickyNav--hasLoggedIn");
    return () => el.classList.remove("MobileStickyNav--hasLoggedIn");
  }
  const cs = getComputedStyle(el);
  const navHeight = parseInt(cs.getPropertyValue("--mobileStickyNavHeight"), 10) || 0;
  const iosPadding = parseInt(cs.getPropertyValue("--iosPadding"), 10) || 0;
  // Reference test (also true for other touch browsers whose UA contains "Safari").
  const isIos = /iPhone|Safari/.test(navigator.userAgent) && navigator.maxTouchPoints > 0;
  if (isIos) el.classList.add("MobileStickyNav--isIos");
  let visible = false;
  let active = true;

  const addBottomPadding = () => {
    document.body.style.paddingBottom = `${navHeight + (isIos ? iosPadding * 2 : 0)}px`;
  };
  const removeBottomPadding = () => {
    document.body.style.paddingBottom = "";
  };
  // The reference polls scrollY every animation frame; the same test runs here on scroll/resize.
  const update = () => {
    if (!active) return;
    const y = window.scrollY;
    if (y > window.innerHeight && !visible) {
      visible = true;
      el.classList.add(MSN_STICKY);
    } else if (y <= window.innerHeight && visible) {
      visible = false;
      el.classList.remove(MSN_STICKY);
    }
  };
  const handleMediaQueryChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      active = false;
      removeBottomPadding();
    } else {
      active = true;
      addBottomPadding();
      update();
    }
  };
  addBottomPadding();
  mq.addEventListener("change", handleMediaQueryChange);
  const offScroll = listen(window, "scroll", update, { passive: true });
  const offResize = listen(window, "resize", update);
  update();
  return () => {
    mq.removeEventListener("change", handleMediaQueryChange);
    offScroll();
    offResize();
    removeBottomPadding();
    el.classList.remove(MSN_STICKY, "MobileStickyNav--isIos");
  };
};

// ---- HorizontalOverflowContainer ----------------------------------------------------------------
export interface HorizontalOverflowContainerApi {
  readonly track: HTMLElement;
  readonly spacing: number;
  makeSureElementIsInView(el: HTMLElement, spacing?: number, mode?: "eager" | "lazy"): void;
  scrollToOffset(offset: number, duration?: number): void;
}

export const HorizontalOverflowContainer: Controller = (el) => {
  const track = target(el, "HorizontalOverflowContainer", "track");
  if (!track) return;
  let raf = 0;
  const scrollToOffset = (offset: number, duration = 350) => {
    cancelAnimationFrame(raf);
    if (prefersReducedMotion() || !duration || duration <= 0) {
      track.scrollLeft = offset;
      return;
    }
    const from = track.scrollLeft;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      track.scrollLeft = easeInOutCubic(elapsed, from, offset - from, duration);
      if (elapsed < duration) raf = requestAnimationFrame(step);
      else track.scrollLeft = offset;
    };
    raf = requestAnimationFrame(step);
  };
  const api: HorizontalOverflowContainerApi = {
    track,
    get spacing() {
      return parseFloat(el.style.getPropertyValue("--horizontalOverflowSpacing"));
    },
    makeSureElementIsInView(item, spacing = 0, mode = "eager") {
      if (!track.contains(item)) return;
      const { offsetLeft, offsetWidth } = item;
      const { scrollLeft, offsetWidth: trackWidth } = track;
      const maxScroll = track.scrollWidth - trackWidth;
      const rightEdge = offsetLeft + offsetWidth + spacing;
      const leftEdge = offsetLeft - spacing;
      const clippedRight = trackWidth + scrollLeft < rightEdge;
      const clippedLeft = scrollLeft > leftEdge;
      if (mode === "eager") {
        if (clippedLeft || clippedRight) scrollToOffset(Math.min(leftEdge, maxScroll));
      } else {
        if (clippedRight) scrollToOffset(Math.min(maxScroll, rightEdge - trackWidth));
        if (clippedLeft) scrollToOffset(Math.min(maxScroll, leftEdge));
      }
    },
    scrollToOffset,
  };
  exposeCore(el, "HorizontalOverflowContainer", api);
  return () => cancelAnimationFrame(raf);
};

// ---- ProductNav ---------------------------------------------------------------------------------
export const ProductNav: Controller = (el) => {
  const items = targetList(el, "ProductNav", "items");
  const overflowEl = el.querySelector<HTMLElement>('[data-js-controller~="HorizontalOverflowContainer"]');
  let timer: number | undefined;
  const scrollToElement = (item: HTMLElement) => {
    const api = overflowEl ? getApi<HorizontalOverflowContainerApi>(overflowEl, "HorizontalOverflowContainer") : undefined;
    if (api) api.scrollToOffset(item.offsetLeft - api.spacing, 0);
    else timer = window.setTimeout(() => scrollToElement(item), 200);
  };
  const active = items.find((i) => i.dataset.jsActive === "");
  if (active) scrollToElement(active);
  return () => window.clearTimeout(timer);
};

// ---- ProductNavDropdownItem ---------------------------------------------------------------------
const PNDI_CLOSING = "ProductNavDropdownItem__panel--isClosing";
const PNDI_FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PNDI_OFFSET_Y = 8;
const PNDI_DEFAULT_GUTTER = 16;
const PNDI_HOVER_CLOSE_DELAY = 100;

export const ProductNavDropdownItem: Controller = (el) => {
  const trigger = target<HTMLButtonElement>(el, "ProductNavDropdownItem", "trigger");
  const panel = target(el, "ProductNavDropdownItem", "panel");
  if (!trigger || !panel) return;
  const nav = el.closest<HTMLElement>(".ProductNav");
  const track = el.closest<HTMLElement>(".HorizontalOverflowContainer__track");
  let isOpen = false;
  let relocated = false;
  let hoverCloseTimeout: number | undefined;

  const gutter = () => {
    const v = parseFloat(getComputedStyle(el).getPropertyValue("--columnPaddingNormal"));
    return Number.isFinite(v) ? v : PNDI_DEFAULT_GUTTER;
  };
  const panelLinks = () => Array.from(panel.querySelectorAll<HTMLElement>("a"));
  const navTriggers = () => (nav ? Array.from(nav.querySelectorAll<HTMLElement>(".ProductNavDropdownItem__trigger")) : []);
  const contains = (n: EventTarget | null) => n instanceof Node && (el.contains(n) || panel.contains(n));
  const relocatePanel = () => {
    if (!nav) return;
    nav.appendChild(panel);
    relocated = true;
  };
  const returnPanel = () => {
    if (!relocated) return;
    el.appendChild(panel);
    relocated = false;
  };
  const updatePosition = () => {
    const parent = panel.offsetParent;
    if (!parent) return;
    const pr = parent.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const { width } = panel.getBoundingClientRect();
    const g = gutter();
    const max = Math.max(g, window.innerWidth - g - width);
    let left = r.left;
    if (left > max) {
      const t = trigger.getBoundingClientRect();
      left = t.left + t.width / 2 - width / 2;
    }
    panel.style.left = `${clamp(left, g, max) - (pr.left + parent.clientLeft)}px`;
    panel.style.top = `${r.bottom - (pr.top + parent.clientTop) + PNDI_OFFSET_Y}px`;
  };
  const clearHoverClose = () => {
    window.clearTimeout(hoverCloseTimeout);
    hoverCloseTimeout = undefined;
  };
  const isFocusHoldingOpen = () => {
    const a = document.activeElement;
    return a ? panel.contains(a) || (a === trigger && trigger.matches(":focus-visible")) : false;
  };
  let removeOpenListeners = () => {};
  const open = () => {
    clearHoverClose();
    if (isOpen) return;
    if (!relocated) relocatePanel();
    panel.classList.remove(PNDI_CLOSING);
    panel.removeAttribute("hidden");
    panel.inert = false;
    updatePosition();
    trigger.setAttribute("aria-expanded", "true");
    isOpen = true;
    const offs = [
      listen(document, "pointerdown", handleDocumentPointerDown),
      listen(document, "focusout", handleFocusOut),
      track ? listen(track, "scroll", close, { passive: true }) : () => {},
      listen(window, "resize", updatePosition),
    ];
    removeOpenListeners = () => {
      offs.forEach((f) => f());
      removeOpenListeners = () => {};
    };
  };
  function close() {
    clearHoverClose();
    if (!isOpen) return;
    isOpen = false;
    removeOpenListeners();
    trigger!.setAttribute("aria-expanded", "false");
    panel!.inert = true;
    panel!.classList.add(PNDI_CLOSING);
  }
  function handleDocumentPointerDown(e: Event) {
    if (!contains(e.target)) close();
  }
  function handleFocusOut(e: Event) {
    const fe = e as FocusEvent;
    if (contains(fe.target) && !contains(fe.relatedTarget)) close();
  }
  const handlePanelFadeOut = (e: TransitionEvent) => {
    if (e.target !== panel || e.propertyName !== "opacity" || isOpen) return;
    panel.classList.remove(PNDI_CLOSING);
    panel.setAttribute("hidden", "");
  };
  const handlePointerEnter = (e: PointerEvent) => {
    if (e.pointerType === "mouse") open();
  };
  const handlePointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearHoverClose();
    hoverCloseTimeout = window.setTimeout(() => {
      hoverCloseTimeout = undefined;
      if (!isFocusHoldingOpen()) close();
    }, PNDI_HOVER_CLOSE_DELAY);
  };
  const handleTriggerClick = () => (isOpen ? close() : open());
  const handlePanelClick = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest("a")) close();
  };
  const focusAfterTrigger = () => {
    if (!nav) return;
    const focusables = Array.from(nav.querySelectorAll<HTMLElement>(PNDI_FOCUSABLE)).filter((n) => !panel.contains(n));
    for (const n of focusables.slice(focusables.indexOf(trigger) + 1)) {
      n.focus();
      if (document.activeElement === n) return;
    }
    trigger.focus();
  };
  const handleNextArrow = (e: KeyboardEvent) => {
    const t = e.target;
    if (t === trigger) {
      e.preventDefault();
      if (isOpen) {
        panelLinks()[0]?.focus();
        return;
      }
      const all = navTriggers();
      all[all.indexOf(trigger) + 1]?.focus();
      return;
    }
    const links = panelLinks();
    const i = links.indexOf(t as HTMLElement);
    if (i !== -1) {
      e.preventDefault();
      links[i + 1]?.focus();
    }
  };
  const handlePreviousArrow = (e: KeyboardEvent) => {
    const t = e.target;
    if (t === trigger) {
      e.preventDefault();
      const all = navTriggers();
      all[all.indexOf(trigger) - 1]?.focus();
      return;
    }
    const links = panelLinks();
    const i = links.indexOf(t as HTMLElement);
    if (i !== -1) {
      e.preventDefault();
      links[i - 1]?.focus();
    }
  };
  const handleTab = (e: KeyboardEvent) => {
    const links = panelLinks();
    if (!links.length) return;
    const a = document.activeElement;
    if (e.shiftKey) {
      if (a === links[0]) {
        e.preventDefault();
        trigger.focus();
      }
      return;
    }
    if (a === trigger) {
      e.preventDefault();
      links[0].focus();
      return;
    }
    if (a === links[links.length - 1]) {
      e.preventDefault();
      close();
      focusAfterTrigger();
    }
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") return handleNextArrow(e);
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") return handlePreviousArrow(e);
    if (!isOpen) return;
    if (e.key === "Escape") {
      close();
      trigger.focus();
      return;
    }
    if (e.key === "Tab") handleTab(e);
  };

  const offs = [
    listen(trigger, "click", handleTriggerClick),
    listen(panel, "click", handlePanelClick),
    listen(panel, "transitionend", handlePanelFadeOut),
    listen(document, "keydown", handleKeyDown),
    listen(el, "pointerenter", handlePointerEnter),
    listen(el, "pointerleave", handlePointerLeave),
    listen(panel, "pointerenter", handlePointerEnter),
    listen(panel, "pointerleave", handlePointerLeave),
  ];
  return () => {
    offs.forEach((f) => f());
    clearHoverClose();
    removeOpenListeners();
    returnPanel();
  };
};
