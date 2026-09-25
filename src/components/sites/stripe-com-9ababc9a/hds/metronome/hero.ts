// Usage-based billing hero (reference: page module 42161, component `ea`).
//  - Entrance (once, when the graphic stack is 20 % visible, not with reduced motion): the Metronome
//    dashboard chart plots wipe in left -> right (clip-path, 1.2 s easeInOutCubic, 0.4 s stagger), then
//    the invoice card (0.4 s before the wipe ends) and the notification (0.3 s before the invoice ends)
//    rise 16 px and fade in (0.6 s easeOutCubic).
//  - Background video (>= 640 px only; client-only in the reference): muted looping `output.mp4` over the
//    static poster, faded in (CSS) once it can play (`loadeddata` / `canplay`). Paused while offscreen or
//    hidden; not played with reduced motion (deviation: the reference autoplays regardless).

import { EASE } from "../revenue-shared/easing";
import { breakpoint, Disposer, listen, observeIntersection, onBreakpointChange, onReducedMotionChange, onVisibilityChange, reducedMotion, type Cleanup } from "../revenue-shared/env";
import { playSequence, stagger, type Segment, type SequenceControls } from "../revenue-shared/sequence";

const PLOT = ".metronome-dashboard-graphic__chart__plot";
const VIDEO_SRC = "/sites/stripe-com-9ababc9a/revenue/ubb-hero-background-mono.mp4";

const ENTRANCE: Segment[] = [
  [PLOT, { clipPath: "inset(0 100% 0 0)" }, { duration: 0 }],
  [".ubb-hero__graphic-invoice", { opacity: 0, y: 16 }, { duration: 0 }],
  [".ubb-hero__graphic-notification", { opacity: 0, y: 16 }, { duration: 0 }],
  [PLOT, { clipPath: "inset(0 0% 0 0)" }, { duration: 1.2, delay: stagger(0.4), ease: EASE.easeInOutCubic }],
  [".ubb-hero__graphic-invoice", { opacity: 1, y: 0 }, { at: "-0.4", duration: 0.6, ease: EASE.easeOutCubic }],
  [".ubb-hero__graphic-notification", { opacity: 1, y: 0 }, { at: "-0.3", duration: 0.6, ease: EASE.easeOutCubic }],
];

function mountEntrance(root: HTMLElement): Cleanup {
  const stack = root.querySelector<HTMLElement>(".ubb-hero__graphic-stack");
  if (!stack) return () => {};
  const d = new Disposer();
  let seq: SequenceControls | null = null;
  d.add(
    observeIntersection(
      stack,
      (v) => {
        if (!v || seq || reducedMotion()) return;
        seq = playSequence(stack, ENTRANCE);
      },
      { threshold: 0.2, once: true },
    ),
  );
  d.add(() => seq?.stop());
  return () => d.run();
}

function mountVideo(root: HTMLElement): Cleanup {
  const host = root.querySelector<HTMLElement>(".ubb-hero__graphic-background-poster--desktop");
  const section = root.querySelector<HTMLElement>(".ubb-hero__graphic");
  if (!host || !section) return () => {};
  const d = new Disposer();
  let video: HTMLVideoElement | null = null;
  let visible = false;
  let hidden = document.hidden;
  let reduced = reducedMotion();
  const vd = new Disposer();

  const syncPlay = () => {
    if (!video) return;
    if (visible && !hidden && !reduced) void video.play().catch(() => {});
    else video.pause();
  };
  const create = () => {
    if (video) return;
    const v = document.createElement("video");
    v.className = "ubb-hero__graphic-background-media ubb-hero__graphic-background-video";
    v.src = VIDEO_SRC;
    v.width = 1600;
    v.height = 662;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.setAttribute("aria-hidden", "true");
    v.setAttribute("muted", "");
    const ready = () => v.classList.add("ubb-hero__graphic-background-video--ready");
    vd.add(listen(v, "loadeddata", ready));
    vd.add(listen(v, "canplay", ready));
    host.appendChild(v);
    video = v;
    if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) ready();
    syncPlay();
  };
  const destroy = () => {
    vd.run();
    video?.pause();
    video?.removeAttribute("src");
    video?.load();
    video?.remove();
    video = null;
  };
  const sync = () => (breakpoint() === "mobile" ? destroy() : create());
  d.add(
    observeIntersection(section, (v) => {
      visible = v;
      syncPlay();
    }),
  );
  d.add(
    onVisibilityChange((h) => {
      hidden = h;
      syncPlay();
    }),
  );
  d.add(
    onReducedMotionChange((r) => {
      reduced = r;
      syncPlay();
    }),
  );
  d.add(onBreakpointChange(sync));
  sync();
  d.add(destroy);
  return () => d.run();
}

export function mountUbbHero(root: HTMLElement): Cleanup {
  const d = new Disposer();
  d.add(mountEntrance(root));
  d.add(mountVideo(root));
  return () => d.run();
}
