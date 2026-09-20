"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK = "/stripe/money-movement-fallback_2x-w894-1283768c.webp";
const UI_POOL_SIZE = 5;

/**
 * Crypto bento background: the reference dot globe (Three.js port of bundle chunk 38639) with the
 * official static render as the no-WebGL fallback. The five `.globe__arc-ui` badges are pooled DOM
 * nodes positioned by the renderer via CSS custom properties. Runs only while intersecting
 * (threshold 0.1, 100px margin) and speeds up the corona while the bento card is hovered.
 */
export function CryptoGlobe() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiRefs = useRef<(HTMLDivElement | null)[]>(Array(UI_POOL_SIZE).fill(null));
  const [webgl, setWebgl] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const uiPool = uiRefs.current.filter((el): el is HTMLDivElement => el !== null);
    let disposed = false;
    let renderer: import("./globe/GlobeRenderer").GlobeRenderer | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersecting = false;
    const syncPaused = () => {
      if (renderer) renderer.paused = !intersecting || document.hidden || reduced.matches;
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        syncPaused();
      },
      { threshold: 0.1, rootMargin: "100px" },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", syncPaused);

    // Debounced resize (reference: 150ms).
    let resizeTimer: number | undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => renderer?.setSize(width, height), 150);
    });
    ro.observe(root);

    const hoverRoot = root.closest<HTMLElement>("[data-bento-card-root]");
    const onEnter = () => renderer?.setHovered(true);
    const onLeave = () => renderer?.setHovered(false);
    hoverRoot?.addEventListener("pointerenter", onEnter);
    hoverRoot?.addEventListener("pointerleave", onLeave);

    import("./globe/GlobeRenderer")
      .then(({ GlobeRenderer }) => {
        if (disposed) return;
        try {
          renderer = new GlobeRenderer(canvas, { uiPool, position: { y: -1 } });
          const rect = root.getBoundingClientRect();
          renderer.setSize(rect.width, rect.height);
          renderer.paused = true;
          renderer.initScene();
          renderer.onLoad(() => {
            if (disposed) return;
            setLoaded(true);
            syncPaused();
          });
        } catch {
          setWebgl(false);
        }
      })
      .catch(() => setWebgl(false));

    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", syncPaused);
      hoverRoot?.removeEventListener("pointerenter", onEnter);
      hoverRoot?.removeEventListener("pointerleave", onLeave);
      renderer?.dispose();
    };
  }, []);

  return (
    <div className="modular-solutions-bento-card__background">
      <div className={`lazy-animation lazy-bento-graphic${!webgl || loaded ? " lazy-animation--loaded" : ""}`}>
        <div className="globe" aria-hidden="true" ref={rootRef}>
          {webgl ? (
            <>
              <canvas ref={canvasRef} aria-hidden="true" className="globe__canvas" />
              <div className="globe__ui-container">
                {Array.from({ length: UI_POOL_SIZE }, (_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      uiRefs.current[i] = el;
                    }}
                    className="globe__arc-ui"
                    style={{ display: "none" }}
                  >
                    <div className="globe__arc-ui-content">
                      <div className="globe__arc-ui-icon" />
                      <div className="globe__arc-ui-text">
                        <span className="globe__arc-ui-amount" />
                        <span className="globe__arc-ui-currency" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="globe__static">
              <img src={FALLBACK} width={894} height={1456} alt="" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
