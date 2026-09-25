// RevRecHeroAnimation — port of v1-HeroAnimation-QZH2H2CV.js.
// A revenue timeline scrolls left one 270 px month at a time while event cards slide in and pairs of
// deferred/recognized bars grow. Intro on first intersection (2 s), then a main sequence (one step per
// event, 3 s each, a 2 s hold and a loop cycle that fast-forwards 5 months while bars drain), then the
// main sequence's animations are cancelled and it replays from the intro's end state. The main
// sequence pauses offscreen (reference handleSeparate) and with the tab hidden.
import type { Controller } from "../types";
import { onPageVisibility, targetList } from "../lib";
import { Clock, disableAmbientAnimations, scrollObserver } from "../pg-tax/motion";

const OFFSET = 3; // r: the first 3 bar pairs are already drawn
const TIMELINE_STEP = 270; // d
const GUIDE_STEP = 269; // T
const EASE_IN_OUT_QUART = "cubic-bezier(0.76, 0, 0.24, 1)";
const EASE_CUSTOM_OUT = "cubic-bezier(0.22, 0.61, 0.36, 1)";

export const RevRecHeroAnimation: Controller = (el) => {
  if (disableAmbientAnimations()) return;
  const N = "RevRecHeroAnimation";
  const bars = targetList(el, N, "bars");
  const events = targetList(el, N, "events");
  const timelineTrack = targetList(el, N, "timelineTrack");
  const guideTrack = targetList(el, N, "guideTrack");
  const recognized = bars.slice(0, 12);
  const deferred = bars.slice(12, 24);
  if (!events.length) return;

  const barIn = (c: Clock, bar: Element | undefined, delay = 0) =>
    c.animate(bar, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { easing: EASE_CUSTOM_OUT, duration: 1000, delay });
  const barOut = (c: Clock, bar: Element | undefined, delay = 0) =>
    c.animate(bar, [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { easing: EASE_IN_OUT_QUART, duration: 2000, delay });
  const eventIn = (c: Clock, ev: Element | undefined, delay = 0) =>
    c.animate(ev, [{ opacity: 0, transform: "translateX(20px)" }, { opacity: 1, transform: "translateX(0)" }], { easing: EASE_CUSTOM_OUT, duration: 1000, delay });
  const tracks = (c: Clock, t: number, delay = 0, steps = 1, duration = 1000) => [
    c.animate(timelineTrack, [{ transform: `translateX(${-TIMELINE_STEP * t}px)` }, { transform: `translateX(${-TIMELINE_STEP * (t + steps)}px)` }], { easing: EASE_IN_OUT_QUART, duration, delay }),
    c.animate(guideTrack, [{ transform: `translateX(${-GUIDE_STEP * t}px)` }, { transform: `translateX(${-GUIDE_STEP * (t + steps)}px)` }], { easing: EASE_IN_OUT_QUART, duration, delay }),
  ];

  const intro = async (c: Clock) => {
    await Promise.all([c.wait(2000), ...tracks(c, 0), eventIn(c, events[0], 0), barIn(c, deferred[OFFSET], 100), barIn(c, recognized[OFFSET], 200)]);
  };

  const stepEvent = (c: Clock, ev: Element, e: number) => {
    const d = e === 1 ? 100 : 800;
    return Promise.all([
      c.wait(3000),
      ...(e === 1 ? tracks(c, 1, 0, 0) : tracks(c, e - 1)),
      eventIn(c, ev, d),
      barIn(c, deferred[e + OFFSET], d + 200),
      barIn(c, recognized[e + OFFSET], d + 300),
    ]);
  };

  const loopCycle = (c: Clock) => {
    const rec = recognized.slice(OFFSET + 1, 12).reverse();
    const def = deferred.slice(OFFSET + 1, 12).reverse();
    return Promise.all([
      eventIn(c, events[events.length - 1], 2200),
      ...tracks(c, events.length - 2, 0, 5, 2600),
      ...rec.map((b, n) => barOut(c, b, 300 + n * 100)),
      ...def.map((b, n) => barOut(c, b, 300 + n * 100)),
      c.wait(4000),
    ]);
  };

  const main = async (c: Clock) => {
    const steps = events.slice(1).slice(0, -1);
    for (let i = 0; i < steps.length; i++) await stepEvent(c, steps[i], i + 1);
    await c.wait(2000);
    await loopCycle(c);
  };

  const introClock = new Clock();
  let loopClock: Clock | null = null;
  let introState: "idle" | "playing" | "done" = "idle";
  let intersecting = false;
  let hidden = document.hidden;
  let pendingMain = false;
  let disposed = false;

  const syncPause = () => {
    if (hidden) introClock.pause();
    else introClock.resume();
    if (!loopClock) return;
    if (intersecting && !hidden) loopClock.resume();
    else loopClock.pause();
  };

  const playMain = async () => {
    pendingMain = false;
    const c = new Clock();
    loopClock = c;
    syncPause();
    await main(c);
    // Reference: on "main" done → restart() (cancels its animations) and play again if intersecting.
    c.dispose(true);
    if (disposed) return;
    loopClock = null;
    if (intersecting) void playMain();
    else pendingMain = true;
  };

  const onIntersect = () => {
    intersecting = true;
    if (introState === "done") {
      if (pendingMain) void playMain();
      else syncPause();
    } else if (introState === "idle") {
      introState = "playing";
      void intro(introClock).then(() => {
        introState = "done";
        if (intersecting) void playMain();
        else pendingMain = true;
      });
    }
  };
  const onSeparate = () => {
    intersecting = false;
    if (introState === "done") syncPause();
  };

  const offs = [
    scrollObserver(el, 0.001, onIntersect, onSeparate),
    onPageVisibility((h) => {
      hidden = h;
      syncPause();
    }),
  ];

  return () => {
    disposed = true;
    offs.forEach((off) => off());
    introClock.dispose(true);
    loopClock?.dispose(true);
  };
};
