"use client";

import { useState } from "react";
import { Segmented } from "./terrain/Segmented";
import { MetricCard } from "./ui/MetricCard";
import { useNow } from "./ui/time";
import { bucketSeries, changeLabel, cumulativeSeries, isDelivery, periodCounts, periods, sizeParts, type Period } from "./skill-insights";
import { totalSkillBytes, type SkillEvent, type SkillRecord } from "./skill-model";
import "./ui/ui.css";

const options = periods.map(({ value, label }) => ({ value, label }));
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Four measured numbers for the library, with a trend over 7, 30 or 90 days. Nothing here is estimated: counts come from saved skills and recorded operations. */
export function SkillOverview({ skills, events }: { skills: readonly SkillRecord[]; events: readonly SkillEvent[] }) {
  const now = useNow();
  const [period, setPeriod] = useState<Period>("7d");
  const spec = periods.find(item => item.value === period) ?? periods[0];
  const ready = skills.filter(skill => skill.status === "ready");
  const added = skills.map(skill => Date.parse(skill.importedAt));
  const deliveries = events.filter(isDelivery).map(event => event.t);
  const addedCounts = periodCounts(added, now, spec.days), deliveredCounts = periodCounts(deliveries, now, spec.days);
  const size = sizeParts(ready.reduce((sum, skill) => sum + totalSkillBytes(skill), 0));
  const files = ready.reduce((sum, skill) => sum + 1 + (skill.files?.length ?? 0), 0);
  const last = deliveries.length ? Math.max(...deliveries) : null;
  const compared = `vs previous ${spec.days} days`;
  return <section className="sk-ov" aria-label="Library overview">
    <div className="sk-ov__bar"><span>Library overview</span><Segmented label="Period" value={period} options={options} onChange={setPeriod} /></div>
    <div className="sk-ov__grid">
      <MetricCard label="Ready skills" value={ready.length} context={skills.length - ready.length ? `${skills.length - ready.length} archived` : "In your library"} series={cumulativeSeries(ready.map(skill => Date.parse(skill.importedAt)), now, spec.days, spec.buckets)} />
      <MetricCard label="Skills added" value={addedCounts.current} change={changeLabel(addedCounts)} context={compared} series={bucketSeries(added, now, spec.days, spec.buckets)} />
      <MetricCard label="Deliveries" value={deliveredCounts.current} change={changeLabel(deliveredCounts)} context={last === null ? "Nothing delivered yet" : compared} series={bucketSeries(deliveries, now, spec.days, spec.buckets)} />
      <MetricCard label="Instruction data" value={size.value} decimals={size.decimals} suffix={size.suffix} context={`${plural(files, "file")} in ${plural(ready.length, "skill")}`} />
    </div>
  </section>;
}
