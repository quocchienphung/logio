// Agent Steering run model: node --experimental-strip-types --test (npm test)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeElapsed,
  activeRemaining,
  DURATIONS,
  initialRun,
  NOTE_KEEP_VIEW,
  NOTE_POSTGRES,
  RETITLE,
  runElapsed,
  runReducer,
} from "./agentSteeringModel.ts";

const T0 = 1_000_000;
const play = (actions, state = initialRun(T0)) => actions.reduce(runReducer, state);
const started = () => play([{ type: "activate", index: 1, now: T0 }]);

test("starts two minutes in, step 1 done and step 2 running", () => {
  const s = started();
  assert.equal(s.steps[0].status, "done");
  assert.equal(s.steps[1].status, "active");
  assert.equal(s.active.index, 1);
  assert.equal(runElapsed(s, T0), 126_000);
});

test("queue insertion keeps stable ids and ignores blank drafts", () => {
  const s = play([{ type: "queue", text: NOTE_POSTGRES }, { type: "queue", text: "   " }, { type: "queue", text: NOTE_KEEP_VIEW }], started());
  assert.deepEqual(s.queue.map((n) => n.id), ["n1", "n2"]);
  assert.deepEqual(s.queue.map((n) => n.text), [NOTE_POSTGRES, NOTE_KEEP_VIEW]);
});

test("queue deletion", () => {
  const s = play([{ type: "queue", text: "a" }, { type: "queue", text: "b" }, { type: "remove", id: "n1" }], started());
  assert.deepEqual(s.queue.map((n) => n.id), ["n2"]);
});

test("pickup: queued notes join the next step with the same id, which re-plans its title", () => {
  let s = play([{ type: "queue", text: NOTE_POSTGRES }], started());
  s = runReducer(s, { type: "complete", now: T0 + DURATIONS.draft });
  assert.equal(s.queue.length, 0);
  assert.equal(s.steps[1].status, "done");
  assert.equal(s.steps[1].duration, DURATIONS.draft);
  assert.equal(s.steps[2].status, "active");
  assert.equal(s.steps[2].title, RETITLE.write);
  assert.deepEqual(s.steps[2].notes, [{ id: "n1", text: NOTE_POSTGRES, picked: "next" }]);
});

test("interrupt redirects the active step immediately and restarts it", () => {
  let s = play([{ type: "queue", text: NOTE_KEEP_VIEW }], started());
  s = runReducer(s, { type: "interrupt", text: NOTE_KEEP_VIEW, id: "n1", now: T0 + 3000 });
  assert.equal(s.queue.length, 0);
  assert.deepEqual(s.steps[1].notes, [{ id: "n1", text: NOTE_KEEP_VIEW, picked: "now" }]);
  assert.equal(s.active.startedAt, T0 + 3000);
  assert.equal(activeRemaining(s, T0 + 3000), DURATIONS.draft);
  // a typed interrupt gets a fresh id
  s = runReducer(s, { type: "interrupt", text: "Use a feature flag", now: T0 + 3500 });
  assert.equal(s.steps[1].notes[1].id, "n2");
});

test("pause freezes the timers and resume continues without resetting the step", () => {
  let s = runReducer(started(), { type: "pause", now: T0 + 1000 });
  assert.equal(s.status, "paused");
  assert.equal(activeElapsed(s, T0 + 9000), 1000);
  assert.equal(runElapsed(s, T0 + 9000), 127_000);
  assert.equal(activeRemaining(s, T0 + 9000), null);
  s = runReducer(s, { type: "resume", now: T0 + 9000 });
  assert.equal(s.status, "running");
  assert.equal(activeElapsed(s, T0 + 9500), 1500);
  assert.equal(runElapsed(s, T0 + 9500), 127_500);
  assert.equal(activeRemaining(s, T0 + 9500), DURATIONS.draft - 1500);
});

test("completing while paused is ignored; repeated pause/resume is idempotent", () => {
  let s = runReducer(started(), { type: "pause", now: T0 + 100 });
  s = runReducer(s, { type: "complete", now: T0 + 99_999 });
  assert.equal(s.steps[1].status, "active");
  s = play([{ type: "pause", now: T0 + 200 }, { type: "resume", now: T0 + 300 }, { type: "resume", now: T0 + 400 }], s);
  assert.equal(s.paused, 200);
});

test("rapid input cannot duplicate notes or skip steps", () => {
  let s = started();
  for (let i = 0; i < 20; i++) s = runReducer(s, { type: "queue", text: `note ${i}` });
  const ids = s.queue.map((n) => n.id);
  assert.equal(new Set(ids).size, 20);
  s = play([{ type: "interrupt", text: "x", id: "n3", now: T0 + 10 }, { type: "interrupt", text: "x", id: "n3", now: T0 + 11 }], s);
  const all = [...s.queue, ...s.steps.flatMap((st) => st.notes)].map((n) => n.id);
  assert.equal(all.filter((id) => id === "n3").length, 1);
  // activate is ignored while a step is active
  s = runReducer(s, { type: "activate", index: 4, now: T0 + 20 });
  assert.equal(s.active.index, 1);
});

test("the run completes, completed steps stay completed and the run freezes", () => {
  let s = started();
  let t = T0;
  for (let i = 1; i < 5; i++) {
    t += DURATIONS[s.steps[i].id];
    s = runReducer(s, { type: "complete", now: t });
  }
  assert.equal(s.status, "done");
  assert.ok(s.steps.every((st) => st.status === "done"));
  assert.equal(runElapsed(s, t + 60_000), runElapsed(s, t));
  assert.deepEqual(runReducer(s, { type: "queue", text: "late" }).queue, []);
});

test("reset replays from the start", () => {
  const s = runReducer(play([{ type: "queue", text: "a" }, { type: "pause", now: T0 + 5 }], started()), { type: "reset", now: T0 + 50_000 });
  assert.equal(s.status, "running");
  assert.equal(s.queue.length, 0);
  assert.equal(s.active, null);
  assert.equal(s.steps[1].status, "pending");
  assert.equal(runElapsed(s, T0 + 50_000), 126_000);
});
