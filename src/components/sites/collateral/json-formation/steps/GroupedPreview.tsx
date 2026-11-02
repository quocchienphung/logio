"use client";

import { useWorkspaceI18n } from "@/components/sites/i18n/WorkspaceI18n";
import type { JsonPlan } from "../engine/json-session";

/** A small sample of the grouped result: branch > customer > asset. It is a diagnostic view, never the export. */
export function GroupedPreview({ plan }: { plan: JsonPlan }) {
  const { t: uiText, locale } = useWorkspaceI18n();
  const n = (value: number) => new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(value);
  const r = plan.reconciliation;
  return <section className="ui-sb-card cr-panel cr-preview" aria-labelledby="gp-title">
    <div className="cr-card-top"><h3 className="ui-sb-h2" id="gp-title">{uiText("Grouped preview")}</h3><span className="ui-sb-pill" data-tone="amber">{uiText("Diagnostic · not the export")}</span></div>
    <p className="ui-sb-muted">{uiText("{0} branches · {1} customers · {2} assets · {3} rows", [n(r.branches), n(r.customers), n(r.assets), n(r.rowsInSheet)])}</p>
    <ul className="cr-tree" role="tree" aria-label={uiText("Grouped preview")}>
      {plan.preview.map(branch => <li key={branch.TTC01} role="treeitem" aria-expanded="true" aria-selected="false"><div className="cr-tree__node"><b>{branch.TTC01}</b> <span>{branch.TTC02}</span><small>{uiText("{0} customers", [n(branch.customerCount)])}</small></div>
        <ul role="group">{branch.customers.map(customer => <li key={customer.TTC03} role="treeitem" aria-expanded="true" aria-selected="false"><div className="cr-tree__node"><b>{customer.TTC03}</b> <span>{customer.TTC04}</span><small>{uiText("{0} assets", [n(customer.assetCount)])}</small></div>
          <ul role="group">{customer.assets.map(asset => <li key={asset.TS001} role="treeitem" aria-selected="false"><div className="cr-tree__node cr-tree__leaf"><b>{asset.TS001}</b> <span>{asset.TS013 || <i>{uiText("(empty)")}</i>}</span><small>{uiText("{0} contracts · {1} owners", [asset.TS009.length, asset.owners])}</small></div></li>)}</ul></li>)}</ul></li>)}
    </ul>
  </section>;
}
