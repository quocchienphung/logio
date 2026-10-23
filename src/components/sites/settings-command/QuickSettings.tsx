"use client";

import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Segmented, SelectField, Switch } from "./Controls";
import { rowOf, type SettingKey, type SettingsValues } from "./settings-model";
import "./settings-command.css";

/** The few settings the small account pop-up keeps: how the app looks, and what reaches you. The rest is on the Settings page. */
const groups: { title: string; keys: SettingKey[] }[] = [
  { title: "Appearance", keys: ["theme", "density"] },
  { title: "Notifications", keys: ["mentions", "assigned", "weeklyDigest", "emailCadence"] },
];

/**
 * The compact version of the Settings page, shown in the account menu's pop-up. It edits the same values through the same controls; a
 * person who needs more opens the full page with "All settings".
 */
export function QuickSettings({ values, onSave, onOpenAll }: { values: SettingsValues; onSave: (values: SettingsValues) => void; onOpenAll: () => void }) {
  const [draft, setDraft] = useState(values);
  const scope = useId();
  const changed = (Object.keys(draft) as SettingKey[]).some(key => draft[key] !== values[key]);
  function update<K extends SettingKey>(key: K, value: SettingsValues[K]) { setDraft(previous => ({ ...previous, [key]: value })); }
  return <form className="sc sc-tokens sc-quick" onSubmit={event => { event.preventDefault(); onSave(draft); }}>
    {groups.map(group => <section key={group.title} className="sc-quick__group" aria-labelledby={`${scope}-${group.title}`}>
      <h3 id={`${scope}-${group.title}`}>{group.title}</h3>
      {group.keys.map(key => {
        const row = rowOf(key);
        const id = `${scope}-${row.id}`;
        return <div className="sc-quick__row" key={key} data-kind={row.kind}>
          <div className="sc-quick__text"><label id={`${id}-label`} htmlFor={row.kind === "segmented" ? undefined : id}>{row.label}</label><p id={`${id}-hint`}>{row.hint}</p></div>
          <div className="sc-quick__control">
            {row.kind === "segmented" ? <Segmented label={row.label} value={String(draft[key])} options={row.options!} onChange={value => update(key, value as never)} />
              : row.kind === "select" ? <SelectField id={id} label={row.label} value={String(draft[key])} options={row.options!} onChange={value => update(key, value as never)} size="popup" />
                : <Switch id={id} checked={Boolean(draft[key])} onChange={checked => update(key, checked as never)} labelledBy={`${id}-label`} describedBy={`${id}-hint`} />}
          </div>
        </div>;
      })}
    </section>)}
    <div className="sc-quick__foot">
      <button type="button" className="sc-btn sc-btn--ghost" onClick={onOpenAll}>All settings<ArrowRight size={14} aria-hidden="true" /></button>
      <button type="submit" className="sc-btn sc-btn--primary" disabled={!changed}>Save</button>
    </div>
  </form>;
}
