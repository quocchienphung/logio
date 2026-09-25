// HorizontalScrollableContainer (reference module 36967, chunk 57979): adds
// `horizontal-scrollable-container--scrollable` (edge-fade mask in CSS) while the inner row overflows.
// Re-evaluated on resize, debounced 150ms.

import { type Cleanup, combine, observeResize } from "./runtime";

export function mountHorizontalScrollContainers(root: ParentNode): Cleanup {
  return combine(
    Array.from(root.querySelectorAll<HTMLElement>(".horizontal-scrollable-container")).map((el) => {
      const inner = el.querySelector<HTMLElement>(".horizontal-scrollable-container__inner");
      if (!inner) return undefined;
      return observeResize(
        inner,
        () => el.classList.toggle("horizontal-scrollable-container--scrollable", inner.scrollWidth > inner.clientWidth),
        { delay: 150 },
      );
    }),
  );
}
