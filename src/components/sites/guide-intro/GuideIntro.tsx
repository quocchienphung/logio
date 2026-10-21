"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AgentCursor, AgentPresence } from "../affectui-agent-cursors/AgentCursor";
import { ArtworkNotes } from "./ArtworkNotes";
import { AgentComments } from "./AgentComments";
import { StudioPainter } from "./painter";
import { ARTWORK_SRC, artistAgents, doingAt, phaseAt, STUDIO_DURATION, WORKSPACE_HREF } from "./studio-timeline";
import "../affectui-fonts.css";
import "./guide-intro.css";

function positionWriters(page: HTMLElement, elapsed: number, reduced: boolean) {
  const bounds = page.getBoundingClientRect();
  for (const [side, id, start] of [["left", "writer", 500], ["right", "researcher", 800]] as const) {
    const anchor = page.querySelector<HTMLElement>(`[data-writing-anchor="${side}"]`);
    const node = page.querySelector<HTMLElement>(`[data-agent="${id}"]`);
    if (!anchor || !node) continue;
    const at = anchor.getBoundingClientRect();
    const x = at.left - bounds.left, y = at.top - bounds.top + 3;
    node.style.transform = `translate3d(${x}px,${y}px,0)`;
    node.style.opacity = String(reduced ? 0 : Math.min(1, Math.max(0, (elapsed - start) / 220), Math.max(0, (8800 - elapsed) / 350)));
    node.dataset.edge = x > bounds.width - 160 ? "right" : "left";
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
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>(".artist-cursor") ?? []).slice(0, 4);
    const resize = new ResizeObserver(() => {
      resizeNeeded = true;
      if (root.current) positionWriters(root.current, clock.current.elapsed, preference.matches);
    });
    if (root.current) resize.observe(root.current);
    if (canvas.current) resize.observe(canvas.current);
    const visibility = () => { previous = 0; };
    document.addEventListener("visibilitychange", visibility);

    function measure() {
      if (!root.current || !canvas.current || !painter) return;
      const outer = root.current.getBoundingClientRect(), inner = canvas.current.getBoundingClientRect();
      artBounds = { left: inner.left - outer.left, top: inner.top - outer.top, width: inner.width, height: inner.height };
      painter.resize(inner.width, inner.height);
      resizeNeeded = false;
    }

    function tick(now: number) {
      if (disposed || !painter || !root.current) return;
      if (previous && !clock.current.paused && !clock.current.interacting && !document.hidden) clock.current.elapsed += now - previous;
      previous = now;
      if (resizeNeeded) measure();
      const t = Math.min(STUDIO_DURATION, clock.current.elapsed);
      clock.current.reduced = preference.matches;
      const rendered = painter.render(preference.matches ? STUDIO_DURATION : t);
      if (t - published >= 32 || t >= STUDIO_DURATION) {
        published = t;
        setElapsed(preference.matches ? STUDIO_DURATION : t);
      }
      root.current.dataset.elapsed = String(Math.round(t));
      root.current.dataset.reduced = String(preference.matches);
      root.current.dataset.leaving = String(t >= 9700);
      root.current.dataset.interacting = String(clock.current.interacting);
      for (const [i, node] of nodes.entries()) {
        const point = rendered.points[i];
        const x = artBounds.left + point.x * artBounds.width, y = artBounds.top + point.y * artBounds.height;
        node.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
        node.dataset.x = String(point.x); node.dataset.y = String(point.y);
        node.dataset.edge = x > root.current.clientWidth - 140 ? "right" : "left";
        node.dataset.bottom = "false";
        node.style.opacity = String(preference.matches ? 0 : Math.min(1, Math.max(0, (t - 260 - i * 45) / 250), Math.max(0, (9000 - t) / 400)));
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
        measure(); painter.render(preference.matches ? STUDIO_DURATION : 0);
        setStatus("ready"); frame = requestAnimationFrame(tick);
      } catch { setStatus("error"); }
    };
    art.onerror = () => { if (!disposed) setStatus("error"); };
    art.src = ARTWORK_SRC;
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener("visibilitychange", visibility); preference.removeEventListener("change", motionChange); painter?.dispose(); art.onload = null; art.onerror = null; };
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
          <span className="guide-intro__handle guide-intro__handle--tl" aria-hidden="true" />
          <span className="guide-intro__handle guide-intro__handle--tr" aria-hidden="true" />
          <span className="guide-intro__handle guide-intro__handle--bl" aria-hidden="true" />
          <span className="guide-intro__handle guide-intro__handle--br" aria-hidden="true" />
        </figure>
        <ArtworkNotes side="right" elapsed={elapsed} complete={elapsed >= STUDIO_DURATION} />
      </div>
    </div>
    <div className="guide-intro__cursors" aria-hidden="true">{artistAgents.map(agent => <AgentCursor key={agent.id} agent={agent} doing={doingAt(agent.id, phase)} dimmed={Boolean(following && following !== agent.id)} typing={agent.id === "writer" || agent.id === "researcher"} />)}</div>
    <AgentComments elapsed={elapsed} reduced={reduced} onInteractionChange={holdForComment} />
    <Link href={WORKSPACE_HREF} replace className="guide-intro__skip">Skip intro</Link>
    {status === "error" && <div className="guide-intro__error" role="alert"><p>The artwork couldn’t load.</p><button type="button" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Retry artwork</button><Link href={WORKSPACE_HREF} replace>Continue to workspace</Link></div>}
    <p className="guide-intro__sr" role="status">{status === "loading" ? "Preparing artwork." : paused ? "Intro paused. Press Space to resume or Escape to skip." : "A ten-second painting intro. Hover or focus a comment to pause and reply. Press Space to pause or Escape to skip. Your workspace opens automatically."}</p>
  </main>;
}
