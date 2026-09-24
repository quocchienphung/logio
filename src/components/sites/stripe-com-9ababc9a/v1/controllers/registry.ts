// Registry of the legacy-stack controller ports. Each group folder is owned by one builder; this file
// only aggregates them. A controller receives the element carrying data-js-controller="Name".
import type { Controller } from "./types";
import { controllers as Core } from "./core";
import { controllers as Carousels } from "./carousels";
import { controllers as Forms } from "./forms";
import { controllers as PgPayments } from "./pg-payments";
import { controllers as PgCheckout } from "./pg-checkout";
import { controllers as PgPaymentLinks } from "./pg-payment-links";
import { controllers as PgElements } from "./pg-elements";
import { controllers as PgLink } from "./pg-link";
import { controllers as PgPaymentMethods } from "./pg-payment-methods";
import { controllers as PgTerminal } from "./pg-terminal";
import { controllers as PgAuthorizationBoost } from "./pg-authorization-boost";
import { controllers as PgFinancialConnections } from "./pg-financial-connections";
import { controllers as PgInvoicing } from "./pg-invoicing";
import { controllers as PgTax } from "./pg-tax";
import { controllers as PgRevenueRecognition } from "./pg-revenue-recognition";
import { controllers as PgSigma } from "./pg-sigma";
import { controllers as PgDataPipeline } from "./pg-data-pipeline";

const CONTROLLERS: Record<string, Controller> = { ...Core, ...Carousels, ...Forms, ...PgPayments, ...PgCheckout, ...PgPaymentLinks, ...PgElements, ...PgLink, ...PgPaymentMethods, ...PgTerminal, ...PgAuthorizationBoost, ...PgFinancialConnections, ...PgInvoicing, ...PgTax, ...PgRevenueRecognition, ...PgSigma, ...PgDataPipeline };

/** Mount every known controller under root (document order, like the reference loader). */
export function mountControllers(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>("[data-js-controller]").forEach((el) => {
    for (const name of (el.dataset.jsController || "").split(/\s+/)) {
      const c = CONTROLLERS[name];
      if (!c) continue;
      try {
        const off = c(el);
        if (typeof off === "function") cleanups.push(off);
      } catch (err) {
        console.error(`[v1] controller ${name} failed`, err);
      }
    }
  });
  return () => cleanups.forEach((f) => f());
}
