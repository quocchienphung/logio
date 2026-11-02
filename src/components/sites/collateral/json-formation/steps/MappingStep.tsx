"use client";

import { useWorkspaceI18n } from "@/components/sites/i18n/WorkspaceI18n";
import { Combobox } from "../../../affectui-combobox/Combobox";
import { MAU9_PROFILE } from "../../excel-formation/engine/mapping-profiles";
import { columnLetters } from "../../excel-formation/engine/text";
import type { CollateralEngine } from "../../useCollateralEngine";

/** The mapping the engine used, column by column. Only exact header matches were mapped; a header that appears twice is left for the reviewer. */
export function MappingStep({ engine }: { engine: CollateralEngine }) {
  const { t: uiText } = useWorkspaceI18n();
  const profile = engine.result!.profile, mapping = profile.mapping;
  if (!mapping) return <p className="ui-sb-card cr-blockers" role="alert">{uiText("No worksheet matches the mapping profile, so no mapping can be shown.")}</p>;
  const resolved = new Map(mapping.resolved.map(item => [item.spec.header, item.col]));
  const ambiguous = new Map(mapping.ambiguous.map(item => [item.spec.header, item.cols]));
  const missing = new Set(mapping.missing.map(spec => spec.header));
  return <div className="cr-mapping">
    <p className="ui-sb-muted">{MAU9_PROFILE.title} · v{MAU9_PROFILE.version}</p>
    <div className="ui-sb-table-wrap" tabIndex={0} role="region" aria-label={uiText("Column mapping")}><table className="ui-sb-table cr-map-table"><thead><tr><th scope="col">{uiText("Excel column")}</th><th scope="col">{uiText("Header")}</th><th scope="col">{uiText("Meaning")}</th><th scope="col">{uiText("JSON field")}</th><th scope="col">{uiText("Status")}</th></tr></thead>
      <tbody>{MAU9_PROFILE.columns.map(spec => {
        const col = resolved.get(spec.header), choices = ambiguous.get(spec.header);
        const state = choices ? "ambiguous" : missing.has(spec.header) ? "missing" : spec.json ? "mapped" : "unused";
        return <tr key={spec.header} data-state={state}>
          <td className="ui-sb-mono">{col !== undefined ? columnLetters(col) : "—"}</td><td>{spec.header}{spec.required && <abbr title={uiText("Required")} className="cr-req">*</abbr>}</td><td className="ui-sb-muted">{spec.field}</td>
          <td className="ui-sb-mono">{spec.json ?? <span className="ui-sb-muted">{uiText("not used in the JSON")}</span>}</td>
          <td>{choices ? <div className="cr-choose"><Combobox size="sm" aria-label={uiText("Choose the {0} column", [spec.header])} placeholder={uiText("Choose…")} options={choices.map(choice => ({ value: String(choice), label: columnLetters(choice), localize: false }))} onChange={value => engine.rescan(engine.diacriticPolicy, { [spec.header]: Number(value) })} searchable={false} /></div>
            : <span className="ui-sb-pill" data-tone={state === "mapped" ? "green" : state === "missing" ? (spec.required ? "red" : "amber") : undefined}>{uiText(state === "mapped" ? "Mapped" : state === "missing" ? "Missing" : "Kept, not exported")}</span>}</td>
        </tr>;
      })}</tbody></table></div>
    {mapping.unknown.length > 0 && <section className="ui-sb-section"><div className="ui-sb-section__head"><h3 className="ui-sb-h2">{uiText("Columns the profile does not know")}</h3></div><p className="ui-sb-muted">{mapping.unknown.map(header => `${header.letter} ${header.text}`).join(" · ")}</p></section>}
    <section className="ui-sb-section"><div className="ui-sb-section__head"><h3 className="ui-sb-h2">{uiText("Open decisions")}</h3></div>
      <ul className="cr-rules"><li>{uiText("TS005 first row · TS006 sum of rows")}</li><li>{uiText("TS009 order: first seen")}</li><li>{uiText("Report date and contacts: entered at export")}</li></ul></section>
  </div>;
}
