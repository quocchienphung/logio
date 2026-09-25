// HDS accordion (reference module 50857 Accordion/Details/Summary/DetailsContent):
//  - exclusive accordions share a `name` on their <details> (native exclusive toggling);
//    non-collapsible exclusive accordions cannot close the open item by clicking its summary;
//  - summaries form a floating-ui Composite (orientation "both", loop): arrow keys move focus between
//    summaries and mark the active one with data-active;
//  - without CSS `interpolate-size` support, DetailsContent measures its height into --content-height
//    on the parent <details> so the CSS height transition has a target.

import { Disposer, listen, type Cleanup } from "./env";

/** From source: `collapsible` flags of the accordions rendered on the Revenue pages. */
function isCollapsible(acc: HTMLElement): boolean {
  if (acc.classList.contains("billing-accordion")) return true; // module 39828 iS: collapsible: !0
  if (acc.closest(".faq-section-accordion")) return true; // module 82345 FAQ: collapsible + allowMultiple
  if (acc.classList.contains("stepper__accordion")) return true; // module 73465: allowMultiple (own click handling)
  return false;
}

export function mountAccordions(root: HTMLElement): Cleanup {
  const d = new Disposer();
  const interpolate = typeof CSS !== "undefined" && CSS.supports("interpolate-size", "allow-keywords");
  root.querySelectorAll<HTMLElement>(".hds-accordion").forEach((acc) => {
    const details = Array.from(acc.querySelectorAll<HTMLDetailsElement>(":scope > details.hds-details"));
    const summaries = details.map((x) => x.querySelector<HTMLElement>(":scope > summary"));
    const collapsible = isCollapsible(acc);
    const exclusive = details.some((x) => x.hasAttribute("name"));

    if (!collapsible && exclusive)
      summaries.forEach((s) => {
        if (!s) return;
        d.add(
          listen<MouseEvent>(s, "click", (e) => {
            if (s.closest("details")?.open) e.preventDefault();
          }),
        );
      });

    // Composite roving focus (loop, both orientations).
    let active = 0;
    const mark = () => summaries.forEach((s, i) => (i === active ? s?.setAttribute("data-active", "") : s?.removeAttribute("data-active")));
    summaries.forEach((s, i) => {
      if (!s) return;
      d.add(
        listen(s, "focus", () => {
          active = i;
          mark();
        }),
      );
      d.add(
        listen<KeyboardEvent>(s, "keydown", (e) => {
          const next = e.key === "ArrowRight" || e.key === "ArrowDown";
          const prev = e.key === "ArrowLeft" || e.key === "ArrowUp";
          if (!next && !prev) return;
          const count = summaries.length;
          const to = next ? (active + 1) % count : (active - 1 + count) % count;
          if (to === active) return;
          e.stopPropagation();
          e.preventDefault();
          active = to;
          mark();
          summaries[to]?.focus();
        }),
      );
    });
    mark();

    if (!interpolate)
      details.forEach((det) => {
        const content = det.querySelector<HTMLElement>(":scope > .hds-details-content");
        if (!content) return;
        const ro = new ResizeObserver(() => det.style.setProperty("--content-height", getComputedStyle(content).height));
        ro.observe(content);
        d.add(() => ro.disconnect());
      });
  });
  return () => d.run();
}
