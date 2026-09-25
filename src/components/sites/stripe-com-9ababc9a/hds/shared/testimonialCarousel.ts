// TestimonialCarousel (reference module 49382, chunk 64353). The cards scroll natively (scroll-snap CSS);
// the customer-logo buttons smooth-scroll their card into view. On every scroll/resize (resize debounced
// 150ms) the active button follows round(scrollLeft / clientWidth) and the selection bar tracks the
// scroll ratio: above 706px it is 1/n wide and slides across; at <=706px it is a fixed 160px bar centred
// under the logo row, and the logo row itself slides instead.

import { type Cleanup, combine, listen, observeResize } from "./runtime";

export function mountTestimonialCarousel(root: HTMLElement): Cleanup {
  const cards = root.querySelector<HTMLElement>(".testimonial-carousel__cards");
  const selection = root.querySelector<HTMLElement>(".testimonial-carousel__navigation-selection");
  const bar = root.querySelector<HTMLElement>(".testimonial-carousel__navigation-selection-bar");
  const logos = root.querySelector<HTMLElement>(".testimonial-carousel__navigation-customers-inner");
  if (!cards) return () => {};
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".testimonial-carousel__navigation-button"));
  const count = cards.children.length;
  const narrowMq = window.matchMedia("(max-width: 706px)");

  const sync = () => {
    const { scrollWidth, clientWidth, scrollLeft } = cards;
    const max = scrollWidth - clientWidth;
    const ratio = max > 0 ? scrollLeft / max : 0;
    const active = clientWidth > 0 ? Math.round(scrollLeft / clientWidth) : 0;
    buttons.forEach((b, i) => b.classList.toggle("testimonial-carousel__navigation-button--active", i === active));
    const narrow = narrowMq.matches;
    const selWidth = selection?.offsetWidth ?? 0;
    if (bar) {
      bar.style.setProperty("transform", `translateX(${narrow ? `${(selWidth - 32 - 160) / 2}px` : `${ratio * (count - 1) * 100}%`})`);
      bar.style.setProperty("width", narrow ? "160px" : `${100 / count}%`);
    }
    logos?.style.setProperty("transform", `translateX(${narrow ? `calc(-${ratio * (count - 1) * 50}% - 8px)` : "0px"})`);
  };

  const onMq = () => sync();
  narrowMq.addEventListener("change", onMq);
  sync();
  return combine([
    observeResize(cards, sync, { delay: 150 }),
    listen(cards, "scroll", sync, { passive: true }),
    ...buttons.map((b, i) =>
      listen(b, "click", () => {
        const card = cards.children[i] as HTMLElement | undefined;
        card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }),
    ),
    () => narrowMq.removeEventListener("change", onMq),
  ]);
}
