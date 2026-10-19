"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { activeElapsed, runElapsed, type RunState, type StepStatus } from "./agentSteeringModel";
import "./agent-steering.css";

/*
 * affectUI Agent Steering, clean style (https://www.affectui.com/components/agent-steering), rebuilt
 * from the shipped component: a running agent's plan you can steer while it works. Enter queues a note
 * for the next step, ⌘/Ctrl+Enter interrupts the active step, Shift+Enter adds a line, Esc clears the
 * draft. Notes glide (FLIP) from the queue into the step that takes them, the card glides to its new
 * height. This is the view; the run itself is `RunState` (agentSteeringModel.ts).
 */

const EASE = "cubic-bezier(0.32, 0.72, 0.24, 1)";
const pad2 = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${pad2(s % 60)}s` : `${Math.floor(m / 60)}h ${pad2(m % 60)}m`;
};
const seconds = (ms: number) => `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const noSubscribe = () => () => {};
const platformMod = () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl");

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Spark = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M7 1.2c.4 2.9 1.9 4.4 4.8 4.8-2.9.4-4.4 1.9-4.8 4.8C6.6 7.9 5.1 6.4 2.2 6 5.1 5.6 6.6 4.1 7 1.2Z" fill="currentColor" />
    <circle cx="11.6" cy="11.4" r="1.1" fill="currentColor" opacity="0.55" />
  </svg>
);
const StepIcon = ({ status }: { status: StepStatus }) => (
  <span className="ui-stc__step-icon" data-status={status} aria-hidden="true">
    {status === "done" && (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
        <path d="m5.4 8.2 1.8 1.8 3.4-3.7" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
    {status === "active" && (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.6" />
        <path d="M8 2.2a5.8 5.8 0 0 1 5.8 5.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )}
    {status === "pending" && (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2.2" />
      </svg>
    )}
  </span>
);
const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="4.2" y="3.4" width="2.6" height="9.2" rx="0.9" fill="currentColor" />
    <rect x="9.2" y="3.4" width="2.6" height="9.2" rx="0.9" fill="currentColor" />
  </svg>
);
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5 3.6v8.8c0 .6.6.9 1.1.6l6.6-4.4a.7.7 0 0 0 0-1.2L6.1 3c-.5-.3-1.1 0-1.1.6Z" fill="currentColor" />
  </svg>
);
const BoltIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M6.9 1 2.6 6.6h3l-.5 4.4 4.3-5.6h-3L6.9 1Z" fill="currentColor" />
  </svg>
);
const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="m3.4 3.4 5.2 5.2M8.6 3.4 3.4 8.6" {...stroke} />
  </svg>
);
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 12.6V3.6M4.2 7.2 8 3.4l3.8 3.8" {...stroke} strokeWidth={1.6} />
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="m2.8 6.2 2 2 4.4-4.6" {...stroke} strokeWidth={1.5} />
  </svg>
);
const ReplyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 2.4v3.4c0 .9.7 1.6 1.6 1.6h4.6M7.6 5.6l1.8 1.8-1.8 1.8" {...stroke} strokeWidth={1.2} />
  </svg>
);

export interface AgentSteeringProps {
  title: string;
  agent?: string;
  run: RunState;
  /** Wall clock (ms) the timers are drawn against. */
  now: number;
  onQueue: (text: string) => void;
  onInterrupt: (text: string, id?: string) => void;
  onRemove: (id: string) => void;
  onDraftChange: (text: string) => void;
  onPause: () => void;
  onResume: () => void;
  placeholder?: string;
  className?: string;
}

/** Offset of `el` inside `root` in layout px (unaffected by 3D transforms on ancestors of `root`). */
function localPos(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let e: HTMLElement | null = el; e && e !== root; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft;
    y += e.offsetTop;
  }
  return { x, y };
}

export function AgentSteering({
  title,
  agent,
  run,
  now,
  onQueue,
  onInterrupt,
  onRemove,
  onDraftChange,
  onPause,
  onResume,
  placeholder = "Steer the agent…",
  className,
}: AgentSteeringProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const cardHeight = useRef(0);
  const mod = useSyncExternalStore(noSubscribe, platformMod, () => "Ctrl");
  const [live, setLive] = useState("");
  const { steps, queue, status, draft } = run;
  const open = status !== "done";
  const done = steps.filter((s) => s.status === "done").length;

  const bind = (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };

  // Positions are measured when the layout can have changed (a new signature, a growing draft, a resize);
  // when the steps, notes or queue change (the signature) everything that moved is animated from where it
  // was at the previous measurement. The clock re-renders this 10× a second: it must not touch layout, as
  // reading offsets after each commit forced a synchronous layout of the whole CSS3D scene every 100 ms.
  const signature = JSON.stringify([steps.map((s) => [s.id, s.status, s.title, s.notes.map((n) => n.id)]), queue.map((n) => n.id)]);
  const lastSignature = useRef(signature);
  const measured = useRef({ signature: "", draft: "" });
  const measure = () => {
    const root = rootRef.current;
    const card = cardRef.current;
    if (!root || !card) return;
    const after = new Map<string, { x: number; y: number }>();
    for (const [key, el] of nodes.current) after.set(key, localPos(el, root));
    positions.current = after;
    cardHeight.current = card.offsetHeight;
  };
  // a resize can re-wrap the card: keep the reference positions current
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    if (!root || !card) return;
    if (measured.current.signature === signature && measured.current.draft === draft) return;
    measured.current = { signature, draft };
    const before = positions.current;
    const after = new Map<string, { x: number; y: number }>();
    for (const [key, el] of nodes.current) after.set(key, localPos(el, root));
    const prevHeight = cardHeight.current;
    positions.current = after;
    cardHeight.current = card.offsetHeight;
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    if (!before.size || reducedMotion()) return;
    if (prevHeight && Math.abs(card.offsetHeight - prevHeight) > 1) {
      card.animate([{ height: `${prevHeight}px` }, { height: `${card.offsetHeight}px` }], { duration: 480, easing: EASE });
    }
    for (const [key, el] of nodes.current) {
      const to = after.get(key);
      if (!to) continue;
      // a note that was queued glides from its chip to the step that takes it
      const from = before.get(key) ?? (key.startsWith("note:") ? before.get(`queued:${key.slice(5)}`) : undefined);
      if (!from) {
        el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE });
        continue;
      }
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      const moved = !before.has(key);
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)`, zIndex: 2 },
          { transform: "none", zIndex: 2 },
        ],
        { duration: moved ? 620 : 480, easing: EASE },
      );
      if (moved) el.setAttribute("data-landed", "");
    }
  });

  // the agent picking a note up is announced once
  const picked = steps.flatMap((s) => s.notes.filter((n) => n.picked).map((n) => n.id)).join("|");
  const [seenPicked, setSeenPicked] = useState(picked);
  if (picked !== seenPicked) {
    const seen = new Set(seenPicked.split("|"));
    const fresh = steps.flatMap((s) => s.notes).find((n) => n.picked && !seen.has(n.id));
    setSeenPicked(picked);
    if (fresh) setLive(`${agent ?? "The agent"} picked up: ${fresh.text}`);
  }

  const submit = (now: boolean) => {
    const text = draft.trim();
    if (!text || !open) return;
    if (now) onInterrupt(text);
    else onQueue(text);
    setLive(now ? `Interrupting: ${text}` : `Queued for the next step: ${text}`);
    onDraftChange("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(e.metaKey || e.ctrlKey);
    } else if (e.key === "Escape" && draft) {
      e.stopPropagation();
      onDraftChange("");
    }
  };

  // the field grows with its text up to three lines
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 60)}px`;
  }, [draft]);

  const elapsed = runElapsed(run, now);
  const stateLabel = status === "done" ? `Done in ${clock(elapsed)}` : status === "paused" ? "Paused" : `Running · ${clock(elapsed)}`;

  return (
    <div ref={rootRef} className={["ui-stc", className].filter(Boolean).join(" ")} data-status={status}>
      <div ref={cardRef} className="ui-stc__card">
        <header className="ui-stc__head">
          <span className="ui-stc__spark">
            <Spark />
          </span>
          <div className="ui-stc__heading">
            <span className="ui-stc__title">{title}</span>
            <span className="ui-stc__sub">
              {agent && (
                <>
                  {agent}
                  <span className="ui-stc__dot" aria-hidden="true">
                    ·
                  </span>
                </>
              )}
              {status === "done" ? `${steps.length} steps` : `Step ${Math.min(done + 1, steps.length)} of ${steps.length}`}
            </span>
          </div>
          <span className="ui-stc__state" data-status={status}>
            <span className="ui-stc__pulse" aria-hidden="true" />
            {stateLabel}
          </span>
          {status === "running" && (
            <button type="button" className="ui-stc__icon-btn" aria-label="Pause the run" title="Pause" onClick={onPause}>
              <PauseIcon />
            </button>
          )}
          {status === "paused" && (
            <button type="button" className="ui-stc__icon-btn" aria-label="Resume the run" title="Resume" onClick={onResume}>
              <PlayIcon />
            </button>
          )}
        </header>

        <ol className="ui-stc__plan" aria-label="Plan">
          {steps.map((s, i) => (
            <li key={s.id} ref={bind(`step:${s.id}`)} className="ui-stc__step" data-status={s.status} aria-current={s.status === "active" ? "step" : undefined}>
              <div className="ui-stc__step-row">
                <StepIcon status={s.status} />
                <span className="ui-stc__step-title">{s.title}</span>
                <span className="ui-stc__step-time">
                  {s.status === "done" && s.duration !== undefined
                    ? seconds(s.duration)
                    : s.status === "active" && status === "running" && run.active?.index === i
                      ? seconds(activeElapsed(run, now))
                      : ""}
                </span>
              </div>
              {s.notes.map((n) => (
                <div key={n.id} ref={bind(`note:${n.id}`)} className="ui-stc__note" data-picked={n.picked}>
                  <ReplyIcon />
                  <span className="ui-stc__note-text">{n.text}</span>
                  {n.picked && (
                    <span className="ui-stc__note-tag">
                      <CheckIcon />
                      {n.picked === "now" ? "Interrupted" : "Picked up"}
                    </span>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ol>

        {queue.length > 0 && (
          <div className="ui-stc__queue" ref={bind("queue:box")}>
            <div className="ui-stc__label">
              Queued for the next step <span>{queue.length}</span>
            </div>
            <ul className="ui-stc__queued">
              {queue.map((n) => (
                <li key={n.id} ref={bind(`queued:${n.id}`)} className="ui-stc__chip">
                  <span className="ui-stc__chip-text">{n.text}</span>
                  {open && (
                    <button type="button" className="ui-stc__chip-btn" title={`Apply now (${mod}↵)`} onClick={() => onInterrupt(n.text, n.id)}>
                      <BoltIcon />
                      Now
                    </button>
                  )}
                  <button type="button" className="ui-stc__chip-x" aria-label={`Remove “${n.text}”`} onClick={() => onRemove(n.id)}>
                    <CloseIcon />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ui-stc__compose" ref={bind("compose:box")} data-disabled={open ? undefined : ""}>
          <div className="ui-stc__field" onClick={() => fieldRef.current?.focus()}>
            <textarea
              ref={fieldRef}
              id={`${id}-field`}
              rows={1}
              value={draft}
              disabled={!open}
              placeholder={open ? placeholder : "The run has finished"}
              aria-label="Steer the agent"
              aria-describedby={`${id}-hint`}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="button" className="ui-stc__send" aria-label="Queue for the next step" disabled={!draft.trim() || !open} onClick={() => submit(false)}>
              <SendIcon />
            </button>
          </div>
          <div className="ui-stc__hint" id={`${id}-hint`}>
            {open ? (
              <>
                <span>
                  <kbd>↵</kbd> next step
                </span>
                <span>
                  <kbd>{mod}</kbd>
                  <kbd>↵</kbd> interrupt now
                </span>
              </>
            ) : (
              <span>Notes still in the queue were not used</span>
            )}
          </div>
        </div>
      </div>
      <span className="ui-stc__sr" aria-live="polite">
        {live}
      </span>
    </div>
  );
}
