"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  animate,
  type AnimationPlaybackControls,
  type AnimationSequence,
} from "motion";
import { EASE } from "@/components/stripe/motion/easings";

// Port of the reference platform graphic timeline (bundle chunk 34526, desktop branch): the
// dashboard browser rises in, then each feature card (payments → notification → payouts → capital)
// reveals while its dashboard card scales in behind a rotating gradient border that fades to a
// static border. Plays once when in view; the replay button re-runs it from t=0.75s.
const FEATURES = ["payments", "notification", "payouts", "capital"] as const;

export function usePlatformTimeline(root: RefObject<HTMLElement | null>) {
  const [done, setDone] = useState(false);
  const [replay, setReplay] = useState<(() => void) | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const desktop = window.matchMedia("(min-width: 940px)").matches;
    const browser = el.querySelector<HTMLElement>(
      ".platform-graphic__dom__browser",
    );
    const featureList = el.querySelector<HTMLElement>(
      ".platform-graphic__features",
    );
    if (!browser || !featureList) return;
    const parts = FEATURES.map((f) => {
      const card = el.querySelector<HTMLElement>(
        `.platform-graphic-browser-card-item--${f}`,
      );
      return {
        feature: featureList.querySelector<HTMLElement>(
          `.platform-graphic-features__${f}`,
        ),
        content:
          card?.querySelector<HTMLElement>(
            `.platform-graphic-browser-card-item__${f}-content`,
          ) ?? null,
        gradient:
          card?.querySelector<HTMLElement>(
            ".platform-graphic-browser-card-item__gradient",
          ) ?? null,
        border:
          card?.querySelector<HTMLElement>(
            ".platform-graphic-browser-card-item__border",
          ) ?? null,
      };
    });
    if (parts.some((p) => !p.feature || !p.content || !p.gradient || !p.border))
      return;

    const setup: AnimationSequence = [
      [
        browser,
        { opacity: 0, transform: "translate3d(0, 80px, 0)" },
        { duration: 0 },
      ],
    ];
    const play: AnimationSequence = [
      [browser, { opacity: 1 }, { duration: 0.5, ease: EASE.easeSwift }],
      [
        browser,
        { transform: "translate3d(0, 0, 0)" },
        { at: "<", duration: 0.75, ease: EASE.easeSwift },
      ],
    ];
    for (const p of parts) {
      setup.push(
        [
          p.feature!,
          { opacity: 0, transform: "translate3d(0, 30px, 0)" },
          { duration: 0 },
        ],
        [
          p.content!,
          { opacity: 0, transform: "scale(0.94)", transformOrigin: "center" },
          { duration: 0 },
        ],
        [p.gradient!, { opacity: 0 }, { duration: 0 }],
        [p.border!, { opacity: 0 }, { duration: 0 }],
      );
      play.push(
        [
          p.feature!,
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
          { duration: 0.5, ease: EASE.easeSwift },
        ],
        [
          p.content!,
          { opacity: 1, transform: "scale(1)" },
          { duration: 0.5, ease: EASE.easeSwift },
        ],
        [
          p.gradient!,
          { opacity: 1 },
          { at: "<", duration: 0.3, ease: EASE.easeOutCubic },
        ],
        [
          p.gradient!,
          { "--border-angle": "360deg" },
          { at: "<", duration: 1.8, ease: "linear" },
        ],
        [
          p.gradient!,
          { opacity: 0 },
          { duration: 0.5, ease: EASE.easeOutCubic },
        ],
        [
          p.border!,
          { opacity: 1 },
          { at: "<", duration: 0.5, ease: EASE.easeOutCubic },
        ],
      );
    }

    let setupCtrl: AnimationPlaybackControls | null = null;
    let playCtrl: AnimationPlaybackControls | null = null;
    let disposed = false;

    // Non-desktop widths use the stacked layout; the reference runs a different sequence there —
    // show the completed state so nothing is hidden.
    if (!desktop || reduced) {
      queueMicrotask(() => setDone(true));
      return;
    }
    setupCtrl = animate(setup);
    setupCtrl.pause();
    playCtrl = animate(play);
    playCtrl.pause();
    setupCtrl.play();

    const start = () => {
      if (!playCtrl || disposed) return;
      setDone(false);
      playCtrl.play();
      playCtrl.finished.then(() => !disposed && setDone(true));
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    queueMicrotask(() =>
      setReplay(() => () => {
        if (!setupCtrl || !playCtrl) return;
        setupCtrl.play();
        playCtrl.time = 0.75;
        start();
      }),
    );
    return () => {
      disposed = true;
      io.disconnect();
      setupCtrl?.stop();
      playCtrl?.stop();
    };
  }, [root]);

  return { done, replay };
}
