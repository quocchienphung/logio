// FaceIdAnimation ← v1-chunk-BHE7QNCY.js; ApplePaySheet ← v1-chunk-WP3AKADS.js (both /payments/checkout).
// Face ID glyph inside the Apple Pay sheet: while "active" the face follows the mouse (snapped to a 20 px
// grid); animate() morphs the corner brackets into a spinning ring (200 + 300 + 200 ms, ghost trails every
// frame while spinning), then shows the check mark and, 10 s later, returns to the face. Clicking the glyph
// toggles between the two states.
import type { Controller } from "../types";
import { childControllers, exposeApi, getApi, listen, prefersReducedMotion, target, targetList } from "../lib";
import { Delay, Exec, Group, Sequence, Waapi, type Step } from "../pg-payments/motion";
import { scrollObserver } from "../pg-payments/util";

// Monochrome: #02e8fc (spin trail) and #0278fc (active) → the generator's greys for the same hexes.
const STROKE_SPIN = "#c7c7c7";
const STROKE_ACTIVE = "#c3c3c3";

export interface FaceIdApi {
  readonly el: HTMLElement;
  activate(delay?: number): void;
  deactivate(): void;
  animate(): void;
}

export const FaceIdAnimation: Controller = (el) => {
  const N = "FaceIdAnimation";
  const border = target<SVGElement>(el, N, "border");
  const borderCopy = target<SVGElement>(el, N, "borderCopy");
  const borders = target(el, N, "borders");
  const features = target(el, N, "features");
  const eyes = target(el, N, "eyes");
  const nose = target(el, N, "nose");
  const mouth = target(el, N, "mouth");
  const tl = targetList(el, N, "tl");
  const tr = targetList(el, N, "tr");
  const br = targetList(el, N, "br");
  const bl = targetList(el, N, "bl");
  if (!border || !borderCopy || !borders || !features) return;

  const isStatic = prefersReducedMotion();
  const shouldFollowMouse = el.dataset.jsFollowMouse === "";
  const showsHoldNearReader = el.hasAttribute("data-js-shows-hold-near-reader");
  const returnsChainable = el.hasAttribute("data-js-returns-chainable-animation");
  let toggled = false;
  let isSpinning = false;
  let isPhone = false;
  let isChecked = false;
  let scrollTop = 0;
  let oldScrollTop = 0;
  let winHalfH = 0;
  let winHalfW = 0;
  let mouseX = 0;
  let mouseY = 0;
  let oldPageX = 0;
  let oldPageY = 0;
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const clones = new Set<Element>();
  let ghostRaf = 0;
  let spin: Step | undefined;

  const updateWindowSize = () => {
    winHalfH = innerHeight * 0.5;
    winHalfW = innerWidth * 0.5;
  };
  const updateScroll = () => (scrollTop = document.scrollingElement?.scrollTop ?? scrollY);
  const lookAtMouse = () => {
    if (eyes) eyes.style.transform = `translate(${mouseX / 150}px, ${mouseY / 150}px)`;
    if (nose) nose.style.transform = `translate(${mouseX / 80}px, ${mouseY / 80}px)`;
    if (mouth) mouth.style.transform = `translate(${mouseX / 200}px, ${mouseY / 300}px)`;
  };
  const updateMousePosition = (e?: MouseEvent) => {
    let x: number;
    let y: number;
    if (e) {
      x = e.pageX;
      y = e.pageY;
      oldPageX = x;
      oldPageY = y;
    } else {
      x = oldPageX;
      y = oldPageY + (scrollTop - oldScrollTop);
    }
    const gx = Math.round((x - winHalfW) / 20) * 20;
    const gy = Math.round((y - scrollTop - winHalfH) / 20) * 20;
    // Reference: only when both axes changed.
    if (gx !== mouseX && gy !== mouseY) {
      mouseX = gx;
      mouseY = gy;
      lookAtMouse();
    }
  };
  const onResize = () => {
    updateWindowSize();
    updateScroll();
    updateMousePosition();
  };
  const onScroll = () => {
    updateScroll();
    updateMousePosition();
  };
  const onMouseMove = (e: MouseEvent) => {
    oldScrollTop = scrollTop;
    updateMousePosition(e);
  };
  const addFaceListeners = () => {
    removeFaceListeners();
    addEventListener("resize", onResize);
    addEventListener("scroll", onScroll);
    addEventListener("mousemove", onMouseMove);
  };
  function removeFaceListeners() {
    removeEventListener("resize", onResize);
    removeEventListener("scroll", onScroll);
    removeEventListener("mousemove", onMouseMove);
  }
  if (shouldFollowMouse) {
    updateScroll();
    oldScrollTop = scrollTop;
    updateWindowSize();
    mouseX = winHalfW;
    mouseY = scrollTop - winHalfH;
    oldPageX = mouseX;
    oldPageY = mouseY;
  }

  const setD = (list: HTMLElement[], d: string) => list.forEach((p) => p.setAttribute("d", d));
  const strokes = (svg: Element, color: string) => svg.querySelectorAll<SVGPathElement>("path").forEach((p) => (p.style.stroke = color));
  const showCorners = () => {
    setD(tl, "M10,30 L10,22 A12,12,0,0,1,22,10L30,10");
    setD(tr, "M70,10 L78,10 A12,12,0,0,1,90,22L90,30");
    setD(br, "M90,70 L90,78 A12,12,0,0,1,78,90L70,90");
    setD(bl, "M30,90 L22,90 A12,12,0,0,1,10,78L10,70");
    later(() => {
      el.classList.remove("is-spinning");
      features.classList.remove("is-hidden");
    }, 10);
  };
  const resetCircles = () => {
    border.style.transform = "perspective(500px) rotateX(0) rotateY(0)";
    border.style.transition = "transform 0s";
    borderCopy.style.transform = "perspective(500px) rotateZ(0) rotateX(0) rotateY(0)";
    borderCopy.style.transition = "transform 0s";
    borderCopy.style.opacity = "0";
  };
  // A fading, thickening clone of the ring every frame while spinning (removed after 400 ms).
  const ghostBorder = (src: SVGElement) => {
    if (!isSpinning) return;
    const c = src.cloneNode(true) as SVGElement;
    c.style.transform = getComputedStyle(src).getPropertyValue("transform");
    c.style.transition = "200ms";
    c.style.opacity = "0.15";
    c.querySelectorAll<SVGPathElement>("path").forEach((p) => {
      p.style.transition = "200ms stroke-width";
      p.style.strokeWidth = "5px";
    });
    c.removeAttribute("data-js-target");
    borders.appendChild(c);
    clones.add(c);
    later(() => {
      c.style.opacity = "0";
      c.querySelectorAll<SVGPathElement>("path").forEach((p) => (p.style.strokeWidth = "8px"));
    }, 10);
    later(() => {
      c.remove();
      clones.delete(c);
    }, 400);
    ghostRaf = requestAnimationFrame(() => ghostBorder(src));
  };
  const processAnimation = () =>
    showsHoldNearReader
      ? new Sequence([
          new Exec(() => {
            el.classList.add("is-phone");
            isSpinning = false;
            isPhone = true;
          }),
          new Delay(isStatic ? 0 : 3000),
          new Exec(() => {
            if (!isPhone) return;
            isChecked = true;
            el.classList.add("is-checked");
          }),
        ])
      : new Sequence([
          new Exec(() => {
            isSpinning = false;
            isChecked = true;
            el.classList.add("is-checked");
          }),
          new Delay(isStatic ? 0 : 1e4),
          new Exec(() => {
            if (isChecked && el.classList.contains("is-active")) animate();
          }),
        ]);
  const spinCircles = () => {
    spin?.cancel();
    const s = new Sequence([
      new Exec(() => {
        isSpinning = true;
        setD(tl, "M10,50 L10,50 A40,40,0,0,1,50,10L50,10");
        setD(tr, "M50,10 L50,10 A40,40,0,0,1,90,50L90,50");
        setD(br, "M90,50 L90,50 A40,40,0,0,1,50,90L50,90");
        setD(bl, "M50,90 L50,90 A40,40,0,0,1,10,50L10,50");
        border.style.transform = "perspective(500px) rotateX(1turn) rotateY(1turn)";
        border.style.transition = "transform 800ms ease-in-out, opacity 300ms";
        border.style.opacity = "0.4";
        borderCopy.style.transform = "perspective(500px) rotateZ(150deg) rotateX(1turn) rotateY(1turn)";
        borderCopy.style.transition = "transform 800ms ease-in-out, opacity 100ms";
        borderCopy.style.opacity = "0.4";
        strokes(borderCopy, STROKE_SPIN);
        el.classList.remove("is-resting");
        el.classList.add("is-spinning");
        features.classList.add("is-hidden");
      }),
      new Delay(isStatic ? 0 : 200),
      new Exec(() => {
        ghostBorder(border);
        ghostBorder(borderCopy);
      }),
      new Delay(isStatic ? 0 : 300),
      new Exec(() => {
        el.classList.remove("is-spinning");
        border.style.opacity = "1";
        borderCopy.style.opacity = "0";
        strokes(borderCopy, STROKE_ACTIVE);
      }),
      new Delay(isStatic ? 0 : 200),
      new Exec(resetCircles),
      processAnimation(),
    ]);
    spin = s;
    if (!returnsChainable) s.play();
    return s;
  };
  const animateToPaying = () => {
    removeFaceListeners();
    spinCircles();
    toggled = true;
  };
  const animateToFace = () => {
    isSpinning = false;
    isPhone = false;
    isChecked = false;
    el.classList.add("is-resting");
    el.classList.remove("is-phone", "is-checked");
    showCorners();
    if (shouldFollowMouse) addFaceListeners();
    toggled = false;
  };
  function animate() {
    if (toggled) animateToFace();
    else animateToPaying();
  }
  const api: FaceIdApi = {
    el,
    activate(delay = 0) {
      el.classList.add("is-active", "is-resting");
      if (delay) later(animate, isStatic ? 0 : delay);
    },
    deactivate() {
      animateToFace();
      el.classList.remove("is-active");
      removeFaceListeners();
    },
    animate,
  };
  exposeApi(el, N, api);
  const offClick = returnsChainable ? () => {} : listen(el, "click", animate);
  return () => {
    offClick();
    removeFaceListeners();
    cancelAnimationFrame(ghostRaf);
    isSpinning = false;
    spin?.cancel();
    timers.forEach(clearTimeout);
    clones.forEach((c) => c.remove());
    el.classList.remove("is-active", "is-resting", "is-spinning", "is-phone", "is-checked");
  };
};

// ---- ApplePaySheet -------------------------------------------------------------------------------------
export interface ApplePaySheetApi {
  readonly faceAnimation: FaceIdApi | undefined;
  animateIn(delay?: number): Step;
  animateOut(): Step;
}

export const ApplePaySheet: Controller = (el) => {
  const N = "ApplePaySheet";
  const overlay = target(el, N, "overlay");
  const sheet = target(el, N, "sheet");
  const faceEl = childControllers(el, "FaceIdAnimation")[0];
  const face = () => (faceEl ? getApi<FaceIdApi>(faceEl, "FaceIdAnimation") : undefined);
  const autoplay = el.dataset.jsAutoplayFaceIdAnimation === "true";
  const api: ApplePaySheetApi = {
    get faceAnimation() {
      return face();
    },
    animateIn: (delay = 400) =>
      new Group([
        new Waapi({ el: overlay, keyframes: [{ opacity: 0 }, { opacity: 0.2 }], delay, duration: 500, easing: "cubic-bezier(0.61, 1, 0.88, 1)" }),
        new Waapi({
          el: sheet,
          keyframes: [{ opacity: 0, transform: "translateY(100%)" }, { opacity: 1, offset: 0.35 }, { opacity: 1, transform: "translateY(0)" }],
          delay,
          duration: 700,
          easing: "cubic-bezier(0, 0.55, 0.45, 1)",
        }),
      ]),
    animateOut: () =>
      new Group([
        new Waapi({ el: overlay, keyframes: [{ opacity: 0.2 }, { opacity: 0 }] }),
        new Waapi({ el: sheet, keyframes: [{ opacity: 1 }, { opacity: 0 }] }),
      ]),
  };
  exposeApi(el, N, api);
  if (!faceEl) return;
  // Fully visible (threshold 1) → activate the face (auto-animate after 2.5 s only when
  // data-js-autoplay-face-id-animation="true"; the page sets it to ""); otherwise deactivate.
  return scrollObserver(faceEl, 1, {
    onIntersect: () => face()?.activate(autoplay ? 2500 : 0),
    onSeparate: () => face()?.deactivate(),
  });
};
