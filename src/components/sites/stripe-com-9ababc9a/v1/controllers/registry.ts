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
import { pageSettled, runSliced } from "@/lib/pageSettled";

const CONTROLLERS: Record<string, Controller> = { ...Core, ...Carousels, ...Forms, ...PgPayments, ...PgCheckout, ...PgPaymentLinks, ...PgElements, ...PgLink, ...PgPaymentMethods, ...PgTerminal, ...PgAuthorizationBoost, ...PgFinancialConnections, ...PgInvoicing, ...PgTax, ...PgRevenueRecognition, ...PgSigma, ...PgDataPipeline };

/** Mount every known controller under root. Deepest elements first, so child controllers (the
 * reference's dependencies) have exposed their API before their parent connects.
 *
 * Mounting all of them in one task blocked the main thread for 300–700 ms right as a page arrived,
 * freezing the page transition. Controllers in the first viewport (with every controller inside them,
 * which must connect first) now mount at once, in short slices that yield to rendering; the rest once the
 * transition has settled, in idle periods. */
export function mountControllers(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];
  let alive = true;
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-js-controller]")).reverse();
  const mount = (el: HTMLElement) => {
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
  };
  const vh = window.innerHeight;
  const inView = nodes.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < vh;
  });
  const first = new Set(nodes.filter((el) => inView.some((v) => v.contains(el))));
  const later = nodes.filter((el) => !first.has(el));
  const isAlive = () => alive;
  void runSliced(
    nodes.filter((el) => first.has(el)).map((el) => () => mount(el)),
    isAlive,
  )
    .then(pageSettled)
    .then(() => runSliced(later.map((el) => () => mount(el)), isAlive, { whenIdle: true }));
  return () => {
    alive = false;
    cleanups.forEach((f) => f());
  };
}
