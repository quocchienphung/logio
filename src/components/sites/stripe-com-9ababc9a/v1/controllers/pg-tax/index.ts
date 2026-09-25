// Controller ports owned by the "pg-tax" group. Map keys are the reference's data-js-controller names.
// Behaviour notes, constants and evidence: docs/research/products/motion/pages-c.md.
import type { Controller } from "../types";
import { TaxHeroAnimation, TaxHeroAnimationCountryIndiciator, TaxHeroAnimationPlusIcon, TaxHeroAnimationScene } from "./heroAnimation";
import { TaxLocalizationGraphic } from "./localizationGraphic";
import { LogoRiver } from "./logoRiver";

export const controllers: Record<string, Controller> = {
  TaxHeroAnimation,
  TaxHeroAnimationScene,
  TaxHeroAnimationPlusIcon,
  TaxHeroAnimationCountryIndiciator,
  TaxLocalizationGraphic,
  LogoRiver,
};
