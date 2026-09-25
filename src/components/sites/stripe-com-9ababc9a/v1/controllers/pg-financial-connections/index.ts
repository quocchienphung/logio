// Controller ports owned by the "pg-financial-connections" group. Map keys are the reference's data-js-controller names.
// Behaviour notes (triggers, timings, easings, evidence): docs/research/products/motion/pages-b.md.
import type { Controller } from "../types";
import {
  FinancialConnectionsAppAccountSelectionSheet,
  FinancialConnectionsAppAddFundsSheet,
  FinancialConnectionsAppBankConnectionSheet,
  FinancialConnectionsAppBankSelectionSheet,
  FinancialConnectionsAppFundsView,
  FinancialConnectionsAppHomeView,
  FinancialConnectionsHeroAnimation,
} from "./hero";
import { FinancialConnectionsPrebuiltFlowAnimation, FinancialConnectionsPrebuiltFlowBankConnection } from "./prebuiltFlow";

export const controllers: Record<string, Controller> = {
  FinancialConnectionsHeroAnimation,
  FinancialConnectionsAppHomeView,
  FinancialConnectionsAppFundsView,
  FinancialConnectionsAppBankSelectionSheet,
  FinancialConnectionsAppAccountSelectionSheet,
  FinancialConnectionsAppBankConnectionSheet,
  FinancialConnectionsAppAddFundsSheet,
  FinancialConnectionsPrebuiltFlowAnimation,
  FinancialConnectionsPrebuiltFlowBankConnection,
};
