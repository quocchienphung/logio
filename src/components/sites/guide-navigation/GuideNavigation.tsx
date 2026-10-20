"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { defaultGuideIndex, guideGroups, navigateWorkspaceHref, subscribeLocation } from "./navigation-model";
import { WorkspaceLink } from "./WorkspaceLink";
import "../affectui-fonts.css";
import "./guide-navigation.css";

const Workspace = dynamic(() => import("../affectui-crm/Crm").then(module => module.Crm), {
  loading: () => <div className="guide-loading" role="status">Opening your workspace…</div>,
});
const locationSnapshot = () => window.location.search;

export function PersonalizeApp({ initialBrowse = false, initialGroup }: { initialBrowse?: boolean; initialGroup?: string }) {
  const search = useSyncExternalStore(subscribeLocation, locationSnapshot, () => {
    if (!initialBrowse) return "";
    return initialGroup ? `?browse=1&group=${encodeURIComponent(initialGroup)}` : "?browse=1";
  });
  const params = new URLSearchParams(search);
  return params.get("browse") === "1"
    ? <GuideNavigation key={params.get("group") || "default"} initialGroup={params.get("group")} />
    : <Workspace />;
}

function GuideNavigation({ initialGroup }: { initialGroup: string | null }) {
  const [active, setActive] = useState(() => {
    const index = guideGroups.findIndex(group => group.id === initialGroup);
    return index < 0 ? defaultGuideIndex : index;
  });
  const [bar, setBar] = useState<{ top: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);
  const activeRef = useRef(active);
  const rows = useRef<(HTMLAnchorElement | null)[]>([]);
  const list = useRef<HTMLUListElement>(null);
  // A touch tap on an inactive row only selects it, as hover would; the next tap opens it.
  const press = useRef({ type: "", wasActive: false });

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
  useLayoutEffect(() => () => clearTimeout(urlTimer.current), []);

  // Keep the selected group in the URL for refresh and Back. Replace rather than push, so hovering never
  // fills the history, and debounce it: Next.js applies history writes to its router asynchronously.
  function writeGroupUrl(index: number) {
    const url = new URL(window.location.href);
    if (url.searchParams.get("browse") !== "1" || url.searchParams.get("group") === guideGroups[index].id) return false;
    url.searchParams.set("group", guideGroups[index].id);
    window.history.replaceState(null, "", url);
    return true;
  }

  function select(index: number) {
    if (index === activeRef.current) return;
    activeRef.current = index;
    setActive(index);
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

  function onKeyDown(event: KeyboardEvent) {
    const last = guideGroups.length - 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? last
      : event.key === "ArrowDown" || event.key === "ArrowRight" ? (active + 1) % guideGroups.length
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (active + last) % guideGroups.length : -1;
    if (next < 0) return;
    event.preventDefault();
    rows.current[next]?.focus();
  }

  return <main className="guide-page">
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
                onPointerEnter={event => { if (event.pointerType !== "touch") select(index); }}
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
        <WorkspaceLink href={guideGroups[active].href} className="guide-preview" tabIndex={-1} aria-label={`Open ${guideGroups[active].name}`}>
          <span className="guide-preview__strip" style={{ "--guide-index": active, "--guide-count": guideGroups.length } as CSSProperties}>
            {guideGroups.map((group, index) => <span className="guide-preview__frame" key={group.id} data-empty={group.image ? undefined : ""}>
              {group.image && <Image src={group.image} alt="" fill sizes="224px" unoptimized priority={index === active} />}
            </span>)}
          </span>
        </WorkspaceLink>
      </div>
    </div>
  </main>;
}
