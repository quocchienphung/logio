// Gradient border card (reference module 50553). Desktop only:
//  - "expandable" cards (expandAmount > 0) get grow/shift vars sized from the card's aspect ratio;
//  - on hover-capable fine pointers the border gradient follows the pointer: the pointer direction from
//    the card centre is cast onto the card rectangle (ray/box intersection, module 64802) and written to
//    --gradient-border-card-mouse-x/y on the gradient layer, throttled to one update per 50 ms.
// Resize measurement is debounced 300 ms.

import { breakpoint, debounce, Disposer, listen, onBreakpointChange, pageRect, type Cleanup } from "./env";

/** From source (billing module 39828): the bento cards pass `expandAmount: 1`. */
const EXPAND_BY_SELECTOR: [string, number][] = [[".feature-bento-card", 1]];

function rayBox(dx: number, dy: number, minX: number, minY: number, maxX: number, maxY: number): { x: number; y: number } | null {
  const ix = dx === 0 ? Infinity : 1 / dx;
  const iy = dy === 0 ? Infinity : 1 / dy;
  let t1 = minX * ix;
  let t2 = maxX * ix;
  if (t1 > t2) [t1, t2] = [t2, t1];
  let t3 = minY * iy;
  let t4 = maxY * iy;
  if (t3 > t4) [t3, t4] = [t4, t3];
  const t = Math.min(t2, t4);
  return t < 0 ? null : { x: t * dx, y: t * dy };
}

function mountCard(card: HTMLElement, expand: number): Cleanup {
  const gradient = card.querySelector<HTMLElement>(".gradient-border-card__gradient");
  if (!gradient) return () => {};
  const inner = new Disposer();
  let rect = pageRect(card);

  const measure = () => {
    rect = pageRect(card);
    if (expand > 0) {
      const h = expand / 2;
      const w = (rect.width / rect.height) * h;
      card.style.setProperty("--gradient-border-card-shift-x", `${-w}px`);
      card.style.setProperty("--gradient-border-card-shift-y", `${-h}px`);
      card.style.setProperty("--gradient-border-card-grow-x", `${w}px`);
      card.style.setProperty("--gradient-border-card-grow-y", `${h}px`);
    }
  };

  const setup = () => {
    inner.run();
    if (breakpoint() !== "desktop") return;
    const onResize = debounce(measure, 300);
    const ro = new ResizeObserver(() => onResize());
    ro.observe(card);
    inner.add(listen(window, "resize", onResize, { passive: true }));
    inner.add(() => {
      ro.disconnect();
      onResize.cancel();
    });
    measure();
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let last = 0;
    inner.add(
      listen<MouseEvent>(
        card,
        "mousemove",
        (e) => {
          if (rect.width === 0 || rect.height === 0) return;
          const now = performance.now();
          if (now - last < 50) return;
          last = now;
          const ratio = rect.height / rect.width;
          const nx = ((e.pageX - rect.x) / rect.width) * 2 - 1;
          const ny = ((e.pageY - rect.y) / rect.height) * 2 * ratio - ratio;
          const len = Math.hypot(nx, ny);
          if (len * len < 1e-4) return;
          const hit = rayBox(nx / len, ny / len, -rect.width / 2, -rect.height / 2, rect.width / 2, rect.height / 2);
          if (!hit) return;
          gradient.style.setProperty("--gradient-border-card-mouse-x", `${hit.x}px`);
          gradient.style.setProperty("--gradient-border-card-mouse-y", `${hit.y}px`);
        },
        { passive: true },
      ),
    );
    inner.add(listen(card, "mouseenter", () => (rect = pageRect(card)), { passive: true }));
  };
  setup();
  const off = onBreakpointChange(setup);
  return () => {
    off();
    inner.run();
  };
}

export function mountGradientBorderCards(root: HTMLElement): Cleanup {
  const d = new Disposer();
  root.querySelectorAll<HTMLElement>(".gradient-border-card").forEach((card) => {
    const expand = EXPAND_BY_SELECTOR.find(([sel]) => card.matches(sel))?.[1] ?? 0;
    d.add(mountCard(card, expand));
  });
  return () => d.run();
}
