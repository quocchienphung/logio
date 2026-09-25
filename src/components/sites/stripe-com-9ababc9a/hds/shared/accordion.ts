// HDS Accordion (reference module 50857 + floating-ui Composite, module 47895).
// Native <details>/<summary> do the open/close; the JS adds:
// - Composite keyboard navigation between summaries: Arrow keys (orientation "both", loop) move focus,
//   the focused summary carries data-active (item 0 active initially). Summaries keep native tab order.
// - DetailsContent: where `interpolate-size: allow-keywords` is unsupported, a ResizeObserver writes the
//   content height to --content-height on the <details> so the CSS height transition has a target.

import { type Cleanup, combine, listen } from "./runtime";

const NEXT = ["ArrowRight", "ArrowDown"];
const PREV = ["ArrowLeft", "ArrowUp"];

export function mountAccordions(root: ParentNode): Cleanup {
  const cleanups: Cleanup[] = [];
  for (const acc of root.querySelectorAll<HTMLElement>(".hds-accordion")) {
    const summaries = Array.from(acc.querySelectorAll<HTMLElement>(":scope > .hds-details > .hds-summary"));
    let active = 0;
    const setActive = (i: number) => {
      active = i;
      summaries.forEach((s, j) => {
        if (j === i) s.setAttribute("data-active", "");
        else s.removeAttribute("data-active");
      });
    };
    setActive(0);
    summaries.forEach((s, i) => cleanups.push(listen(s, "focus", () => setActive(i))));
    cleanups.push(
      listen(acc, "keydown", (e) => {
        if (!NEXT.includes(e.key) && !PREV.includes(e.key)) return;
        if (!summaries.includes(e.target as HTMLElement)) return;
        const n = summaries.length;
        const next = NEXT.includes(e.key) ? (active + 1) % n : (active - 1 + n) % n;
        if (next === active) return;
        e.stopPropagation();
        e.preventDefault();
        setActive(next);
        summaries[next].focus();
      }),
    );
  }

  const supportsInterpolate = typeof CSS !== "undefined" && CSS.supports?.("interpolate-size", "allow-keywords");
  if (!supportsInterpolate && typeof ResizeObserver !== "undefined") {
    for (const content of root.querySelectorAll<HTMLElement>(".hds-accordion .hds-details-content")) {
      const details = content.closest("details");
      if (!details) continue;
      const ro = new ResizeObserver(() => {
        details.style.setProperty("--content-height", getComputedStyle(content).getPropertyValue("height"));
      });
      ro.observe(content);
      cleanups.push(() => ro.disconnect());
    }
  }
  return combine(cleanups);
}
