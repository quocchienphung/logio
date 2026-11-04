"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CollateralPlayback } from "./simulation/collateral-simulation";
export type { ExportedFile, RestoreOutcome } from "./simulation/collateral-simulation";

/** The existing screens consume only sample data and local interaction state. */
export function useCollateralSimulation() {
  const [playback] = useState(() => new CollateralPlayback());
  const snapshot = useSyncExternalStore(playback.subscribe, playback.getSnapshot, playback.getSnapshot);
  useEffect(() => () => playback.dispose(), [playback]);
  return {
    ...snapshot,
    open: playback.open, close: playback.close, retry: playback.retry, rescan: playback.rescan,
    edit: playback.edit, reject: playback.reject, reopen: playback.reopen, accept: playback.accept,
    chooseGroup: playback.chooseGroup, undo: playback.undo, redo: playback.redo,
    bulkPlan: playback.bulkPlan, bulkApply: playback.bulkApply, groupRows: playback.groupRows,
    duplicatePlan: playback.duplicatePlan, duplicateApply: playback.duplicateApply,
    gridMeta: playback.gridMeta, gridRows: playback.gridRows, rowContext: playback.rowContext,
    sheetWindow: playback.sheetWindow, predict: playback.predict,
    exportXlsx: playback.exportXlsx, saveProgress: playback.saveProgress, loadProgress: playback.loadProgress,
    jsonPlan: playback.jsonPlan, autoRepair: playback.autoRepair, cancelRepair: playback.cancelRepair,
    clearFailure: playback.clearFailure,
  };
}
export type CollateralSimulation = ReturnType<typeof useCollateralSimulation>;
