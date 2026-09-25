// Controller ports owned by the "forms" group. Map keys are the reference's data-js-controller names.
// Behaviour notes (triggers, timings, easings, evidence): docs/research/products/motion/forms.md.
// Parent controllers in other groups reach these through getApi(el, "<Name>") (see ./api.ts for the types).
import type { Controller } from "../types";
import { animatedCodeEditorControllers } from "./animatedCodeEditor";
import { cardFieldControllers } from "./cardField";
import { codeEditorControllers } from "./codeEditor";
import { filterControllers } from "./filters";
import { inputControllers } from "./inputs";
import { pmGridControllers } from "./pmGrid";
import { shippingControllers } from "./shipping";
import { snippetsControllers } from "./snippets";
import { tableControllers } from "./table";

export const controllers: Record<string, Controller> = {
  ...codeEditorControllers,
  ...snippetsControllers,
  ...animatedCodeEditorControllers,
  ...cardFieldControllers,
  ...inputControllers,
  ...shippingControllers,
  ...filterControllers,
  ...pmGridControllers,
  ...tableControllers,
};
