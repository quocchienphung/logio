// PhoneHeader (reference module 40498, page bundle): the status-bar clock is the viewer's current local
// time, formatted once on mount as hour:minute without the day period (server render: a non-breaking space).

import type { Cleanup } from "./runtime";

export function mountPhoneHeaders(root: ParentNode, locale = "en-US"): Cleanup {
  const text = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" })
    .formatToParts(new Date())
    .filter((p) => p.type !== "dayPeriod")
    .map((p) => p.value)
    .join("")
    .trim();
  const touched: [HTMLElement, string][] = [];
  for (const header of root.querySelectorAll<HTMLElement>(".phone-header")) {
    const clock = header.firstElementChild as HTMLElement | null;
    if (!clock || clock.classList.contains("phone-header__status")) continue;
    touched.push([clock, clock.textContent ?? ""]);
    clock.textContent = text;
  }
  return () => touched.forEach(([el, prev]) => (el.textContent = prev));
}
