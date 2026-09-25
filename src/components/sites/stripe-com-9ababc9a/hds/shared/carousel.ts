// HDS Carousel, scroll-snap mode (reference module 21933 via Carousel 64103, page bundle). In scroll-snap
// mode the browser scrolls natively; the JS resets scrollLeft on enable and mirrors the position into
// --carousel-scroll-progress (= scrollLeft / item pitch, 6 decimals, rAF-coalesced). Each carousel picks
// its mode per breakpoint; "none" (and drag mode, unused here) leave the scroller untouched.

import { type Breakpoint, type Cleanup, combine, getBreakpoint, listen, onBreakpointChange } from "./runtime";

export type CarouselMode = "scroll-snap" | "none";

export function mountScrollSnapCarousel(scroller: HTMLElement, modes: Record<Breakpoint, CarouselMode>): Cleanup {
  let disable: Cleanup | null = null;
  const enable = () => {
    const items = Array.from(scroller.querySelectorAll<HTMLElement>(":scope > .carousel__item"));
    let pitch = scroller.clientWidth;
    let raf = 0;
    let last: string | null = null;
    const measure = () => {
      pitch = items[0] && items[1] ? items[1].offsetLeft - items[0].offsetLeft : items[0]?.offsetWidth ?? scroller.clientWidth;
    };
    const update = () => {
      raf = 0;
      if (pitch <= 0) return;
      const progress = (scroller.scrollLeft / pitch).toFixed(6);
      if (progress !== last) {
        scroller.style.setProperty("--carousel-scroll-progress", progress);
        last = progress;
      }
    };
    scroller.scrollLeft = 0;
    measure();
    scroller.style.setProperty("--carousel-scroll-progress", "0");
    last = "0";
    const off = listen(
      scroller,
      "scroll",
      () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
      },
      { passive: true },
    );
    const offResize = listen(window, "resize", measure, { passive: true });
    return () => {
      off();
      offResize();
      if (raf) cancelAnimationFrame(raf);
    };
  };
  const sync = (bp: Breakpoint) => {
    const want = modes[bp] === "scroll-snap";
    if (want && !disable) disable = enable();
    else if (!want && disable) {
      disable();
      disable = null;
    }
  };
  sync(getBreakpoint());
  return combine([onBreakpointChange(sync), () => disable?.()]);
}
