"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useCollateralSimulation, type CollateralSimulation } from "./useCollateralSimulation";
import { useJsonPlan, type JsonPlanState } from "./json-formation/useJsonPlan";
import { defaultFilters, type ReviewFilters } from "./excel-formation/review-filters";
import { useWorkspaceRoute } from "../affectui-crm/workspace-state";
import { useWorkbookPreview } from "./useWorkbookPreview";
import { sampleQueue } from "./simulation/fixtures";
import type { QueueDeleteReceipt, QueueEntry } from "./queue/queue-model";

interface CollateralValue {
  engine: CollateralSimulation;
  isSimulation: boolean;
  json: JsonPlanState;
  setJsonActive: (active: boolean) => void;
  filters: ReviewFilters;
  setFilters: (filters: ReviewFilters) => void;
  entries: QueueEntry[];
  archive: { state: "saved"; entry: QueueEntry } | null;
  saveToQueue: () => void;
  openSaved: (entry: QueueEntry) => Promise<void>;
  deleteSaved: (entry: QueueEntry) => Promise<QueueDeleteReceipt>;
  restoreSaved: (entry: QueueEntry, receipt: QueueDeleteReceipt) => Promise<QueueEntry>;
}
const Context = createContext<CollateralValue | null>(null);

/** Keyed by workspace by the caller: all demo state disappears on reload or workspace change. */
export function CollateralProvider({ children, workspaceId }: { children: ReactNode; workspaceId: string }) {
  void workspaceId;
  const simulation = useCollateralSimulation();
  const workbookPreview = useWorkbookPreview();
  const { section } = useWorkspaceRoute();
  const isSimulation = String(section) !== "Flip";
  const engine = isSimulation ? simulation : workbookPreview;
  const [entries, setEntries] = useState(sampleQueue);
  const [archive, setArchive] = useState<CollateralValue["archive"]>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [jsonActive, setJsonActive] = useState(false);
  const json = useJsonPlan(engine, jsonActive);
  const openSample = engine.open;
  const open = useCallback(async (...args: Parameters<CollateralSimulation["open"]>) => {
    setArchive(null); setFilters(defaultFilters); await openSample(...args);
  }, [openSample]);
  const saveToQueue = useCallback(() => {
    if (engine.phase !== "ready") return;
    const entry: QueueEntry = { id: `preview-${Date.now()}`, name: engine.fileName, size: engine.fileSize, sha256: "demo-preview-only", uploadedAt: new Date().toISOString(), status: "ready", sheets: 1, rows: 6 };
    setEntries(current => [entry, ...current]); setArchive({ entry, state: "saved" });
  }, [engine.phase, engine.fileName, engine.fileSize]);
  const openSaved = useCallback(async (entry: QueueEntry) => {
    setFilters(defaultFilters); await openSample({ name: entry.name, size: entry.size }); setArchive({ entry, state: "saved" });
  }, [openSample]);
  const deleteSaved = useCallback(async (entry: QueueEntry) => {
    setEntries(current => current.filter(item => item.id !== entry.id));
    setArchive(current => current?.entry.id === entry.id ? null : current);
    return { expiresAt: new Date(Date.now() + 8000).toISOString() };
  }, []);
  const restoreSaved = useCallback(async (entry: QueueEntry, receipt: QueueDeleteReceipt) => {
    if (Date.now() > new Date(receipt.expiresAt).getTime()) throw new Error("The preview Undo window has ended.");
    setEntries(current => current.some(item => item.id === entry.id) ? current : [entry, ...current]); return entry;
  }, []);
  const closeSample = engine.close;
  const close = useCallback(() => { closeSample(); setArchive(null); setFilters(defaultFilters); }, [closeSample]);
  const value = useMemo<CollateralValue>(() => ({ isSimulation, engine: { ...engine, open, close }, json, setJsonActive, filters, setFilters, entries, archive, saveToQueue, openSaved, deleteSaved, restoreSaved }), [isSimulation, engine, open, close, json, filters, entries, archive, saveToQueue, openSaved, deleteSaved, restoreSaved]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCollateral(): CollateralValue {
  const value = useContext(Context);
  if (!value) throw new Error("useCollateral must be used inside CollateralProvider.");
  return value;
}
export function useCollateralBadges(): { open: number; ready: boolean } {
  const value = useContext(Context);
  return { open: value?.engine.view?.summary.blocking ?? 0, ready: value?.json.plan?.ready ?? false };
}
