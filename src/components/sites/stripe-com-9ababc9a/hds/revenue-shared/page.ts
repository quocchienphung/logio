// Behaviours common to the three Revenue HDS pages. Page-specific graphics are mounted by each page.

import { mountAccordions } from "./accordion";
import { mountAnimatedTagIcons } from "./animatedTagIcon";
import { mountCarousels } from "./carousel";
import { mountChippies, mountResourceCards, mountRevenueRecovery } from "./cards";
import { mountDomGraphics } from "./domGraphic";
import { Disposer, type Cleanup } from "./env";
import { mountGradientBorderCards } from "./gradientBorderCard";
import { mountLogoCarousel } from "./logoCarousel";
import { mountSteppers } from "./stepper";
import { mountSubnav } from "./subnav";

/** Runs `fn` and isolates failures so one broken behaviour cannot take the others down. */
export function safe(d: Disposer, fn: () => Cleanup): void {
  try {
    d.add(fn());
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[revenue-hds]", err);
  }
}

export function mountRevenueCommon(root: HTMLElement, d: Disposer): void {
  // The reference passes the manifesto section as the sub-nav's stickyAnchorRef.
  const anchor = root.querySelector<HTMLElement>(".manifesto-container")?.closest<HTMLElement>("section") ?? null;
  safe(d, () => mountDomGraphics(root));
  safe(d, () => mountSubnav(root, anchor));
  root.querySelectorAll<HTMLElement>(".logo-carousel").forEach((el) => safe(d, () => mountLogoCarousel(el)));
  safe(d, () => mountGradientBorderCards(root));
  safe(d, () => mountAccordions(root));
  safe(d, () => mountSteppers(root));
  safe(d, () => mountCarousels(root));
  safe(d, () => mountChippies(root));
  safe(d, () => mountResourceCards(root));
  safe(d, () => mountRevenueRecovery(root));
  safe(d, () => mountAnimatedTagIcons(root));
}
