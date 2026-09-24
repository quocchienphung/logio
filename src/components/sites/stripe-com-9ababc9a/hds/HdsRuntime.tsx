"use client";

import { useEffect } from "react";
import { mount as billing } from "./pages/billing";
import { mount as managedPayments } from "./pages/managed-payments";
import { mount as metronome } from "./pages/metronome";
import { mount as subscriptions } from "./pages/subscriptions";

const PAGES: Record<string, (root: HTMLElement) => () => void> = {
  "managed-payments": managedPayments,
  billing,
  metronome,
  subscriptions,
};

/** Page behaviours for the HDS-stack product pages (subnav, reveals, graphics). */
export function HdsRuntime({ page }: { page: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`main[data-page="${page}"]`);
    const mount = PAGES[page];
    if (!root || !mount) return;
    return mount(root);
  }, [page]);
  return null;
}
