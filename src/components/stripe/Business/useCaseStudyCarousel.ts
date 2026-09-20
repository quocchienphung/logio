import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Behaviour of the reference case-study carousel (measured on stripe.com, 2026-09-17):
 * - prev/next scroll the native scroll-snap scroller by one card (card width + gap) smoothly;
 * - prev is disabled at scrollLeft 0, next at the end;
 * - hovering a card sets `--carousel-item-hover-scale` to the hover target (1.036) on that card and
 *   shifts that card and every card before it by −(width × (target − 1)) / 2 and every card after
 *   by +that amount (transform-origin is left center, so the hovered card grows symmetrically);
 * - pointer drag on the scroller scrolls it (snap is released while dragging).
 */
export function useCaseStudyCarousel() {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const items = Array.from(scroller.querySelectorAll<HTMLElement>(".carousel__item"));
    const inners = items.map((item) => item.querySelector<HTMLElement>(".carousel__inner"));

    const syncButtons = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      setAtStart(scroller.scrollLeft <= 1);
      setAtEnd(scroller.scrollLeft >= max - 1);
    };
    syncButtons();
    scroller.addEventListener("scroll", syncButtons, { passive: true });
    const ro = new ResizeObserver(syncButtons);
    ro.observe(scroller);

    const setHover = (index: number | null) => {
      const container = scroller.parentElement;
      const target = container ? parseFloat(getComputedStyle(container).getPropertyValue("--carousel-hover-scale-target")) || 1 : 1;
      const width = items[0]?.getBoundingClientRect().width ?? 0;
      const shift = (width * (target - 1)) / 2;
      inners.forEach((inner, i) => {
        if (!inner) return;
        const scale = index !== null && i === index ? target : 1;
        const offset = index === null ? 0 : i <= index ? -shift : shift;
        inner.style.setProperty("--carousel-item-hover-scale", scale.toFixed(6));
        inner.style.setProperty("--carousel-item-hover-shift", `${offset}px`);
      });
    };
    const enterHandlers = inners.map((inner, i) => {
      if (!inner) return null;
      const onEnter = () => setHover(i);
      const onLeave = () => setHover(null);
      inner.addEventListener("pointerenter", onEnter);
      inner.addEventListener("pointerleave", onLeave);
      return { inner, onEnter, onLeave };
    });

    // Pointer drag → native scroll.
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScroll = scroller.scrollLeft;
      scroller.style.scrollSnapType = "none";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      scroller.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      scroller.style.scrollSnapType = "";
      if (moved) {
        // Swallow the click that follows a drag so the card link does not open.
        const swallow = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
        };
        scroller.addEventListener("click", swallow, { capture: true, once: true });
        window.setTimeout(() => scroller.removeEventListener("click", swallow, { capture: true }), 0);
      }
    };
    scroller.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      scroller.removeEventListener("scroll", syncButtons);
      ro.disconnect();
      enterHandlers.forEach((h) => {
        if (!h) return;
        h.inner.removeEventListener("pointerenter", h.onEnter);
        h.inner.removeEventListener("pointerleave", h.onLeave);
      });
      scroller.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const step = useCallback((direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const first = scroller.querySelector<HTMLElement>(".carousel__item");
    const width = first?.getBoundingClientRect().width ?? 0;
    const gap = parseFloat(getComputedStyle(scroller).gap) || 0;
    scroller.scrollBy({ left: direction * (width + gap), behavior: "smooth" });
  }, []);

  return {
    scrollerRef,
    atStart,
    atEnd,
    prev: () => step(-1),
    next: () => step(1),
  };
}
