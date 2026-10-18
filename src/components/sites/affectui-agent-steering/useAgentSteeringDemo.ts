"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { activeRemaining, DURATIONS, initialRun, NOTE_KEEP_VIEW, NOTE_POSTGRES, runReducer } from "./agentSteeringModel";

/*
 * Drives the Agent Steering simulation: step timers, the reference demo's guided tour and the clock.
 *
 * Tour (as on affectui.com, relative to a reset): step 2 starts at 0.2 s; "Use Postgres 16 syntax…" is
 * typed from 0.9 s (38 ms a character) and queued 0.42 s later; "Keep the old users view…" is typed once
 * step 2 has finished and queued, then applied with "Now" 1.4 s after that. The run restarts 3.8 s after
 * it finishes. Any trusted pointer or key input hands control to the visitor (the tour stops, the run
 * keeps going). The run starts the first time the demo is on screen and its clock only ticks there.
 */

const TYPE_MS = 38;
const SEND_AFTER = 420;
const RESTART_TOUR = 3800;
const RESTART_IDLE = 4200;

export function useAgentSteeringDemo() {
  const [run, dispatch] = useReducer(runReducer, undefined, () => initialRun(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(false);
  const [cycle, setCycle] = useState(0);
  const tour = useRef(true);
  const tourTimers = useRef<number[]>([]);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const clearTour = () => {
    tourTimers.current.forEach((t) => window.clearTimeout(t));
    tourTimers.current = [];
  };

  /** Restart the run (and the guided tour when `withTour`). */
  const restart = useCallback((withTour: boolean) => {
    clearTour();
    tour.current = withTour;
    dispatch({ type: "reset", now: Date.now() });
    setCycle((c) => c + 1);
  }, []);

  // the run starts the first time the demo is on screen
  useEffect(() => {
    if (visible && cycle === 0) restart(true);
  }, [visible, cycle, restart]);

  // each cycle: start step 2, and play the tour while the visitor has not taken over
  useEffect(() => {
    if (cycle === 0) return;
    const later = (fn: () => void, ms: number) => tourTimers.current.push(window.setTimeout(fn, ms));
    const typeAndSend = (text: string, at: number, then?: () => void) => {
      for (let i = 1; i <= text.length; i++) later(() => dispatch({ type: "draft", text: text.slice(0, i) }), at + i * TYPE_MS);
      later(() => {
        dispatch({ type: "queue", text });
        dispatch({ type: "draft", text: "" });
        then?.();
      }, at + text.length * TYPE_MS + SEND_AFTER);
    };
    const t = window.setTimeout(() => dispatch({ type: "activate", index: 1, now: Date.now() }), 200);
    if (tour.current) {
      typeAndSend(NOTE_POSTGRES, 900);
      const second = 200 + DURATIONS.draft + 900;
      typeAndSend(NOTE_KEEP_VIEW, second, () =>
        later(() => {
          const queued = runRef.current.queue.find((n) => n.text === NOTE_KEEP_VIEW);
          if (queued && tour.current) dispatch({ type: "interrupt", text: queued.text, id: queued.id, now: Date.now() });
        }, 1400),
      );
    }
    return () => {
      window.clearTimeout(t);
      clearTour();
    };
  }, [cycle]);

  // the active step finishes after its remaining time (re-planned on pause/resume/interrupt)
  const activeKey = run.active ? `${run.active.index}:${run.active.startedAt}:${run.active.paused}` : "";
  useEffect(() => {
    const remaining = activeRemaining(runRef.current, Date.now());
    if (remaining === null) return;
    const t = window.setTimeout(() => dispatch({ type: "complete", now: Date.now() }), remaining);
    return () => window.clearTimeout(t);
  }, [run.status, activeKey]);

  // a finished run starts over
  useEffect(() => {
    if (run.status !== "done") return;
    const t = window.setTimeout(() => restart(tour.current), tour.current ? RESTART_TOUR : RESTART_IDLE);
    return () => window.clearTimeout(t);
  }, [run.status, restart]);

  // the clock only ticks while the demo is visible and running
  useEffect(() => {
    if (!visible || run.status !== "running") return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [visible, run.status]);

  /** Trusted input from the visitor ends the guided tour (and drops its half-typed draft). */
  const takeOver = useCallback((trusted: boolean) => {
    if (!trusted || !tour.current) return;
    tour.current = false;
    clearTour();
    dispatch({ type: "draft", text: "" });
  }, []);

  const actions = {
    queue: (text: string) => dispatch({ type: "queue", text }),
    interrupt: (text: string, id?: string) => dispatch({ type: "interrupt", text, id, now: Date.now() }),
    remove: (id: string) => dispatch({ type: "remove", id }),
    pause: () => dispatch({ type: "pause", now: Date.now() }),
    resume: () => dispatch({ type: "resume", now: Date.now() }),
    setDraft: (text: string) => dispatch({ type: "draft", text }),
  };

  return { run, now, actions, restart, takeOver, setVisible };
}
