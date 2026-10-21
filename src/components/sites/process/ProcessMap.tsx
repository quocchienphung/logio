"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Hourglass, Maximize2, Minus, Plus, Repeat } from "lucide-react";
import { AgentCardBody } from "../affectui-agent-tree/agent-card";
import { durationLabel, flatten, isMuted, statusLabel, type TreeAgent } from "../affectui-agent-tree/tree-model";
import { BLOCK, anchorOf, blockAt, boxOf, clampScale, edgeBetween, fitView, freeSpot, layoutMap, zoomAt } from "./map-layout";
import type { Shape } from "./map-layout";
import type { Box, Point, Side, Size, View } from "./map-layout";
import { LinkEditor } from "./LinkEditor";
import { flattenNodes, linkKind } from "./process-model";
import type { LinkCheck, ProcessLink, ProcessNode } from "./process-model";
import { isAttemptCard, taskIdOf } from "./run-view";
import "../affectui-agent-tree/agent-tree.css";
import "./process-map.css";

export interface ProcessMapProps {
  /** The plan: who is connected to whom and where the person put each block. */
  root: ProcessNode;
  /** The same plan as cards (status, cost, times), from `buildTree`. Failed tries come as extra cards named `taskId~n`. */
  tree: TreeAgent;
  selectedId: string;
  now: number;
  formatCost: (amount: number) => string;
  showCost: boolean;
  /** A run is active: blocks can still be moved, but not added. */
  locked: boolean;
  /** Space the page keeps for its own controls over the map (the settings panel), so "fit" does not hide blocks behind it. */
  inset?: { left?: number; right?: number; top?: number; bottom?: number };
  /** Changes when the whole map should be shown again (another process, "tidy up"). */
  fitKey: string;
  /** A block to bring into view (the one just added). */
  revealId?: string | null;
  /** The connections drawn on top of the tree, and the one whose card is open. */
  links: readonly ProcessLink[];
  selectedLinkId: string | null;
  onSelectLink: (id: string | null) => void;
  /** Whether the first block may be connected to the second (asked while a connection is being dragged, and answered with the reason when not). */
  check: (from: string, to: string) => LinkCheck;
  /** A connection was dragged from one block onto another. */
  onConnect: (from: string, to: string) => void;
  onLinkChange: (id: string, change: Partial<Pick<ProcessLink, "label" | "rounds">>) => void;
  onLinkRemove: (id: string) => void;
  onSelect: (id: string) => void;
  /** A tap or Enter on a block (not a drag): open its settings. */
  onOpen?: (id: string) => void;
  onMove: (id: string, pos: Point) => void;
  onAdd: (parentId: string, pos: Point) => void;
  onDelete: (id: string) => void;
}

/** The size of an element as an external store (a string, so the snapshot stays stable between renders). */
function useSize() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const subscribe = useCallback((notify: () => void) => {
    if (!element) return () => {};
    const observer = new ResizeObserver(notify);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  const snapshot = useSyncExternalStore(subscribe, () => element ? `${element.clientWidth}x${element.clientHeight}` : "0x0", () => "0x0");
  const [w, h] = snapshot.split("x").map(Number);
  return [setElement, { w, h }] as const;
}

const GRID = 8;
const SLOP = 4;
const sides: Side[] = ["top", "right", "bottom", "left"];
const sideLabel: Record<Side, string> = { top: "above", right: "to the right of", bottom: "below", left: "to the left of" };
const roundSize = (size: Size): Size => ({ w: Math.round(size.w), h: Math.round(size.h) });

/** The map is never fitted smaller than this: tiny blocks cannot be read, so a big map is centered and panned instead. */
const READABLE = 0.55;

/**
 * The Process map: one block in the middle with branches fanning out around it, every block joined to the one it hands work
 * to. Drag a block to put it where you want (it keeps that place), drag the background to pan, zoom with Ctrl + wheel, a
 * pinch or the buttons, and use the + on a selected block to connect a new block to it. Arrow keys nudge the focused block.
 */
export function ProcessMap({ root, tree, selectedId, now, formatCost, showCost, locked, inset, fitKey, revealId, links, selectedLinkId, onSelectLink, check, onConnect, onLinkChange, onLinkRemove, onSelect, onOpen, onMove, onAdd, onDelete }: ProcessMapProps) {
  const [setViewport, viewport] = useSize();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [sizes, setSizes] = useState<ReadonlyMap<string, Size>>(new Map());
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [fitted, setFitted] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [connect, setConnect] = useState<{ from: string; side: Side; point: Point; over: string | null } | null>(null);
  const blocks = useRef(new Map<string, HTMLElement>());
  const dragCancel = useRef<null | (() => void)>(null);
  const gesture = useRef({ pointers: new Map<number, Point>(), pinch: 0, pan: null as null | { x: number; y: number; view: View } });

  const agents = useMemo(() => new Map(flatten(tree).map(agent => [agent.id, agent])), [tree]);
  const tries = useMemo(() => {
    const grouped = new Map<string, TreeAgent[]>();
    for (const agent of agents.values()) if (isAttemptCard(agent.id)) grouped.set(taskIdOf(agent.id), [...(grouped.get(taskIdOf(agent.id)) ?? []), agent]);
    return grouped;
  }, [agents]);
  const nodes = useMemo(() => flattenNodes(root), [root]);
  const shape: Shape = viewport.w > 0 && viewport.w < 560 && viewport.h > viewport.w ? "tall" : "wide";
  const centers = layoutMap(root, sizes, shape);
  const centerOf = (id: string): Point => (drag?.id === id ? { x: drag.x, y: drag.y } : centers.get(id) ?? { x: 0, y: 0 });
  const sizeOf = (id: string) => sizes.get(id) ?? BLOCK;
  const boxFor = (id: string): Box => boxOf(centerOf(id), sizeOf(id));
  const allBoxes = nodes.map(node => boxFor(node.id));

  // The whole map is shown again when the key changes (a new process, "tidy up"), once the view has a size.
  if (fitted !== fitKey && viewport.w > 0) {
    setFitted(fitKey);
    setView(fitView(allBoxes, viewport, 56, inset, READABLE));
  }
  // A block that was just added is brought into view if it is off screen.
  if (revealId && revealed !== revealId && viewport.w > 0 && centers.has(revealId)) {
    setRevealed(revealId);
    const box = boxFor(revealId);
    const margin = 40, left = (inset?.left ?? 0) + margin, right = viewport.w - (inset?.right ?? 0) - margin, top = (inset?.top ?? 0) + margin, bottom = viewport.h - (inset?.bottom ?? 0) - margin;
    let dx = 0, dy = 0;
    const screen = { l: box.x * view.scale + view.x, r: (box.x + box.w) * view.scale + view.x, t: box.y * view.scale + view.y, b: (box.y + box.h) * view.scale + view.y };
    if (screen.l < left) dx = left - screen.l; else if (screen.r > right) dx = right - screen.r;
    if (screen.t < top) dy = top - screen.t; else if (screen.b > bottom) dy = bottom - screen.b;
    if (dx || dy) setView({ ...view, x: view.x + dx, y: view.y + dy });
  }
  if (!revealId && revealed) setRevealed(null);

  // Blocks report their real size, so a tall card pushes its neighbours apart instead of overlapping them.
  const observer = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    let frame = 0;
    const pending = new Map<string, Size>();
    observer.current = new ResizeObserver(entries => {
      for (const entry of entries) { const id = (entry.target as HTMLElement).dataset.block; if (id) pending.set(id, roundSize({ w: (entry.target as HTMLElement).offsetWidth, h: (entry.target as HTMLElement).offsetHeight })); }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Taken out of `pending` before the updater runs: an updater must be pure (React may call it twice).
        const batch = new Map(pending);
        pending.clear();
        setSizes(current => {
          let next: Map<string, Size> | null = null;
          batch.forEach((size, id) => { const was = current.get(id); if (!was || was.w !== size.w || was.h !== size.h) (next ??= new Map(current)).set(id, size); });
          return next ?? current;
        });
      });
    });
    blocks.current.forEach(element => observer.current?.observe(element));
    return () => { cancelAnimationFrame(frame); observer.current?.disconnect(); };
  }, []);
  // One stable ref callback per block: a new function on every render would unobserve and observe again each time.
  const refs = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const register = (id: string) => {
    let callback = refs.current.get(id);
    if (!callback) {
      callback = (element: HTMLElement | null) => {
        if (element) { blocks.current.set(id, element); observer.current?.observe(element); }
        else { const old = blocks.current.get(id); if (old) observer.current?.unobserve(old); blocks.current.delete(id); }
      };
      refs.current.set(id, callback);
    }
    return callback;
  };
  const attach = useCallback((element: HTMLDivElement | null) => { viewportRef.current = element; setViewport(element); }, [setViewport]);

  // ----- pan, zoom and pinch -----
  const local = (event: { clientX: number; clientY: number }): Point => { const rect = viewportRef.current?.getBoundingClientRect(); return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }; };
  const zoomBy = (factor: number, around?: Point) => setView(current => zoomAt(current, factor, around ?? { x: viewport.w / 2, y: viewport.h / 2 }));
  const fit = () => setView(fitView(allBoxes, viewport, 56, inset, READABLE));
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) setView(current => zoomAt(current, Math.exp(-event.deltaY * 0.0025), { x: event.clientX - rect.left, y: event.clientY - rect.top }));
      else setView(current => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);

  function onBackgroundDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as Element).closest(".pmap__block, .pmap__controls, .pmap__pill, .pmap__editor")) return;
    if (selectedLinkId) onSelectLink(null);
    const state = gesture.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (state.pointers.size === 1) { state.pan = { ...local(event), view }; setPanning(true); }
  }
  function onBackgroundMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (state.pointers.size === 1 && state.pan && state.pointers.has(event.pointerId)) {
      const point = local(event);
      setView({ ...state.pan.view, x: state.pan.view.x + point.x - state.pan.x, y: state.pan.view.y + point.y - state.pan.y });
    }
  }
  function onBackgroundUp() {
    const state = gesture.current;
    if (state.pointers.size === 1) { const [rest] = [...state.pointers.values()]; state.pan = { ...rest, view }; }
    else if (!state.pointers.size) { state.pan = null; setPanning(false); }
  }
  // Every finger is tracked wherever it lands (on a block too), so two fingers pinch even when both are on blocks. The
  // second finger cancels a block drag the first one had started.
  function trackDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as Element).closest(".pmap__controls, .pmap__editor, button")) return;
    const state = gesture.current;
    state.pointers.set(event.pointerId, local(event));
    if (state.pointers.size === 2) {
      dragCancel.current?.();
      state.pan = null;
      const [a, b] = [...state.pointers.values()];
      state.pinch = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    }
  }
  function trackMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.set(event.pointerId, local(event));
    if (state.pointers.size < 2) return;
    const [a, b] = [...state.pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const factor = distance / state.pinch;
    state.pinch = distance;
    setView(current => zoomAt(current, factor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
  }
  function trackUp(event: ReactPointerEvent<HTMLDivElement>) { gesture.current.pointers.delete(event.pointerId); }

  // ----- dragging a block -----
  function onBlockDown(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (event.button !== 0 || (event.target as Element).closest("button")) return;
    event.stopPropagation();
    if (gesture.current.pointers.size > 1) return; // a second finger is a pinch, not a block
    const start = { x: event.clientX, y: event.clientY }, origin = centerOf(id), scale = view.scale;
    let moved = false;
    const move = (e: PointerEvent) => {
      if (gesture.current.pointers.size > 1) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < SLOP) return;
      moved = true;
      setDrag({ id, x: origin.x + (e.clientX - start.x) / scale, y: origin.y + (e.clientY - start.y) / scale });
    };
    const finish = (e: PointerEvent | null, drop: boolean) => {
      dragCancel.current = null;
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      if (e && moved && drop) {
        const x = Math.round((origin.x + (e.clientX - start.x) / scale) / GRID) * GRID, y = Math.round((origin.y + (e.clientY - start.y) / scale) / GRID) * GRID;
        onMove(id, { x, y });
      } else if (e && !moved && drop) { onSelect(id); onOpen?.(id); }
      setDrag(null);
    };
    const up = (e: PointerEvent) => finish(e, true);
    const cancel = (e: PointerEvent) => finish(e, false);
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
    dragCancel.current = () => finish(null, false);
    onSelect(id);
  }
  function onBlockKey(event: ReactKeyboardEvent<HTMLDivElement>, id: string) {
    if (event.target !== event.currentTarget) return;
    const step = event.shiftKey ? 40 : GRID;
    const arrows: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    if (arrows[event.key]) { event.preventDefault(); const at = centerOf(id); onMove(id, { x: at.x + arrows[event.key].x, y: at.y + arrows[event.key].y }); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(id); onOpen?.(id); }
    else if ((event.key === "Delete" || event.key === "Backspace") && id !== root.id) { event.preventDefault(); onDelete(id); }
  }
  function onViewportKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("input, textarea, [role=combobox]")) return;
    if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomBy(1.2); }
    else if (event.key === "-") { event.preventDefault(); zoomBy(1 / 1.2); }
    else if (event.key === "0") { event.preventDefault(); fit(); }
  }

  // ----- connecting: drag from a + handle onto another block (a connection), or onto empty canvas (a new block there) -----
  function onHandleDown(event: ReactPointerEvent<HTMLButtonElement>, from: string, side: Side) {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (gesture.current.pointers.size > 1) return;
    const start = { x: event.clientX, y: event.clientY }, scale = view.scale, shift = { x: view.x, y: view.y };
    const rect = viewportRef.current?.getBoundingClientRect();
    const toMap = (e: PointerEvent): Point => ({ x: (e.clientX - (rect?.left ?? 0) - shift.x) / scale, y: (e.clientY - (rect?.top ?? 0) - shift.y) / scale });
    const boxes = new Map(nodes.map(node => [node.id, boxFor(node.id)] as const));
    let moved = false;
    const move = (e: PointerEvent) => {
      if (gesture.current.pointers.size > 1) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < SLOP + 3) return;
      moved = true;
      const point = toMap(e);
      setConnect({ from, side, point, over: blockAt(point, boxes, from) });
    };
    const finish = (e: PointerEvent | null, drop: boolean) => {
      dragCancel.current = null;
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      setConnect(null);
      if (!e || !drop) return;
      if (!moved) { addAt(from, side); return; }
      const point = toMap(e), over = blockAt(point, boxes, from);
      if (over) onConnect(from, over);
      else onAdd(from, { x: Math.round(point.x / GRID) * GRID, y: Math.round(point.y / GRID) * GRID });
    };
    const up = (e: PointerEvent) => finish(e, true);
    const cancel = (e: PointerEvent) => finish(e, false);
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
    dragCancel.current = () => finish(null, false);
  }

  const addAt = (parentId: string, side: Side) => {
    const taken = nodes.map(node => boxFor(node.id));
    onAdd(parentId, freeSpot(taken, boxFor(parentId), side));
  };

  const stage: CSSProperties = { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` };
  const grid = { "--vx": `${view.x}px`, "--vy": `${view.y}px`, "--vs": view.scale } as CSSProperties;
  const edges = nodes.flatMap(node => node.children.map(child => ({ parent: node.id, child: child.id })));
  const ids = new Set(nodes.map(node => node.id));
  const drawn = links.filter(link => ids.has(link.from) && ids.has(link.to)).map(link => {
    const kind = linkKind(root, link);
    const edge = edgeBetween(boxFor(link.from), boxFor(link.to), kind === "loop" ? 72 : 44);
    return { link, kind, edge, live: kind === "loop" && agents.get(link.to)?.status === "running" && (agents.get(link.to)?.round?.current ?? 1) > 1 };
  });
  const openLink = drawn.find(item => item.link.id === selectedLinkId);
  const screenOf = (point: Point): Point => ({ x: view.x + point.x * view.scale, y: view.y + point.y * view.scale });
  const connectCheck = connect?.over ? check(connect.from, connect.over) : null;
  const nameOf = (id: string) => agents.get(id)?.name ?? "Block";
  const percent = `${Math.round(clampScale(view.scale) * 100)}%`;

  return <div
    className="pmap agt" ref={attach} data-panning={panning ? "" : undefined}
    style={grid} role="group" aria-label="Process map. Drag a block to move it, drag the background to pan, press plus or minus to zoom, zero to fit." tabIndex={-1}
    onPointerDownCapture={trackDown} onPointerMoveCapture={trackMove} onPointerUpCapture={trackUp} onPointerCancelCapture={trackUp}
    onPointerDown={onBackgroundDown} onPointerMove={onBackgroundMove} onPointerUp={onBackgroundUp} onPointerCancel={onBackgroundUp} onKeyDown={onViewportKey}
  >
    <div className="pmap__stage" style={stage}>
      <svg className="pmap__edges" aria-hidden="true" width="1" height="1">
        <defs>
          {[["pmap-arrow", "pmap__arrow"], ["pmap-arrow-muted", "pmap__arrow pmap__arrow--muted"], ["pmap-arrow-loop", "pmap__arrow pmap__arrow--loop"], ["pmap-arrow-wait", "pmap__arrow pmap__arrow--wait"]].map(([id, className]) => <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path className={className} d="M 1 1 L 9 5 L 1 9" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></marker>)}
        </defs>
        {edges.map(({ parent, child }) => {
          const edge = edgeBetween(boxFor(parent), boxFor(child));
          const target = agents.get(child);
          const muted = !!target && isMuted(target.status), live = target?.status === "running";
          return <g key={`${parent}>${child}`} data-muted={muted ? "" : undefined} data-live={live ? "" : undefined} data-failed={target?.status === "failed" ? "" : undefined}>
            <path className="pmap__edge" d={edge.d} markerEnd={muted ? "url(#pmap-arrow-muted)" : "url(#pmap-arrow)"} />
            <circle className="agt__dot" cx={edge.from.x} cy={edge.from.y} r="4" />
          </g>;
        })}
        {drawn.map(({ link, kind, edge, live }) => <g key={link.id} className="pmap__link" data-kind={kind} data-selected={link.id === selectedLinkId ? "" : undefined} data-live={live ? "" : undefined}>
          <path className="pmap__edge" d={edge.d} markerEnd={`url(#${kind === "loop" ? "pmap-arrow-loop" : "pmap-arrow-wait"})`} />
          <circle className="agt__dot" cx={edge.from.x} cy={edge.from.y} r="4" />
        </g>)}
        {connect && (() => {
          const box = boxFor(connect.from), from = anchorOf(box, connect.side), reach = 60;
          const lead = { x: from.x + (connect.side === "right" ? reach : connect.side === "left" ? -reach : 0), y: from.y + (connect.side === "bottom" ? reach : connect.side === "top" ? -reach : 0) };
          return <path className="pmap__ghost" data-state={connectCheck ? connectCheck.ok ? "ok" : "no" : undefined} d={`M ${from.x} ${from.y} C ${lead.x} ${lead.y}, ${connect.point.x} ${connect.point.y}, ${connect.point.x} ${connect.point.y}`} markerEnd="url(#pmap-arrow-loop)" />;
        })()}
      </svg>
      {nodes.map(node => {
        const agent = agents.get(node.id);
        if (!agent) return null;
        const at = centerOf(node.id), size = sizeOf(node.id);
        const selected = selectedId === node.id;
        const failedTries = tries.get(node.id) ?? [];
        return <div
          key={node.id} ref={register(node.id)} data-block={node.id}
          className="pmap__block agt__node" data-status={agent.status} data-selected={selected ? "" : undefined} data-target={connect?.over === node.id ? (connectCheck?.ok ? "ok" : "no") : undefined} data-dragging={drag?.id === node.id ? "" : undefined} data-root={node.id === root.id ? "" : undefined}
          role="group" aria-label={`${agent.name}, ${statusLabel[agent.status]}${agent.badge ? `, ${agent.badge.label}` : ""}`} aria-current={selected ? "true" : undefined} tabIndex={0}
          style={{ left: at.x - BLOCK.w / 2, top: at.y - size.h / 2 }}
          onPointerDown={event => onBlockDown(event, node.id)} onKeyDown={event => onBlockKey(event, node.id)}
        >
          <AgentCardBody agent={agent} now={now} formatCost={formatCost} showCost={showCost} />
          {node.approval && <span className="proc-tag pmap__tag" title="Asks you before it runs">Approval</span>}
          {failedTries.length > 0 && <ul className="pmap__tries" aria-label={`Earlier tries of ${agent.name}`}>
            {failedTries.map((attempt, index) => <li key={attempt.id} title={attempt.error}><span>Try {index + 1} failed</span>{attempt.started !== undefined && attempt.ended !== undefined && <span>{showCost && attempt.cost !== undefined ? `${formatCost(attempt.cost)} · ` : ""}{durationLabel(attempt.ended - attempt.started)}</span>}</li>)}
          </ul>}
          {(agent.round?.earlier.length ?? 0) > 0 && <ul className="pmap__tries pmap__tries--rounds" aria-label={`Earlier rounds of ${agent.name}`}>
            {agent.round!.earlier.map(round => <li key={round.round}><span>Round {round.round} · {statusLabel[round.status].toLowerCase()}</span>{round.started !== undefined && round.ended !== undefined && <span>{showCost ? `${formatCost(round.cost)} · ` : ""}{durationLabel(round.ended - round.started)}</span>}</li>)}
          </ul>}
          {selected && !locked && sides.map(side => <button key={side} type="button" className="pmap__add" data-side={side} aria-label={`Add a block ${sideLabel[side]} ${agent.name}. Drag onto another block to connect it.`} title="Click to add a block. Drag onto another block to connect it, or onto empty space for a new one." onPointerDown={event => onHandleDown(event, node.id, side)} onClick={event => { if (event.detail === 0) addAt(node.id, side); }}><Plus size={13} /></button>)}
        </div>;
      })}
    </div>
    <div className="pmap__pills">
      {drawn.map(({ link, kind, edge }) => {
        const at = screenOf(edge.mid), rounds = link.rounds ?? 2;
        return <button key={link.id} type="button" className="pmap__pill" data-kind={kind} data-selected={link.id === selectedLinkId ? "" : undefined} style={{ left: at.x, top: at.y }}
          aria-label={kind === "loop" ? `Loop from ${nameOf(link.from)} back to ${nameOf(link.to)}, up to ${rounds} rounds. Edit` : `${nameOf(link.to)} waits for ${nameOf(link.from)}. Edit`}
          aria-expanded={link.id === selectedLinkId} onClick={() => onSelectLink(link.id === selectedLinkId ? null : link.id)}
          onKeyDown={event => { if ((event.key === "Delete" || event.key === "Backspace") && !locked) { event.preventDefault(); onLinkRemove(link.id); } }}>
          {kind === "loop" ? <Repeat size={12} /> : <Hourglass size={12} />}
          <span>{link.label ? link.label : kind === "loop" ? `${rounds}×` : "waits"}</span>
        </button>;
      })}
      {openLink && (() => {
        const mid = screenOf(openLink.edge.mid), at = { x: Math.max(164, Math.min(viewport.w - 164, mid.x)), y: mid.y };
        return <div className="pmap__editor-anchor" data-above={mid.y > viewport.h - 300 ? "" : undefined} style={{ left: at.x, top: at.y }}>
          <LinkEditor link={openLink.link} kind={openLink.kind} fromName={nameOf(openLink.link.from)} toName={nameOf(openLink.link.to)} locked={locked}
            onChange={change => onLinkChange(openLink.link.id, change)} onRemove={() => onLinkRemove(openLink.link.id)} onClose={() => onSelectLink(null)} />
        </div>;
      })()}
      {connect && <div className="pmap__hint" data-state={connectCheck ? connectCheck.ok ? "ok" : "no" : "new"} style={{ left: screenOf(connect.point).x, top: screenOf(connect.point).y }} role="status">
        {connectCheck ? connectCheck.ok ? (connectCheck.kind === "loop" ? `Loop back to ${nameOf(connect.over!)}` : `${nameOf(connect.over!)} will wait for ${nameOf(connect.from)}`) : connectCheck.reason : "Drop to add a new block here"}
      </div>}
    </div>
    <div className="pmap__controls" role="toolbar" aria-label="Map view">
      <button type="button" className="pmap__control" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}><Minus size={14} /></button>
      <span className="pmap__zoom" aria-live="polite">{percent}</span>
      <button type="button" className="pmap__control" aria-label="Zoom in" onClick={() => zoomBy(1.2)}><Plus size={14} /></button>
      <button type="button" className="pmap__control" aria-label="Fit the whole map" title="Fit the whole map" onClick={fit}><Maximize2 size={14} /></button>
    </div>
    <span className="agt__sr" role="status">{nodes.length} blocks</span>
  </div>;
}
