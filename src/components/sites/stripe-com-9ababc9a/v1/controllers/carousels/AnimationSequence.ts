// AnimationSequence — port of v1-AnimationSequence-5L57BFU6.js (+ the Sequence/Delay steps of
// v1-chunk-DSWZA3DI.js / v1-chunk-PCZ6HXRS.js).
// Time-driven loop over its child AnimationControllers (the animated product icons on Revenue
// Recognition), in document order: play icon 1, wait 2.5 s, play icon 2, wait 2.5 s, … then restart
// every icon and loop. Pauses (keeping its place) when < 1 % visible and resumes on re-entry; also
// pauses while the tab is hidden. Under reduced motion it never starts (icons stay static).
// The icon controllers belong to another group; each is expected to expose, under its own controller
// name, { play(): Promise<void> | void; pause(): void; restart(): void } (or the same under
// `.animation`), and to signal completion by resolving play() or dispatching "AnimationStep:done".
import type { Controller } from "../types";
import { getApi, onPageVisibility, prefersReducedMotion } from "../lib";
import { Delay } from "./util";

const STEP_GAP_MS = 2500;
const VISIBLE_THRESHOLD = 0.01;
/** Reference controllers that extend AnimationController (import of v1-chunk-UJMSTR4C.js). */
const ANIMATION_CONTROLLERS = [
  "BlocksIcon", "DocumentWithArrowsIcon", "DocumentWithCheckmarkIcon", "FastForwardIcon", "GearsIcon",
  "HealthIcon", "NodesIcon", "PricingIcon", "ShieldWithCheckmarkIcon", "TerminalIcon",
];

interface IconAnimation {
  play(): Promise<void> | void;
  pause(): void;
  restart(): void;
}

function iconAnimation(node: HTMLElement): IconAnimation | undefined {
  for (const name of (node.dataset.jsController || "").split(/\s+/)) {
    if (!ANIMATION_CONTROLLERS.includes(name)) continue;
    const api = getApi<IconAnimation & { animation?: IconAnimation }>(node, name);
    const a = api?.animation ?? api;
    if (a && typeof a.play === "function") return a;
  }
  return undefined;
}

interface Step {
  play(): void;
  pause(): void;
  restart(): void;
  dispose(): void;
}

export const AnimationSequence: Controller = (el) => {
  if (prefersReducedMotion()) return;
  const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-js-controller]")).filter((n) =>
    (n.dataset.jsController || "").split(/\s+/).some((c) => ANIMATION_CONTROLLERS.includes(c)),
  );

  let index = 0;
  let playing = false;
  let visible = false;
  let hidden = document.hidden;
  let disposed = false;

  const advance = () => {
    if (disposed) return;
    if (index < steps.length - 1) {
      index += 1;
      if (playing) steps[index].play();
      return;
    }
    // Sequence finished: restart every step and loop.
    steps.forEach((s) => s.restart());
    index = 0;
    if (playing) steps[0].play();
  };

  // An icon step: completes when the icon's play() promise resolves or it dispatches AnimationStep:done.
  const iconStep = (node: HTMLElement): Step => {
    let token = 0;
    let started = false;
    let done = false;
    const finish = (t: number) => {
      if (t !== token || done) return;
      done = true;
      advance();
    };
    // Only the icon's own completion counts (its inner parts may bubble their own done events).
    const onDoneEvent = (e: Event) => {
      if (e.target === node) finish(token);
    };
    return {
      play() {
        const anim = iconAnimation(node);
        if (!anim) {
          done = true;
          advance();
          return;
        }
        const t = token;
        node.addEventListener("AnimationStep:done", onDoneEvent);
        const r = anim.play();
        if (!started && r && typeof (r as Promise<void>).then === "function") (r as Promise<void>).then(() => finish(t), () => undefined);
        started = true;
      },
      pause() {
        iconAnimation(node)?.pause();
      },
      restart() {
        token += 1;
        started = false;
        done = false;
        node.removeEventListener("AnimationStep:done", onDoneEvent);
        iconAnimation(node)?.restart();
      },
      dispose() {
        token += 1;
        node.removeEventListener("AnimationStep:done", onDoneEvent);
      },
    };
  };

  const delayStep = (): Step => {
    let d = new Delay(STEP_GAP_MS, advance);
    return {
      play: () => d.play(),
      pause: () => d.pause(),
      restart: () => {
        d.cancel();
        d = new Delay(STEP_GAP_MS, advance);
      },
      dispose: () => d.cancel(),
    };
  };

  const steps: Step[] = nodes.flatMap((n) => [iconStep(n), delayStep()]);
  if (!steps.length) return;

  const update = () => {
    const should = visible && !hidden;
    if (should === playing) return;
    playing = should;
    if (should) steps[index].play();
    else steps[index].pause();
  };

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].intersectionRatio >= VISIBLE_THRESHOLD;
      update();
    },
    { threshold: VISIBLE_THRESHOLD },
  );
  io.observe(el);
  const offVisibility = onPageVisibility((h) => {
    hidden = h;
    update();
  });

  return () => {
    disposed = true;
    io.disconnect();
    offVisibility();
    steps.forEach((s) => s.dispose());
  };
};
