// Payment-method grid card: a click anywhere on the card follows its "Learn more" link above 600px.
// Reference module: v1-Card-ZAQKVGPY.js (PaymentMethodHubCard).
import { target } from "../lib";
import type { Controller } from "../types";

export const PaymentMethodHubCard: Controller = (el) => {
  const link = target<HTMLElement>(el, "PaymentMethodHubCard", "link");
  if (!link) return;
  const onClick = (e: MouseEvent) => {
    if (window.innerWidth > 600 && e.target !== link) {
      link.click();
      e.stopImmediatePropagation();
    }
  };
  el.addEventListener("click", onClick);
  return () => el.removeEventListener("click", onClick);
};
