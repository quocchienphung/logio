// Terminal hero: outline drawing, S700 device entrance, looping S700 screen UI, hover swaps for the M2 /
// WisePad 3 outlines, and the pointer-driven 3D tilt of the S700.
// Reference modules: v1-HeroGraphic-DCI36TUX.js (TerminalHeroGraphic), v1-chunk-UZBU4E2B.js
// (TerminalHeroGraphic3d), v1-chunk-HXJ4T6VS.js (TerminalHeroGraphicS700UI).
// Behaviour notes: docs/research/products/motion/pages-b.md.
//
// The reference renders the S700 as a three.js GLB model loaded from an external bucket
// (stripe-images.s3.us-west-1.amazonaws.com/newsroom/s700_latest.glb). That asset is not part of the mirror and
// external requests are not allowed, so the port always takes the reference's own fallback branch (the model
// "errored"): the knockout PNG (TerminalHeroGraphic3d.pngDevice) fades in instead of the model. On pointer
// devices the PNG then stands in for the model in the reference's render loop: it receives the same
// rotateX/rotateY the loop applies to the screen UI and shadow, inside the same perspective box.
import { exposeApi, getApi, prefersReducedMotion, target, targetList } from "../lib";
import type { Controller } from "../types";
import { EASE, Timeline, pauseWhenHidden, run, whenActive } from "../pg-payment-methods/motion";

const ENTERING = "TerminalHeroGraphic--isEntering";
const TAP_TO_PAY_VISIBLE = "TerminalHeroGraphicS700UI__paymentTapToPay--isVisible";
const SPLASH_LOADED = "TerminalHeroGraphicS700UI__splash--loaded";
const EVT_LOADED = "TerminalHeroGraphic3d:S700Loaded";
const EVT_ERRORED = "TerminalHeroGraphic3d:S700Errored";
/** Pointer offset (px from the canvas centre) → rotation (rad). */
const TILT_PER_PX = 5e-4;

const isTouchDevice = () => "ontouchstart" in window;

// ---- TerminalHeroGraphicS700UI ---------------------------------------------------------------------------

export interface S700UIApi {
  animateSplashInOnLoad(): void;
  startAnimation(): void;
}

export const TerminalHeroGraphicS700UI: Controller = (el) => {
  const C = "TerminalHeroGraphicS700UI";
  const splash = target<HTMLElement>(el, C, "splash");
  const payment = target<HTMLElement>(el, C, "payment");
  const paymentTitle = target<HTMLElement>(el, C, "paymentTitle");
  const tapToPay = target<HTMLElement>(el, C, "tapToPay");
  const items = targetList<HTMLElement>(el, C, "paymentLineItems");
  if (!splash || !payment || !paymentTitle || !tapToPay) return;
  const loop = new Timeline();
  const once = new Timeline();
  const reduced = prefersReducedMotion();
  let started = false;
  let offActive: () => void = () => undefined;

  const splashIn = () => loop.animate(splash, [{ opacity: 1, transform: "scale(1)" }], { easing: EASE.outCubic, duration: 650 });
  const splashOut = () => loop.animate(splash, [{ opacity: 0, transform: "scale(1.1)" }], { easing: EASE.outCubic, duration: 650 });
  const intro = () =>
    Promise.all([
      loop.animate(paymentTitle, [{ opacity: 1, transform: "translateY(0)" }], { duration: 800, easing: EASE.outCubic }),
      loop.animate(items, [{ opacity: 1, transform: "translateY(0)" }], { duration: 800, easing: EASE.outCubic, delay: (i) => i * 100 }),
    ]);
  const tapToPayIn = () =>
    Promise.all([
      loop.animate([...items].reverse(), [{ opacity: 0, transform: "translateY(40px)" }], { duration: 800, easing: EASE.outCubic, delay: (i) => i * 100 }),
      loop.animate(paymentTitle, [{ transform: "translateY(150px)" }], { duration: 800, delay: 600, easing: EASE.outCubic }),
      loop.wait(600).then(() => tapToPay.classList.add(TAP_TO_PAY_VISIBLE)),
    ]);

  /** One pass of the reference's "TerminalHeroGraphicS700UI:step" sequence; on completion the reference toggles
   * the tap-to-pay class and restarts it (restart cancels the pass's animations, so every pass starts from the
   * CSS state: splash shown via its --loaded class, payment hidden). */
  const pass = async () => {
    await loop.wait(1000);
    await Promise.all([splashOut(), loop.animate(payment, [{ opacity: 1 }], { duration: 400, easing: "linear" })]);
    await intro();
    await loop.wait(1000);
    await tapToPayIn();
    await loop.wait(3000);
    await Promise.all([splashIn(), loop.animate(payment, [{ opacity: 0 }], { duration: 400, easing: "linear" })]);
    await loop.wait(1000);
    tapToPay.classList.toggle(TAP_TO_PAY_VISIBLE);
    loop.clearFills();
  };
  const cycle = async () => {
    for (;;) await pass();
  };

  const api: S700UIApi = {
    animateSplashInOnLoad() {
      if (reduced) {
        splash.classList.add(SPLASH_LOADED);
        return;
      }
      run(
        once.animate(
          splash,
          [
            { opacity: 0, transform: "scale(0.9)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { easing: EASE.outCubic, duration: 650 },
        ),
      );
      splash.classList.add(SPLASH_LOADED);
    },
    startAnimation() {
      if (started || reduced) return;
      started = true;
      // not in the reference: the loop pauses while offscreen or in a hidden tab
      offActive = whenActive(el, (on) => (on ? loop.resume() : loop.pause()));
      run(cycle());
    },
  };
  exposeApi(el, C, api);
  return () => {
    offActive();
    loop.reset();
    once.reset();
    splash.classList.remove(SPLASH_LOADED);
    tapToPay.classList.remove(TAP_TO_PAY_VISIBLE);
  };
};

// ---- TerminalHeroGraphic3d ---------------------------------------------------------------------------------

export interface Hero3dApi {
  loadS700Model(): void;
  showDevice(): void;
}

export const TerminalHeroGraphic3d: Controller = (el) => {
  const C = "TerminalHeroGraphic3d";
  const canvas = target<HTMLCanvasElement>(el, C, "canvas");
  const pngDevice = target<HTMLElement>(el, C, "pngDevice");
  const s700UI = target<HTMLElement>(el, C, "s700UI");
  const s700Shadow = target<HTMLElement>(el, C, "s700Shadow");
  if (!canvas || !pngDevice || !s700UI || !s700Shadow) return;
  const uiEl = el.querySelector<HTMLElement>('[data-js-controller~="TerminalHeroGraphicS700UI"]');
  const ui = () => (uiEl ? getApi<S700UIApi>(uiEl, "TerminalHeroGraphicS700UI") : undefined);
  const touch = isTouchDevice();
  const tl = new Timeline();
  const offHidden = pauseWhenHidden(tl);
  const cleanups: (() => void)[] = [offHidden];
  let s700Errored = false;
  let showTimer = 0;
  let errorTimer = 0;
  let mouseX = 0;
  let mouseY = 0;
  let canvasTop = 0;
  let canvasLeft = 0;
  let canvasHeight = 0;
  let canvasWidth = 0;
  let isIntersecting = false;
  let isTrackingMouse = false;
  let raf = 0;
  let tilting = false;

  const onMouseMove = (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  };
  const onResize = () => {
    const r = canvas.getBoundingClientRect();
    canvasTop = r.top + window.scrollY;
    canvasLeft = r.left;
    canvasHeight = canvas.clientHeight;
    canvasWidth = canvas.clientWidth;
  };
  const onDocLeave = () => (isTrackingMouse = false);
  const onDocEnter = () => (isTrackingMouse = true);

  const setTilt = (x: number, y: number) => {
    const t = `rotateX(${x * -1}rad) rotateY(${y}rad)`;
    s700UI.style.transform = t;
    s700Shadow.style.transform = t;
    pngDevice.style.transform = t;
  };
  /** The reference's render loop (renderThreeJS): while the pointer is in the document and the hero is on
   * screen, rotate by the pointer offset from the canvas centre; otherwise snap back to 0. The reference adds
   * window.scrollY twice to the centre's y (canvasTop is already a document offset); kept as is. */
  const render = () => {
    raf = 0;
    if (isTrackingMouse && isIntersecting) {
      const cy = canvasTop + canvasHeight / 2 + window.scrollY;
      const cx = canvasLeft + canvasWidth / 2;
      setTilt((mouseY - cy) * TILT_PER_PX, (mouseX - cx) * TILT_PER_PX);
    } else setTilt(0, 0);
    if (isIntersecting && !document.hidden) raf = requestAnimationFrame(render);
  };
  const kick = () => {
    if (tilting && !raf && isIntersecting && !document.hidden) raf = requestAnimationFrame(render);
  };

  if (!touch) {
    onResize();
    const offIo = whenActive(el, (on) => {
      isIntersecting = on;
      if (on) kick();
      else if (tilting) setTilt(0, 0);
    }, 0.001);
    window.addEventListener("resize", onResize);
    document.addEventListener("mouseleave", onDocLeave);
    document.addEventListener("mouseenter", onDocEnter);
    cleanups.push(offIo, () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mouseleave", onDocLeave);
      document.removeEventListener("mouseenter", onDocEnter);
      window.removeEventListener("mousemove", onMouseMove);
      if (raf) cancelAnimationFrame(raf);
    });
  }

  /** animateS700PNGIn: device and shadow fade in (650ms easeOutCubic) while the screen UI starts. */
  const animatePngIn = async () => {
    const reduced = prefersReducedMotion();
    const u = ui();
    u?.animateSplashInOnLoad();
    u?.startAnimation();
    const d = reduced ? 0 : 650;
    await Promise.all([
      tl.animate(pngDevice, [{ opacity: 1, transform: "scale(1)" }], { easing: EASE.outCubic, duration: d }),
      tl.animate(s700Shadow, [{ opacity: 1 }], { easing: EASE.outCubic, duration: d }),
    ]);
    if (touch || reduced) return;
    // Model stand-in (see header): keep the end state inline so the render loop can own the transform.
    pngDevice.getAnimations().forEach((a) => {
      a.commitStyles();
      a.cancel();
    });
    tilting = true;
    window.addEventListener("mousemove", onMouseMove);
    kick();
  };

  const api: Hero3dApi = {
    loadS700Model() {
      // The GLB is unavailable offline; report the load failure like the reference's loader error callback.
      errorTimer = window.setTimeout(() => {
        s700Errored = true;
        el.dispatchEvent(new CustomEvent(EVT_ERRORED, { bubbles: true, detail: {} }));
      }, 0);
    },
    showDevice() {
      if (touch || s700Errored) run(animatePngIn());
      else showTimer = window.setTimeout(() => api.showDevice(), 200);
    },
  };
  exposeApi(el, C, api);

  return () => {
    window.clearTimeout(showTimer);
    window.clearTimeout(errorTimer);
    tl.reset();
    cleanups.forEach((f) => f());
    [s700UI, s700Shadow, pngDevice].forEach((n) => {
      n.style.removeProperty("transform");
      n.style.removeProperty("opacity");
    });
  };
};

// ---- TerminalHeroGraphic ------------------------------------------------------------------------------------

export const TerminalHeroGraphic: Controller = (el) => {
  const C = "TerminalHeroGraphic";
  const m2 = target<HTMLElement>(el, C, "m2");
  const wisePad = target<HTMLElement>(el, C, "wisePad");
  const s700 = target<HTMLElement>(el, C, "s700");
  const hitboxes = targetList<HTMLElement>(el, C, "hitboxes");
  const h3dEl = el.querySelector<HTMLElement>('[data-js-controller~="TerminalHeroGraphic3d"]');
  const hero3d = () => (h3dEl ? getApi<Hero3dApi>(h3dEl, "TerminalHeroGraphic3d") : undefined);
  const touch = isTouchDevice();
  const reduced = prefersReducedMotion();
  const tl = new Timeline();
  const cleanups: (() => void)[] = [pauseWhenHidden(tl)];
  let s700IsLoaded = false;
  let s700Errored = false;
  let pollTimer = 0;
  const dur = (ms: number) => (reduced ? 0 : ms);

  const deviceEl = (name: string) => (name === "m2" ? m2 : name === "wisepad" ? wisePad : s700);
  /** Outline out: opacity 1 → 0 (1300ms) and scale .95 → 1 (650ms), easeOutCubic. */
  const crossFadeOut = (name: string) => {
    const d = deviceEl(name);
    if (!d) return Promise.resolve();
    return Promise.all([
      tl.animate(d, [{ opacity: 1 }, { opacity: 0 }], { easing: EASE.outCubic, duration: dur(1300) }),
      tl.animate(d, [{ transform: "scale(0.95, 0.95)" }, { transform: "scale(1, 1)" }], { easing: EASE.outCubic, duration: dur(650) }),
    ]).then(() => undefined);
  };
  const crossFadeIn = (name: string) => {
    const d = deviceEl(name);
    if (!d) return Promise.resolve();
    return Promise.all([
      tl.animate(d, [{ opacity: 0 }, { opacity: 1 }], { easing: EASE.outCubic, duration: dur(1300) }),
      tl.animate(d, [{ transform: "scale(1, 1)" }, { transform: "scale(0.95, 0.95)" }], { easing: EASE.outCubic, duration: dur(650) }),
    ]).then(() => undefined);
  };
  const s700Intro = () => {
    run(crossFadeOut("s700"));
    hero3d()?.showDevice();
  };
  const ensureS700IsLoaded = () => {
    if (s700IsLoaded || s700Errored) s700Intro();
    else pollTimer = window.setTimeout(ensureS700IsLoaded, 200);
  };

  const onEnter = (e: Event) => {
    const box = e.currentTarget as HTMLElement;
    const name = box.dataset.name;
    const img = box.getElementsByClassName("TerminalHeroGraphicUI__deviceImage")[0];
    if (!img || !name) return;
    run(crossFadeOut(name));
    run(tl.animate(img, [{ opacity: 1, transform: "scale(1)" }], { duration: dur(650), easing: EASE.outCubic }));
  };
  const onLeave = (e: Event) => {
    const box = e.currentTarget as HTMLElement;
    const name = box.dataset.name;
    const img = box.getElementsByClassName("TerminalHeroGraphicUI__deviceImage")[0];
    if (!img || !name) return;
    run(crossFadeIn(name));
    run(tl.animate(img, [{ opacity: 0, transform: "scale(0.9)" }], { duration: dur(650), easing: EASE.outCubic }));
  };
  const onLoaded = () => (s700IsLoaded = true);
  const onErrored = () => (s700Errored = true);

  hitboxes.forEach((h) => {
    h.addEventListener("mouseenter", onEnter);
    h.addEventListener("mouseleave", onLeave);
  });
  el.addEventListener(EVT_LOADED, onLoaded);
  el.addEventListener(EVT_ERRORED, onErrored);

  const startTimer = window.setTimeout(() => {
    // enter sequence: outlines draw (CSS transitions keyed on the class), 2s later the S700 intro
    el.classList.add(ENTERING);
    run(
      tl.wait(dur(2000)).then(() => {
        if (touch) s700Intro();
        else ensureS700IsLoaded();
      }),
    );
    if (!touch) hero3d()?.loadS700Model();
  }, 0);

  return () => {
    window.clearTimeout(startTimer);
    window.clearTimeout(pollTimer);
    tl.reset();
    cleanups.forEach((f) => f());
    hitboxes.forEach((h) => {
      h.removeEventListener("mouseenter", onEnter);
      h.removeEventListener("mouseleave", onLeave);
    });
    el.removeEventListener(EVT_LOADED, onLoaded);
    el.removeEventListener(EVT_ERRORED, onErrored);
    el.classList.remove(ENTERING);
  };
};
