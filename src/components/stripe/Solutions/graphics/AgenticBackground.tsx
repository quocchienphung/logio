"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK = "/stripe/particles-w1028-46b1b0bb-mono.webp";

/** Particle field behind the agentic-commerce chat (Three.js port; official particles.png as fallback). */
export function AgenticBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    let disposed = false;
    let renderer:
      | import("./agentic/AgenticParticlesRenderer").AgenticParticlesRenderer
      | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersecting = false;
    let thought = false;
    const syncPaused = () => {
      if (!renderer) return;
      renderer.paused = !intersecting || document.hidden || reduced.matches;
      if (intersecting && !thought && !reduced.matches) {
        thought = true;
        renderer.think(2000, 1000);
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        syncPaused();
      },
      { threshold: 0.1 },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", syncPaused);

    import("./agentic/AgenticParticlesRenderer")
      .then(async ({ AgenticParticlesRenderer }) => {
        if (disposed) return;
        try {
          renderer = new AgenticParticlesRenderer(canvas);
          await renderer.init();
          if (disposed) return;
          syncPaused();
          if (renderer.paused) renderer.drawOnce();
        } catch {
          setWebgl(false);
        }
      })
      .catch(() => setWebgl(false));

    return () => {
      disposed = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
      renderer?.dispose();
    };
  }, []);

  return (
    <div className="agentic-graphic__background" ref={rootRef}>
      {webgl ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="agentic-graphic__background-canvas"
        />
      ) : (
        <div className="agentic-graphic__background-static">
          <img src={FALLBACK} width={1028} height={1468} alt="" />
        </div>
      )}
    </div>
  );
}
