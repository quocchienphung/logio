"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AgentCursor, AgentPresence } from "../affectui-agent-cursors/AgentCursor";
import { ArtworkNotes } from "./ArtworkNotes";
import { AgentComments } from "./AgentComments";
import { FrameCraft } from "./FrameCraft";
import { StudioPainter } from "./painter";
import { ARTWORK_SRC, artistAgents, doingAt, phaseAt, STUDIO_DURATION, WORKSPACE_HREF, PAINT_END, FRAME_START, FRAME_END, progressBetween } from "./studio-timeline";
import "../affectui-fonts.css";
import "./guide-intro.css";

function positionWriters(page: HTMLElement, elapsed: number, reduced: boolean) {
  const bounds = page.getBoundingClientRect();
  const contentRight = page.querySelector(".guide-intro__document")?.getBoundingClientRect().right ?? bounds.right;
  for (const [side, id, start] of [["left", "writer", 775], ["right", "researcher", 1240]] as const) {
    const anchor = page.querySelector<HTMLElement>(`[data-writing-anchor="${side}"]`);
    const node = page.querySelector<HTMLElement>(`[data-agent="${id}"]`);
    if (!anchor || !node) continue;
    const at = anchor.getBoundingClientRect();
    const x = at.left - bounds.left, y = at.top - bounds.top + 3;
    node.dataset.targetX = String(x); node.dataset.targetY = String(y);
    node.style.opacity = String(reduced ? 0 : Math.min(1, Math.max(0, (elapsed - start) / 330), Math.max(0, (13700 - elapsed) / 650)));
    node.dataset.edge = x > contentRight - bounds.left - 150 ? "right" : "left";
    node.dataset.bottom = String((bounds.width < 520 && side === "left") || y > bounds.height - 70);
  }
}

export function GuideIntro() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [following, setFollowing] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef({ elapsed: 0, paused: false, reduced: false, interacting: false });
  const phase = phaseAt(elapsed).id;
  const holdForComment = useCallback((active: boolean) => { clock.current.interacting = active; }, []);

  useEffect(() => { router.prefetch(WORKSPACE_HREF); }, [router]);

  // Read after React lays out the typed text, including wrapping and inline edits.
  useLayoutEffect(() => {
    if (root.current) positionWriters(root.current, elapsed, clock.current.reduced);
  }, [elapsed]);

  useEffect(() => {
    const art = new Image();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => { setReduced(preference.matches); clock.current.reduced = preference.matches; };
    preference.addEventListener("change", motionChange);
    let painter: StudioPainter | undefined, frame = 0, previous = 0, disposed = false;
    let published = -100, resizeNeeded = true;
    let artBounds = { left: 0, top: 0, width: 1, height: 1 };
    let frameTransform: DOMMatrix | null = null, frameLength = 1, frameScreenLength = 1;
    let frameRoute: { local: number; screen: number }[] = [];
    const allNodes = Array.from(root.current?.querySelectorAll<HTMLElement>(".artist-cursor") ?? []);
    const nodes = allNodes.slice(0, 4), writers = allNodes.slice(4, 6), framer = allNodes[6];
    const strokes = Array.from(root.current?.querySelectorAll<SVGPathElement>("[data-frame-stroke]") ?? []);
    const writerPoints = writers.map(() => ({ x: Number.NaN, y: Number.NaN }));
    const resize = new ResizeObserver(() => {
      resizeNeeded = true;
      if (root.current) positionWriters(root.current, clock.current.elapsed, preference.matches);
    });
    if (root.current) resize.observe(root.current);
    if (canvas.current) resize.observe(canvas.current);
    const documentPanel = root.current?.querySelector(".guide-intro__document");
    const scrolled = () => { resizeNeeded = true; if (root.current) positionWriters(root.current, clock.current.elapsed, preference.matches); };
    documentPanel?.addEventListener("scroll", scrolled, { passive: true });
    const visibility = () => { previous = 0; };
    document.addEventListener("visibilitychange", visibility);

    function measure() {
      if (!root.current || !canvas.current || !painter) return;
      const outer = root.current.getBoundingClientRect(), inner = canvas.current.getBoundingClientRect();
      artBounds = { left: inner.left - outer.left, top: inner.top - outer.top, width: inner.width, height: inner.height };
      painter.resize(inner.width, inner.height);
      frameTransform = strokes[0]?.getScreenCTM() ?? null;
      if (frameTransform) { frameTransform.e -= outer.left; frameTransform.f -= outer.top; }
      if (frameTransform) {
        frameLength = strokes[0].getTotalLength();
        frameRoute = [{ local: 0, screen: 0 }];
        let previousPoint = strokes[0].getPointAtLength(0).matrixTransform(frameTransform);
        let distance = 0;
        for (let i = 1; i <= 720; i++) {
          const local = i / 720 * frameLength;
          const point = strokes[0].getPointAtLength(local).matrixTransform(frameTransform);
          distance += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
          frameRoute.push({ local, screen: distance }); previousPoint = point;
        }
        frameScreenLength = distance;
        for (const stroke of strokes) stroke.style.strokeDasharray = String(frameLength);
      }
      const visible = documentPanel?.getBoundingClientRect();
      if (visible) root.current.style.setProperty("--cursor-clip", `${visible.top - outer.top}px ${outer.right - visible.right}px ${outer.bottom - visible.bottom}px ${visible.left - outer.left}px`);
      resizeNeeded = false;
    }

    function tick(now: number) {
      if (disposed || !painter || !root.current) return;
      const delta = previous ? Math.min(64, now - previous) : 16;
      if (previous && !clock.current.paused && !clock.current.interacting && !document.hidden) clock.current.elapsed += now - previous;
      previous = now;
      if (resizeNeeded) measure();
      const t = Math.min(STUDIO_DURATION, clock.current.elapsed);
      clock.current.reduced = preference.matches;
      const rendered = painter.render(preference.matches ? PAINT_END : Math.min(t, PAINT_END));
      if (t - published >= 32 || t >= STUDIO_DURATION) {
        published = t;
        setElapsed(preference.matches ? PAINT_END : t);
      }
      root.current.dataset.elapsed = String(Math.round(t));
      root.current.dataset.reduced = String(preference.matches);
      root.current.dataset.leaving = String(t >= 14700);
      root.current.dataset.interacting = String(clock.current.interacting);
      const frameTime = preference.matches ? 1 : progressBetween(t, FRAME_START, FRAME_END);
      // Gentle launch and landing; the rounded path carries momentum through each corner.
      const frameProgress = frameTime * frameTime * (3 - 2 * frameTime);
      const distance = frameProgress * frameScreenLength;
      const routeIndex = Math.max(1, frameRoute.findIndex(point => point.screen >= distance));
      const from = frameRoute[routeIndex - 1], to = frameRoute[routeIndex];
      const localDistance = from && to ? from.local + (to.local - from.local) * (distance - from.screen) / Math.max(.001, to.screen - from.screen) : 0;
      root.current.dataset.frameProgress = frameProgress.toFixed(4);
      for (const stroke of strokes) {
        stroke.style.opacity = frameProgress > 0 ? "1" : "0";
        stroke.style.strokeDashoffset = String(frameLength - localDistance);
        // A solid closed mask seals every joint, including the start/end join.
        stroke.style.strokeDasharray = frameProgress >= 1 ? "none" : String(frameLength);
      }
      for (const [i, node] of nodes.entries()) {
        const point = rendered.points[i];
        const x = artBounds.left + point.x * artBounds.width, y = artBounds.top + point.y * artBounds.height;
        node.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
        node.dataset.x = String(point.x); node.dataset.y = String(point.y);
        node.dataset.edge = x > root.current.clientWidth - 140 ? "right" : "left";
        node.dataset.bottom = "false";
        node.style.opacity = String(preference.matches ? 0 : Math.min(1, Math.max(0, (t - 260 - i * 60) / 400), Math.max(0, (13900 - t) / 650)));
      }
      for (const [i, node] of writers.entries()) {
        const x = Number(node.dataset.targetX), y = Number(node.dataset.targetY);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const point = writerPoints[i], blend = 1 - Math.exp(-delta / 30);
        point.x = Number.isFinite(point.x) ? point.x + (x - point.x) * blend : x;
        point.y = Number.isFinite(point.y) ? point.y + (y - point.y) * blend : y;
        node.style.transform = `translate3d(${point.x.toFixed(2)}px,${point.y.toFixed(2)}px,0)`;
      }
      if (framer && frameTransform && strokes[0]) {
        const point = strokes[0].getPointAtLength(localDistance).matrixTransform(frameTransform);
        const x = point.x, y = point.y;
        framer.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
        framer.style.setProperty("--wand-tilt", `${(Math.sin(t / 580) * 5 * Math.sin(frameTime * Math.PI)).toFixed(2)}deg`);
        framer.style.opacity = String(preference.matches ? 0 : Math.min(progressBetween(t, FRAME_START - 300, FRAME_START), 1 - progressBetween(t, FRAME_END, 13900)));
        framer.dataset.edge = x > root.current.clientWidth - 160 ? "right" : "left";
        framer.dataset.bottom = "false";
      }
      if (t >= STUDIO_DURATION && !clock.current.paused && !clock.current.interacting) { router.replace(WORKSPACE_HREF); return; }
      frame = requestAnimationFrame(tick);
    }

    art.onload = () => {
      if (disposed || !canvas.current || !root.current) return;
      try {
        clock.current.elapsed = 0;
        motionChange();
        painter = new StudioPainter(canvas.current, art);
        measure(); painter.render(preference.matches ? PAINT_END : 0);
        setStatus("ready"); frame = requestAnimationFrame(tick);
      } catch { setStatus("error"); }
    };
    art.onerror = () => { if (!disposed) setStatus("error"); };
    art.src = ARTWORK_SRC;
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); documentPanel?.removeEventListener("scroll", scrolled); document.removeEventListener("visibilitychange", visibility); preference.removeEventListener("change", motionChange); painter?.dispose(); art.onload = null; art.onerror = null; };
  }, [attempt, router]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.code === "Escape") router.replace(WORKSPACE_HREF);
      if (event.code === "Space" && event.target === document.body) {
        event.preventDefault(); clock.current.paused = !clock.current.paused; setPaused(clock.current.paused);
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); };
  }, [router]);

  return <main ref={root} className="guide-intro" data-ready={status === "ready"} data-phase={phase} data-paused={paused} aria-label="Agents painting The Starry Night and writing its story">
    <div className="guide-intro__sheet">
      <header className="guide-intro__bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>
        <AgentPresence agents={artistAgents} following={following} onFollow={setFollowing} done={phase === "final"} />
      </header>
      <div className="guide-intro__document">
        <ArtworkNotes side="left" elapsed={elapsed} complete={elapsed >= STUDIO_DURATION} />
        <figure className="guide-intro__artwork" data-painting-frame>
          <div className="guide-intro__paper">
            <canvas ref={canvas} className="guide-intro__canvas" role="img" aria-label="The Starry Night by Vincent van Gogh, progressively painted by four collaborating agents." />
          </div>
          <FrameCraft />
        </figure>
        <ArtworkNotes side="right" elapsed={elapsed} complete={elapsed >= STUDIO_DURATION} />
        <div className="guide-intro__comment-space" data-comment-space="mobile" aria-hidden="true" />
        <AgentComments elapsed={elapsed} reduced={reduced} onInteractionChange={holdForComment} />
      </div>
    </div>
    <div className="guide-intro__cursors" aria-hidden="true">{artistAgents.map(agent => <AgentCursor key={agent.id} agent={agent} doing={doingAt(agent.id, phase)} dimmed={Boolean(following && following !== agent.id)} typing={agent.id === "writer" || agent.id === "researcher"} />)}</div>
    <Link href={WORKSPACE_HREF} replace className="guide-intro__skip">Skip intro</Link>
    {status === "error" && <div className="guide-intro__error" role="alert"><p>The artwork couldn’t load.</p><button type="button" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Retry artwork</button><Link href={WORKSPACE_HREF} replace>Continue to workspace</Link></div>}
    <p className="guide-intro__sr" role="status">{status === "loading" ? "Preparing artwork." : paused ? "Intro paused. Press Space to resume or Escape to skip." : "A fifteen-second painting intro. Seven agents paint, write and craft a gilded frame. Hover or focus a comment to pause and reply. Press Space to pause or Escape to skip."}</p>
  </main>;
}
