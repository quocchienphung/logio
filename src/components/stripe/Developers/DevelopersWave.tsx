"use client";

import { useEffect, useRef, useState } from "react";
import { WAVE_DEVELOPER } from "@/components/stripe/Hero/wave/config";

/** Dark line-wave behind the "Scale with confidence" stats (same renderer as the hero, dark theme). */
export function DevelopersWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    let disposed = false;
    let renderer:
      import("@/components/stripe/Hero/wave/WaveRenderer").WaveRenderer | null =
      null;
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
      { threshold: 0, rootMargin: "20px 0px" },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", syncPaused);

    import("@/components/stripe/Hero/wave/WaveRenderer")
      .then(async ({ WaveRenderer }) => {
        if (disposed) return;
        try {
          renderer = new WaveRenderer(canvas, {
            theme: "dark",
            configs: {
              wide: WAVE_DEVELOPER,
              medium: WAVE_DEVELOPER,
              small: WAVE_DEVELOPER,
            },
            paletteUrl: "/stripe/palette-a288e2dc.webp",
            clearColor:
              getComputedStyle(document.body)
                .getPropertyValue("--hds-color-core-neutralDark-990")
                .trim() || "#101010",
            onFirstDraw: () => setDrawn(true),
          });
          await renderer.init();
          if (disposed) return;
          syncPaused();
          if (renderer.paused) renderer.drawOnce();
        } catch {
          /* no WebGL or a touch device: the reference renders nothing here either */
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      className={`developers-wave-animation${drawn ? " hero-wave-animation--drawn" : ""}`}
      ref={rootRef}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="developers-wave-animation__canvas"
      />
    </div>
  );
}
