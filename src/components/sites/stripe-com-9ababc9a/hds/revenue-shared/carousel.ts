// Carousel (reference module 64103 Carousel + 21933 scroll-snap controller + 12171 CarouselNav +
// 41718 CarouselPagination). Each breakpoint picks a mode:
//  - "drag": pointer drag on fine pointers with eased scroll (1/6.26 per frame, 1/3.87 while dragging,
//    1/9 for nav jumps), rubber-band at the edges (spring 0.1 / damping 0.65, max 200 px), snap to the
//    nearest item on release (+velocity fling), optional hover scale of the hovered card (1.036);
//  - "scroll-snap": native scrolling, --carousel-scroll-progress and the active index (pagination);
//  - "none": static.
// The reference physics is per animation frame; here it runs on a fixed 60 Hz step driven by elapsed
// time so it looks the same on any refresh rate.

import {
  breakpoint,
  clamp,
  debounce,
  Disposer,
  isTouchDevice,
  listen,
  onBreakpointChange,
  onReducedMotionChange,
  reducedMotion,
  type Breakpoint,
  type Cleanup,
} from "./env";

export type CarouselMode = "drag" | "scroll-snap" | "none";

export interface CarouselOptions {
  scroller: HTMLElement;
  modes: Record<Breakpoint, CarouselMode>;
  hoverScale?: number | null;
  nav?: HTMLElement | null;
  /** isAtStart / isAtEnd thresholds on the 0-100 progress (context nav: 0.5 / 99.5). */
  navThresholds?: [number, number];
  pagination?: HTMLElement | null;
}

const STEP = 1000 / 60;

export function mountCarousel(opts: CarouselOptions): Cleanup {
  const d = new Disposer();
  const { scroller } = opts;
  const items = Array.from(scroller.querySelectorAll<HTMLElement>(":scope > .carousel__item"));
  const inners = items.map((li) => li.querySelector<HTMLElement>(":scope > .carousel__inner"));
  const n = items.length;
  const touch = isTouchDevice();
  let reduced = reducedMotion();
  d.add(onReducedMotionChange((r) => (reduced = r)));

  // ---- shared progress → nav state ----
  let progress = 0;
  const [startT, endT] = opts.navThresholds ?? [0.5, 99.5];
  const navButtons = opts.nav ? Array.from(opts.nav.querySelectorAll<HTMLButtonElement>("button")) : [];
  const [prevBtn, nextBtn] = navButtons;
  let navFocusVisible = false;
  const renderNav = () => {
    const atStart = progress <= startT;
    const atEnd = progress >= endT;
    if (prevBtn) prevBtn.disabled = atStart;
    if (nextBtn) nextBtn.disabled = atEnd;
    // Reference: keep keyboard focus on the nav when the focused button becomes disabled.
    if (navFocusVisible) {
      if (atStart && document.activeElement !== nextBtn && nextBtn && !nextBtn.disabled) nextBtn.focus();
      else if (atEnd && document.activeElement !== prevBtn && prevBtn && !prevBtn.disabled) prevBtn.focus();
    }
  };
  const setProgress = (p: number) => {
    const crossed = progress <= 0.5 !== p <= 0.5 || progress >= 99.5 !== p >= 99.5 || progress <= startT !== p <= startT || progress >= endT !== p >= endT;
    progress = p;
    if (crossed) renderNav();
  };
  for (const b of navButtons) {
    d.add(
      listen(b, "focus", () => {
        try {
          navFocusVisible = b.matches(":focus-visible");
        } catch {
          navFocusVisible = false;
        }
      }),
    );
    d.add(listen(b, "blur", () => (navFocusVisible = false)));
  }

  // ---- pagination ----
  const segments = opts.pagination ? Array.from(opts.pagination.querySelectorAll<HTMLElement>(".carousel-pagination__segment")) : [];
  const setActive = (i: number) => {
    segments.forEach((s, k) => {
      s.classList.toggle("carousel-pagination__segment--active", k === i);
      if (s instanceof HTMLButtonElement) {
        if (k === i) s.setAttribute("aria-current", "true");
        else s.removeAttribute("aria-current");
      }
    });
  };

  // ---- metrics ----
  const stride = () => (items[0] && items[1] ? items[1].offsetLeft - items[0].offsetLeft : (items[0]?.offsetWidth ?? 0));
  const maxScroll = () => scroller.scrollWidth - scroller.clientWidth;

  // ---- drag mode ----
  const drag = {
    locked: true,
    target: 0,
    current: 0,
    easing: 6.26,
    direction: 0,
    rbOffset: 0,
    rbTarget: 0,
    rbVelocity: 0,
  };
  const ptr = { active: false, startX: 0, moved: false, lastX: 0, preventClick: false, lastTime: 0, velocity: 0 };
  let raf = 0;
  let lastTs: number | null = null;
  let acc = 0;
  let max = 0;
  let itemStride = 0;
  let hovered: number | null = null;
  let firstWidth = items[0]?.offsetWidth ?? 0;
  const lastHover: { scale: string; shift: string }[] = [];

  const reportDragProgress = () => {
    setProgress(clamp(max <= 0 ? 0 : (scroller.scrollLeft / max) * 100, 0, 100));
  };

  const applyHover = () => {
    if (!opts.hoverScale || touch || mode !== "drag") return;
    const active = ptr.active || reduced ? null : hovered;
    const scales = items.map((_, i) => (active === i ? opts.hoverScale! : 1));
    const shifts = scales.map((s) => (s > 1 ? (firstWidth * (s - 1)) / 2 : 0));
    const total = shifts.reduce((a, b) => a + b, 0);
    let run = 0;
    inners.forEach((el, i) => {
      if (!el) return;
      const scale = scales[i].toFixed(6);
      const shift = `${2 * run - total}px`;
      const prev = lastHover[i] ?? (lastHover[i] = { scale: "", shift: "" });
      if (prev.scale !== scale) {
        el.style.setProperty("--carousel-item-hover-scale", scale);
        prev.scale = scale;
      }
      if (prev.shift !== shift) {
        el.style.setProperty("--carousel-item-hover-shift", shift);
        prev.shift = shift;
      }
      run += shifts[i];
    });
  };

  const physicsStep = (): boolean => {
    const s = drag;
    s.current += (s.target - s.current) / s.easing;
    scroller.scrollLeft = clamp(s.current, 0, max);
    const settled = Math.abs(s.current - s.target) < 0.5;
    const rbSettled = Math.abs(s.rbOffset) < 0.5 && Math.abs(s.rbVelocity) < 0.01 && s.rbTarget === 0;
    if (settled && rbSettled && !ptr.active) {
      s.current = s.target;
      s.rbOffset = 0;
      s.rbVelocity = 0;
      scroller.scrollLeft = clamp(s.target, 0, max);
      scroller.style.setProperty("--carousel-drag-offset", "0px");
      scroller.style.overflow = "auto";
      scroller.style.scrollSnapType = "";
      s.locked = true;
      reportDragProgress();
      return false;
    }
    if (ptr.active) s.rbOffset += (s.rbTarget - s.rbOffset) / 3.87;
    else {
      s.rbVelocity += (s.rbTarget - s.rbOffset) * 0.1;
      s.rbVelocity *= 0.65;
      s.rbOffset += s.rbVelocity;
      if (Math.abs(s.rbOffset) < 0.5 && Math.abs(s.rbVelocity) < 0.01) {
        s.rbOffset = 0;
        s.rbVelocity = 0;
      }
    }
    scroller.style.setProperty("--carousel-drag-offset", `${Math.round(10 * s.rbOffset) / 10}px`);
    reportDragProgress();
    return true;
  };

  const loop = (ts: number) => {
    raf = 0;
    if (drag.locked) {
      lastTs = null;
      return;
    }
    acc += lastTs === null ? STEP : Math.min(ts - lastTs, 100);
    lastTs = ts;
    let running = true;
    while (acc >= STEP && running) {
      acc -= STEP;
      running = physicsStep();
    }
    if (running) raf = requestAnimationFrame(loop);
    else {
      lastTs = null;
      acc = 0;
    }
  };
  const startLoop = () => {
    if (!raf) {
      lastTs = null;
      acc = 0;
      raf = requestAnimationFrame(loop);
    }
  };
  const stopLoop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  let dragOff: Cleanup | null = null;
  const beginDrag = (clientX: number) => {
    dragOff?.();
    max = maxScroll();
    Object.assign(drag, { current: scroller.scrollLeft, target: scroller.scrollLeft, locked: false, easing: 3.87, rbTarget: 0, rbOffset: 0, rbVelocity: 0 });
    scroller.style.overflow = "hidden";
    scroller.style.scrollSnapType = "none";
    scroller.style.setProperty("--carousel-drag-offset", "0px");
    startLoop();
    Object.assign(ptr, { active: true, startX: clientX, moved: false, lastX: clientX, preventClick: false, lastTime: performance.now(), velocity: 0 });
    hovered = null;
    scroller.setAttribute("data-dragging", "true");
    document.body.style.userSelect = "none";
    const move = (e: PointerEvent | MouseEvent) => {
      e.preventDefault();
      if (!ptr.active) return;
      const x = e.clientX;
      const now = performance.now();
      const dx = x - ptr.lastX;
      const dt = now - ptr.lastTime;
      if (dt > 0) ptr.velocity = dx / dt;
      drag.direction = Math.sign(-dx);
      const c = Math.ceil(scroller.scrollLeft);
      const atStart = c <= 4 && ptr.startX < x;
      const atEnd = c >= Math.floor(max) - 4 && ptr.startX > x;
      if (atStart || atEnd) {
        const mag = Math.abs(drag.rbTarget);
        drag.rbTarget = clamp(drag.rbTarget + 0.2 * (1 - (mag / 200) * 0.7) * dx, -200, 200);
      } else drag.target = clamp(drag.target - dx, 0, max);
      ptr.lastX = x;
      ptr.lastTime = now;
      if (Math.abs(dx) > 2) ptr.moved = true;
    };
    const up = (e: PointerEvent | MouseEvent) => {
      if (!ptr.active) return;
      dragOff?.();
      dragOff = null;
      ptr.active = false;
      ptr.preventClick = ptr.moved;
      scroller.removeAttribute("data-dragging");
      document.body.style.userSelect = "";
      hovered = null;
      drag.easing = 6.26;
      drag.rbTarget = 0;
      itemStride = stride();
      if (Math.abs(ptr.startX - e.clientX) > 3 && itemStride > 0) {
        const speed = Math.abs(ptr.velocity);
        const fling = speed > 0.5 ? Math.floor(0.15 * speed) : 0;
        const snapped = Math.round(scroller.scrollLeft / itemStride) * itemStride + itemStride * drag.direction * (1 + fling);
        drag.target = clamp(snapped, 0, max);
      }
      startLoop();
    };
    const usePointer = "PointerEvent" in window;
    const moveEv = usePointer ? "pointermove" : "mousemove";
    const a = listen<PointerEvent>(window, moveEv, move, { passive: false });
    const b = listen<PointerEvent>(window, usePointer ? "pointerup" : "mouseup", up, { passive: false });
    const c = usePointer ? listen<PointerEvent>(window, "pointercancel", up, { passive: false }) : () => {};
    dragOff = () => {
      a();
      b();
      c();
    };
    applyHover();
  };

  const animateToIndexDrag = (i: number) => {
    itemStride = stride();
    const idx = clamp(i, 0, n - 1);
    max = maxScroll();
    const target = idx === n - 1 ? max : clamp(idx * itemStride, 0, max);
    Object.assign(drag, { current: scroller.scrollLeft, target, locked: false, easing: 9, rbTarget: 0 });
    scroller.style.overflow = "hidden";
    scroller.style.scrollSnapType = "none";
    startLoop();
  };
  const nearestDrag = () => {
    itemStride = stride();
    const left = scroller.scrollLeft;
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < n; i++) {
      const dd = Math.abs(clamp(i * itemStride, 0, max) - left);
      if (dd < dist) {
        dist = dd;
        best = i;
      }
    }
    return best;
  };

  // ---- scroll-snap mode ----
  let snapIndex = 0;
  let snapRaf = 0;
  let snapMetrics = { itemWidth: 0, maxScroll: 0 };
  let lastProgressVar: string | null = null;
  const snapMeasure = () => {
    snapMetrics = { itemWidth: stride() || scroller.clientWidth, maxScroll: maxScroll() };
  };
  const snapUpdate = () => {
    snapRaf = 0;
    const { itemWidth, maxScroll: m } = snapMetrics;
    if (itemWidth <= 0) return;
    const c = scroller.scrollLeft / itemWidth;
    const v = c.toFixed(6);
    if (v !== lastProgressVar) {
      scroller.style.setProperty("--carousel-scroll-progress", v);
      lastProgressVar = v;
    }
    snapIndex = clamp(Math.round(c), 0, n - 1);
    setActive(snapIndex);
    setProgress(m > 0 ? clamp((scroller.scrollLeft / m) * 100, 0, 100) : 0);
  };
  const onSnapScroll = () => {
    if (snapRaf) cancelAnimationFrame(snapRaf);
    snapRaf = requestAnimationFrame(snapUpdate);
  };

  // ---- mode switching ----
  let mode: CarouselMode = "none";
  const modeOff = new Disposer();
  const enable = (m: CarouselMode) => {
    modeOff.run();
    mode = m;
    if (m === "drag") {
      scroller.scrollLeft = 0;
      scroller.setAttribute("data-carousel-drag", "");
      drag.current = drag.target = 0;
      itemStride = stride();
      max = maxScroll();
      firstWidth = items[0]?.offsetWidth ?? 0;
      applyHover();
      setActive(0);
      reportDragProgress();
      if (!touch) {
        modeOff.add(
          listen<PointerEvent>(scroller, "pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            beginDrag(e.clientX);
          }),
        );
        modeOff.add(
          listen<MouseEvent>(
            scroller,
            "click",
            (e) => {
              if (ptr.preventClick) {
                e.preventDefault();
                e.stopPropagation();
                ptr.preventClick = false;
              }
            },
            true,
          ),
        );
        modeOff.add(
          listen(scroller, "mouseleave", () => {
            if (ptr.active) return;
            hovered = null;
            applyHover();
          }),
        );
        inners.forEach((el, i) => {
          if (!el) return;
          modeOff.add(
            listen(el, "mouseenter", () => {
              if (ptr.active) return;
              hovered = i;
              applyHover();
            }),
          );
        });
      }
      const interrupt = () => {
        if (!drag.locked) drag.target = drag.current;
      };
      modeOff.add(listen(scroller, "wheel", interrupt, { passive: true }));
      modeOff.add(listen(scroller, "touchstart", interrupt, { passive: true }));
      modeOff.add(
        listen(
          scroller,
          "scroll",
          () => {
            if (drag.locked) {
              drag.current = drag.target = scroller.scrollLeft;
              reportDragProgress();
            }
          },
          { passive: true },
        ),
      );
      modeOff.add(() => {
        stopLoop();
        dragOff?.();
        dragOff = null;
        if (ptr.active) {
          ptr.active = false;
          document.body.style.userSelect = "";
        }
        scroller.removeAttribute("data-dragging");
        scroller.removeAttribute("data-carousel-drag");
        scroller.style.overflow = "";
        scroller.style.scrollSnapType = "";
        scroller.style.setProperty("--carousel-drag-offset", "0px");
        drag.locked = true;
        drag.rbOffset = drag.rbTarget = drag.rbVelocity = 0;
        inners.forEach((el) => {
          el?.style.setProperty("--carousel-item-hover-scale", "1");
          el?.style.setProperty("--carousel-item-hover-shift", "0px");
        });
        lastHover.length = 0;
        hovered = null;
      });
    } else if (m === "scroll-snap") {
      scroller.scrollLeft = 0;
      snapIndex = 0;
      snapMeasure();
      scroller.style.setProperty("--carousel-scroll-progress", "0");
      lastProgressVar = "0";
      snapUpdate();
      modeOff.add(listen(scroller, "scroll", onSnapScroll, { passive: true }));
      modeOff.add(() => {
        if (snapRaf) cancelAnimationFrame(snapRaf);
        snapRaf = 0;
      });
    } else {
      setProgress(0);
    }
  };

  const animateToIndex = (i: number) => {
    if (mode === "drag") animateToIndexDrag(i);
    else if (mode === "scroll-snap") {
      const el = items[clamp(i, 0, n - 1)];
      el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest", inline: "center" });
    }
  };
  const nearest = () => (mode === "drag" ? nearestDrag() : snapIndex);

  if (prevBtn) d.add(listen(prevBtn, "click", () => animateToIndex(nearest() - 1)));
  if (nextBtn) d.add(listen(nextBtn, "click", () => animateToIndex(nearest() + 1)));
  segments.forEach((s, i) => {
    if (s instanceof HTMLButtonElement) d.add(listen(s, "click", () => animateToIndex(i)));
  });

  const recalc = debounce(() => {
    if (mode === "drag") {
      itemStride = stride();
      max = maxScroll();
      firstWidth = items[0]?.offsetWidth ?? 0;
      applyHover();
      reportDragProgress();
    } else if (mode === "scroll-snap") {
      snapMeasure();
      snapUpdate();
    }
  }, 150);
  const ro = new ResizeObserver(() => recalc());
  ro.observe(scroller);
  if (items[0]) ro.observe(items[0]);
  d.add(() => {
    ro.disconnect();
    recalc.cancel();
  });

  enable(opts.modes[breakpoint()]);
  renderNav();
  d.add(onBreakpointChange((bp) => enable(opts.modes[bp])));
  d.add(() => modeOff.run());
  return () => d.run();
}

/** Finds and mounts the Revenue pages' carousels (customer stories, product eco, resources, UBB launch). */
export function mountCarousels(root: HTMLElement): Cleanup {
  const d = new Disposer();
  // Customer stories (module 64894 + 80525): < 4 cards stay static on tablet/desktop; hover scale 1.036.
  root.querySelectorAll<HTMLElement>(".customer-stories-carousel").forEach((wrap) => {
    const container = wrap.querySelector<HTMLElement>(".case-study-carousel");
    const scroller = container?.querySelector<HTMLElement>(".carousel__scroller");
    if (!container || !scroller) return;
    const count = scroller.querySelectorAll(":scope > .carousel__item").length;
    const few = count < 4;
    const hoverTarget = parseFloat(container.style.getPropertyValue("--carousel-hover-scale-target")) || 1.036;
    const hoverDisabled = container.hasAttribute("data-hover-disabled");
    d.add(
      mountCarousel({
        scroller,
        modes: { mobile: "scroll-snap", tablet: few ? "none" : "drag", desktop: few ? "none" : "drag" },
        hoverScale: !few && !hoverDisabled ? hoverTarget : null,
        nav: wrap.querySelector<HTMLElement>(".customer-stories-carousel__header .carousel-nav"),
        navThresholds: [0, 100], // module 3816: isAtStart = progress <= 0, isAtEnd = progress >= 100
      }),
    );
  });
  // Product ecosystem (module 66149): <= 3 items static above mobile.
  root.querySelectorAll<HTMLElement>(".product-eco-carousel.carousel__section-container").forEach((container) => {
    const scroller = container.querySelector<HTMLElement>(".carousel__scroller");
    if (!scroller) return;
    const few = scroller.querySelectorAll(":scope > .carousel__item").length <= 3;
    const header = container.parentElement?.querySelector<HTMLElement>(".product-eco-carousel__nav") ?? null;
    d.add(
      mountCarousel({
        scroller,
        modes: few ? { mobile: "scroll-snap", tablet: "none", desktop: "none" } : { mobile: "scroll-snap", tablet: "drag", desktop: "drag" },
        nav: header,
      }),
    );
  });
  // Resources (module 46845): modes depend on the card count.
  root.querySelectorAll<HTMLElement>(".resource-carousel__wrapper").forEach((wrap) => {
    const scroller = wrap.querySelector<HTMLElement>(".resource-carousel .carousel__scroller");
    if (!scroller) return;
    const m = scroller.querySelectorAll(":scope > .carousel__item").length;
    const modes: Record<Breakpoint, CarouselMode> =
      m > 3
        ? { mobile: "scroll-snap", tablet: "drag", desktop: "drag" }
        : m === 3
          ? { mobile: "scroll-snap", tablet: "drag", desktop: "none" }
          : m === 2
            ? { mobile: "scroll-snap", tablet: "none", desktop: "none" }
            : { mobile: "none", tablet: "none", desktop: "none" };
    d.add(mountCarousel({ scroller, modes, nav: wrap.querySelector<HTMLElement>(".resource-carousel__nav") }));
  });
  // UBB launch graphics (usage-based-billing module 42161 `ew`): scroll-snap + pagination on mobile only.
  root.querySelectorAll<HTMLElement>(".ubb-launch-graphics").forEach((wrap) => {
    const scroller = wrap.querySelector<HTMLElement>(".carousel__scroller");
    if (!scroller) return;
    d.add(
      mountCarousel({
        scroller,
        modes: { mobile: "scroll-snap", tablet: "none", desktop: "none" },
        pagination: wrap.querySelector<HTMLElement>(".carousel-pagination"),
      }),
    );
  });
  return () => d.run();
}
