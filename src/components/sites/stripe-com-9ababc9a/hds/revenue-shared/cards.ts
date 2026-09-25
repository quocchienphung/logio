// Small measured-layout behaviours of HDS cards and graphics on the Revenue pages.

import { Disposer, observeIntersection, onReducedMotionChange, reducedMotion, type Cleanup } from "./env";

/**
 * Chippy (reference module 91144): --hds-chippy-link-offset-y = half the link's height, kept in sync
 * with a ResizeObserver on the link (drives the link's hover reveal offset in CSS).
 */
export function mountChippies(root: HTMLElement): Cleanup {
  const d = new Disposer();
  root.querySelectorAll<HTMLElement>(".hds-chippy").forEach((card) => {
    const link = card.querySelector<HTMLElement>(".hds-chippy__link");
    if (!link) return;
    const set = () => card.style.setProperty("--hds-chippy-link-offset-y", `${0.5 * link.offsetHeight}px`);
    const ro = new ResizeObserver(set);
    ro.observe(link);
    set();
    d.add(() => {
      ro.disconnect();
      card.style.removeProperty("--hds-chippy-link-offset-y");
    });
  });
  return () => d.run();
}

/**
 * Resource card (reference module 26615): --hds-resource-card-link-offset-y = tag height + the
 * container's gap, observed on the tag.
 */
export function mountResourceCards(root: HTMLElement): Cleanup {
  const d = new Disposer();
  root.querySelectorAll<HTMLElement>(".hds-resource-card").forEach((card) => {
    const container = card.querySelector<HTMLElement>(".hds-resource-card__container");
    const tag = card.querySelector<HTMLElement>(".hds-resource-card__tag");
    const link = card.querySelector<HTMLElement>(".hds-resource-card__link");
    if (!container || !tag || !link) return;
    const set = () => {
      const gap = parseFloat(getComputedStyle(container).gap) || 0;
      card.style.setProperty("--hds-resource-card-link-offset-y", `${tag.offsetHeight + gap}px`);
    };
    const ro = new ResizeObserver(set);
    ro.observe(tag);
    set();
    d.add(() => {
      ro.disconnect();
      card.style.removeProperty("--hds-resource-card-link-offset-y");
    });
  });
  return () => d.run();
}

/**
 * Revenue recovery graphic (reference module 79013): animated variants get
 * revenue-recovery-graphic--visible once 50 % visible (frozen after the first hit) unless reduced
 * motion is preferred; the bars/line/markers animate in CSS.
 */
export function mountRevenueRecovery(root: HTMLElement): Cleanup {
  const d = new Disposer();
  root.querySelectorAll<HTMLElement>(".revenue-recovery-graphic.revenue-recovery-graphic--animated").forEach((el) => {
    let seen = false;
    let reduced = reducedMotion();
    const render = () => el.classList.toggle("revenue-recovery-graphic--visible", seen && !reduced);
    d.add(
      observeIntersection(
        el,
        (v) => {
          if (v) {
            seen = true;
            render();
          }
        },
        { threshold: 0.5, once: true },
      ),
    );
    d.add(
      onReducedMotionChange((r) => {
        reduced = r;
        render();
      }),
    );
  });
  return () => d.run();
}
