"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgentSteeringDemo } from "@/components/sites/affectui-agent-steering/useAgentSteeringDemo";
import { IphoneDuoStage } from "../iphoneDuo/IphoneDuoStage";
import { AgentScreen, type AnnotationTarget, type ShowcaseTheme } from "./AgentScreen";
import { NOTE_GAP, NOTE_WIDTH, ShowcaseAnnotations } from "./ShowcaseAnnotations";
import "./agent-showcase.css";

/** Notes beside the device need two columns next to a ≥620 px device. */
const ASIDE_MIN = 620 + 2 * (NOTE_WIDTH + NOTE_GAP + 12);
/** Below this the embedded screen is too small to use; it opens as a sheet instead. */
const EXPAND_BELOW = 620;
const NOTE_STAGGER = 700;

/**
 * Homepage showcase: the stationary iPhone Duo running the affectUI Agent Steering simulation on its
 * inner display, with three guided annotations (shown once, on first view; replayable) and, on narrow
 * screens, a tap-to-expand sheet holding the same live demo.
 */
export function AgentShowcase() {
  const demo = useAgentSteeringDemo();
  const { setVisible, restart } = demo;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [theme, setTheme] = useState<ShowcaseTheme>("light");
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);
  const [tips, setTips] = useState(true);
  const [highlight, setHighlight] = useState<AnnotationTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const mode = width >= ASIDE_MIN ? "aside" : "strip";
  const expand = width > 0 && width < EXPAND_BELOW;
  const deviceWidth = mode === "aside" ? Math.min(790, width - 2 * (NOTE_WIDTH + NOTE_GAP + 12)) : Math.min(790, width);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(root);
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.intersectionRatio >= 0.35) setSeen(true);
      },
      { threshold: [0, 0.35] },
    );
    io.observe(root);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [setVisible]);

  // the guided sequence: one note after another, once per run of the demo
  useEffect(() => {
    if (!seen || !ready || !tips) return;
    const timers = [1, 2, 3].map((n) => window.setTimeout(() => setShown((s) => Math.max(s, n)), 400 + (n - 1) * NOTE_STAGGER));
    return () => timers.forEach(clearTimeout);
  }, [seen, ready, tips, run]);

  const replay = useCallback(() => {
    restart(true);
    setTips(true);
    setShown(0);
    setRun((r) => r + 1);
  }, [restart]);

  const openSheet = () => {
    sheetRef.current?.showModal();
    setSheetOpen(true);
  };

  return (
    <div ref={rootRef} className="agent-showcase" data-mode={mode} data-tips={tips ? undefined : "off"}>
      <header className="agent-showcase__head">
        <h2 className="hds-heading hds-heading--lg">AI workflows, with you in control.</h2>
        <p className="hds-heading hds-heading--lg hds-heading--subdued">Guide an agent in real time, without starting over.</p>
      </header>

      <div ref={stageRef} className="agent-showcase__stage">
        <div ref={deviceRef} className="agent-showcase__device" style={{ width: deviceWidth || undefined }}>
          <IphoneDuoStage theme={theme} interactive={!expand} onReady={() => setReady(true)}>
            <AgentScreen demo={demo} theme={theme} onThemeChange={setTheme} onReplay={replay} highlight={highlight} />
          </IphoneDuoStage>
          {expand && (
            <button type="button" className="agent-showcase__expand" onClick={openSheet}>
              <span>Tap to try the demo</span>
            </button>
          )}
        </div>
        {tips && mode === "aside" && (
          <ShowcaseAnnotations stageRef={stageRef} deviceRef={deviceRef} shown={shown} mode="aside" ready={ready} active={highlight} onHighlight={setHighlight} />
        )}
      </div>

      {tips && mode === "strip" && (
        <ShowcaseAnnotations stageRef={stageRef} deviceRef={deviceRef} shown={shown} mode="strip" ready={ready} active={highlight} onHighlight={setHighlight} />
      )}

      <div className="agent-showcase__actions">
        <button type="button" className="agent-showcase__action" onClick={replay}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.2 6a3.8 3.8 0 1 0 1.1-2.7M2.2 1.6v2.2h2.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Replay demo
        </button>
        <button type="button" className="agent-showcase__action" aria-pressed={!tips} onClick={() => setTips((t) => !t)}>
          {tips ? "Hide tips" : "Show tips"}
        </button>
        <span className="agent-showcase__disclaimer">Interactive simulation – no agent is running.</span>
      </div>

      <dialog ref={sheetRef} className="agent-sheet" aria-label="Agent Steering demo" onClose={() => setSheetOpen(false)}>
        <div className="agent-sheet__bar">
          <span>Agent Steering</span>
          <button type="button" className="agent-sheet__close" onClick={() => sheetRef.current?.close()} aria-label="Close the demo">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="m3.4 3.4 5.2 5.2M8.6 3.4 3.4 8.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {sheetOpen && <AgentScreen demo={demo} theme={theme} onThemeChange={setTheme} onReplay={replay} variant="sheet" />}
      </dialog>
    </div>
  );
}
