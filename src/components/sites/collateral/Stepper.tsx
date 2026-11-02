"use client";

import { useWorkspaceI18n } from "@/components/sites/i18n/WorkspaceI18n";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface StepSpec<K extends string> { id: K; label: string; badge?: ReactNode }
/** Step tabs with the Usage page's sliding pill. Only steps that are available can be reached; arrow keys skip the others. */
export function Stepper<K extends string>({ steps, current, onChange, available, group }: { steps: StepSpec<K>[]; current: K; onChange: (id: K) => void; available: (id: K) => boolean; group: string }) {
  const { t: uiText } = useWorkspaceI18n();
  return <div className="ui-as-toolbar ui-sb__bar"><div className="ui-as-tabs" role="tablist" aria-label={uiText("Steps")} onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = steps.map(step => step.id).filter(available);
    const at = enabled.indexOf(current);
    const next = enabled[event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : (at + (event.key === "ArrowRight" ? 1 : enabled.length - 1)) % enabled.length];
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-step="${next}"]`)?.focus();
  }}>{steps.map((step, index) => <button type="button" key={step.id} id={`${group}-tab-${step.id}`} data-step={step.id} role="tab" className="ui-as-tabs__tab" aria-selected={current === step.id} aria-controls={`${group}-panel`} aria-disabled={!available(step.id) || undefined} tabIndex={current === step.id ? 0 : -1} onClick={() => available(step.id) && onChange(step.id)}>
    {current === step.id && <motion.span className="settings-tab-pill" layoutId={`${group}-tab`} transition={{ type: "spring", stiffness: 450, damping: 38 }} />}
    <span className="cr-step-num" aria-hidden="true">{index + 1}</span><span>{uiText(step.label)}</span>{step.badge}
  </button>)}</div></div>;
}
