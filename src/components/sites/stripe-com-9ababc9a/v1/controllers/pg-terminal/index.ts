// Controller ports owned by the "pg-terminal" group. Map keys are the reference's data-js-controller names.
// Behaviour notes (triggers, timings, easings, evidence): docs/research/products/motion/pages-b.md.
// TerminalIcon (v1-TerminalIcon-PFKMIM2E.js) is a generic animated icon (AnimationController subclass like
// the other *Icon controllers) and is ported by the core group.
import type { Controller } from "../types";
import { TerminalHeroGraphic, TerminalHeroGraphic3d, TerminalHeroGraphicS700UI } from "./hero";
import { TerminalDeviceManagementLayout, TerminalDeviceShowcaseGraphic, TerminalUnifiedCommerceS700Animation } from "./sections";

export const controllers: Record<string, Controller> = {
  TerminalHeroGraphic,
  TerminalHeroGraphic3d,
  TerminalHeroGraphicS700UI,
  TerminalUnifiedCommerceS700Animation,
  TerminalDeviceShowcaseGraphic,
  TerminalDeviceManagementLayout,
};
