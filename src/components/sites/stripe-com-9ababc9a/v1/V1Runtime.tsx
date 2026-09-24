"use client";

import { useEffect } from "react";
import { mountControllers } from "./controllers/registry";

/** Instantiates the TypeScript ports of the reference's data-js-controller behaviours for one page. */
export function V1Runtime({ page }: { page: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`.v1-root[data-page="${page}"]`);
    if (!root) return;
    return mountControllers(root);
  }, [page]);
  return null;
}
