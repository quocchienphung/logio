"use client";

import { useEffect, useState } from "react";
import type { CollateralSimulation } from "../useCollateralSimulation";
import type { ReportMeta, ReportOptions } from "../simulation/types";
import { defaultReportOptions } from "../simulation/report-options";
import { sampleJsonPlan } from "../simulation/fixtures";

export const emptyMeta: ReportMeta = { KB001: "20261104", KB002: "Sample preparer", KB003: "0000000000", KB004: "sample@example.test" };
/** Form edits are cosmetic; the workflow replays scripted outcomes. */
export function useJsonPlan(engine: CollateralSimulation, enabled: boolean) {
  const [meta, setMeta] = useState(emptyMeta);
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions);
  const [checking, setChecking] = useState(false);
  const [passed, setPassed] = useState(false);
  const active = enabled && engine.phase === "ready";
  useEffect(() => {
    if (!active) return;
    const start = setTimeout(() => { setChecking(true); setPassed(false); }, 0);
    const end = setTimeout(() => { setChecking(false); setPassed(true); }, 650);
    return () => { clearTimeout(start); clearTimeout(end); };
  }, [active, meta, options]);
  return { meta, options, plan: active ? sampleJsonPlan(options, passed) : null, checking, setOptions, setMeta };
}
export type JsonPlanState = ReturnType<typeof useJsonPlan>;
