// Controller ports owned by the "pg-payments" group. Map keys are the reference's data-js-controller names.
// Behaviour notes, constants and evidence: docs/research/products/motion/pages-a.md.
import type { Controller } from "../types";
import {
  PaymentsHeroAnimation,
  PaymentsHeroAnimationCheckout,
  PaymentsHeroAnimationKlarna,
  PaymentsHeroAnimationLink,
  PaymentsHeroAnimationPaymentElements,
} from "./heroAnimation";
import { PaymentMethodHubGlobalPaymentCarousel, PaymentsOnlinePaymentsLinkAnimation, PaymentsTerminalAnimation } from "./sections";
import {
  CustomersCaseStudyCarousel,
  CustomersCaseStudyCarouselNavGroup,
  CustomersCaseStudyCarouselNavItem,
  CustomersCaseStudyCarouselNavTrack,
} from "./caseStudyCarousel";

export const controllers: Record<string, Controller> = {
  PaymentsHeroAnimation,
  PaymentsHeroAnimationPaymentElements,
  PaymentsHeroAnimationKlarna,
  PaymentsHeroAnimationCheckout,
  PaymentsHeroAnimationLink,
  PaymentsOnlinePaymentsLinkAnimation,
  PaymentsTerminalAnimation,
  CustomersCaseStudyCarousel,
  CustomersCaseStudyCarouselNavTrack,
  CustomersCaseStudyCarouselNavGroup,
  CustomersCaseStudyCarouselNavItem,
  PaymentMethodHubGlobalPaymentCarousel,
};
