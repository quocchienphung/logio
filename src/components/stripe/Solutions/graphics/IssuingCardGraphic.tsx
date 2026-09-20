"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK = "/stripe/card-placeholder_2x-w894-e383a280-mono.webp";

/**
 * Issuing bento card background. Three.js card (port of bundle module 51310) with the official
 * static card render as the no-WebGL / reduced-motion fallback. Pauses when offscreen (100px margin).
 */
export function IssuingCardGraphic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    let disposed = false;
    let renderer:
      import("./issuing/IssuingCardRenderer").IssuingCardRenderer | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersecting = false;
    const syncPaused = () => {
      if (renderer)
        renderer.paused = !intersecting || document.hidden || reduced.matches;
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        syncPaused();
      },
      { threshold: 0, rootMargin: "100px" },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", syncPaused);

    import("./issuing/IssuingCardRenderer")
      .then(async ({ IssuingCardRenderer }) => {
        if (disposed) return;
        try {
          renderer = new IssuingCardRenderer(
            canvas,
            root.closest<HTMLElement>("[data-bento-card-root]"),
          );
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
    <div className="modular-solutions-bento-card__background">
      <div className="lazy-animation lazy-animation--loaded lazy-bento-graphic">
        <div className="issuing-graphic__background" ref={rootRef}>
          {webgl ? (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="issuing-graphic__background-canvas"
            />
          ) : (
            <div className="issuing-graphic__background-static">
              <img src={FALLBACK} width={894} height={1456} alt="" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
