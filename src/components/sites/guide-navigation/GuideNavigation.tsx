"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { defaultGuideIndex, guideGroups, liveFrameOf, navigateWorkspaceHref, subscribeLocation } from "./navigation-model";
import { WorkspaceLink } from "./WorkspaceLink";
import { WorkspaceBackendProvider } from "@/lib/workspace-backend/react";
import { GradientFloor } from "../affectui-gradient-floor/GradientFloor";
import { InvoicePlan } from "../affectui-agent-plan/AgentPlan";
import { WritingAssistant } from "../affectui-writing-assistant/WritingAssistant";
import "../affectui-fonts.css";
import "./guide-navigation.css";

const Workspace = dynamic(() => import("../affectui-crm/Crm").then(module => module.Crm), {
  loading: () => <div className="guide-loading" role="status">Opening your workspace…</div>,
});
const locationSnapshot = () => window.location.search;
const swipeDistance = 40;

export function PersonalizeApp({ initialBrowse = false, initialGroup }: { initialBrowse?: boolean; initialGroup?: string }) {
  const search = useSyncExternalStore(subscribeLocation, locationSnapshot, () => {
    if (!initialBrowse) return "";
    return initialGroup ? `?browse=1&group=${encodeURIComponent(initialGroup)}` : "?browse=1";
  });
  const params = new URLSearchParams(search);
  return <WorkspaceBackendProvider>{params.get("browse") === "1"
    ? <GuideNavigation key={params.get("group") || "default"} initialGroup={params.get("group")} />
    : <Workspace />}</WorkspaceBackendProvider>;
}

function GuideNavigation({ initialGroup }: { initialGroup: string | null }) {
  const [active, setActive] = useState(() => {
    const index = guideGroups.findIndex(group => group.id === initialGroup);
    return index < 0 ? defaultGuideIndex : index;
  });
  const [bar, setBar] = useState<{ top: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);
  // False while the strip slides, so every frame in between is visible; true at rest.
  const [settled, setSettled] = useState(true);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const activeRef = useRef(active);
  const rows = useRef<(HTMLAnchorElement | null)[]>([]);
  const list = useRef<HTMLUListElement>(null);
  // A touch tap on an inactive row only selects it, as hover would; the next tap opens it.
  const press = useRef({ type: "", wasActive: false });
  const preview = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const row = rows.current[active];
    if (row) setBar({ top: row.offsetTop, height: row.offsetHeight });
  }, [active]);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (list.current) observer.observe(list.current);
    return () => observer.disconnect();
  }, [measure]);

  // The first position is applied without a transition; later changes animate.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useLayoutEffect(() => () => { clearTimeout(urlTimer.current); clearTimeout(settleTimer.current); }, []);

  // Keep the selected group in the URL for refresh and Back. Replace rather than push, so hovering never
  // fills the history, and debounce it: Next.js applies history writes to its router asynchronously.
  function writeGroupUrl(index: number) {
    const url = new URL(window.location.href);
    if (url.searchParams.get("browse") !== "1" || url.searchParams.get("group") === guideGroups[index].id) return false;
    url.searchParams.set("group", guideGroups[index].id);
    window.history.replaceState(null, "", url);
    return true;
  }

  // While someone is working in a live frame, passing the pointer over a row must not pull the frame away.
  const workingInPreview = () => !!preview.current?.contains(document.activeElement) && document.activeElement !== preview.current;

  function select(index: number, fromPointer = false) {
    if (index === activeRef.current || (fromPointer && workingInPreview())) return;
    activeRef.current = index;
    setActive(index);
    setSettled(false);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettled(true), 1200);
    clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => writeGroupUrl(index), 150);
  }

  function onPointerDown(event: PointerEvent, index: number) {
    press.current = { type: event.pointerType, wasActive: index === active };
  }

  function onClick(event: MouseEvent, index: number) {
    const { type, wasActive } = press.current;
    press.current = { type: "", wasActive: false };
    if (type === "touch" && !wasActive) { event.preventDefault(); return; }
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    clearTimeout(urlTimer.current);
    if (writeGroupUrl(index)) {
      // Let the router settle the group URL before pushing the workspace entry on top of it.
      event.preventDefault();
      setTimeout(() => navigateWorkspaceHref(guideGroups[index].href), 80);
    }
  }

  // A horizontal finger swipe anywhere on the page steps through the groups, as hover does with a mouse.
  // Vertical movement stays with the browser (page scroll), and so do text fields and the plan's drag grips.
  const swipe = useRef({ id: -1, x: 0, y: 0, at: -Infinity });

  function onSwipeStart(event: PointerEvent) {
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    const ignored = (event.target as Element).closest("input, textarea, select, [contenteditable], .ap__grip");
    swipe.current = { ...swipe.current, id: ignored ? -1 : event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onSwipeMove(event: PointerEvent) {
    const gesture = swipe.current;
    if (event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { gesture.id = -1; return; }
    if (Math.abs(dx) < swipeDistance || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    gesture.id = -1;
    gesture.at = event.timeStamp;
    const next = Math.min(guideGroups.length - 1, Math.max(0, activeRef.current + (dx < 0 ? 1 : -1)));
    select(next);
  }

  function onSwipeEnd(event: PointerEvent) {
    if (event.pointerId === swipe.current.id) swipe.current.id = -1;
  }

  // The tap that ends a swipe must not open the page under the finger.
  function onClickCapture(event: MouseEvent) {
    if (event.timeStamp - swipe.current.at > 400) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onKeyDown(event: KeyboardEvent) {
    const last = guideGroups.length - 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? last
      : event.key === "ArrowDown" || event.key === "ArrowRight" ? (active + 1) % guideGroups.length
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (active + last) % guideGroups.length : -1;
    if (next < 0) return;
    event.preventDefault();
    rows.current[next]?.focus();
  }

  return <main className="guide-page" onPointerDown={onSwipeStart} onPointerMove={onSwipeMove} onPointerUp={onSwipeEnd} onPointerCancel={onSwipeEnd} onClickCapture={onClickCapture}>
    <GradientFloor className="guide-floor" />
    <div className="guide-stage">
      <h1 className="guide-heading"><span>How I can help you</span><sup>(SERVICES)</sup></h1>
      <div className="guide-grid">
        <nav aria-label="Guide me">
          <ul className="guide-list" ref={list} data-ready={ready ? "" : undefined} onKeyDown={onKeyDown}>
            {bar && <li className="guide-bar" aria-hidden="true" style={{ transform: `translateY(${bar.top}px)`, height: bar.height }} />}
            {guideGroups.map((group, index) => <li key={group.id}>
              <WorkspaceLink
                href={group.href}
                className="guide-item"
                aria-current={index === active ? "true" : undefined}
                ref={element => { rows.current[index] = element; }}
                onPointerEnter={event => { if (event.pointerType !== "touch") select(index, true); }}
                onPointerDown={event => onPointerDown(event, index)}
                onFocus={() => select(index)}
                onClick={event => onClick(event, index)}
              >
                <span className="guide-item__number">({group.number})</span>
                <span className="guide-item__name">{group.name}</span>
              </WorkspaceLink>
            </li>)}
          </ul>
        </nav>
        <div className="guide-preview" ref={preview} data-settled={settled ? "" : undefined}>
          <div className="guide-preview__strip" style={{ "--guide-index": active, "--guide-count": guideGroups.length } as CSSProperties} onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === "transform") { clearTimeout(settleTimer.current); setSettled(true); } }}>
            {guideGroups.map((group, index) => {
              const live = liveFrameOf(group);
              return <div
                className="guide-preview__frame"
                key={group.id}
                data-empty={group.image || live ? undefined : ""}
                data-live={live ? "" : undefined}
                inert={live && index !== active ? true : undefined}
                data-active={index === active ? "" : undefined}
              >
                {group.image && <Image src={group.image} alt="" fill sizes="224px" unoptimized priority={index === active} />}
                {live === "writing-assistant" && <div className="guide-live"><WritingAssistant speech="simulate" /></div>}
                {live === "agent-plan" && <div className="guide-live"><InvoicePlan /></div>}
              </div>;
            })}
          </div>
          {!liveFrameOf(guideGroups[active]) && <WorkspaceLink href={guideGroups[active].href} className="guide-preview__link" tabIndex={-1} aria-label={`Open ${guideGroups[active].name}`} />}
        </div>
      </div>
    </div>
  </main>;
}
