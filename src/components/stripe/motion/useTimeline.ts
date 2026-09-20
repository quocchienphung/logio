"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  animate,
  type AnimationPlaybackControls,
  type AnimationSequence,
} from "motion";

export interface TimelineOptions {
  /** Start only once the scope is at least this visible (IntersectionObserver threshold). */
  threshold?: number;
  /** Keep playing after the first reveal even if scrolled away (reference: freezeOnceVisible). */
  freezeOnceVisible?: boolean;
  /** Called when the sequence finishes; may call `play` again to chain/loop. */
  onComplete?: (play: (seq: AnimationSequence) => void) => void;
  /** Called once when the scope first enters the viewport (before playback). */
  onStart?: () => void;
}

/**
 * Plays a Motion `animate()` sequence scoped to `scope` when it enters the viewport, honouring
 * prefers-reduced-motion (no playback) and cleaning up on unmount. Mirrors the reference's
 * `useAnimate` + `useIntersectionObserver` pairing used by the product graphics.
 */
export function useTimeline(
  scope: RefObject<HTMLElement | null>,
  build: () => AnimationSequence,
  opts: TimelineOptions = {},
) {
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const buildRef = useRef(build);
  const optsRef = useRef(opts);
  useEffect(() => {
    buildRef.current = build;
    optsRef.current = opts;
  });

  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let disposed = false;
    let started = false;
    const scoped = (seq: AnimationSequence): AnimationSequence =>
      seq
        .map((step) => {
          if (!Array.isArray(step)) return step;
          const [target, ...rest] = step;
          const resolved =
            typeof target === "string" ? el.querySelectorAll(target) : target;
          if (resolved instanceof NodeList && resolved.length === 0)
            return null;
          return [
            resolved as Element | NodeListOf<Element>,
            ...rest,
          ] as unknown as (typeof seq)[number];
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
    const play = (seq: AnimationSequence) => {
      if (disposed) return;
      controls.current?.stop();
      controls.current = animate(scoped(seq));
      controls.current.finished.then(() => {
        if (disposed) return;
        optsRef.current.onComplete?.(play);
      });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          optsRef.current.onStart?.();
          if (!reduced) play(buildRef.current());
          if (optsRef.current.freezeOnceVisible !== false) io.disconnect();
        }
      },
      { threshold: optsRef.current.threshold ?? 0.1 },
    );
    io.observe(el);
    return () => {
      disposed = true;
      io.disconnect();
      controls.current?.stop();
      controls.current = null;
    };
  }, [scope]);

  return controls;
}
