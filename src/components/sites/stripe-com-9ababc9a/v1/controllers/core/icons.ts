// Animated product icons (reference AnimationController subclasses, base v1-chunk-UJMSTR4C.js).
//   FastForwardIcon           ← v1-FastForwardIcon-6R34RS32.js
//   DocumentWithArrowsIcon    ← v1-DocumentWithArrowsIcon-U67CULTZ.js
//   ShieldWithCheckmarkIcon   ← v1-ShieldWithCheckmarkIcon-TPJARBSW.js
//   NodesIcon                 ← v1-NodesIcon-GSUOSEI2.js
//   DocumentWithCheckmarkIcon ← v1-DocumentWithCheckmarkIcon-ZEXDN4PM.js
//   BlocksIcon                ← v1-BlocksIcon-6RCJTY4Z.js
//   GearsIcon                 ← v1-GearsIcon-ZOH6IPQY.js
//   HealthIcon                ← v1-HealthIcon-R7QWLO6P.js
//   PricingIcon               ← v1-PricingIcon-WS47TY7X.js
//   TerminalIcon              ← v1-TerminalIcon-PFKMIM2E.js
// As in the reference, an icon only *builds* its animation on connect and never plays it by itself:
// the only reference caller is the AnimationSequence controller (v1-AnimationSequence-5L57BFU6.js,
// /revenue-recognition), which plays its child icons in document order. Everywhere else the icons stay
// static. Each icon exposes an AnimatedIconApi under its own controller name and under
// "AnimationController" (the reference base class the sequence collects).
import type { Controller } from "../types";
import { target, targetList } from "../lib";
import { exposeCore } from "./util";
import { Delay, Group, Sequence, Step, type Playable } from "./anim";

export interface AnimatedIconApi {
  /** The icon's current animation (FastForward/Blocks alternate between two after each completion). */
  readonly animation: Playable;
  /** Plays (or resumes) the current animation; resolves when it completes. */
  play(): Promise<void>;
  pause(): void;
  restart(): void;
  cancel(): void;
  finish(): void;
}

function expose(el: HTMLElement, name: string, current: () => Playable): void {
  const api: AnimatedIconApi = {
    get animation() {
      return current();
    },
    play() {
      const a = current();
      a.play();
      return a.finished;
    },
    pause: () => current().pause(),
    restart: () => current().restart(),
    cancel: () => current().cancel(),
    finish: () => current().finish(),
  };
  exposeCore(el, name, api);
  exposeCore(el, "AnimationController", api);
}

/** Registers a single-animation icon. `build` runs once, on connect (reference connect()). */
const icon = (name: string, build: (el: HTMLElement) => Playable | null): Controller => (el) => {
  const animation = build(el);
  if (!animation) return;
  expose(el, name, () => animation);
  return () => animation.cancel();
};

const t = (el: HTMLElement, ctrl: string, name: string) => target<SVGGraphicsElement>(el, ctrl, name);
const tl = (el: HTMLElement, ctrl: string, name: string) => targetList<SVGGraphicsElement>(el, ctrl, name);

// ---- FastForwardIcon / BlocksIcon: two alternating steps --------------------------------------------
const OVERSHOOT = "cubic-bezier(0.68, -1.5, 0.27, 2.5)";
const STANDARD = "cubic-bezier(0.4, 0, 0.2, 1)";
const DECELERATE = "cubic-bezier(0.2, 0, 0.4, 1)";

interface ShiftConfig {
  ctrl: string;
  paddingLeft: number;
  paddingTop: number;
  shiftX: number;
  shiftY: number;
  /** Arrows travel 3 shifts out; blocks travel 3 out and start 4 back. */
  stayBack: number;
  inBack: number;
  hidden: [string, string];
  lists: [string, string, string, string]; // firstBack, firstFront, secondFront, secondBack
}

const alternatingIcon = (cfg: ShiftConfig): Controller => (el) => {
  const hiddenA = t(el, cfg.ctrl, cfg.hidden[0]);
  const hiddenB = t(el, cfg.ctrl, cfg.hidden[1]);
  const [firstBack, firstFront, secondFront, secondBack] = cfg.lists.map((n) => tl(el, cfg.ctrl, n));
  const bbox = (node: SVGGraphicsElement) => {
    const ref = node.getAttribute("data-js-bbox");
    const src = ref === cfg.hidden[0] ? hiddenA : ref === cfg.hidden[1] ? hiddenB : node;
    try {
      return (src ?? node).getBBox();
    } catch {
      return { x: 0, y: 0 };
    }
  };
  const origin = (node: SVGGraphicsElement) => {
    const { x, y } = bbox(node);
    return { x: x - cfg.paddingLeft, y: y - cfg.paddingTop };
  };
  const tr = (x: number, y: number) => (cfg.shiftY ? `translate(${x}px, ${y}px)` : `translate(${x}px)`);
  const stayLeft = (node: SVGGraphicsElement) => {
    const o = origin(node);
    const x = -cfg.shiftX * cfg.stayBack - o.x;
    const y = -cfg.shiftY * cfg.stayBack - o.y;
    return new Step({ el: node, keyframes: [{ transform: tr(x, y), opacity: 0 }, { transform: tr(x, y), opacity: 0 }] });
  };
  const leftToRight = (node: SVGGraphicsElement) => {
    const o = origin(node);
    return new Step({
      el: node,
      keyframes: [{ transform: tr(-o.x, -o.y), opacity: 1 }, { transform: tr(-o.x + cfg.shiftX, -o.y + cfg.shiftY), opacity: 1 }],
      easing: OVERSHOOT,
      duration: 1000,
    });
  };
  const rightOut = (node: SVGGraphicsElement) => {
    const o = origin(node);
    return new Step({
      el: node,
      keyframes: [
        { transform: tr(cfg.shiftX - o.x, cfg.shiftY - o.y), opacity: 1 },
        { transform: tr(cfg.shiftX - o.x + cfg.shiftX * 3, cfg.shiftY - o.y + cfg.shiftY * 3), opacity: 0 },
      ],
      easing: STANDARD,
      delay: 350,
      duration: 500,
      fill: "both",
    });
  };
  const leftIn = (node: SVGGraphicsElement) => {
    const o = origin(node);
    return new Step({
      el: node,
      keyframes: [
        { transform: tr(-(o.x + cfg.shiftX * cfg.inBack), -(o.y + cfg.shiftY * cfg.inBack)), opacity: 1 },
        { transform: tr(-o.x, -o.y), opacity: 1 },
      ],
      easing: DECELERATE,
      delay: 350,
      duration: 500,
      fill: "both",
    });
  };
  const name = `${cfg.ctrl}:main`;
  const stepOne = new Group({
    name,
    el,
    animations: [...firstBack.map(leftToRight), ...firstFront.map(rightOut), ...secondFront.map(leftIn), ...secondBack.map(stayLeft)],
  });
  const stepTwo = new Group({
    name,
    el,
    animations: [...secondFront.map(leftToRight), ...secondBack.map(leftIn), ...firstBack.map(rightOut), ...firstFront.map(stayLeft)],
  });
  let animation: Playable = stepOne;
  // reference: listens for its own "AnimationStep:done" (name "<Icon>:main") and swaps the steps
  const onDone = (e: Event) => {
    if ((e as CustomEvent<{ name?: string }>).detail?.name === name) animation = animation === stepOne ? stepTwo : stepOne;
  };
  el.addEventListener("AnimationStep:done", onDone);
  expose(el, cfg.ctrl, () => animation);
  return () => {
    el.removeEventListener("AnimationStep:done", onDone);
    stepOne.cancel();
    stepTwo.cancel();
  };
};

export const FastForwardIcon = alternatingIcon({
  ctrl: "FastForwardIcon",
  paddingLeft: 16,
  paddingTop: 0,
  shiftX: 14,
  shiftY: 0,
  stayBack: 3,
  inBack: 3,
  hidden: ["firstHiddenArrow", "secondHiddenArrow"],
  lists: ["firstBackArrows", "firstFrontArrows", "secondFrontArrows", "secondBackArrows"],
});

export const BlocksIcon = alternatingIcon({
  ctrl: "BlocksIcon",
  paddingLeft: 16,
  paddingTop: 31,
  shiftX: 13,
  shiftY: 6,
  stayBack: 4,
  inBack: 4,
  hidden: ["firstHiddenBlock", "secondHiddenBlock"],
  lists: ["firstBackBlocks", "firstFrontBlocks", "secondFrontBlocks", "secondBackBlocks"],
});

// ---- DocumentWithArrowsIcon ------------------------------------------------------------------------
const DWA_OUT = "cubic-bezier(0.68, -1.5, 0.27, 2.5)";
const DWA_SPIN = "cubic-bezier(0.68, -0.5, 0.27, 1.5)";
const DWA_IN = "cubic-bezier(0.33, 1, 0.68, 1)";
const DWA_DISTANCE = 16;

export const DocumentWithArrowsIcon = icon("DocumentWithArrowsIcon", (el) => {
  const C = "DocumentWithArrowsIcon";
  const left = tl(el, C, "leftArrows");
  const right = tl(el, C, "rightArrows");
  const doc = t(el, C, "document");
  const d = DWA_DISTANCE;
  const arrows = (els: SVGGraphicsElement[], dir: 1 | -1) =>
    new Sequence({
      el,
      steps: [
        new Step({ el: els, keyframes: [{ transform: "translateX(0px)", opacity: 1 }, { transform: `translateX(${dir * d}px)`, opacity: 0 }], easing: DWA_OUT, duration: 1000 }),
        new Step({ el: els, keyframes: [{ transform: `translateX(${-dir * d}px)`, opacity: 0 }, { transform: dir < 0 ? "translateX(0px)" : "translateX(0)", opacity: 1 }], easing: DWA_IN, duration: 500 }),
      ],
    });
  return new Group({
    el,
    dispatch: true,
    animations: [
      arrows(left, -1),
      arrows(right, 1),
      new Step({ el: doc ? [doc] : [], keyframes: [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-360deg)" }], easing: DWA_SPIN, duration: 1500 }),
    ],
  });
});

// ---- ShieldWithCheckmarkIcon / DocumentWithCheckmarkIcon --------------------------------------------
const CHECK_POP = "cubic-bezier(0.68, 0, 0.27, 2.5)";
const CHECK_FADE = "cubic-bezier(0.2, 0, 0.4, 1)";
const STEP_DURATION = 500;
const CHECK_SCALE = 0.75;

const checkIn = (checks: Element[]) =>
  new Step({ el: checks, keyframes: [{ transform: `scale(${CHECK_SCALE})`, opacity: 0 }, { transform: "scale(1)", opacity: 1 }], duration: STEP_DURATION, easing: CHECK_POP });
const checkOut = (checks: Element[]) => new Step({ el: checks, keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: STEP_DURATION, easing: CHECK_FADE });

export const ShieldWithCheckmarkIcon = icon("ShieldWithCheckmarkIcon", (el) => {
  const C = "ShieldWithCheckmarkIcon";
  const checks = tl(el, C, "checks");
  const content = t(el, C, "content");
  // The reference keyframes carry an `easingWiggle` key that is not a CSS property (ignored by WAAPI),
  // so the wiggle runs on the step's linear easing.
  const wiggle = new Step({
    el: content ? [content] : [],
    keyframes: [{ transform: "translateX(1px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(2px)" }, { transform: "translateX(-1px)" }, { transform: "translateX(0px)" }],
    easing: "linear",
    duration: STEP_DURATION,
  });
  return new Sequence({ el, dispatch: true, steps: [checkOut(checks), new Sequence({ el, steps: [wiggle, checkIn(checks)] })] });
});

export const DocumentWithCheckmarkIcon = icon("DocumentWithCheckmarkIcon", (el) => {
  const C = "DocumentWithCheckmarkIcon";
  const checks = tl(el, C, "checks");
  const content = t(el, C, "content");
  const slide = new Step({
    el: content ? [content] : [],
    keyframes: [{ transform: "translate(-26px, 0px)" }, { transform: "translate(0px, 0px)" }],
    duration: STEP_DURATION,
    easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  });
  return new Sequence({ el, dispatch: true, steps: [checkOut(checks), new Sequence({ el, steps: [slide, checkIn(checks)] })] });
});

// ---- NodesIcon ---------------------------------------------------------------------------------------
const NODES_DOT_IN = "cubic-bezier(0.5, -1.125, 0.5, 1)";
const NODES_DOT_OUT = "cubic-bezier(0.5, 0, 0.5, 2.125)";
const NODES_SEGMENT = "cubic-bezier(0.2, 0, 0.4, 1)";
const NODES_SEGMENT_SPACING = 6;
const NODES_DOT_SCALE = 0.666666667;
const NODES_RADIUS = 24;

export const NodesIcon = icon("NodesIcon", (el) => {
  const C = "NodesIcon";
  const segments = tl(el, C, "segments");
  const dots = tl(el, C, "dots");
  const clipPathDots = tl(el, C, "clipPathDots");
  const pos = (i: number) => {
    const a = (((i / dots.length) * 360 - 90) * Math.PI) / 180;
    return { x: -Math.cos(a) * NODES_RADIUS, y: -Math.sin(a) * NODES_RADIUS };
  };
  const dotsIn = (els: Element[]) =>
    new Step({
      el: els,
      keyframes: (i) => {
        const { x, y } = pos(i);
        return [{ transform: `scale(${NODES_DOT_SCALE}) translate(0, 0)` }, { transform: `scale(1) translate(${x}px, ${y}px)` }];
      },
      duration: 600,
      easing: NODES_DOT_IN,
    });
  const dotsOut = (els: Element[]) =>
    new Step({
      el: els,
      keyframes: (i) => {
        const { x, y } = pos(i);
        return [{ transform: `scale(1) translate(${x}px, ${y}px)` }, { transform: `scale(${NODES_DOT_SCALE}) translate(0, 0)` }];
      },
      duration: 600,
      easing: NODES_DOT_OUT,
    });
  const inAnim = new Group({
    el,
    animations: [
      new Step({ el: segments, keyframes: [{ transform: "translate(0, 0)" }, { transform: `translate(-${NODES_SEGMENT_SPACING}px, 0)` }], duration: 850, easing: NODES_SEGMENT, delay: 350 }),
      dotsIn(dots),
      dotsIn(clipPathDots),
    ],
  });
  const outAnim = new Group({
    el,
    animations: [
      new Step({ el: segments, keyframes: [{ transform: `translate(-${NODES_SEGMENT_SPACING}px, 0)` }, { transform: "translate(0, 0)" }], duration: 350, easing: NODES_SEGMENT }),
      dotsOut(dots),
      dotsOut(clipPathDots),
    ],
  });
  return new Sequence({ el, dispatch: true, steps: [inAnim, outAnim] });
});

// ---- GearsIcon / TerminalIcon ------------------------------------------------------------------------
const GEAR_EASING = "cubic-bezier(0.68, -1.5, 0.27, 2.5)";
const GEAR_DURATION = 1250;
const spin = (node: Element, deg: number) =>
  new Step({ el: node, keyframes: [{ transform: "rotate(0deg)" }, { transform: `rotate(${deg}deg)` }], duration: GEAR_DURATION, easing: GEAR_EASING });

export const GearsIcon = icon("GearsIcon", (el) => {
  const C = "GearsIcon";
  return new Group({
    el,
    dispatch: true,
    animations: [...tl(el, C, "smallGears").map((g) => spin(g, -67.5)), ...tl(el, C, "largeGears").map((g) => spin(g, 60))],
  });
});

export const TerminalIcon = icon("TerminalIcon", (el) => {
  const C = "TerminalIcon";
  const cursor = t(el, C, "cursor");
  const blinks = 2 * 2; // blinkCount × 2
  return new Group({
    el,
    dispatch: true,
    animations: [
      new Step({ el: cursor ? [cursor] : [], keyframes: Array.from({ length: blinks + 1 }, (_, i) => ({ opacity: 1 - (i % 2) })), duration: GEAR_DURATION, easing: `steps(${blinks})` }),
      ...tl(el, C, "gears").map((g) => spin(g, 67.5)),
    ],
  });
});

// ---- HealthIcon --------------------------------------------------------------------------------------
export const HealthIcon = icon("HealthIcon", (el) => {
  const C = "HealthIcon";
  const line = t(el, C, "line");
  const lines = line ? [line] : [];
  const checks = tl(el, C, "checks");
  const out = new Group({
    el,
    animations: [
      new Step({ el: lines, keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: STEP_DURATION, easing: CHECK_FADE }),
      new Step({ el: checks, keyframes: [{ transform: "scale(1)" }, { transform: `scale(${CHECK_SCALE})` }], duration: STEP_DURATION, easing: CHECK_FADE }),
    ],
  });
  const inn = new Group({
    el,
    animations: [
      new Step({ el: lines, keyframes: [{ opacity: 1, strokeDashoffset: 81 }, { opacity: 1, strokeDashoffset: 0 }], duration: STEP_DURATION, easing: CHECK_FADE }),
      new Step({ el: checks, keyframes: [{ transform: `scale(${CHECK_SCALE})` }, { transform: "scale(1)" }], duration: STEP_DURATION, easing: CHECK_POP }),
    ],
  });
  return new Sequence({ el, dispatch: true, steps: [out, inn] });
});

// ---- PricingIcon -------------------------------------------------------------------------------------
const PRICING_ANGLE = 45;
const SWING_START = 750;
const SWING_OUT = 500;
const SWING_BACK = 350;
const SWING_END = 550;
const SWING_OVERLAP = 95;

export const PricingIcon = icon("PricingIcon", (el) => {
  const C = "PricingIcon";
  const backs = tl(el, C, "tagBacks");
  const fronts = tl(el, C, "tagFronts");
  const a = PRICING_ANGLE;
  const backsAnim = new Sequence({
    el,
    steps: [
      new Step({ el: backs, keyframes: [{ transform: `rotate(${a}deg)` }, { transform: "rotate(0)" }], easing: "cubic-bezier(0.5, -1.75, 1, 0.5)", duration: SWING_START }),
      new Delay({ el, duration: SWING_START - SWING_OVERLAP }),
      new Step({ el: backs, keyframes: [{ transform: "rotate(0)" }, { transform: `rotate(${a}deg)` }], easing: "cubic-bezier(0.4, 0, 0, 1)", duration: SWING_END }),
    ],
  });
  const frontsAnim = new Sequence({
    el,
    steps: [
      new Step({
        el: fronts,
        keyframes: [{ transform: "rotate(0)" }, { transform: `rotate(${a * -1.5}deg)` }],
        easing: "cubic-bezier(0.4, 0, 0.4, 1)",
        duration: SWING_OUT,
        delay: SWING_START - SWING_OVERLAP,
        fill: "both",
      }),
      new Step({ el: fronts, keyframes: [{ transform: `rotate(${a * -1.5}deg)` }, { transform: "rotate(0)" }], easing: "cubic-bezier(0.4, 0, 1, 1)", duration: SWING_BACK }),
    ],
  });
  return new Group({ el, dispatch: true, animations: [backsAnim, frontsAnim] });
});
