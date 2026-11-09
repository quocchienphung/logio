"use client";

import { useMemo } from "react";
import { useWorkspaceI18n } from "@/components/sites/i18n/WorkspaceI18n";
import { JsonViewer } from "../../../json-viewer/JsonViewer";
import type { CollateralSimulation } from "../../useCollateralSimulation";
import type { JsonPlan } from "../../simulation/types";
import { memorySource } from "../../../json-viewer/json-model";
import { SAMPLE_DOCUMENT } from "../../simulation/fixtures";

/** Expandable sample JSON tree; no workbook conversion. */
export function GroupedPreview({ plan, engine, notify }: { plan: JsonPlan; engine: CollateralSimulation; notify: (message: string) => void }) {
  const { t: uiText, locale } = useWorkspaceI18n();
  const n = (value: number) => new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(value);
  const r = plan.reconciliation;
  void engine;
  const epoch = plan.epoch ?? 0;
  // A new build of the document is a new source; the open branches and the search stay, being kept by the viewer.
  const source = useMemo(() => { void epoch; return memorySource(SAMPLE_DOCUMENT, "report"); }, [epoch]);
  return <section className="ui-sb-card cr-panel cr-preview" aria-labelledby="gp-title">
    <div className="cr-card-top"><h3 className="ui-sb-h2" id="gp-title">{uiText("Reporting JSON preview")}</h3><span className="ui-sb-pill" data-tone="amber">{uiText("Diagnostic · not the export")}</span></div>
    <p className="ui-sb-muted">{uiText("{0} branches · {1} customers · {2} assets · {3} rows", [n(r.branches), n(r.customers), n(r.assets), n(r.rowsInSheet)])}</p>
    <JsonViewer source={source} rootName="report" label={uiText("Reporting JSON")} defaultExpanded={["report", "report.CNTCTD"]} maxHeight={460} pageSize={50}
      onCopy={({ kind }) => notify(kind === "path" ? uiText("Path copied") : uiText("Value copied"))} />
  </section>;
}
