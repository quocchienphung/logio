"use client";

import { useEffect, useRef, useState } from "react";
import type { TimeOfDay } from "./dataviz/core";

// Official no-WebGL renderings of the data visualisation, one per stat.
const FALLBACKS = [
  ["/stripe/dataviz-fallback_2x-w1266-a1b21d3e-mono.webp", "/stripe/dataviz-fallback_2x-w2468-2377cae9-mono.webp"],
  ["/stripe/volume-fallback_2x-w1266-98a1eb6b-mono.webp", "/stripe/volume-fallback_2x-w2468-5e9d04ed-mono.webp"],
  ["/stripe/uptime-fallback_2x-w1266-23468cb1-mono.webp", "/stripe/uptime-fallback_2x-w2468-336461a3-mono.webp"],
  ["/stripe/subscriptions-fallback_2x-w1266-3d4bd1a9-mono.webp", "/stripe/subscriptions-fallback_2x-w2468-94988b2c-mono.webp"],
];

export function DataVizFallback({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="data-viz">
      <div className="data-viz__static">
        {FALLBACKS.map(([w1, w2], i) => (
          <img
            key={i}
            src={w1}
            srcSet={`${w1} 1266w, ${w2} 2468w`}
            sizes="(min-width: 1266px) 1266px, (min-width: 940px) 100vw, 150vw"
            width={2468}
            height={1038}
            alt=""
            hidden={i !== activeIndex}
          />
        ))}
      </div>
    </div>
  );
}

export interface DataVizProps {
  activeIndex: number;
  timeOfDay: TimeOfDay;
  /** Whether the viewport is at the desktop breakpoint (the reference only runs WebGL there). */
  desktop: boolean;
}

/**
 * Stats data visualisation (port of the reference `DataViz`): the Three.js controller runs while the
 * canvas intersects (threshold 0.1) on desktop; with reduced motion it renders one frame per state
 * and switches stats/palettes without tweening. Falls back to the official stills when WebGL fails.
 */
export function DataViz({ activeIndex, timeOfDay, desktop }: DataVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<import("./dataviz/DataVizController").DataVizController | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [intersecting, setIntersecting] = useState(false);
  const [ambient, setAmbient] = useState(true);
  const initialTimeOfDay = useRef(timeOfDay);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setAmbient(!reduced.matches);
    syncReduced();
    reduced.addEventListener("change", syncReduced);
    const io = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting), { threshold: 0.1 });
    io.observe(canvas);
    let disposed = false;
    import("./dataviz/DataVizController")
      .then(({ DataVizController }) => {
        if (disposed) return;
        try {
          const controller = new DataVizController(canvas);
          controller.setTimeOfDay(initialTimeOfDay.current, false);
          controllerRef.current = controller;
          setReady(true);
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    const ro = new ResizeObserver(() => controllerRef.current?.debouncedResize());
    ro.observe(document.body);
    return () => {
      disposed = true;
      reduced.removeEventListener("change", syncReduced);
      io.disconnect();
      ro.disconnect();
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Palette changes cross-fade only while ambient motion plays and the canvas is in view.
  useEffect(() => {
    controllerRef.current?.setTimeOfDay(timeOfDay, ambient && intersecting);
  }, [ready, timeOfDay, ambient, intersecting]);

  useEffect(() => {
    const c = controllerRef.current;
    if (!c) return;
    if (intersecting && desktop) {
      c.initScene();
      c.paused = !ambient;
      c.setAnimationIndex(activeIndex, ambient);
      if (!ambient) {
        c.rays.cancelIntro();
        c.renderActive();
      }
    } else {
      c.paused = true;
    }
  }, [ready, ambient, intersecting, desktop, activeIndex]);

  if (failed) return <DataVizFallback activeIndex={activeIndex} />;
  return (
    <div className="data-viz">
      <canvas className="data-viz__canvas" ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
