// GradientBorderCard (reference module 50553 + helpers 26847 / 64802, chunk 61541). Desktop only (>=940px).
// On fine-pointer hover devices the card's border gradient follows the pointer: the pointer direction
// from the card centre (x in [-1,1], y in [-h/w, h/w]) is cast as a ray and the point where it leaves
// the card box becomes --gradient-border-card-mouse-x/y on the gradient layer (the CSS transitions
// transform 1s cubic-bezier(.16,1,.3,1)). Mousemove is sampled at most every 50ms. The card rect (page
// coordinates) is refreshed on resize (debounced 300ms) and on mouseenter.

import { type Breakpoint, type Cleanup, combine, debounce, getBreakpoint, listen, onBreakpointChange } from "./runtime";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const pageRect = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect();
  return getComputedStyle(el).position === "fixed"
    ? { x: r.left, y: r.top, w: r.width, h: r.height }
    : { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
};

/** Ray (origin o, direction d) against the axis-aligned box [min, max]; exit point or null. */
const rayBoxExit = (o: { x: number; y: number }, d: { x: number; y: number }, min: { x: number; y: number }, max: { x: number; y: number }) => {
  const ix = d.x === 0 ? Infinity : 1 / d.x;
  const iy = d.y === 0 ? Infinity : 1 / d.y;
  let tx1 = (min.x - o.x) * ix;
  let tx2 = (max.x - o.x) * ix;
  if (tx1 > tx2) [tx1, tx2] = [tx2, tx1];
  let ty1 = (min.y - o.y) * iy;
  let ty2 = (max.y - o.y) * iy;
  if (ty1 > ty2) [ty1, ty2] = [ty2, ty1];
  const t = Math.min(tx2, ty2);
  return t < 0 ? null : { x: o.x + t * d.x, y: o.y + t * d.y };
};

function mountCard(card: HTMLElement): Cleanup {
  const gradient = card.querySelector<HTMLElement>(".gradient-border-card__gradient");
  if (!gradient) return () => {};
  let rect: Rect = pageRect(card);
  const update = () => {
    rect = pageRect(card);
  };
  const onResize = debounce(update, 300);
  const ro = new ResizeObserver(() => onResize());
  ro.observe(card);
  const cleanups: Cleanup[] = [listen(window, "resize", onResize, { passive: true }), () => ro.disconnect(), () => onResize.cancel()];
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let last = 0;
    cleanups.push(
      listen(
        card,
        "mousemove",
        (e) => {
          if (!rect.w || !rect.h) return;
          const now = performance.now();
          if (now - last < 50) return;
          last = now;
          const aspect = rect.h / rect.w;
          const px = ((e.pageX - rect.x) / rect.w) * 2 - 1;
          const py = ((e.pageY - rect.y) / rect.h) * 2 * aspect - aspect;
          const len = Math.hypot(px, py);
          if (len * len < 1e-4) return;
          const hit = rayBoxExit({ x: 0, y: 0 }, { x: px / len, y: py / len }, { x: -rect.w / 2, y: -rect.h / 2 }, { x: rect.w / 2, y: rect.h / 2 });
          if (hit) {
            gradient.style.setProperty("--gradient-border-card-mouse-x", `${hit.x}px`);
            gradient.style.setProperty("--gradient-border-card-mouse-y", `${hit.y}px`);
          }
        },
        { passive: true },
      ),
      listen(card, "mouseenter", update, { passive: true }),
    );
  }
  return combine(cleanups);
}

export function mountGradientBorderCards(root: ParentNode): Cleanup {
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".gradient-border-card"));
  let active: Cleanup | null = null;
  const sync = (bp: Breakpoint) => {
    if (bp === "desktop" && !active) active = combine(cards.map(mountCard));
    else if (bp !== "desktop" && active) {
      active();
      active = null;
    }
  };
  sync(getBreakpoint());
  return combine([onBreakpointChange(sync), () => active?.()]);
}
