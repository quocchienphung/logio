"use client";

import { useMemo, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Timeline, type TimelineEvent } from "./ui/Timeline";
import { useNow } from "./ui/time";
import { lifecycleSteps, timelineEntries } from "./skill-insights";
import type { SkillEvent, SkillRecord } from "./skill-model";
import "./ui/ui.css";

/** The operation rows as a Timeline: what was imported, delivered or failed, with the numbers measured at the time. */
export function operationTimeline(events: readonly SkillEvent[], skills: readonly SkillRecord[], keep?: (event: SkillEvent) => boolean): TimelineEvent[] {
  return timelineEntries(events, skills, keep).map(({ rows, ...entry }) => ({ ...entry, detail: <dl>{rows.map(([term, value]) => <div key={term} style={{ display: "contents" }}><dt>{term}</dt><dd>{value}</dd></div>)}</dl> }));
}

export function SkillTimeline({ skills, events }: { skills: readonly SkillRecord[]; events: readonly SkillEvent[] }) {
  const now = useNow();
  const entries = useMemo(() => operationTimeline(events, skills), [events, skills]);
  const steps = lifecycleSteps(skills, events);
  const next = steps.findIndex(step => !step.done);
  const done = steps.filter(step => step.done).length;
  const empty: ReactNode = <>Your timeline starts with the first skill you add or deliver.</>;
  return <section className="sk-card-panel" aria-label="Skill timeline">
    <header><h2>Timeline</h2><span>{entries.length ? `${entries.length} update${entries.length === 1 ? "" : "s"}` : "No updates yet"}</span></header>
    <div className="sk-card-panel__body">
      {done < steps.length && <ol className="sk-steps" aria-label={`Setup, ${done} of ${steps.length} done`}>{steps.map((step, index) => <li key={step.id} data-done={step.done || undefined} data-next={index === next || undefined}><span aria-hidden="true">{step.done ? <Check size={10} strokeWidth={2.6} /> : index + 1}</span>{step.label}</li>)}</ol>}
      <Timeline events={entries} now={now} label="Skill operations, newest first" maxHeight={420} empty={empty} />
    </div>
  </section>;
}
