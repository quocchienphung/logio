// Controller ports owned by the "carousels" group. Map keys are the reference's data-js-controller names.
// Behaviour notes and evidence: docs/research/products/motion/carousels.md.
import type { Controller } from "../types";
import { AnimationSequence } from "./AnimationSequence";
import { CaseStudyCarousel, CaseStudyCarouselNav } from "./CaseStudyCarousel";
import { CyclingCard, CyclingCardsAnimation } from "./CyclingCardsAnimation";
import { DetailCodeSnippetCarousel } from "./DetailCodeSnippetCarousel";
import { FullWidthCarousel, FullWidthFeatureCarousel, FullWidthFeatureCarouselMobileNav, FullWidthFeatureCarouselNav } from "./FullWidthCarousel";
import { SegmentedControl } from "./SegmentedControl";
import { StackedCarousel, StackedCarouselControl } from "./StackedCarousel";
import { TestimonialCarousel } from "./TestimonialCarousel";

export const controllers: Record<string, Controller> = {
  TestimonialCarousel,
  FullWidthCarousel,
  FullWidthFeatureCarousel,
  FullWidthFeatureCarouselNav,
  FullWidthFeatureCarouselMobileNav,
  CaseStudyCarousel,
  CaseStudyCarouselNav,
  StackedCarousel,
  StackedCarouselControl,
  SegmentedControl,
  CyclingCardsAnimation,
  CyclingCard,
  DetailCodeSnippetCarousel,
  AnimationSequence,
};
