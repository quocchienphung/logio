// RevRecSingleViewAnimation + RevRecSingleViewLogoItem — port of v1-SingleViewAnimation-JJR6SIKB.js.
// 17 slots arranged around a centre hold data-source logos. After an intro (each logo flies in from
// 60 px further out along its ray, staggered 1–2 s), two independent chains run forever: a logo leaves
// (shrinks to the centre, 1.4 s), is replaced in the pool, waits `b` ms, then a logo enters an empty
// slot (1.2 s), waits `w` ms, then another leaves… Paused offscreen (reference handleSeparate).
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, onPageVisibility } from "../lib";
import { Clock, disableAmbientAnimations, scrollObserver } from "../pg-tax/motion";

const ACTIVE = "RevRecSingleViewLogoItem--isActive";
const ANIMATING = "RevRecSingleViewLogoItem--isAnimating";
const SMALL = "RevRecSingleViewLogoItem--isSmall";
const EASE_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

interface Position {
  scale: "Regular" | "Small";
  x: number;
  y: number;
}

const POSITIONS: Position[] = [
  { scale: "Regular", x: 34, y: -240 },
  { scale: "Small", x: 128, y: -246 },
  { scale: "Regular", x: 200, y: -200 },
  { scale: "Small", x: 218, y: -102 },
  { scale: "Regular", x: 150, y: -40 },
  { scale: "Small", x: 210, y: 44 },
  { scale: "Small", x: 188, y: 126 },
  { scale: "Regular", x: 170, y: 214 },
  { scale: "Small", x: 54, y: 214 },
  { scale: "Regular", x: -62, y: 190 },
  { scale: "Small", x: -140, y: 244 },
  { scale: "Regular", x: -210, y: 166 },
  { scale: "Regular", x: -146, y: 60 },
  { scale: "Small", x: -204, y: -32 },
  { scale: "Small", x: -234, y: -132 },
  { scale: "Regular", x: -152, y: -195 },
  { scale: "Small", x: -60, y: -230 },
];
const EMPTY_AT_START = 2; // I

interface LogoItemApi {
  animateIn(c: Clock, p: Position, delay?: number): Promise<void>;
  animateOut(c: Clock, p: Position, delay?: number): Promise<void>;
  activate(scale: Position["scale"]): void;
  show(p: Position): void;
}

export const RevRecSingleViewLogoItem: Controller = (el) => {
  const activate = (scale: Position["scale"]) => {
    if (scale === "Small") el.classList.add(SMALL);
    el.classList.add(ACTIVE);
  };
  const deactivate = () => el.classList.remove(ACTIVE, ANIMATING, SMALL);
  const api: LogoItemApi = {
    activate,
    async animateIn(c, { scale, x, y }, delay = 0) {
      const a = Math.atan2(y, x);
      const mx = Math.cos(a) * 60;
      const my = Math.sin(a) * 60;
      await c.wait(delay);
      activate(scale);
      await c.animate(el, [{ opacity: 0, transform: `translate(${x + mx}px, ${y + my}px)` }, { opacity: 1, transform: `translate(${x}px, ${y}px)` }], { duration: 1200 });
    },
    async animateOut(c, { x, y }, delay = 0) {
      await c.wait(delay);
      el.classList.add(ANIMATING);
      await c.animate(el, [{ opacity: 1, transform: `translateX(${x}px) translateY(${y}px) scale(1.0)` }, { opacity: 0, transform: "translateX(0) translateY(0) scale(0.3)" }], { easing: EASE_OUT, duration: 1400 });
      deactivate();
    },
    show({ x, y }) {
      el.style.transform = `translate(${x}px,${y}px)`;
      el.style.opacity = "1";
    },
  };
  exposeApi(el, "RevRecSingleViewLogoItem", api);
  return () => {
    deactivate();
    el.style.removeProperty("transform");
    el.style.removeProperty("opacity");
    el.getAnimations().forEach((a) => a.cancel());
  };
};

interface Slot {
  isActive: boolean;
  isAnimating: boolean;
  position: Position;
  logo: LogoItemApi;
}

const randomIndex = (arr: unknown[]) => Math.floor(Math.random() * arr.length);

/** Reference pickRandomItemAndRemoveFromArray: removes the pick (and, with `neighbours`, its neighbours). */
function pickAndRemove<T>(arr: T[], neighbours = false): T {
  const t = randomIndex(arr);
  const item = arr[t];
  if (neighbours) {
    arr.splice(t === 0 ? arr.length - 1 : t - 1, 1);
    arr.splice((t + 1) % arr.length, 1);
  }
  arr.splice(t, 1);
  return item;
}

export const RevRecSingleViewAnimation: Controller = (el) => {
  const logos = childControllers(el, "RevRecSingleViewLogoItem")
    .map((n) => getApi<LogoItemApi>(n, "RevRecSingleViewLogoItem"))
    .filter((a): a is LogoItemApi => !!a);
  if (!logos.length) return;

  if (disableAmbientAnimations()) {
    const pool = [...logos];
    POSITIONS.forEach((p) => {
      const logo = pickAndRemove(pool);
      if (!logo) return;
      logo.activate(p.scale);
      logo.show(p);
    });
    return;
  }

  // Module-level constants in the reference: fixed per page load.
  const holdAfterOut = 500 + Math.random() * 3500; // b
  const holdAfterIn = 1000 + Math.random() * 5000; // w

  let available = [...logos];
  const free = [...POSITIONS];
  const empty = [...Array(EMPTY_AT_START)].map(() => pickAndRemove(free, true));
  const slots: Slot[] = POSITIONS.map((p) => ({ isActive: !empty.includes(p), isAnimating: false, position: p, logo: pickAndRemove(available) }));

  const clock = new Clock();
  let introState: "idle" | "playing" | "done" = "idle";
  let intersecting = false;
  let hidden = document.hidden;
  let chains = 0;
  let previousIndex: number | undefined;

  const isNextToPrevious = (i: number, all: Slot[]) => {
    const p = previousIndex ?? 0;
    const before = p === 0 ? all.length - 1 : p - 1;
    return i === before || i === (p + 1) % all.length;
  };
  const isNextToEmpty = (i: number, all: Slot[]) => {
    const a = all[i === 0 ? all.length - 1 : i - 1];
    const b = all[(i + 1) % all.length];
    return !a.isActive || a.isAnimating || !b.isActive || b.isAnimating;
  };

  const onOutComplete = (slot: Slot) => {
    if (available.length === 0) {
      const used = slots.map((s) => s.logo);
      available = logos.filter((l) => !used.includes(l));
    }
    slot.logo = pickAndRemove(available);
    slot.isActive = false;
    slot.isAnimating = false;
  };

  const logoOut = async (delay = 0) => {
    const candidates = slots.filter((s, i, all) => s.isActive && !s.isAnimating && (previousIndex === undefined || !isNextToPrevious(i, all)) && !isNextToEmpty(i, all));
    if (!candidates.length) return; // this chain ends, as in the reference
    const t = randomIndex(candidates);
    const slot = candidates[t];
    previousIndex = t;
    slot.isAnimating = true;
    chains++;
    await slot.logo.animateOut(clock, slot.position, delay);
    onOutComplete(slot);
    await clock.wait(holdAfterOut);
    chains--;
    void logoIn();
  };

  const logoIn = async () => {
    const inactive = slots.filter((s) => !s.isActive);
    if (!inactive.length) return;
    const slot = inactive[randomIndex(inactive)];
    slot.isAnimating = true;
    slot.isActive = true;
    chains++;
    await slot.logo.animateIn(clock, slot.position);
    slot.isAnimating = false;
    await clock.wait(holdAfterIn);
    chains--;
    void logoOut();
  };

  const start = () => {
    void logoOut(500);
    void logoOut(5000);
  };

  const sync = () => {
    // The intro is never paused by scrolling in the reference; the chains are.
    const run = !hidden && (introState !== "done" || intersecting);
    if (run) clock.resume();
    else clock.pause();
  };

  const onIntersect = () => {
    intersecting = true;
    if (introState === "done") {
      if (chains === 0) start();
      sync();
    } else if (introState === "idle") {
      introState = "playing";
      sync();
      const active = slots.filter((s) => s.isActive);
      void Promise.all(active.map((s) => s.logo.animateIn(clock, s.position, 1000 + Math.random() * 1000))).then(() => {
        introState = "done";
        sync();
        if (intersecting) start();
      });
    }
  };
  const onSeparate = () => {
    intersecting = false;
    sync();
  };

  clock.pause();
  const offs = [
    scrollObserver(el, 0.001, onIntersect, onSeparate),
    onPageVisibility((h) => {
      hidden = h;
      sync();
    }),
  ];
  return () => {
    offs.forEach((off) => off());
    clock.dispose(true);
  };
};
