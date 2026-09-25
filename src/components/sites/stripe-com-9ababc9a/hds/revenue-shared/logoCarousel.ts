// Logo marquee (reference module 96815 LogoCarousel):
//  - scrolls only when one set of logos is wider than the carousel (items * item width > width);
//    the list then holds two copies and wraps by one set width;
//  - auto-scroll 0.03 px/ms to the left while visible and not hovered/focused (0 with reduced motion);
//  - wheel (horizontal / shift+wheel) and mouse drag move the track on fine pointers, touch drag with
//    axis lock (10 px) and inertia (velocity over the last 100 ms, decay 0.9 per 16.667 ms) on touch;
//  - hovering or focusing a logo turns every other logo "flat" (customer-logo--flat), focusing an
//    off-screen logo scrolls it into view.

import {
  Disposer,
  debounce,
  isTouchDevice,
  listen,
  observeIntersection,
  onReducedMotionChange,
  onVisibilityChange,
  reducedMotion,
  type Cleanup,
} from "./env";

const SPEED = 0.03; // from source: `let e = v ? 0 : 0.03` (px per ms)
const DECAY = 0.9; // from source: R = useRef(0.9)
const FRAME = 16.667; // from source: R.current ** (i / 16.667)

export function mountLogoCarousel(el: HTMLElement): Cleanup {
  const d = new Disposer();
  const container = el.querySelector<HTMLElement>(".logo-carousel__marquee-container");
  const track = el.querySelector<HTMLElement>(".logo-carousel__marquee");
  if (!container || !track) return () => {};
  const touch = isTouchDevice();

  const allItems = Array.from(track.querySelectorAll<HTMLElement>(":scope > .logo-carousel__item"));
  const initiallyDoubled = !container.classList.contains("logo-carousel__marquee-container--centered");
  const count = initiallyDoubled ? allItems.length / 2 : allItems.length;
  const base = allItems.slice(0, count);
  let clones: HTMLElement[] = initiallyDoubled ? allItems.slice(count) : [];

  let scrolling = initiallyDoubled;
  let setWidth = 0;
  let pos = 0;
  let velocity = 0;
  let hovered = false;
  let focused = false;
  let dragging = false;
  let wheeling = false;
  let visible = false;
  let hidden = document.hidden;
  let reduced = reducedMotion();
  let raf = 0;
  let last: number | undefined;
  let hoveredItem: HTMLElement | null = null;

  const wrap = () => {
    if (setWidth <= 0) return;
    while (pos < -setWidth) pos += setWidth;
    while (pos > 0) pos -= setWidth;
  };
  const paint = () => {
    track.style.transform = `translateX(${pos}px)`;
  };

  const items = () => [...base, ...clones];
  const renderFlat = () => {
    for (const li of items()) {
      const logo = li.querySelector<HTMLElement>(":scope > a > div, :scope > div");
      logo?.classList.toggle("customer-logo--flat", !!hoveredItem && li !== hoveredItem && sameLogo(li) !== sameLogo(hoveredItem));
    }
  };
  // The reference compares logo objects, so both copies of the hovered logo stay coloured.
  const sameLogo = (li: HTMLElement) => base.indexOf(li) !== -1 ? base.indexOf(li) : clones.indexOf(li);

  const setScrolling = (v: boolean) => {
    if (v === scrolling) return;
    scrolling = v;
    container.classList.toggle("logo-carousel__marquee-container--centered", !scrolling);
    if (scrolling) {
      clones = base.map((li) => {
        const c = li.cloneNode(true) as HTMLElement;
        c.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
        track.appendChild(c);
        return c;
      });
      bindItems(clones);
    } else {
      clones.forEach((c) => c.remove());
      clones = [];
      pos = 0;
      velocity = 0;
      track.style.transform = "";
    }
    schedule();
  };

  const measure = () => {
    const first = track.querySelector<HTMLElement>(".logo-carousel__item");
    if (!first) {
      setScrolling(false);
      return;
    }
    setWidth = first.offsetWidth * count;
    setScrolling(setWidth > el.offsetWidth);
  };

  const tick = (now: number) => {
    raf = 0;
    const dt = last !== undefined ? now - last : 0;
    last = now;
    if (!dragging && !wheeling) {
      if (velocity !== 0) {
        velocity *= DECAY ** (dt / FRAME);
        if (Math.abs(velocity) < 0.05) velocity = 0;
        pos += velocity * dt;
        wrap();
      } else if (!hovered && !focused && visible) {
        pos -= (reduced ? 0 : SPEED) * dt;
        wrap();
      }
    }
    paint();
    schedule();
  };
  function schedule() {
    const run = scrolling && visible && !hidden;
    if (run && !raf) {
      last = undefined;
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }
  d.add(() => raf && cancelAnimationFrame(raf));

  // Items: hover/focus flatten the others; focus brings an off-screen logo into view.
  const itemCleanups = new Disposer();
  d.add(() => itemCleanups.run());
  function bindItems(list: HTMLElement[]) {
    for (const li of list) {
      const a = li.querySelector<HTMLAnchorElement>("a");
      if (!a || touch) continue;
      itemCleanups.add(
        listen(li, "mouseenter", () => {
          hoveredItem = li;
          renderFlat();
        }),
      );
      itemCleanups.add(
        listen(li, "mouseleave", () => {
          hoveredItem = null;
          renderFlat();
        }),
      );
      itemCleanups.add(
        listen(a, "focus", () => {
          hoveredItem = li;
          focused = true;
          renderFlat();
          const box = el.getBoundingClientRect();
          const r = a.getBoundingClientRect();
          const left = r.left - box.left;
          const right = r.right - box.left;
          if (!(left >= 0 && right <= box.width) && scrolling) {
            pos -= left < 0 ? left : right - box.width;
            wrap();
            paint();
          }
        }),
      );
      itemCleanups.add(
        listen(a, "blur", () => {
          hoveredItem = null;
          focused = false;
          renderFlat();
        }),
      );
    }
  }
  bindItems(base);
  if (clones.length) bindItems(clones);

  if (!touch) {
    d.add(listen(el, "mouseenter", () => (hovered = true)));
    d.add(
      listen(el, "mouseleave", () => {
        hovered = false;
        focused = false;
      }),
    );
    // Wheel: horizontal delta (or shift + vertical) moves the track.
    let wheelTimer: number | undefined;
    d.add(
      listen<WheelEvent>(
        el,
        "wheel",
        (e) => {
          if (!scrolling) return;
          const delta = e.shiftKey && e.deltaY ? e.deltaY : e.deltaX;
          if (delta === 0) return;
          e.preventDefault();
          wheeling = true;
          velocity = 0;
          pos -= delta;
          wrap();
          paint();
          window.clearTimeout(wheelTimer);
          wheelTimer = window.setTimeout(() => {
            wheeling = false;
            velocity = 0;
          }, 50);
        },
        { passive: false },
      ),
    );
    d.add(() => window.clearTimeout(wheelTimer));
    // Mouse drag.
    let moved = false;
    let dragOff: Cleanup | null = null;
    d.add(
      listen<MouseEvent>(el, "mousedown", (e) => {
        if (e.button !== 0 || !scrolling) return;
        dragging = true;
        velocity = 0;
        moved = false;
        const start = e.clientX;
        let lastX = start;
        const move = (ev: MouseEvent) => {
          const dx = ev.clientX - lastX;
          lastX = ev.clientX;
          if (Math.abs(ev.clientX - start) > 4) {
            el.style.setProperty("--logo-carousel-cursor", "grabbing");
            moved = true;
          }
          pos += dx;
          wrap();
          paint();
        };
        const up = (ev: MouseEvent) => {
          dragging = false;
          velocity = 0;
          const r = el.getBoundingClientRect();
          if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
            hovered = false;
            focused = false;
          }
          el.style.removeProperty("--logo-carousel-cursor");
          dragOff?.();
          dragOff = null;
        };
        const a = listen<MouseEvent>(window, "mousemove", move);
        const b = listen<MouseEvent>(window, "mouseup", up);
        dragOff = () => {
          a();
          b();
        };
      }),
    );
    d.add(() => dragOff?.());
    d.add(
      listen<MouseEvent>(
        el,
        "click",
        (e) => {
          if (moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      ),
    );
  } else {
    // Touch drag with axis lock and inertia.
    let lastX = 0;
    let startX = 0;
    let startY = 0;
    let decided = false;
    let horizontal = false;
    let samples: { x: number; t: number }[] = [];
    d.add(
      listen<TouchEvent>(el, "touchstart", (e) => {
        if (!scrolling) return;
        dragging = true;
        velocity = 0;
        const t = e.touches[0];
        lastX = startX = t.clientX;
        startY = t.clientY;
        decided = false;
        horizontal = false;
        samples = [{ x: t.clientX, t: performance.now() }];
      }),
    );
    d.add(
      listen<TouchEvent>(
        el,
        "touchmove",
        (e) => {
          if (!dragging) return;
          const t = e.touches[0];
          if (!decided) {
            const dx = Math.abs(t.clientX - startX);
            const dy = Math.abs(t.clientY - startY);
            if (Math.max(dx, dy) >= 10) {
              decided = true;
              horizontal = dx > dy;
            }
          }
          if (!horizontal) return;
          e.preventDefault();
          const dx = t.clientX - lastX;
          lastX = t.clientX;
          const now = performance.now();
          samples.push({ x: t.clientX, t: now });
          samples = samples.filter((s) => now - s.t < 100);
          pos += dx;
          wrap();
          paint();
        },
        { passive: false },
      ),
    );
    const end = () => {
      dragging = false;
      if (horizontal && samples.length >= 2) {
        const a = samples[0];
        const b = samples[samples.length - 1];
        const dt = b.t - a.t;
        if (dt > 0) velocity = (b.x - a.x) / dt;
      }
      samples = [];
      decided = false;
      horizontal = false;
      schedule();
    };
    d.add(listen(el, "touchend", end));
    d.add(listen(el, "touchcancel", end));
  }

  // Visibility, reduced motion, resize (debounced 150 ms like the reference useResizeObserver).
  d.add(
    observeIntersection(el, (v) => {
      visible = v;
      schedule();
    }),
  );
  d.add(
    onVisibilityChange((h) => {
      hidden = h;
      schedule();
    }),
  );
  d.add(onReducedMotionChange((r) => (reduced = r)));
  const onResize = debounce(measure, 150);
  const ro = new ResizeObserver(() => onResize());
  ro.observe(el);
  d.add(() => {
    ro.disconnect();
    onResize.cancel();
  });
  measure();
  schedule();

  return () => {
    d.run();
    track.style.transform = "";
    items().forEach((li) => li.querySelector(":scope > a > div, :scope > div")?.classList.remove("customer-logo--flat"));
    // Restore the server-rendered structure (one or two sets, centred class) for a clean remount.
    if (!initiallyDoubled) clones.forEach((c) => c.remove());
    else if (!clones.length)
      base.forEach((li) => {
        const c = li.cloneNode(true) as HTMLElement;
        c.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
        track.appendChild(c);
      });
    container.classList.toggle("logo-carousel__marquee-container--centered", !initiallyDoubled);
  };
}
