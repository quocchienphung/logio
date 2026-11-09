"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCollateralSimulation } from "./useCollateralSimulation";
import type { GridMeta, GridRow, OpenResult, SheetWindow } from "./simulation/types";

/** Flip's existing shared import/grid contract, kept read-only and separate from the three demo pages. */
export function useWorkbookPreview() {
  const fallback = useCollateralSimulation();
  const [state, setState] = useState<Pick<typeof fallback, "phase" | "fileName" | "fileSize" | "result" | "failure" | "openMs" | "progress">>({ phase: "idle", fileName: "", fileSize: 0, result: null, failure: null, openMs: 0, progress: { phase: "read", fraction: 0 } });
  const worker = useRef<Worker | null>(null), serial = useRef(0), generation = useRef(0);
  const lastFile = useRef<File | null>(null);
  const pending = useRef(new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>());
  const cancel = useCallback(() => {
    generation.current++; worker.current?.terminate(); worker.current = null;
    pending.current.forEach(p => p.reject(new Error("cancelled"))); pending.current.clear();
  }, []);
  useEffect(() => cancel, [cancel]);
  const call = useCallback(<T,>(request: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> => {
    if (!worker.current) {
      worker.current = new Worker(new URL("../../../lib/workbook-preview/workbook.worker.ts", import.meta.url));
      worker.current.onmessage = (event: MessageEvent<{ id: number; value?: unknown; error?: string; code?: string }>) => {
        const data = event.data, task = pending.current.get(data.id); pending.current.delete(data.id);
        if (data.error) task?.reject(Object.assign(new Error(data.error), { code: data.code })); else task?.resolve(data.value);
      };
      worker.current.onerror = () => { pending.current.forEach(p => p.reject(new Error("Workbook reader failed."))); pending.current.clear(); };
    }
    const id = ++serial.current;
    return new Promise<T>((resolve, reject) => { pending.current.set(id, { resolve: value => resolve(value as T), reject }); worker.current!.postMessage({ id, ...request }, transfer); });
  }, []);
  const open = useCallback(async (candidate?: Pick<File, "name" | "size">) => {
    if (!(candidate instanceof File)) return;
    cancel(); const run = generation.current, started = performance.now(); lastFile.current = candidate;
    setState({ phase: "scanning", fileName: candidate.name, fileSize: candidate.size, result: null, failure: null, openMs: 0, progress: { phase: "read", fraction: 0 } });
    try {
      const bytes = await candidate.arrayBuffer(); if (run !== generation.current) return;
      const result = await call<OpenResult>({ type: "open", bytes, name: candidate.name }, [bytes]);
      if (run !== generation.current) return;
      setState(current => ({ ...current, phase: "ready", result, openMs: Math.round(performance.now() - started), progress: { phase: "scan", fraction: 1 } }));
    } catch (error) { if (run === generation.current) setState(current => ({ ...current, phase: "failed", failure: { message: error instanceof Error ? error.message : "Could not open workbook.", code: error && typeof error === "object" && "code" in error ? String(error.code) : "corrupt" } })); }
  }, [cancel, call]);
  const close = useCallback(() => { cancel(); lastFile.current = null; setState({ phase: "idle", fileName: "", fileSize: 0, result: null, failure: null, openMs: 0, progress: { phase: "read", fraction: 0 } }); }, [cancel]);
  const retry = useCallback(async () => { if (lastFile.current) await open(lastFile.current); }, [open]);
  const gridMeta = useCallback((sheet?: string) => call<GridMeta>({ type: "meta", sheet }), [call]);
  const gridRows = useCallback((from: number, count: number, sheet?: string) => call<GridRow[]>({ type: "rows", from, count, sheet }), [call]);
  const sheetWindow = useCallback((row: number, col: number) => call<SheetWindow>({ type: "window", row, col }), [call]);
  return { ...fallback, ...state, open, close, retry, gridMeta, gridRows, sheetWindow };
}
