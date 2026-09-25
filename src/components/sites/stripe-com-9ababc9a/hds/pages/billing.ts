// Behaviours for the billing page (HDS stack). Receives <main data-page="billing">, returns a cleanup.
// Reference: page module 39828 (chunk 87161) plus the shared HDS modules noted in each behaviour file.
import { mountBillingAccordionDialogs } from "../billing/accordionDialog";
import { mountBillingBento } from "../billing/bento";
import { mountBillingHeroAnimation } from "../billing/heroAnimation";
import { mountBillingHeroWave } from "../billing/heroWave";
import { Disposer } from "../revenue-shared/env";
import { mountRevenueCommon, safe } from "../revenue-shared/page";

export function mount(root: HTMLElement): () => void {
  const d = new Disposer();
  mountRevenueCommon(root, d);
  safe(d, () => mountBillingHeroWave(root));
  safe(d, () => mountBillingHeroAnimation(root));
  safe(d, () => mountBillingBento(root));
  safe(d, () => mountBillingAccordionDialogs(root));
  return () => d.run();
}
