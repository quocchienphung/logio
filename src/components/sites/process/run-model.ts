import type { AgentStatus } from "../affectui-agent-tree/tree-model.ts";
import { LIMITS, flattenNodes } from "./process-model.ts";
import type { CostUnit, ProcessNode, Provider } from "./process-model.ts";

/**
 * How a run looks at one moment, and the simulated engine that produces it. A real engine (a backend) reports a
 * `RunSnapshot` directly; the simulated one derives it as a pure function of the plan, the decisions made so far and
 * the clock: no timers advance state, so a page reload continues the same run and every rule can be tested with plain
 * numbers. Nothing here calls a model: durations and costs are labelled demo values (see `docs/research/process`).
 */
export type RunAction = { type: "approve" | "reject" | "retry" | "dismiss"; id: string } | { type: "stop" };
export interface RunEvent { t: number; action: RunAction }

/** An earlier try of a task that failed and was retried; shown as its own failed card. */
export interface Attempt { cost: number; started: number; ended: number; error: string }
export interface NodeRun {
  status: AgentStatus;
  /** The cost of the current try only; failed tries are in `attempts`. */
  cost: number;
  started?: number;
  ended?: number;
  ask?: string;
  error?: string;
  attempts?: Attempt[];
}
export type RunState = "running" | "waiting" | "done" | "failed" | "stopped";
export interface RunSnapshot { id: string; processId: string; startedAt: number; /** The moment this snapshot describes. */ at: number; state: RunState; nodes: Record<string, NodeRun> }

/** What the simulated engine keeps for a run: the plan as it was started and the decisions made since. */
export interface RunLog { id: string; processId: string; startedAt: number; unit: CostUnit; root: ProcessNode; events: RunEvent[] }

export const DELEGATE_MS = 700;
const MAX_RETRIES = 4;

function hash(text: string) {
  let value = 5381;
  for (let index = 0; index < text.length; index += 1) value = (value * 33 + text.charCodeAt(index)) >>> 0;
  return value;
}

/** How long the simulated task works on its own: the node's `sim.durationMs`, else a steady 4-9 s derived from its id. */
export const durationOf = (node: ProcessNode) => node.sim?.durationMs ?? 4000 + hash(node.id) % 5000;

/** Demo prices: a person is free, tokens and credits are flat rates, dollars are free on a local model. */
export function ratePerSecond(unit: CostUnit, provider: Provider): number {
  if (unit === "none" || provider === "human") return 0;
  if (unit === "tokens") return 40;
  if (unit === "credits") return 0.4;
  return provider === "ollama" ? 0 : 0.012;
}
/** The cost of the whole task when it runs to the end. */
export const totalCost = (node: ProcessNode, unit: CostUnit) => node.sim?.cost !== undefined && unit !== "none" && node.ai.provider !== "human" ? node.sim.cost : ratePerSecond(unit, node.ai.provider) * durationOf(node) / 1000;

const defaultAsk = (node: ProcessNode) => node.askText || `Run “${node.name}”? ${node.task}`.slice(0, LIMITS.askText);

interface Context { now: number; events: RunEvent[]; stopAt: number; unit: CostUnit; nodes: Record<string, NodeRun> }

function markSubtree(node: ProcessNode, ctx: Context, status: "queued" | "stopped") {
  for (const item of flattenNodes(node)) ctx.nodes[item.id] = status === "stopped" ? { status, cost: 0, ...(Number.isFinite(ctx.stopAt) ? { ended: ctx.stopAt } : {}) } : { status, cost: 0 };
}

/** Places one task (and what is under it) on the timeline. Returns when everything under it has ended, or Infinity if that is not known yet. */
function simulate(node: ProcessNode, readyAt: number, ctx: Context): number {
  const { now, events, stopAt } = ctx;
  if (Number.isFinite(stopAt) && readyAt >= stopAt) { markSubtree(node, ctx, "stopped"); return stopAt; }
  if (readyAt === Infinity) { markSubtree(node, ctx, "queued"); return Infinity; }

  let start = readyAt;
  if (node.approval) {
    const decision = events.find(event => event.t >= readyAt && event.action.type !== "stop" && event.action.id === node.id && (event.action.type === "approve" || event.action.type === "reject"));
    if (!decision) {
      if (readyAt > now) { markSubtree(node, ctx, "queued"); return Infinity; }
      if (Number.isFinite(stopAt)) {
        // Stopped while it was waiting for the decision.
        ctx.nodes[node.id] = { status: "stopped", cost: 0, started: readyAt, ended: stopAt };
        for (const child of node.children) markSubtree(child, ctx, "stopped");
        return stopAt;
      }
      ctx.nodes[node.id] = { status: "waiting", cost: 0, started: readyAt, ask: defaultAsk(node) };
      for (const child of node.children) markSubtree(child, ctx, "queued");
      return Infinity;
    }
    if (decision.action.type === "reject") {
      ctx.nodes[node.id] = { status: "stopped", cost: 0, started: readyAt, ended: decision.t, error: "Rejected by you" };
      for (const child of node.children) markSubtree(child, { ...ctx, stopAt: decision.t }, "stopped");
      return decision.t;
    }
    start = decision.t;
  }

  const dur = durationOf(node), total = totalCost(node, ctx.unit), perMs = dur > 0 ? total / dur : 0;
  const attempts: Attempt[] = [];
  let workStart = start, ownEnd = start + dur, failed = false, error = "";
  for (let attempt = 0; ; attempt += 1) {
    const limitMs = node.limit !== undefined && total > node.limit ? dur * node.limit / total : undefined;
    const onceMs = attempt === 0 && node.sim?.failOnce ? Math.round(dur * 0.6) : undefined;
    let fail: { ms: number; text: string } | undefined = onceMs !== undefined ? { ms: onceMs, text: "Simulated failure: the task could not finish." } : undefined;
    if (limitMs !== undefined && (!fail || limitMs < fail.ms)) fail = { ms: limitMs, text: `Cost limit reached (${node.limit}).` };
    if (!fail) { ownEnd = workStart + dur; failed = false; break; }
    const failAt = workStart + fail.ms;
    const retry = failAt <= now && failAt <= stopAt ? events.find(event => event.action.type === "retry" && event.action.id === node.id && event.t >= failAt) : undefined;
    if (retry && attempt < MAX_RETRIES) { attempts.push({ cost: perMs * fail.ms, started: workStart, ended: failAt, error: fail.text }); workStart = retry.t; continue; }
    ownEnd = failAt; failed = true; error = fail.text; break;
  }

  const stoppedHere = Number.isFinite(stopAt) && stopAt <= now && stopAt < ownEnd;
  if (stoppedHere) ownEnd = stopAt;
  const kidsAt = start + DELEGATE_MS;
  let childEnds: number[];
  if (node.mode === "sequence") {
    childEnds = [];
    let ready = kidsAt;
    for (const child of node.children) { const end = simulate(child, ready, ctx); childEnds.push(end); ready = end; }
  } else childEnds = node.children.map(child => simulate(child, kidsAt, ctx));
  const end = Math.max(ownEnd, ...childEnds);

  const dismissed = failed && now >= ownEnd && events.some(event => event.action.type === "dismiss" && event.action.id === node.id && event.t >= ownEnd);
  const cost = perMs * Math.max(0, Math.min(now, ownEnd) - workStart);
  const run: NodeRun = { status: "queued", cost, ...(attempts.length ? { attempts } : {}) };
  if (now < start) { run.status = "queued"; run.cost = 0; }
  else {
    run.started = workStart;
    if (stoppedHere) { run.status = "stopped"; run.ended = stopAt; }
    else if (failed && now >= ownEnd) { run.status = dismissed ? "stopped" : "failed"; run.ended = ownEnd; run.error = error; }
    else if (Number.isFinite(end) && now >= end) { run.status = "done"; run.ended = end; }
    else run.status = "running";
  }
  ctx.nodes[node.id] = run;
  return end;
}

/** The run as it is at `now`: the plan played forward with every decision made up to then. */
export function replay(log: RunLog, now: number): RunSnapshot {
  const events = log.events.filter(event => event.t <= now).sort((a, b) => a.t - b.t);
  const stopAt = events.find(event => event.action.type === "stop")?.t ?? Infinity;
  const ctx: Context = { now, events, stopAt, unit: log.unit, nodes: {} };
  const end = simulate(log.root, log.startedAt, ctx);
  const all = Object.values(ctx.nodes);
  const root = ctx.nodes[log.root.id];
  const state: RunState = all.some(node => node.status === "waiting") ? "waiting"
    : Number.isFinite(end) && now >= end ? (Number.isFinite(stopAt) ? "stopped" : root?.status === "failed" ? "failed" : "done")
    : "running";
  return { id: log.id, processId: log.processId, startedAt: log.startedAt, at: now, state, nodes: ctx.nodes };
}

/** A new run of a plan (or of one task and what is under it). */
export function startLog(root: ProcessNode, processId: string, unit: CostUnit, now: number, id = `run-${now.toString(36)}`): RunLog {
  return { id, processId, startedAt: now, unit, root: structuredClone(root), events: [] };
}

/** Whether the run still needs the clock: something is running or waiting for you. */
export const isActive = (snapshot: RunSnapshot) => snapshot.state === "running" || snapshot.state === "waiting";

/** Records a person's decision if it makes sense at that moment (approve a waiting task, retry a failed one, stop an active run). */
export function applyAction(log: RunLog, action: RunAction, now: number): RunLog | null {
  const snapshot = replay(log, now);
  const node = action.type === "stop" ? undefined : snapshot.nodes[action.id];
  const valid = action.type === "stop" ? isActive(snapshot)
    : action.type === "approve" || action.type === "reject" ? node?.status === "waiting"
    : node?.status === "failed";
  if (!valid) return null;
  const last = log.events.at(-1)?.t ?? log.startedAt;
  return { ...log, events: [...log.events, { t: Math.max(now, last), action }] };
}

/* ---------- validating a snapshot that comes from somewhere else (a backend) ---------- */
const statuses: readonly AgentStatus[] = ["idle", "queued", "running", "waiting", "done", "failed", "stopped"];
const states: readonly RunState[] = ["running", "waiting", "done", "failed", "stopped"];
const num = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const optNum = (value: unknown) => value === undefined || num(value);
const optText = (value: unknown) => value === undefined || (typeof value === "string" && value.length <= 2000);

export function isRunSnapshot(raw: unknown): raw is RunSnapshot {
  if (!raw || typeof raw !== "object") return false;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.processId !== "string" || !num(value.startedAt) || !num(value.at) || !states.includes(value.state as RunState)) return false;
  if (!value.nodes || typeof value.nodes !== "object" || Array.isArray(value.nodes)) return false;
  const entries = Object.entries(value.nodes as Record<string, unknown>);
  if (entries.length > LIMITS.nodes) return false;
  return entries.every(([, item]) => {
    if (!item || typeof item !== "object") return false;
    const node = item as Record<string, unknown>;
    if (!statuses.includes(node.status as AgentStatus) || !num(node.cost) || !optNum(node.started) || !optNum(node.ended) || !optText(node.ask) || !optText(node.error)) return false;
    return node.attempts === undefined || (Array.isArray(node.attempts) && node.attempts.length <= 20 && node.attempts.every(attempt => !!attempt && typeof attempt === "object" && num((attempt as Attempt).cost) && num((attempt as Attempt).started) && num((attempt as Attempt).ended) && typeof (attempt as Attempt).error === "string"));
  });
}

/** A saved simulated run, or null when it is not one. */
export function isRunLog(raw: unknown): raw is RunLog {
  if (!raw || typeof raw !== "object") return false;
  const value = raw as Record<string, unknown>;
  return typeof value.id === "string" && typeof value.processId === "string" && num(value.startedAt) && ["usd", "credits", "tokens", "none"].includes(value.unit as string)
    && !!value.root && typeof value.root === "object" && Array.isArray(value.events) && value.events.length <= 500
    && value.events.every(event => !!event && typeof event === "object" && num((event as RunEvent).t) && !!(event as RunEvent).action && typeof (event as RunEvent).action === "object" && ["approve", "reject", "retry", "dismiss", "stop"].includes((event as RunEvent).action.type));
}

/** What the simulated engine saves: the newest run of each process. */
export interface RunStore { version: 1; runs: Record<string, RunLog> }
export const emptyRunStore = (): RunStore => ({ version: 1, runs: {} });

/** A saved run store. Runs that are not valid are dropped (a stale or edited copy must not break the page); null when it is not a store at all. */
export function normalizeRunStore(raw: unknown): RunStore | null {
  if (!raw || typeof raw !== "object" || (raw as RunStore).version !== 1 || !(raw as RunStore).runs || typeof (raw as RunStore).runs !== "object") return null;
  const runs: Record<string, RunLog> = {};
  for (const [id, log] of Object.entries((raw as RunStore).runs).slice(0, 50)) if (isRunLog(log) && log.processId === id) runs[id] = log;
  return { version: 1, runs };
}
