"use client";

import { useEffect } from "react";
import { idle, pageSettled } from "@/lib/pageSettled";

/**
 * Loads the heavy section renderers (three.js scenes, canvases) while the page is idle, one per idle period,
 * instead of when the visitor scrolls to them: fetching, parsing and evaluating a three.js chunk is a
 * 100–280 ms task, which froze scrolling at the section that first needed it. The sections still create
 * their own renderers (and GL contexts) when they come near the viewport; `import()` then resolves at once.
 */
const CHUNKS: (() => Promise<unknown>)[] = [
  () => import("@/components/stripe/Solutions/graphics/globe/GlobeRenderer"),
  () => import("@/components/stripe/Solutions/graphics/agentic/AgenticParticlesRenderer"),
  () => import("@/components/stripe/Solutions/graphics/issuing/IssuingCardRenderer"),
  () => import("@/components/stripe/Stats/dataviz/DataVizController"),
  () => import("@/components/stripe/News/SqueezyImagesCanvas"),
  () => import("@/components/stripe/Hero/wave/WaveRenderer"),
];

export function WarmChunks() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await pageSettled();
      for (const load of CHUNKS) {
        await idle(2000);
        if (cancelled) return;
        await load().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
