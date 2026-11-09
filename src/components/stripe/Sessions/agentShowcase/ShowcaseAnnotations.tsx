"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import type { AnnotationTarget } from "./AgentScreen";

export interface Annotation {
  id: AnnotationTarget;
  index: string;
  title: string;
  body: string;
  side: "left" | "right";
  /** Element inside the device screen the note points at. */
  anchor: string;
}

export const ANNOTATIONS: Annotation[] = [
  { id: "compose", index: "01", title: "Guide the agent", body: "Give an agent new instructions while it's still working.", side: "left", anchor: ".ui-stc__field" },
  { id: "keys", index: "02", title: "Queue or interrupt", body: "Apply changes at the next step, or redirect the current step instantly.", side: "left", anchor: ".ui-stc__hint" },
  { id: "plan", index: "03", title: "See every adjustment", body: "Watch new instructions become part of the running plan.", side: "right", anchor: ".ui-stc__plan" },
];

/** Card width and its gap to the device frame (aside mode). */
export const NOTE_WIDTH = 208;
export const NOTE_GAP = 24;
const NOTE_MIN_GAP = 12;

type Placed = { id: AnnotationTarget; left: number; top: number; height: number; from: number; x: number; y: number };

export interface ShowcaseAnnotationsProps {
  stageRef: RefObject<HTMLDivElement | null>;
  deviceRef: RefObject<HTMLDivElement | null>;
  /** How many notes are shown so far in the guided sequence (0–3). */
  shown: number;
  /** Side columns (wide screens) or a compact strip under the device. */
  mode: "aside" | "strip";
  ready: boolean;
  active: AnnotationTarget | null;
  onHighlight: (id: AnnotationTarget | null) => void;
}

/**
 * Product annotations around the device. In "aside" mode each note sits beside the device, level with
 * the part of the screen it explains, joined to it by a hairline leader; anchors are read from the live
 * screen elements (getBoundingClientRect includes the CSS3D projection) and follow resizes. In "strip"
 * mode the notes are an ordered list under the device.
 */
export function ShowcaseAnnotations({ stageRef, deviceRef, shown, mode, ready, active, onHighlight }: ShowcaseAnnotationsProps) {
  const [placed, setPlaced] = useState<Placed[]>([]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const device = deviceRef.current;
    if (mode !== "aside" || !stage || !device || !ready) return;
    const place = () => {
      const s = stage.getBoundingClientRect();
      const d = device.getBoundingClientRect();
      const cards = Array.from(stage.querySelectorAll<HTMLElement>(".agent-notes--aside .agent-note"));
      const out: Placed[] = [];
      for (const side of ["left", "right"] as const) {
        let floor = 0;
        ANNOTATIONS.forEach((a, i) => {
          if (a.side !== side) return;
          const el = device.querySelector(a.anchor);
          if (!el) return;
          const r = el.getBoundingClientRect();
          const height = cards[i]?.offsetHeight || 92;
          const y = r.top + r.height / 2 - s.top;
          const x = (side === "left" ? r.left + 6 : r.right - 6) - s.left;
          const top = Math.max(floor, Math.min(s.height - height, y - height / 2));
          floor = top + height + NOTE_MIN_GAP;
          const left = side === "left" ? d.left - s.left - NOTE_GAP - NOTE_WIDTH : d.right - s.left + NOTE_GAP;
          out.push({ id: a.id, left, top, height, from: side === "left" ? left + NOTE_WIDTH : left, x, y });
        });
      }
      setPlaced(out);
    };
    // the card glides to new heights (480 ms): measure now, next frame, and once it has settled
    let raf = 0;
    let settle = 0;
    const schedule = () => {
      place();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
      window.clearTimeout(settle);
      settle = window.setTimeout(place, 560);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    const card = device.querySelector(".ui-stc__card");
    if (card) ro.observe(card);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [stageRef, deviceRef, mode, ready]);

  const notes = (cls: string, withPosition: boolean) => (
    <ol className={`agent-notes ${cls}`} aria-label="How it works">
      {ANNOTATIONS.map((a, i) => {
        const p = withPosition ? placed.find((q) => q.id === a.id) : undefined;
        const visible = i < shown && (!withPosition || Boolean(p));
        return (
          <li
            key={a.id}
            className="agent-note"
            data-side={a.side}
            data-shown={visible || undefined}
            data-active={active === a.id || undefined}
            style={p ? { left: p.left, top: p.top, width: NOTE_WIDTH } : undefined}
            onPointerEnter={() => onHighlight(a.id)}
            onPointerLeave={() => onHighlight(null)}
          >
            <span className="agent-note__index">{a.index}</span>
            <span className="agent-note__title">{a.title}</span>
            <span className="agent-note__body">{a.body}</span>
          </li>
        );
      })}
    </ol>
  );

  if (mode === "strip") return notes("agent-notes--strip", false);

  return (
    <>
      <svg className="agent-notes__leaders" aria-hidden="true">
        {placed.map((p) => {
          const i = ANNOTATIONS.findIndex((n) => n.id === p.id);
          return (
            <g key={p.id} className="agent-notes__leader" data-shown={i < shown || undefined} data-active={active === p.id || undefined}>
              <polyline points={`${p.from},${p.top + 22} ${p.from + (p.x > p.from ? 14 : -14)},${p.top + 22} ${p.x},${p.y}`} />
              <circle cx={p.x} cy={p.y} r="3" />
            </g>
          );
        })}
      </svg>
      {notes("agent-notes--aside", true)}
    </>
  );
}
