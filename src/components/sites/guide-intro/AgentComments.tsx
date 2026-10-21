"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Mark } from "../affectui-agent-tree/tree-marks";
import { artistAgents } from "./studio-timeline";
import "./agent-comments.css";

type CommentId = "history" | "moonlight" | "brushwork";
interface CommentNote {
  id: CommentId;
  agent: string;
  at: number;
  until: number;
  text: string;
}
interface CommentPosition { id: CommentId; x: number; y: number; shift: number; above: boolean }

const comments: readonly CommentNote[] = [
  { id: "history", agent: "researcher", at: 1900, until: 4050, text: "Saint-Rémy, June 1889 — not 1888. Updating the date in the story." },
  { id: "moonlight", agent: "colorist", at: 4350, until: 6500, text: "Keeping the moonlight warm. The blue strokes can flow around it." },
  { id: "brushwork", agent: "writer", at: 6800, until: 9100, text: "A quiet village, a sky alive with motion. The story and painting now move together." },
];

export function AgentComments({ elapsed, reduced, onInteractionChange }: {
  elapsed: number;
  reduced: boolean;
  onInteractionChange: (active: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<CommentId>());
  const [positions, setPositions] = useState<CommentPosition[]>([]);

  useLayoutEffect(() => {
    const page = root.current?.closest<HTMLElement>(".guide-intro");
    if (!page) return;
    const measure = () => {
      const bounds = page.getBoundingClientRect();
      const next: CommentPosition[] = [];
      for (const note of comments) {
        const target = page.querySelector(note.id === "moonlight" ? "[data-painting-frame]" : `[data-comment-anchor="${note.id}"]`);
        if (!target) continue;
        const rect = target.getBoundingClientRect();
        const x = Math.max(12, Math.min(bounds.width - 40, rect.left - bounds.left + (note.id === "moonlight" ? rect.width * .82 : -24)));
        const y = Math.max(12, Math.min(bounds.height - 40, rect.top - bounds.top + (note.id === "moonlight" ? rect.height * .23 : note.id === "brushwork" ? 70 : 4)));
        const width = Math.min(310, bounds.width - 32);
        const left = Math.max(16, Math.min(bounds.width - width - 16, x));
        next.push({ id: note.id, x, y, shift: left - x, above: y > bounds.height - 260 });
      }
      setPositions(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    const sheet = page.querySelector(".guide-intro__sheet");
    if (sheet) observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => { onInteractionChange(false); }, [onInteractionChange]);

  const interact = (id: CommentId, active: boolean) => {
    if (active) held.current.add(id); else held.current.delete(id);
    onInteractionChange(held.current.size > 0);
  };

  return <div ref={root} className="studio-comments" data-reduced={reduced}>
    {positions.map(position => {
      const note = comments.find(item => item.id === position.id);
      return note && <AgentComment key={note.id} note={note} position={position} elapsed={elapsed} reduced={reduced} onInteract={interact} />;
    })}
  </div>;
}

function AgentComment({ note, position, elapsed, reduced, onInteract }: {
  note: CommentNote;
  position: CommentPosition;
  elapsed: number;
  reduced: boolean;
  onInteract: (id: CommentId, active: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [draft, setDraft] = useState("");
  const [replies, setReplies] = useState<string[]>([]);
  const pin = useRef<HTMLButtonElement>(null);
  const agent = artistAgents.find(item => item.id === note.agent) ?? artistAgents[0];
  const visible = elapsed >= note.at && !resolved && !reduced;
  const scheduled = elapsed >= note.at && elapsed < note.until;
  const open = visible && !dismissed && (scheduled || hovered || focused || pinned);
  const body = hovered || focused || pinned ? note.text : note.text.slice(0, Math.floor(Math.max(0, elapsed - note.at - 140) / 13));
  const style = { "--comment-x": `${position.x}px`, "--comment-y": `${position.y}px`, "--comment-shift": `${position.shift}px`, "--comment-color": agent.color } as CSSProperties;

  const close = () => {
    setDismissed(true); setPinned(false); setHovered(false); setFocused(false);
    onInteract(note.id, false);
    pin.current?.focus(); pin.current?.blur();
  };

  return <div className="studio-comment" style={style} data-visible={visible} data-open={open} data-above={position.above} inert={!visible}
    onPointerEnter={() => { if (!visible) return; setHovered(true); setDismissed(false); onInteract(note.id, true); }}
    onPointerLeave={() => { setHovered(false); if (!focused && !pinned) onInteract(note.id, false); }}
    onFocusCapture={() => { setFocused(true); onInteract(note.id, true); }}
    onBlurCapture={event => {
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
      setFocused(false); if (!hovered && !pinned) onInteract(note.id, false);
    }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <button ref={pin} type="button" className="studio-comment__pin" aria-label={`Comment from ${agent.name}: ${note.text}`} aria-expanded={open} aria-controls={`studio-comment-${note.id}`}
      tabIndex={open ? -1 : 0} onClick={() => {
        if (pinned) close(); else { setPinned(true); setDismissed(false); onInteract(note.id, true); }
      }}><Mark id={agent.mark} /></button>
    <section id={`studio-comment-${note.id}`} className="studio-comment__card" role="dialog" aria-label={`Comment from ${agent.name}`} aria-hidden={!open} inert={!open}>
      <header className="studio-comment__header">
        <button type="button" className="studio-comment__mark" aria-label={`Collapse comment from ${agent.name}`} onClick={close}><Mark id={agent.mark} /></button>
        <strong>{agent.name}</strong><span>now</span>
      </header>
      <p className="studio-comment__text" aria-hidden="true">{body}<span className="studio-comment__caret" data-typing={body.length < note.text.length} /></p>
      <p className="guide-intro__sr">{note.text}</p>
      {replies.length > 0 && <div className="studio-comment__replies" aria-live="polite">{replies.map((reply, index) => <p key={`${index}-${reply}`}><span>You</span>{reply}</p>)}</div>}
      <form className="studio-comment__reply" onSubmit={event => {
        event.preventDefault(); const text = draft.trim();
        if (!text) return;
        setReplies(previous => [...previous.slice(-1), text]); setDraft("");
      }}>
        <input aria-label={`Reply to ${agent.name}`} placeholder="Reply" value={draft} maxLength={240} onChange={event => setDraft(event.target.value)} autoComplete="off" />
        <button type="button" className="studio-comment__resolve" aria-label={`Resolve comment from ${agent.name}`} onClick={() => {
          setResolved(true); setPinned(false); setHovered(false); setFocused(false); onInteract(note.id, false);
        }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 12 4 4 8-8" /></svg></button>
      </form>
    </section>
  </div>;
}
