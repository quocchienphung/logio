// Controller ports owned by the "pg-authorization-boost" group. Map keys are the reference's data-js-controller names.
// Behaviour notes (triggers, timings, easings, evidence): docs/research/products/motion/pages-b.md.
import type { Controller } from "../types";
import { AuthorizationBoostAIPoweredGraphic, AuthorizationBoostAIPoweredGraphicIssuer } from "./aiPowered";

export const controllers: Record<string, Controller> = {
  AuthorizationBoostAIPoweredGraphic,
  AuthorizationBoostAIPoweredGraphicIssuer,
};
