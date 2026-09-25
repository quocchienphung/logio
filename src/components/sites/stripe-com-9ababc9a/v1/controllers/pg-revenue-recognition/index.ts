// Controller ports owned by the "pg-revenue-recognition" group. Map keys are the reference's data-js-controller names.
// Behaviour notes, constants and evidence: docs/research/products/motion/pages-c.md.
import type { Controller } from "../types";
import { RevRecHeroAnimation } from "./heroAnimation";
import { RevRecReportsGraphic } from "./reportsGraphic";
import { RevRecSingleViewAnimation, RevRecSingleViewLogoItem } from "./singleViewAnimation";

export const controllers: Record<string, Controller> = {
  RevRecHeroAnimation,
  RevRecSingleViewAnimation,
  RevRecSingleViewLogoItem,
  RevRecReportsGraphic,
};
