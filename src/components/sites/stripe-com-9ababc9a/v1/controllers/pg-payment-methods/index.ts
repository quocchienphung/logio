// Controller ports owned by the "pg-payment-methods" group. Map keys are the reference's data-js-controller names.
// Behaviour notes (triggers, timings, easings, evidence): docs/research/products/motion/pages-b.md.
// PaymentMethodHubGrid / PaymentMethodHubFilterText are ported by the forms group (forms/pmGrid.ts), which owns
// the filter inputs they are built on; they are intentionally not registered here (a second registration here
// would silently replace that port, since this map is spread after the forms map in registry.ts).
import type { Controller } from "../types";
import { PaymentMethodHubCard } from "./card";
import { PaymentMethodHubCountriesExplorer, PaymentMethodHubCountryStats, PaymentMethodHubDonutChart } from "./countries";
import { PaymentMethodHubHeroCarousel, PaymentMethodHubHeroGraphicCardScaleContainer } from "./heroCarousel";

export const controllers: Record<string, Controller> = {
  PaymentMethodHubHeroCarousel,
  PaymentMethodHubHeroGraphicCardScaleContainer,
  PaymentMethodHubCard,
  PaymentMethodHubCountriesExplorer,
  PaymentMethodHubCountryStats,
  PaymentMethodHubDonutChart,
};
