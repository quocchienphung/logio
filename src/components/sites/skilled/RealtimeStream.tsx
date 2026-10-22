"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import "./realtime-stream.css";

export interface StreamPoint {
  t: number;
  value: number;
  anomaly?: string;
}

interface RealtimeStreamProps {
  points: readonly StreamPoint[];
  label: string;
  unit?: string;
  description?: string;
  emptyLabel?: string;
  className?: string;
  windowMs?: number;
  interval?: number;
  height?: number;
}

interface HeldView {
  points: readonly StreamPoint[];
  end: number;
}

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

function formatTime(t: number) {
  return Math.abs(t) <= 8.64e15 ? timeFormat.format(t) : "—";
}

function lowerBound(points: readonly StreamPoint[], time: number) {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].t < time) low = middle + 1;
    else high = middle;
  }
  return low;
}

function nearest(points: readonly StreamPoint[], time: number) {
  const right = lowerBound(points, time);
  if (right === 0) return 0;
  if (right === points.length) return right - 1;
  return time - points[right - 1].t < points[right].t - time ? right - 1 : right;
}

/** Independently authored from the public Arc preview. This chart never invents readings. */
export function RealtimeStream({
  points, label, unit = "ms", description, emptyLabel = "Waiting for measurements",
  className = "", windowMs = 30000, interval = 1000, height = 200,
}: RealtimeStreamProps) {
  const helpId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const viewRef = useRef({ end: 0, min: 0, max: 1 });
  const markerBirths = useRef(new Map<number, number>());
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState<HeldView | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [plotWidth, setPlotWidth] = useState(590);
  const [announcement, setAnnouncement] = useState("");
  const span = Number.isFinite(windowMs) ? Math.max(1000, Math.min(3600000, windowMs)) : 30000;
  const cadence = Number.isFinite(interval) ? Math.max(100, Math.min(60000, interval)) : 1000;
  const plotHeight = Number.isFinite(height) ? Math.max(120, Math.min(600, height)) : 200;
  const cleanPoints = useMemo(() => points.slice(-2000)
    .filter(point => Number.isFinite(point.t) && Number.isFinite(point.value) && Math.abs(point.t) <= 8.64e15)
    .sort((a, b) => a.t - b.t), [points]);
  const visiblePoints = held?.points ?? cleanPoints;
  const latest = visiblePoints.at(-1);
  const reading = selected === null ? undefined : visiblePoints[selected];
  const end = held?.end ?? latest?.t ?? 0;
  const startIndex = Math.max(0, lowerBound(visiblePoints, end - span) - 1);
  const selectedPoint = latest;
  const readout = selectedPoint ? numberFormat.format(selectedPoint.value) : "—";
  const tooltipX = reading ? Math.max(4, Math.min(plotWidth - 124, ((reading.t - end + span) / span) * (plotWidth - 44) + 12)) : 0;

  function holdView() {
    if (!held) setHeld({ points: cleanPoints, end: viewRef.current.end || cleanPoints.at(-1)?.t || 0 });
  }

  function togglePause() {
    if (paused) {
      setPaused(false);
      setHeld(null);
      setSelected(null);
    } else {
      holdView();
      setPaused(true);
    }
  }

  function clearReading() {
    setSelected(null);
    if (!paused) setHeld(null);
  }

  function readPointer(event: PointerEvent<HTMLDivElement>) {
    if (!visiblePoints.length) return;
    holdView();
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width - 44)));
    const frozenEnd = held?.end ?? viewRef.current.end ?? end;
    setSelected(nearest(visiblePoints, frozenEnd - span + fraction * span));
  }

  function readKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const current = selected ?? visiblePoints.length - 1;
    let next: number | undefined;
    if (event.key === "ArrowLeft") next = current - 1;
    if (event.key === "ArrowRight") next = current + 1;
    if (event.key === "PageUp") next = current - 10;
    if (event.key === "PageDown") next = current + 10;
    if (event.key === "Home") next = startIndex;
    if (event.key === "End") next = visiblePoints.length - 1;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      togglePause();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setPaused(false);
      setHeld(null);
      setSelected(null);
    } else if (next !== undefined && visiblePoints.length) {
      event.preventDefault();
      holdView();
      const index = Math.max(startIndex, Math.min(visiblePoints.length - 1, next));
      setSelected(index);
      const point = visiblePoints[index];
      setAnnouncement(`${numberFormat.format(point.value)} ${unit}, ${formatTime(point.t)}${point.anomaly ? `, ${point.anomaly}` : ""}`);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const plot = plotRef.current;
    const figure = figureRef.current;
    if (!canvas || !plot || !figure) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let width = plot.clientWidth;
    let onScreen = true;
    let stopped = false;
    let lastFrame = 0;
    let colors = { line: "#1687ed", anomaly: "#7934ac", text: "#858585", grid: "#e9e9e9", surface: "#fff" };
    const targetEnd = held?.end ?? visiblePoints.at(-1)?.t ?? 0;
    const windowPoints = visiblePoints.slice(Math.max(0, lowerBound(visiblePoints, targetEnd - span) - 1));
    const markerNow = performance.now();
    for (const point of windowPoints) {
      if (point.anomaly && !markerBirths.current.has(point.t)) markerBirths.current.set(point.t, markerNow);
    }
    for (const time of markerBirths.current.keys()) {
      if (time < targetEnd - span * 2) markerBirths.current.delete(time);
    }
    let low = 0;
    let high = 1;
    if (windowPoints.length) {
      low = Math.min(...windowPoints.map(point => point.value));
      high = Math.max(...windowPoints.map(point => point.value));
      const padding = Math.max(1, (high - low) * 0.2, Math.abs(high) * 0.12);
      low = Math.max(low >= 0 ? 0 : -Infinity, low - padding);
      high += padding;
      if (high <= low) high = low + 1;
    }
    if (!viewRef.current.end || motion.matches || held) {
      viewRef.current = { end: targetEnd, min: low, max: high };
    }

    function resolveColors() {
      const style = getComputedStyle(figure!);
      colors = {
        line: style.getPropertyValue("--stream-line").trim() || "#1687ed",
        anomaly: style.getPropertyValue("--stream-anomaly").trim() || "#7934ac",
        text: style.getPropertyValue("--stream-muted").trim() || "#858585",
        grid: style.getPropertyValue("--stream-grid").trim() || "#e9e9e9",
        surface: style.getPropertyValue("--stream-surface").trim() || "#fff",
      };
    }

    function draw(now: number) {
      frame = 0;
      if (stopped || !onScreen || document.hidden || !context || !canvas) return;
      const delta = Math.min(80, now - (lastFrame || now - 16));
      lastFrame = now;
      const ease = motion.matches || held ? 1 : 1 - Math.exp(-delta / 120);
      const view = viewRef.current;
      view.end += (targetEnd - view.end) * ease;
      view.min += (low - view.min) * ease;
      view.max += (high - view.max) * ease;
      const chartWidth = Math.max(1, width - 44);
      const bottom = plotHeight - 22;
      const top = 10;
      const x = (t: number) => ((t - view.end + span) / span) * chartWidth;
      const y = (value: number) => bottom - ((value - view.min) / Math.max(0.0001, view.max - view.min)) * (bottom - top);
      context.clearRect(0, 0, width, plotHeight);
      context.font = "12px Inter, Arial, sans-serif";
      context.textBaseline = "middle";
      context.lineWidth = 1;
      context.strokeStyle = colors.grid;
      context.fillStyle = colors.text;
      const step = 10 ** Math.floor(Math.log10((view.max - view.min) / 3));
      const tickStep = Math.ceil((view.max - view.min) / (3 * step)) * step;
      for (let value = Math.ceil(view.min / tickStep) * tickStep, count = 0; value <= view.max && count < 8; value += tickStep, count++) {
        const position = y(value);
        context.beginPath(); context.moveTo(0, position); context.lineTo(chartWidth, position); context.stroke();
        context.fillText(numberFormat.format(value), chartWidth + 9, position);
      }
      const divisions = width < 360 ? 3 : 6;
      for (let i = 0; i <= divisions; i++) {
        context.textAlign = i === 0 ? "left" : i === divisions ? "right" : "center";
        const seconds = Math.round((span / 1000) * (1 - i / divisions));
        context.fillText(i === divisions ? "now" : `−${seconds}s`, chartWidth * i / divisions, plotHeight - 8);
      }
      context.textAlign = "left";
      const first = Math.max(0, lowerBound(visiblePoints, view.end - span) - 1);
      const last = Math.min(visiblePoints.length, lowerBound(visiblePoints, view.end + cadence) + 1);
      const drawn = visiblePoints.slice(first, last);
      let animatingMarker = false;
      if (drawn.length) {
        context.save();
        context.beginPath(); context.rect(0, 0, chartWidth, bottom + 1); context.clip();
        const path = new Path2D();
        path.moveTo(x(drawn[0].t), y(drawn[0].value));
        for (let index = 1; index < drawn.length; index++) {
          const previous = drawn[index - 1];
          const point = drawn[index];
          const middle = (x(previous.t) + x(point.t)) / 2;
          path.bezierCurveTo(middle, y(previous.value), middle, y(point.value), x(point.t), y(point.value));
        }
        const area = new Path2D(path);
        area.lineTo(x(drawn.at(-1)!.t), bottom); area.lineTo(x(drawn[0].t), bottom); area.closePath();
        context.fillStyle = colors.line; context.globalAlpha = 0.08; context.fill(area); context.globalAlpha = 1;
        context.strokeStyle = colors.line; context.lineWidth = 1.75; context.lineJoin = "round"; context.stroke(path);
        const head = drawn.at(-1)!;
        context.beginPath(); context.arc(x(head.t), y(head.value), 4, 0, Math.PI * 2); context.fill();
        for (const point of drawn) {
          if (!point.anomaly) continue;
          const px = x(point.t); const py = y(point.value);
          const age = Math.max(0, now - (markerBirths.current.get(point.t) ?? 0));
          const scale = motion.matches || held ? 1 : 1 - Math.exp(-age / 100) * Math.cos(age / 75);
          if (age < 700 && !held) animatingMarker = true;
          context.fillStyle = colors.anomaly;
          context.beginPath(); context.arc(px, py, 4 * Math.max(0, scale), 0, Math.PI * 2); context.fill();
          const text = point.anomaly.slice(0, 22);
          const textWidth = context.measureText(text).width;
          const tagX = Math.max(0, Math.min(chartWidth - textWidth - 12, px - textWidth / 2 - 6));
          context.globalAlpha = 0.12; context.fillRect(tagX, Math.max(0, py - 27), textWidth + 12, 20); context.globalAlpha = 1;
          context.fillText(text, tagX + 6, Math.max(10, py - 17));
        }
        if (reading) {
          const px = x(reading.t); const py = y(reading.value);
          context.strokeStyle = colors.text; context.lineWidth = 1;
          context.beginPath(); context.moveTo(px, top); context.lineTo(px, bottom); context.stroke();
          context.fillStyle = colors.line; context.strokeStyle = colors.surface;
          context.beginPath(); context.arc(px, py, 4.5, 0, Math.PI * 2); context.fill(); context.lineWidth = 2; context.stroke();
        }
        context.restore();
      }
      const unsettled = Math.abs(view.end - targetEnd) > 0.5 || Math.abs(view.min - low) > 0.01 || Math.abs(view.max - high) > 0.01;
      if (!motion.matches && !held && (unsettled || animatingMarker)) frame = requestAnimationFrame(draw);
    }

    function schedule() {
      if (!frame && !stopped && onScreen && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function resize() {
      width = plot!.clientWidth;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(plotHeight * dpr);
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      setPlotWidth(width);
      resolveColors();
      schedule();
    }
    function visibility() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else { lastFrame = 0; resolveColors(); schedule(); }
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(plot);
    const intersectionObserver = new IntersectionObserver(entries => {
      onScreen = entries[0]?.isIntersecting ?? true;
      if (!onScreen) { cancelAnimationFrame(frame); frame = 0; }
      else { lastFrame = 0; schedule(); }
    });
    intersectionObserver.observe(plot);
    const themeObserver = new MutationObserver(() => { resolveColors(); schedule(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", schedule);
    resize();
    return () => {
      stopped = true; cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersectionObserver.disconnect(); themeObserver.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", schedule);
    };
  }, [visiblePoints, held, reading, span, cadence, plotHeight]);

  const anomalies = cleanPoints.filter(point => point.anomaly).slice(-3);
  return (
    <figure ref={figureRef} className={`skilled-stream ${className}`} aria-label={label}>
      <figcaption className="skilled-stream-caption">
        <span>{label}</span>{description && <small>{description}</small>}
      </figcaption>
      <div className="skilled-stream-head">
        <p className="skilled-stream-now" aria-label={`${label}, ${readout}${selectedPoint ? ` ${unit}` : ""}`}>
          <span className="skilled-stream-value" aria-hidden="true">{readout}</span>
          <span className="skilled-stream-unit" aria-hidden="true">{unit}</span>
        </p>
        <button type="button" className="skilled-stream-status" aria-pressed={paused} onClick={togglePause}>
          <span className="skilled-stream-dot" data-paused={paused || undefined} aria-hidden="true" />
          <span>{paused ? "Paused" : held ? "Reading" : "Live"}</span>
          <span className="skilled-stream-sr">{paused ? ", resume" : ", pause"}</span>
        </button>
      </div>
      <div ref={plotRef} className="skilled-stream-plot" style={{ height: plotHeight }} role="group" tabIndex={0}
        aria-roledescription="live chart" aria-label={`${label}, last ${span / 1000} seconds`}
        aria-describedby={helpId} onKeyDown={readKeyboard}
        onFocus={() => { holdView(); if (visiblePoints.length) setSelected(visiblePoints.length - 1); }}
        onBlur={clearReading} onPointerMove={readPointer} onPointerLeave={clearReading}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); readPointer(event); }}
        onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId); if (event.pointerType !== "mouse") clearReading(); }}
        onPointerCancel={clearReading}>
        <canvas ref={canvasRef} aria-hidden="true" />
        {!latest && <p className="skilled-stream-empty">{emptyLabel}</p>}
        {reading && <div className="skilled-stream-tooltip" style={{ left: tooltipX }} aria-hidden="true">
          <strong>{numberFormat.format(reading.value)} {unit}</strong>
          <span>{formatTime(reading.t)}{reading.anomaly ? ` · ${reading.anomaly}` : ""}</span>
        </div>}
      </div>
      <p id={helpId} className="skilled-stream-sr">Focus holds the view. Arrow keys read points; Home and End jump to the first and last point; Page Up and Page Down move ten points. Space pauses or resumes. Escape resumes the live view.</p>
      <p className="skilled-stream-sr" aria-live="polite" aria-atomic="true">{announcement}</p>
      <p className="skilled-stream-sr" aria-live="polite" aria-atomic="false">{anomalies.map(point => <span key={`${point.t}-${point.anomaly}`}>{point.anomaly}, {numberFormat.format(point.value)} {unit}, {formatTime(point.t)}. </span>)}</p>
      <div className="skilled-stream-sr"><table>
        <caption>{label}, latest 20 readings</caption>
        <thead><tr><th scope="col">Time</th><th scope="col">Value</th><th scope="col">Note</th></tr></thead>
        <tbody>{cleanPoints.slice(-20).map((point, index) => <tr key={`${point.t}-${index}`}>
          <th scope="row">{formatTime(point.t)}</th><td>{numberFormat.format(point.value)} {unit}</td><td>{point.anomaly}</td>
        </tr>)}</tbody>
      </table></div>
    </figure>
  );
}
