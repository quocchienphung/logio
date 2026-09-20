"use client";

import { useEffect, useRef, useState } from "react";
import { WAVE_DESKTOP, WAVE_MOBILE, WAVE_TABLET } from "./wave/config";

const FALLBACK = {
  desktop: {
    webp: "/stripe/wave-fallback-desktop-w1392-91e9e278-mono.webp 1x, /stripe/wave-fallback-desktop-w2784-e934b0d7-mono.webp 2x",
    width: 1392,
  },
  tablet: {
    webp: "/stripe/wave-fallback-tablet-w1248-f66958f4-mono.webp 1x, /stripe/wave-fallback-tablet-w2496-a6f7aa27-mono.webp 2x",
    width: 1248,
  },
  mobile: {
    webp: "/stripe/wave-fallback-mobile-w624-cf807862-mono.webp 1x, /stripe/wave-fallback-mobile-w1248-94766365-mono.webp 2x",
    width: 624,
  },
  png: "/stripe/wave-fallback-desktop-d7206623-mono.png",
  height: 975,
};

/**
 * Hero ribbon. Renders the Three.js wave on capable devices; the official static fallback image is
 * shown underneath and fades out on first WebGL draw (`hero-wave-animation--drawn`). Reduced-motion
 * users get a single static frame, matching the reference lifecycle.
 */
export function HeroWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    let disposed = false;
    let renderer: import("./wave/WaveRenderer").WaveRenderer | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersecting = false;
    const syncPaused = () => {
      if (!renderer) return;
      const shouldPause = !intersecting || document.hidden || reduced.matches;
      renderer.paused = shouldPause;
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
    reduced.addEventListener("change", syncPaused);

    import("./wave/WaveRenderer")
      .then(async ({ WaveRenderer }) => {
        if (disposed) return;
        try {
          renderer = new WaveRenderer(canvas, {
            theme: "light",
            configs: {
              wide: WAVE_DESKTOP,
              medium: WAVE_TABLET,
              small: WAVE_MOBILE,
            },
            paletteUrl: "/stripe/palette-411be97f.webp",
            litSelector: "h1.hero-section__title--background",
            onFirstDraw: () => setDrawn(true),
          });
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
      reduced.removeEventListener("change", syncPaused);
      renderer?.dispose();
    };
  }, []);

  return (
    <div className="hero-wave-animation" ref={rootRef}>
      <div className="hero-wave-animation__layout">
        <div
          className={`hero-wave-animation__contents${drawn ? " hero-wave-animation--drawn" : ""}`}
        >
          {webgl ? (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="hero-wave-animation__canvas"
            />
          ) : null}
          <div
            className="hero-wave-animation__static"
            style={
              {
                "--fallback-width-mobile": `${FALLBACK.mobile.width}px`,
                "--fallback-width-tablet": `${FALLBACK.tablet.width}px`,
                "--fallback-width-desktop": `${FALLBACK.desktop.width}px`,
                "--fallback-height-mobile": `${FALLBACK.height}px`,
                "--fallback-height-tablet": `${FALLBACK.height}px`,
                "--fallback-height-desktop": `${FALLBACK.height}px`,
              } as React.CSSProperties
            }
          >
            <picture>
              <source
                srcSet={FALLBACK.desktop.webp}
                media="(min-width: 1264px)"
              />
              <source
                srcSet={FALLBACK.tablet.webp}
                media="(min-width: 640px) and (max-width: 1263px)"
              />
              <source
                srcSet={FALLBACK.mobile.webp}
                media="(max-width: 639px)"
              />
              <img src={FALLBACK.png} alt="" aria-hidden="true" />
            </picture>
          </div>
        </div>
      </div>
    </div>
  );
}
