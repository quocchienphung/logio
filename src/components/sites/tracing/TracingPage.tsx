"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronsDownUp, ChevronsUpDown, Plug, Workflow } from "lucide-react";
import type { SnapshotSource } from "@/lib/workspace-backend";
import { Combobox } from "../affectui-combobox/Combobox";
import { useWorkspaceRoute } from "../affectui-crm/workspace-state";
import { Mark, markNames } from "../affectui-agent-tree/tree-marks";
import { TraceWaterfall } from "../affectui-trace-waterfall/TraceWaterfall";
import { flattenSpans, formatDuration, runStatus, spanEnd } from "../affectui-trace-waterfall/trace-model";
import type { TraceSpan } from "../affectui-trace-waterfall/trace-model";
import { configuredEngine, handleNow, simulatedHandle } from "../process/engine";
import type { ProcessEngine, RunHandle } from "../process/engine";
import { costFormatter, createLibrary, createSampleProcess } from "../process/process-model";
import type { ProcessDoc, ProcessLibrary } from "../process/process-model";
import { emptyRunStore, isActive } from "../process/run-model";
import type { RunStore } from "../process/run-model";
import { buildProcessTrace } from "../process/trace-build";
import { createLocalProcessSource, createLocalRunSource } from "../process/local-sources";
import { performanceOf } from "./performance";
import { useFastClock, peekClock } from "./use-fast-clock";
import { SectionSkeleton } from "../shimmer-loader/SectionSkeleton";
import "./tracing.css";

export interface TracingProps {
  workspaceId: string;
  dataSource?: SnapshotSource<ProcessLibrary>;
  runSource?: SnapshotSource<RunStore>;
  engine?: ProcessEngine;
  remote?: boolean;
}

interface Loaded { library: ProcessLibrary; store: RunStore }
const POLL_MS = 1500;
const stateOf = { running: { label: "Live", status: "running" }, waiting: { label: "Needs you", status: "waiting" }, done: { label: "Done", status: "done" }, failed: { label: "Failed", status: "failed" }, stopped: { label: "Stopped", status: "stopped" } } as const;

/**
 * The Tracing page: the run of a process, as it happens, on the Trace Waterfall. The Process page decides and starts; this page only
 * watches. It reads the same plans and the same run (the simulated engine's saved run, or a connected engine's newest one) and keeps
 * reading while the run is active, so a run started on the Process page (even in another tab) shows up here as it goes.
 */
export function Tracing({ workspaceId, dataSource, runSource, engine: suppliedEngine, remote = false }: TracingProps) {
  const source = useMemo(() => dataSource ?? createLocalProcessSource(`affectui:${workspaceId}:process`), [dataSource, workspaceId]);
  const runs = useMemo(() => runSource ?? createLocalRunSource(`affectui:${workspaceId}:process-run`), [runSource, workspaceId]);
  const engine = useMemo(() => suppliedEngine ?? configuredEngine(), [suppliedEngine]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastJson = useRef("");

  // Read the plans and the run now and every moment after: cheap, and it is what makes the page live
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    async function pull() {
      try {
        const [library, store] = await Promise.all([source.load(controller.signal), engine.kind === "simulated" ? runs.load(controller.signal).catch(() => null) : Promise.resolve(null)]);
        if (!alive) return;
        const base = library && library.processes.length ? library : createLibrary([createSampleProcess()]);
        const next: Loaded = { library: base, store: store ?? emptyRunStore() };
        const json = JSON.stringify(next);
        if (json !== lastJson.current) { lastJson.current = json; setLoaded(next); }
        setError(null);
      } catch (failure) { if (alive && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the run."); }
    }
    void pull();
    const timer = setInterval(() => void pull(), POLL_MS);
    const unsubscribe = source.subscribe?.(() => void pull());
    return () => { alive = false; controller.abort(); clearInterval(timer); unsubscribe?.(); };
  }, [source, runs, engine, attempt]);

  if (error && !loaded) return <div className="workspace-page trc trc--center" role="alert"><p>{error}</p><button type="button" className="trc__button" onClick={() => { setError(null); setAttempt(value => value + 1); }}>Retry</button></div>;
  if (!loaded) return <SectionSkeleton section="Tracing" label="Loading the trace…" />;
  return <TracingView key={workspaceId} workspaceId={workspaceId} loaded={loaded} engine={engine} remote={remote} />;
}

function TracingView({ workspaceId, loaded, engine, remote }: { workspaceId: string; loaded: Loaded; engine: ProcessEngine; remote: boolean }) {
  const { navigate } = useWorkspaceRoute();
  const { library, store } = loaded;
  const [picked, setPicked] = useState<string | null>(null);
  const doc: ProcessDoc = library.processes.find(item => item.id === picked) ?? library.processes.find(item => item.id === library.activeId) ?? library.processes[0];
  const simulated = engine.kind === "simulated";
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  // A connected engine's newest run of this process, polled while it is active
  const [served, setServed] = useState<{ docId: string; handle: RunHandle | null } | null>(null);
  const servedHandle = served?.docId === doc.id ? served.handle : null;
  const handle: RunHandle | null = simulated ? simulatedHandle(store.runs[doc.id]) : servedHandle;
  const clockActive = (() => { if (!handle) return false; try { return isActive(engine.read(handle, handleNow(handle, peekClock()))); } catch { return false; } })();
  const clock = useFastClock(clockActive);
  useEffect(() => {
    if (simulated || !engine.latest) return;
    const controller = new AbortController();
    const pull = () => engine.latest!(workspaceId, doc.id, controller.signal).then(found => { if (!controller.signal.aborted) setServed(current => current?.docId === doc.id && found && current.handle?.kind === "remote" && found.kind === "remote" && current.handle.version && current.handle.version === found.version ? current : { docId: doc.id, handle: found }); }).catch(() => {});
    void pull();
    const timer = setInterval(() => void pull(), 2000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [engine, simulated, workspaceId, doc.id]);

  const snapshot = (() => { if (!handle) return null; try { return engine.read(handle, handleNow(handle, clock)); } catch { return null; } })();
  const absoluteNow = handle ? handleNow(handle, clock) : clock;
  const trace = useMemo(() => snapshot ? buildProcessTrace(doc, snapshot, snapshot.at, { simulated }) : null, [doc, snapshot, simulated]);
  const now = snapshot ? Math.max(0, snapshot.at - snapshot.startedAt) : 0;
  void absoluteNow;
  const format = costFormatter(doc.unit);
  const performance = trace ? performanceOf(trace, now) : null;
  const spans = trace ? flattenSpans(trace) : [];
  const finishedBranches = spans.filter(span => (span.kind === "subagent" || span.kind === "agent") && span.status === "done" && (span.children?.length ?? 0) > 0 && span.id !== trace?.id).map(span => span.id);

  const processOptions = library.processes.map(item => ({ value: item.id, label: item.name }));
  const totalCost = spans.reduce((sum, span) => sum + (span.cost ?? 0), 0);
  const perMinute = performance && performance.duration > 0 ? totalCost / (performance.duration / 60_000) : 0;

  return <div className="workspace-page trc">
    <header className="workspace-page-head">
      <div><h1>Tracing</h1><p>Where the time and money of a run go, as it happens. Start and decide on the Process page; this page watches.</p></div>
      <div className="trc__actions">
        {processOptions.length > 1 && <Combobox label="Process" options={processOptions} value={doc.id} searchable={false} onChange={value => { setPicked(value); setCollapsed([]); setOpenId(null); }} />}
        <span className="trc__chip" data-kind={simulated ? "simulated" : "connected"} title={simulated ? "Nothing is sent to a model; the calls inside a block are demo values." : "A server runs the tasks and reports them."}><Plug size={13} />{simulated ? "Simulated" : remote ? "Connected (server)" : "Connected"}</span>
        <button type="button" className="trc__button" onClick={() => navigate("Process")}><Workflow size={14} />Open in Process<ArrowUpRight size={13} /></button>
      </div>
    </header>

    {!trace || !snapshot || !performance
      ? <section className="trc__empty" aria-label="No run yet">
        <div className="trc__empty-art" aria-hidden="true"><span /><span /><span /><span /></div>
        <h2>No run of “{doc.name}” yet</h2>
        <p>Open the Process page and press <strong>Run</strong>. The run shows up here the moment it starts, bar by bar.</p>
        <button type="button" className="trc__button trc__button--dark" onClick={() => navigate("Process")}><Workflow size={14} />Open the Process page</button>
      </section>
      : <>
        {snapshot.state === "waiting" && <div className="trc__callout" role="status"><strong>A block is waiting for you.</strong> The run holds until you decide on the Process page.<button type="button" className="trc__button trc__button--small" onClick={() => navigate("Process")}>Decide</button></div>}
        <div className="trc__tools">
          <span className="trc__caption">{simulated ? "Simulated run: block times, costs and statuses come from the plan; the calls inside a block are derived from its model and tools." : "Spans are what the connected engine reported."}</span>
          <span className="trc__tools-buttons">
            <button type="button" className="trc__button trc__button--small" disabled={!finishedBranches.length} onClick={() => setCollapsed(finishedBranches)}><ChevronsDownUp size={13} />Fold finished</button>
            <button type="button" className="trc__button trc__button--small" disabled={!collapsed.length} onClick={() => setCollapsed([])}><ChevronsUpDown size={13} />Expand all</button>
          </span>
        </div>
        <TraceWaterfall root={trace} now={now} collapsed={collapsed} onCollapsedChange={setCollapsed} openId={openId} onOpenChange={id => setOpenId(id)} formatCost={format} title="Trace" subtitle={doc.goal || doc.name} state={stateOf[snapshot.state]} />

        <section className="trc__metrics" aria-label="Performance">
          <Metric label="Parallelism" value={`${performance.parallelism.toFixed(1)}×`} hint="How many blocks worked at once, on average" />
          <Metric label="Waiting on people" value={formatDuration(performance.waiting.ms)} hint={`${performance.waiting.count} approval${performance.waiting.count === 1 ? "" : "s"}`} warn={performance.waiting.ms > 0} />
          <Metric label="Rounds" value={String(performance.rounds)} hint={performance.rounds > 1 ? "The first block ran again (a loop)" : "No loop ran the plan again"} />
          <Metric label="Cost per minute" value={doc.unit === "none" ? "–" : format(perMinute)} hint={doc.unit === "none" ? "This process counts no costs" : "At the pace of this run"} />
        </section>

        <div className="trc__grid">
          <section className="trc__card" aria-label="Where the time went">
            <h2>Where the time went</h2>
            <p className="trc__sub">Time a block spent itself (its calls and waits), not counting the blocks under it. Click a row to open it.</p>
            <ul className="trc__bars">
              {performance.blocks.filter(block => block.own > 0).slice(0, 7).map(block => <li key={block.id}>
                <button type="button" onClick={() => setOpenId(block.id)} aria-label={`Open ${block.name}: ${formatDuration(block.own)}, ${Math.round(block.share * 100)} percent`}>
                  <span className="trc__bar-name">{block.mark ? <span className="trc__mark"><Mark id={block.mark} /></span> : <span className="trc__mark trc__mark--person">ME</span>}{block.name}</span>
                  <span className="trc__bar-track"><span style={{ width: `${Math.max(2, block.share * 100)}%` }} /></span>
                  <span className="trc__bar-value">{formatDuration(block.own)}</span>
                </button>
              </li>)}
            </ul>
          </section>
          <section className="trc__card" aria-label="Critical path">
            <h2>Critical path</h2>
            <p className="trc__sub">The chain of blocks that decided when the run ended. Speed these up to make the run shorter.</p>
            <ol className="trc__path">
              {performance.critical.map((step, index) => <li key={step.id}><button type="button" onClick={() => setOpenId(step.id)}><span className="trc__step">{index + 1}</span><span className="trc__path-name">{step.name}</span><span className="trc__bar-value">{formatDuration(step.ms)}</span></button></li>)}
            </ol>
          </section>
          <section className="trc__card" aria-label="By AI engine">
            <h2>By AI engine</h2>
            <p className="trc__sub">Which engines did the work, and what it cost.</p>
            <table className="trc__table">
              <thead><tr><th scope="col">Engine</th><th scope="col">Time</th><th scope="col">Cost</th><th scope="col">Calls</th></tr></thead>
              <tbody>
                {performance.engines.map(engineRow => <tr key={engineRow.mark ?? "person"}>
                  <th scope="row"><span className="trc__bar-name">{engineRow.mark ? <span className="trc__mark"><Mark id={engineRow.mark} /></span> : <span className="trc__mark trc__mark--person">ME</span>}{engineRow.mark ? markNames[engineRow.mark] : "A person"}{engineRow.blocks > 1 && <small> ×{engineRow.blocks}</small>}</span></th>
                  <td>{formatDuration(engineRow.own)}</td><td>{doc.unit === "none" ? "–" : format(engineRow.cost)}</td><td>{engineRow.calls}</td>
                </tr>)}
              </tbody>
            </table>
          </section>
        </div>
        <span className="trc__sr" role="status">{runStatus(trace) === "running" ? "The run is live" : `The run is ${snapshot.state}`}. {spans.length} spans, longest {formatDuration(Math.max(...spans.map(span => spanEnd(span, now) - span.start)))}.</span>
      </>}
  </div>;
}

function Metric({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return <div className="trc__metric" data-warn={warn ? "" : undefined}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

export type { TraceSpan };
