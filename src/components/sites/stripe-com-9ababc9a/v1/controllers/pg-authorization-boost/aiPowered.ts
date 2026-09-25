// Authorization Boost "AI-powered" graphic: 63 issuers whose four treatment rates drift with 2D simplex noise
// (the highest is "promoted", the lowest "demoted"), and a zoom out/in of the issuer grid when the graphic
// scrolls into view.
// Reference modules: v1-AIPoweredGraphic-F6PP264T.js (AuthorizationBoostAIPoweredGraphic),
// v1-chunk-SEKHFGLV.js (AuthorizationBoostAIPoweredGraphicIssuer, with an inlined simplex-noise 2D).
// Behaviour notes: docs/research/products/motion/pages-b.md.
import { exposeApi, getApi, prefersReducedMotion, target, targetList } from "../lib";
import type { Controller } from "../types";
import { EASE, Timeline, pauseWhenHidden, run } from "../pg-payment-methods/motion";

const ZOOM_OUT_SCALE = 0.3876;
const MAX_SPEED = 3e-4;
const MIN_SPEED = 5e-5;
const PROMOTED = "AuthorizationBoostAIPoweredGraphic__treatment--promoted";
const DEMOTED = "AuthorizationBoostAIPoweredGraphic__treatment--demoted";

// ---- 2D simplex noise (Gustavson), seeded with a shuffled permutation table as the reference does -----------
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1];

function createNoise2D(random: () => number = Math.random): (x: number, y: number) => number {
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 0; i < 255; i++) {
    const r = i + ~~(random() * (256 - i));
    const t = perm[i];
    perm[i] = perm[r];
    perm[r] = t;
  }
  for (let i = 256; i < 512; i++) perm[i] = perm[i - 256];
  const gx = Float64Array.from(perm, (p) => GRAD[(p % 12) * 2]);
  const gy = Float64Array.from(perm, (p) => GRAD[(p % 12) * 2 + 1]);
  const corner = (idx: number, x: number, y: number) => {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    t *= t;
    return t * t * (gx[idx] * x + gy[idx] * y);
  };
  return (x, y) => {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
    const ii = i & 255;
    const jj = j & 255;
    const n0 = corner(ii + perm[jj], x0, y0);
    const n1 = corner(ii + i1 + perm[jj + j1], x0 - i1 + G2, y0 - j1 + G2);
    const n2 = corner(ii + 1 + perm[jj + 1], x0 - 1 + 2 * G2, y0 - 1 + 2 * G2);
    return 70 * (n0 + n1 + n2);
  };
}
const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((outMax - outMin) * (v - inMin)) / (inMax - inMin);

// ---- Issuer ---------------------------------------------------------------------------------------------------

export interface IssuerApi {
  startNumbersAnimation(): void;
  stopNumbersAnimation(): void;
  speedUp(): void;
  speedDown(): void;
}

export const AuthorizationBoostAIPoweredGraphicIssuer: Controller = (el) => {
  const C = "AuthorizationBoostAIPoweredGraphicIssuer";
  const numbers = targetList<HTMLElement>(el, C, "treatmentNumbers");
  const pills = targetList<HTMLElement>(el, C, "treatmentPills");
  const initial = numbers.map((n) => n.textContent);
  const noise2D = createNoise2D();
  let speed = MIN_SPEED;
  let isAnimating = false;
  let raf = 0;

  /** Driven by the rAF timestamp: rate_i = map(noise(i·100, t·speed), -1..1 → 80..97)%. */
  const update = (now: number) => {
    let max = -Infinity;
    let min = Infinity;
    let maxI = 0;
    let minI = 0;
    numbers.forEach((n, i) => {
      const v = mapRange(noise2D(i * 100, now * speed), -1, 1, 80, 97);
      n.textContent = `${Math.round(v)}%`;
      if (v > max) {
        max = v;
        maxI = i;
      }
      if (v < min) {
        min = v;
        minI = i;
      }
    });
    pills.forEach((p, i) => {
      p.classList.toggle(PROMOTED, i === maxI);
      p.classList.toggle(DEMOTED, i === minI);
    });
    if (isAnimating) raf = requestAnimationFrame(update);
  };

  const api: IssuerApi = {
    startNumbersAnimation() {
      if (isAnimating || prefersReducedMotion()) return;
      isAnimating = true;
      raf = requestAnimationFrame(update);
    },
    stopNumbersAnimation() {
      if (!isAnimating) return;
      isAnimating = false;
      cancelAnimationFrame(raf);
    },
    speedUp: () => (speed = MAX_SPEED),
    speedDown: () => (speed = MIN_SPEED),
  };
  exposeApi(el, C, api);
  // reference connect(): the numbers start at once (the parent stops them while offscreen)
  if (prefersReducedMotion()) update(performance.now());
  else api.startNumbersAnimation();

  return () => {
    api.stopNumbersAnimation();
    numbers.forEach((n, i) => (n.textContent = initial[i]));
    pills.forEach((p) => p.classList.remove(PROMOTED, DEMOTED));
  };
};

// ---- Graphic ------------------------------------------------------------------------------------------------

export const AuthorizationBoostAIPoweredGraphic: Controller = (el) => {
  const grid = target<HTMLElement>(el, "AuthorizationBoostAIPoweredGraphic", "grid");
  const issuers = () =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-js-controller~="AuthorizationBoostAIPoweredGraphicIssuer"]'))
      .map((n) => getApi<IssuerApi>(n, "AuthorizationBoostAIPoweredGraphicIssuer"))
      .filter((a): a is IssuerApi => !!a);
  if (!grid) return;
  if (prefersReducedMotion()) {
    // reference: Motion.disableAmbientAnimations() → no observer; the issuers show one static frame (see Issuer)
    return;
  }
  const tl = new Timeline();
  const offHidden = pauseWhenHidden(tl);
  let isAnimating = false;
  const scale = (s: number) => `translate(-50%, -50%) scale(${s})`;

  /** wait 1s → focus + zoom out (2s easeInOutCubic) → hold 4s → zoom in (2s), classes cleared 1s into it. */
  const zoom = async () => {
    await tl.wait(1000);
    issuers().forEach((i) => i.speedUp());
    el.classList.add("isFocused", "isZoomedOut");
    await tl.animate(grid, [{ transform: scale(1) }, { transform: scale(ZOOM_OUT_SCALE) }], { easing: EASE.inOutCubic, duration: 2000 });
    await tl.wait(4000);
    await Promise.all([
      tl.animate(grid, [{ transform: scale(ZOOM_OUT_SCALE) }, { transform: scale(1) }], { easing: EASE.inOutCubic, duration: 2000 }),
      tl.wait(1000).then(() => {
        issuers().forEach((i) => i.speedDown());
        el.classList.remove("isZoomedOut", "isFocused");
      }),
    ]);
  };

  // IntersectionObserver(0.1): below the threshold counts as "separate" (reference requireThreshold)
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].intersectionRatio >= 0.1) {
        if (isAnimating) return;
        isAnimating = true; // stays set after the zoom completes: it replays only after leaving the view
        issuers().forEach((i) => i.startNumbersAnimation());
        run(zoom());
      } else if (isAnimating) {
        isAnimating = false;
        issuers().forEach((i) => i.stopNumbersAnimation());
        tl.abort("keep"); // reference: pause() and drop the sequence
      }
    },
    { threshold: 0.1 },
  );
  io.observe(el);

  return () => {
    io.disconnect();
    offHidden();
    tl.reset();
    grid.getAnimations().forEach((a) => a.cancel());
    el.classList.remove("isFocused", "isZoomedOut");
  };
};
