"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useCollateralEngine, type CollateralEngine } from "./useCollateralEngine";
import { useJsonPlan, type JsonPlanState } from "./json-formation/useJsonPlan";
import { defaultFilters, type ReviewFilters } from "./excel-formation/review-filters";

/**
 * One workbook, two sections. The file is read and reviewed in a worker of this tab; this provider keeps it alive while the person moves
 * between Excel formation and JSON formation, and drops it with the tab. Nothing here is stored or sent anywhere.
 */
export interface CollateralValue {
  engine: CollateralEngine;
  json: JsonPlanState;
  /** The JSON section tells the provider when it is on screen, so the grouped result is built only while someone looks at it. */
  setJsonActive: (active: boolean) => void;
  filters: ReviewFilters;
  setFilters: (filters: ReviewFilters) => void;
}
const Context = createContext<CollateralValue | null>(null);

export function CollateralProvider({ children }: { children: ReactNode }) {
  const engine = useCollateralEngine();
  const [jsonActive, setJsonActive] = useState(false);
  const json = useJsonPlan(engine, jsonActive);
  // Filters belong to the open file: another file starts from the defaults.
  const fileKey = engine.result?.fileHash ?? "";
  const [box, setBox] = useState<{ key: string; value: ReviewFilters }>({ key: "", value: defaultFilters });
  const filters = box.key === fileKey ? box.value : defaultFilters;
  const value = useMemo<CollateralValue>(() => ({ engine, json, setJsonActive, filters, setFilters: next => setBox({ key: fileKey, value: next }) }), [engine, json, filters, fileKey]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCollateral(): CollateralValue {
  const value = useContext(Context);
  if (!value) throw new Error("useCollateral must be used inside CollateralProvider.");
  return value;
}
/** Numbers for the sidebar: how many serious issues are open, and whether the JSON is ready. */
export function useCollateralBadges(): { open: number; ready: boolean } {
  const value = useContext(Context);
  if (!value || value.engine.phase !== "ready" || !value.engine.view) return { open: 0, ready: false };
  return { open: value.engine.view.summary.blocking, ready: value.json.plan?.ready === true };
}
