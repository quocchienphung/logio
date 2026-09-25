// Animated tag icon (reference lazy chunk 82178 AnimatedTagIcon), used in the footer CTA "pricing" card.
// Each time the icon becomes >= 50 % visible (not frozen, so it replays) the tag swings:
// rotate(40deg) -> rotate(-45deg) over 1000 ms -> rotate(0deg) over 800 ms, pivoting at (15.5px, 4.5px),
// keyframe easing cubic-bezier(0.65, 0, 0.35, 1), fill forwards. Leaving the viewport pauses it;
// re-entering cancels and restarts. Reduced motion: no animation.

import { Disposer, observeIntersection, onReducedMotionChange, reducedMotion, type Cleanup } from "./env";

function timeline() {
  const steps = [
    { transform: "rotate(40deg)", easing: "cubic-bezier(0.65, 0, 0.35, 1)", duration: 0 },
    { transform: "rotate(-45deg)", easing: "cubic-bezier(0.65, 0, 0.35, 1)", duration: 1000 },
    { transform: "rotate(0deg)", easing: "cubic-bezier(0.15, 0.05, 0.36, 1)", duration: 800 },
  ];
  const total = steps.slice(1).reduce((a, s) => a + s.duration, 0);
  let acc = 0;
  const keyframes: Keyframe[] = steps.map((s, i) => {
    if (i > 0) acc += s.duration;
    return { transform: s.transform, easing: s.easing, offset: i === 0 ? 0 : acc / total };
  });
  return { keyframes, duration: total };
}

export function mountAnimatedTagIcons(root: HTMLElement): Cleanup {
  const d = new Disposer();
  root.querySelectorAll<SVGLinearGradientElement>('linearGradient[id^="animated-tag-gradient-a-"]').forEach((grad) => {
    const svg = grad.closest("svg");
    const g = svg?.querySelector<SVGGElement>(":scope > g");
    if (!svg || !g) return;
    let anim: Animation | null = null;
    let visible = false;
    let reduced = reducedMotion();
    const reset = () => {
      anim?.cancel();
      anim = null;
      g.style.transform = "";
    };
    const sync = () => {
      if (visible && !reduced) {
        reset();
        const { keyframes, duration } = timeline();
        anim = g.animate(keyframes, { duration, fill: "forwards" });
      } else anim?.pause();
    };
    d.add(
      observeIntersection(
        svg,
        (v) => {
          if (v === visible) return;
          visible = v;
          sync();
        },
        { threshold: 0.5 },
      ),
    );
    d.add(
      onReducedMotionChange((r) => {
        reduced = r;
        if (r) reset();
        else sync();
      }),
    );
    d.add(reset);
  });
  return () => d.run();
}
