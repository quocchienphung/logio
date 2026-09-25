// Customer logo marquee (reference module 96815 LogoCarousel, chunk 99449).
// - When one set of logos is wider than the carousel, two sets are rendered and the track auto-scrolls
//   left at 0.03 px/ms (0 with prefers-reduced-motion), wrapping modulo one set's width. Auto-scroll
//   holds while hovered, while a logo link has focus, while dragging and while offscreen.
// - Pointer devices: horizontal wheel (or shift+wheel) scrubs the track; mouse drag scrubs it (cursor
//   "grabbing" after 4px; the click that ends a drag is swallowed).
// - Touch devices: horizontal swipe scrubs with direction lock (10px); release flings with the last 100ms
//   of velocity, decaying x0.9 per 16.667ms.
// - Hovering/focusing a linked logo flattens every other logo (customer-logo--flat); focusing an
//   off-screen link scrolls it into view.
// Otherwise one centred set is shown (logo-carousel__marquee-container--centered).

import { type Cleanup, combine, isTouchDevice, listen, observeIntersection, observeResize, prefersReducedMotion } from "./runtime";

const SPEED = 0.03; // px per ms
const FRICTION = 0.9; // per 16.667ms

export function mountLogoCarousel(carousel: HTMLElement): Cleanup {
  const container = carousel.querySelector<HTMLElement>(".logo-carousel__marquee-container");
  const track = carousel.querySelector<HTMLElement>(".logo-carousel__marquee");
  if (!container || !track) return () => {};
  const items = Array.from(track.querySelectorAll<HTMLElement>(":scope > .logo-carousel__item"));
  if (!items.length) return () => {};
  // The server renders two sets when the reference assumed overflow (172px x items > 1264px).
  const keyOf = (li: HTMLElement) => li.querySelector("svg[aria-label]")?.getAttribute("aria-label") ?? "";
  const firstKey = keyOf(items[0]);
  const secondStart = items.findIndex((li, i) => i > 0 && keyOf(li) === firstKey);
  const setSize = secondStart > 0 ? secondStart : items.length;
  const duplicates = items.slice(setSize);
  const touch = isTouchDevice();
  const cleanups: Cleanup[] = [];

  let overflow = duplicates.length > 0; // `k`
  let x = 0; // `Z`
  let momentum = 0; // `H`
  let hovering = false; // `z`
  let focused = false; // `C`
  let dragging = false; // `N`
  let wheeling = false; // `S`
  let moved = false; // `F`
  let visible = false; // `x`
  let setWidth = 0; // `V`
  let raf = 0;
  let lastT: number | undefined;
  let hoveredKey: string | null = null;

  const wrap = () => {
    if (setWidth <= 0) return;
    while (x < -setWidth) x += setWidth;
    while (x > 0) x -= setWidth;
  };
  const paint = () => {
    track.style.transform = overflow ? `translateX(${x}px)` : "";
  };

  const measure = () => {
    const itemWidth = items[0].offsetWidth;
    setWidth = itemWidth * setSize;
    const next = setWidth > carousel.offsetWidth;
    if (next !== overflow) {
      overflow = next;
      duplicates.forEach((li) => (li.hidden = !overflow));
      container.classList.toggle("logo-carousel__marquee-container--centered", !overflow);
      if (!overflow) {
        x = 0;
        momentum = 0;
      }
      paint();
      schedule();
    }
  };

  const frame = (t: number) => {
    raf = 0;
    const dt = lastT !== undefined ? t - lastT : 0;
    lastT = t;
    if (!dragging && !wheeling) {
      if (momentum !== 0) {
        momentum *= FRICTION ** (dt / 16.667);
        if (Math.abs(momentum) < 0.05) momentum = 0;
        x += momentum * dt;
        wrap();
      } else if (!hovering && !focused && visible) {
        x -= (prefersReducedMotion() ? 0 : SPEED) * dt;
        wrap();
      }
    }
    paint();
    schedule();
  };
  // The reference keeps its rAF running; here it idles when nothing can move (offscreen, reduced
  // motion or held) and restarts on the next state change, which is visually identical.
  const schedule = () => {
    const canMove = overflow && (momentum !== 0 || (visible && !hovering && !focused && !dragging && !wheeling && !prefersReducedMotion()));
    if (canMove && !raf) raf = requestAnimationFrame(frame);
    if (!canMove) lastT = undefined;
  };

  const setHovered = (key: string | null) => {
    hoveredKey = key;
    for (const li of items) {
      const logo = li.querySelector<HTMLElement>(":scope > div, :scope > a > div");
      logo?.classList.toggle("customer-logo--flat", hoveredKey !== null && keyOf(li) !== hoveredKey);
    }
  };

  duplicates.forEach((li) => (li.hidden = !overflow));
  container.classList.toggle("logo-carousel__marquee-container--centered", !overflow);
  cleanups.push(observeResize(carousel, measure, { delay: 150 }));
  measure();
  cleanups.push(
    observeIntersection(carousel, (v) => {
      visible = v;
      schedule();
    }),
  );

  if (!touch) {
    cleanups.push(
      listen(carousel, "mouseenter", () => {
        hovering = true;
        schedule();
      }),
      listen(carousel, "mouseleave", () => {
        hovering = false;
        focused = false;
        schedule();
      }),
    );
    // Linked logos: hover/focus flatten the others; focus scrolls the link into view.
    for (const li of items) {
      const link = li.querySelector<HTMLAnchorElement>(":scope > a");
      if (!link) continue;
      const key = keyOf(li);
      cleanups.push(
        listen(li, "mouseenter", () => setHovered(key)),
        listen(li, "mouseleave", () => setHovered(null)),
        listen(link, "focus", () => {
          setHovered(key);
          focused = true;
          const c = carousel.getBoundingClientRect();
          const r = link.getBoundingClientRect();
          const left = r.left - c.left;
          const right = r.right - c.left;
          if (!(left >= 0 && right <= c.width)) {
            x -= left < 0 ? left : right - c.width;
            wrap();
            paint();
          }
          schedule();
        }),
        listen(link, "blur", () => {
          setHovered(null);
          focused = false;
          schedule();
        }),
      );
    }

    // Wheel scrubbing.
    let wheelTimer: number | undefined;
    cleanups.push(
      listen(
        carousel,
        "wheel",
        (e) => {
          if (!overflow) return;
          const delta = e.shiftKey && e.deltaY ? e.deltaY : e.deltaX;
          if (delta === 0) return;
          e.preventDefault();
          wheeling = true;
          momentum = 0;
          x -= delta;
          wrap();
          paint();
          if (wheelTimer !== undefined) window.clearTimeout(wheelTimer);
          wheelTimer = window.setTimeout(() => {
            wheeling = false;
            momentum = 0;
            wheelTimer = undefined;
            schedule();
          }, 50);
        },
        { passive: false },
      ),
      () => {
        if (wheelTimer !== undefined) window.clearTimeout(wheelTimer);
      },
    );

    // Mouse drag.
    let stopDrag: Cleanup | null = null;
    cleanups.push(
      listen(carousel, "mousedown", (e) => {
        if (e.button !== 0 || !overflow) return;
        dragging = true;
        momentum = 0;
        moved = false;
        const startX = e.clientX;
        let lastX = startX;
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - lastX;
          lastX = ev.clientX;
          if (Math.abs(ev.clientX - startX) > 4) {
            carousel.style.setProperty("--logo-carousel-cursor", "grabbing");
            moved = true;
          }
          x += dx;
          wrap();
          paint();
        };
        const onUp = (ev: MouseEvent) => {
          dragging = false;
          momentum = 0;
          const r = carousel.getBoundingClientRect();
          if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
            hovering = false;
            focused = false;
          }
          carousel.style.removeProperty("--logo-carousel-cursor");
          stopDrag?.();
          stopDrag = null;
          schedule();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        stopDrag = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        schedule();
      }),
      listen(
        carousel,
        "click",
        (e) => {
          if (moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        { capture: true },
      ),
      () => stopDrag?.(),
    );
  } else {
    // Touch: direction-locked swipe with fling.
    let lastX = 0;
    let startX = 0;
    let startY = 0;
    let locked = false;
    let horizontal = false;
    let samples: { x: number; t: number }[] = [];
    cleanups.push(
      listen(carousel, "touchstart", (e) => {
        if (!overflow) return;
        dragging = true;
        momentum = 0;
        const t = e.touches[0];
        lastX = startX = t.clientX;
        startY = t.clientY;
        locked = false;
        horizontal = false;
        samples = [{ x: t.clientX, t: performance.now() }];
      }),
      listen(
        carousel,
        "touchmove",
        (e) => {
          if (!dragging) return;
          const t = e.touches[0];
          if (!locked) {
            const dx = Math.abs(t.clientX - startX);
            const dy = Math.abs(t.clientY - startY);
            if (Math.max(dx, dy) >= 10) {
              locked = true;
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
          x += dx;
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
        if (dt > 0) momentum = (b.x - a.x) / dt;
      }
      samples = [];
      locked = false;
      horizontal = false;
      schedule();
    };
    cleanups.push(listen(carousel, "touchend", end), listen(carousel, "touchcancel", end));
  }

  schedule();
  return combine([
    ...cleanups,
    () => {
      if (raf) cancelAnimationFrame(raf);
      track.style.transform = "";
      duplicates.forEach((li) => (li.hidden = false));
      setHovered(null);
    },
  ]);
}
