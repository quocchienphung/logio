// Behaviours for the metronome page (/billing/usage-based-billing, HDS stack). Receives
// <main data-page="metronome">, returns a cleanup. Reference: page module 42161 (chunk
// pages/billing/usage-based-billing) plus shared HDS modules.
import { mountUbbHero } from "../metronome/hero";
import { Disposer } from "../revenue-shared/env";
import { mountRevenueCommon, safe } from "../revenue-shared/page";

export function mount(root: HTMLElement): () => void {
  const d = new Disposer();
  mountRevenueCommon(root, d);
  safe(d, () => mountUbbHero(root));
  return () => d.run();
}
