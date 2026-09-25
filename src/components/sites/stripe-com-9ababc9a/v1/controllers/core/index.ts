// Controller ports owned by the "core" group. Map keys are the reference's data-js-controller names.
// Behaviour notes, constants and evidence: docs/research/products/motion/core.md.
import type { Controller } from "../types";
import { BackgroundGlobe } from "./backgroundGlobe";
import { Gradient } from "./gradient";
import {
  BlocksIcon,
  DocumentWithArrowsIcon,
  DocumentWithCheckmarkIcon,
  FastForwardIcon,
  GearsIcon,
  HealthIcon,
  NodesIcon,
  PricingIcon,
  ShieldWithCheckmarkIcon,
  TerminalIcon,
} from "./icons";
import { DomGraphic, GuidesCard, PortalTooltipItem, StripeSet, Track, Video } from "./misc";
import { FixedNav, HorizontalOverflowContainer, MobileStickyNav, PaymentsStickyNav, ProductNav, ProductNavDropdownItem, StickyNav } from "./nav";
import { mountPageBehaviours } from "./page";

export type { AnimatedIconApi } from "./icons";
export type { DomGraphicApi, PortalTooltipItemApi, TrackApi, VideoApi } from "./misc";
export type { HorizontalOverflowContainerApi } from "./nav";

/**
 * Gradient is on every legacy page, so it also carries the reference "Page" controller behaviours
 * (the generated markup drops <html data-js-controller="Page">); see page.ts.
 */
const GradientAndPage: Controller = (el) => {
  const offPage = mountPageBehaviours(el);
  const offGradient = Gradient(el);
  return () => {
    offGradient?.();
    offPage();
  };
};

export const controllers: Record<string, Controller> = {
  Gradient: GradientAndPage,
  StickyNav,
  FixedNav,
  PaymentsStickyNav,
  MobileStickyNav,
  ProductNav,
  ProductNavDropdownItem,
  HorizontalOverflowContainer,
  DomGraphic,
  StripeSet,
  Track,
  Video,
  PortalTooltipItem,
  GuidesCard,
  BackgroundGlobe,
  FastForwardIcon,
  DocumentWithArrowsIcon,
  ShieldWithCheckmarkIcon,
  NodesIcon,
  DocumentWithCheckmarkIcon,
  BlocksIcon,
  GearsIcon,
  HealthIcon,
  PricingIcon,
  TerminalIcon,
};
