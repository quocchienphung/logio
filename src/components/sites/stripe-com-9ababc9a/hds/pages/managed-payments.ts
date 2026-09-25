// Behaviours for the managed-payments page (HDS stack). Receives <main data-page="managed-payments">,
// returns a cleanup. Every behaviour is a port of the reference page bundle
// (pages/managed-payments-40aa2ec9b3155626.js) and the shared chunks it loads; see
// docs/research/products/motion/managed-payments.md for the per-behaviour evidence.

import { mountHero } from "../managed-payments/hero";
import { mountMerchantOfRecord } from "../managed-payments/merchantOfRecord";
import { mountAccordions } from "../shared/accordion";
import { mountScrollSnapCarousel } from "../shared/carousel";
import { type DomGraphicDims, mountDomGraphics } from "../shared/domGraphic";
import { mountGradientBorderCards } from "../shared/gradientBorderCard";
import { mountHeroSubnav } from "../shared/heroSubnav";
import { mountLogoCarousel } from "../shared/logoCarousel";
import { mountPhoneHeaders } from "../shared/phoneHeader";
import { type Cleanup, combine } from "../shared/runtime";
import { mountTestimonialCarousel } from "../shared/testimonialCarousel";
import { mountWhimsyDividers } from "../shared/whimsyDivider";

const LOCALE = "en-US";

/** DomGraphic props the server render cannot carry: the hero overlay has a separate mobile size. */
function domGraphicDims(el: HTMLElement): DomGraphicDims | undefined {
  if (el.closest(".managed-payments-hero__ui-anim-container")) return { width: 1264, height: 425, mobileWidth: 555, mobileHeight: 628 };
  return undefined; // every other graphic: the server-rendered source size
}

export function mount(root: HTMLElement): () => void {
  const cleanups: (Cleanup | undefined)[] = [];
  const hero = root.querySelector<HTMLElement>(".managed-payments-hero");
  const subnav = root.querySelector<HTMLElement>(".product-hero-subnav");
  const manifesto = root.querySelector<HTMLElement>(".managed-payments-manifesto");

  cleanups.push(mountDomGraphics(root, domGraphicDims));
  if (subnav) cleanups.push(mountHeroSubnav(subnav, { stickyAnchor: manifesto }));
  if (hero) cleanups.push(mountHero(hero));
  root.querySelectorAll<HTMLElement>(".logo-carousel").forEach((c) => cleanups.push(mountLogoCarousel(c)));
  cleanups.push(mountGradientBorderCards(root));
  cleanups.push(mountWhimsyDividers(root));
  root
    .querySelectorAll<HTMLElement>(".reduce-overhead-carousel")
    .forEach((c) => cleanups.push(mountScrollSnapCarousel(c, { mobile: "scroll-snap", tablet: "none", desktop: "none" })));
  cleanups.push(mountMerchantOfRecord(root, LOCALE));
  cleanups.push(mountPhoneHeaders(root, LOCALE));
  root.querySelectorAll<HTMLElement>(".testimonial-carousel-container").forEach((c) => cleanups.push(mountTestimonialCarousel(c)));
  cleanups.push(mountAccordions(root));
  return combine(cleanups);
}
