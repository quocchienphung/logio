// Behaviours for the subscriptions page (HDS stack). Receives <main data-page="subscriptions">, returns a cleanup.
// Reference: page module 58634 (chunk pages/billing/subscriptions) plus shared HDS modules. The page's
// own graphics are static or CSS-animated; its behaviours are the shared ones.
import { Disposer } from "../revenue-shared/env";
import { mountRevenueCommon } from "../revenue-shared/page";

export function mount(root: HTMLElement): () => void {
  const d = new Disposer();
  mountRevenueCommon(root, d);
  return () => d.run();
}
