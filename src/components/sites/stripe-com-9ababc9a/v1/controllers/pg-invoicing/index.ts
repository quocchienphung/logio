// Controller ports owned by the "pg-invoicing" group. Map keys are the reference's data-js-controller names.
// Behaviour notes, constants and evidence: docs/research/products/motion/pages-c.md.
// HeroGraphic (shared with payment-links) is owned by the payment-links group; it drives HostedPage.animateIn().
import type { Controller } from "../types";
import { BillingInvoicingDemoButton, InvoicingCustomizeCarousel, InvoicingGlobalCarousel } from "./carousels";
import { HostedPage } from "./hostedPage";

export const controllers: Record<string, Controller> = {
  HostedPage,
  BillingInvoicingDemoButton,
  InvoicingCustomizeCarousel,
  InvoicingGlobalCarousel,
};
