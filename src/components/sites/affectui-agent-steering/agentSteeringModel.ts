/*
 * Agent Steering run model: a deterministic, time-explicit reducer for the interactive simulation of
 * affectUI's Agent Steering demo (https://www.affectui.com/components/agent-steering, captured
 * 2026-10-19). No agent runs: steps advance on fixed durations. Every action carries `now` (ms) so
 * the model is pure and testable; the React hook schedules the timers.
 *
 * Kept free of imports so `node --experimental-strip-types --test` can load it directly.
 */

export type StepStatus = "pending" | "active" | "done";
export type RunStatus = "running" | "paused" | "done";

export interface Note {
  id: string;
  text: string;
  /** How the agent took the note: at the next step, or by interrupting the active one. */
  picked?: "next" | "now";
}

export interface Step {
  id: string;
  title: string;
  status: StepStatus;
  /** Measured run time of a finished step (ms). */
  duration?: number;
  notes: Note[];
}

export interface ActiveStep {
  index: number;
  startedAt: number;
  /** Time spent paused since the step started (ms). */
  paused: number;
}

export interface RunState {
  steps: Step[];
  queue: Note[];
  status: RunStatus;
  draft: string;
  nextId: number;
  runStartedAt: number;
  /** Time the run spent paused (ms). */
  paused: number;
  pausedAt: number | null;
  doneAt: number | null;
  active: ActiveStep | null;
}

export type RunAction =
  | { type: "reset"; now: number }
  | { type: "activate"; index: number; now: number }
  | { type: "complete"; now: number }
  | { type: "queue"; text: string }
  | { type: "interrupt"; text: string; id?: string; now: number }
  | { type: "remove"; id: string }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "draft"; text: string };

export const PLAN: readonly { id: string; title: string }[] = [
  { id: "read", title: "Read schema and 14 migrations" },
  { id: "draft", title: "Plan the split into accounts and profiles" },
  { id: "write", title: "Write migration 0042_split_users" },
  { id: "dry", title: "Dry run on staging" },
  { id: "pr", title: "Open a pull request for review" },
];
/** Simulated run time of each step (ms), as in the reference demo. */
export const DURATIONS: Readonly<Record<string, number>> = { read: 1400, draft: 4600, write: 5200, dry: 2600, pr: 1800 };
/** A step the agent re-plans when it takes notes in. */
export const RETITLE: Readonly<Record<string, string>> = { write: "Write migration 0042 for Postgres 16" };
export const NOTE_POSTGRES = "Use Postgres 16 syntax – prod isn't on 17 yet";
export const NOTE_KEEP_VIEW = "Keep the old users view for a week";
/** The demo joins a run that has been going for 2m 06s. */
export const RUN_AGE = 126_000;

export function initialRun(now: number): RunState {
  return {
    steps: PLAN.map((s, i) => ({ id: s.id, title: s.title, status: i === 0 ? "done" : "pending", duration: i === 0 ? DURATIONS.read : undefined, notes: [] })),
    queue: [],
    status: "running",
    draft: "",
    nextId: 1,
    runStartedAt: now - RUN_AGE,
    paused: 0,
    pausedAt: null,
    doneAt: null,
    active: null,
  };
}

const activate = (state: RunState, index: number, now: number): RunState => {
  if (index >= state.steps.length) return { ...state, status: "done", active: null, doneAt: now };
  return {
    ...state,
    active: { index, startedAt: now, paused: 0 },
    steps: state.steps.map((s, i) => (i === index ? { ...s, status: "active" } : s)),
  };
};

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "reset":
      return initialRun(action.now);
    case "activate":
      if (state.status === "done" || state.active) return state;
      return activate(state, action.index, action.now);
    case "complete": {
      const a = state.active;
      if (!a || state.status !== "running") return state;
      const queue = state.queue;
      const steps = state.steps.map((s, i) => {
        if (i === a.index) return { ...s, status: "done" as const, duration: Math.max(0, action.now - a.startedAt - a.paused) };
        // queued notes become part of the next step, which may re-plan its title
        if (i === a.index + 1 && queue.length) return { ...s, title: RETITLE[s.id] ?? s.title, notes: [...s.notes, ...queue.map((n) => ({ ...n, picked: "next" as const }))] };
        return s;
      });
      return activate({ ...state, steps, queue: [], active: null }, a.index + 1, action.now);
    }
    case "queue": {
      const text = action.text.trim();
      if (!text || state.status === "done") return state;
      return { ...state, queue: [...state.queue, { id: `n${state.nextId}`, text }], nextId: state.nextId + 1 };
    }
    case "interrupt": {
      const text = action.text.trim();
      if (!text || state.status === "done") return state;
      const a = state.active;
      if (!a) return runReducer(state, { type: "queue", text });
      // a queued note keeps its id when applied now, so it can glide from the queue to its step
      const fromQueue = action.id !== undefined && state.queue.some((n) => n.id === action.id);
      const id = fromQueue ? (action.id as string) : `n${state.nextId}`;
      return {
        ...state,
        queue: fromQueue ? state.queue.filter((n) => n.id !== id) : state.queue,
        nextId: fromQueue ? state.nextId : state.nextId + 1,
        steps: state.steps.map((s, i) => (i === a.index ? { ...s, notes: [...s.notes, { id, text, picked: "now" as const }] } : s)),
        // the active step restarts with the new instruction
        active: { index: a.index, startedAt: action.now, paused: 0 },
        status: state.status === "paused" ? "paused" : "running",
        pausedAt: state.status === "paused" ? action.now : state.pausedAt,
      };
    }
    case "remove":
      return { ...state, queue: state.queue.filter((n) => n.id !== action.id) };
    case "pause":
      if (state.status !== "running") return state;
      return { ...state, status: "paused", pausedAt: action.now };
    case "resume": {
      if (state.status !== "paused" || state.pausedAt === null) return state;
      const gap = Math.max(0, action.now - state.pausedAt);
      return {
        ...state,
        status: "running",
        pausedAt: null,
        paused: state.paused + gap,
        active: state.active ? { ...state.active, paused: state.active.paused + gap } : null,
      };
    }
    case "draft":
      return state.draft === action.text ? state : { ...state, draft: action.text };
  }
}

/** The clock the run is displayed and timed against: frozen while paused or done. */
export const runClock = (state: RunState, now: number) => state.doneAt ?? state.pausedAt ?? now;

export const runElapsed = (state: RunState, now: number) => Math.max(0, runClock(state, now) - state.runStartedAt - state.paused);

export function activeElapsed(state: RunState, now: number) {
  const a = state.active;
  return a ? Math.max(0, runClock(state, now) - a.startedAt - a.paused) : 0;
}

/** Ms until the active step finishes, or null when nothing is due (paused, done, idle). */
export function activeRemaining(state: RunState, now: number) {
  const a = state.active;
  if (!a || state.status !== "running") return null;
  return Math.max(0, (DURATIONS[state.steps[a.index].id] ?? 2000) - activeElapsed(state, now));
}
