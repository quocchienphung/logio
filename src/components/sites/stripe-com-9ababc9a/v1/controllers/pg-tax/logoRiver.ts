// LogoRiver — port of v1-LogoRiver-PHJFXQEQ.js (noise: v1-chunk-QUSLLVBP.js, shuffle: v1-chunk-N3OSMDTD.js,
// easing: v1-chunk-XZAD27SG.js `ease`). Integration-partner logo bubbles drift upwards in an endless
// 540 × 2800 px column, wobbling on 1-D value noise; each fades/scales in over 1.5 s once its image has
// loaded. rAF-driven while the figure is on screen.
import type { Controller } from "../types";
import { onPageVisibility, prefersReducedMotion, target } from "../lib";
import { scrollObserver } from "./motion";

const INTRO_MS = 1500; // S
const RISE_PX_PER_MS = 0.0175; // L
const NOISE_PX = 80; // m
const NOISE_PER_MS = 55e-6; // O
const RIVER_HEIGHT = 2800; // y
const RIVER_WIDTH = 540; // P
const MIN_X_GAP = 125; // I

// The captured markup references the logos on images.stripeassets.com; they are served locally.
const LOCAL_LOGO_DIR = "/sites/stripe-com-9ababc9a/products/logo-river/";
const localLogoUrl = (url: string) => LOCAL_LOGO_DIR + (url.split("?")[0].split("/").pop() ?? "");

const random = (min: number, max: number) => Math.random() * (max - min) + min;

/** easeInOutQuad (reference MathUtils ease). */
const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

function shuffle<T>(items: T[]): T[] {
  const r = items.slice();
  for (let i = r.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** 1-D value noise, 4 octaves, cosine interpolation over a 4096-entry random table. */
function createNoise(): (t: number) => number {
  const table = Array.from({ length: 4096 }, () => Math.random());
  const cosine = (t: number) => 0.5 * (1 - Math.cos(t * Math.PI));
  return (t: number) => {
    const x = Math.abs(t);
    let i = Math.floor(x);
    let f = x - i;
    let sum = 0;
    let amp = 0.5;
    for (let o = 0; o < 4; o++) {
      const w = cosine(f);
      let v = table[i & 4095];
      v += w * (table[(i + 1) & 4095] - v);
      sum += v * amp;
      amp *= 0.5;
      i <<= 1;
      f *= 2;
      if (f >= 1) {
        i++;
        f--;
      }
    }
    return sum;
  };
}

/** Bubble anchor points: rows 65–80 px apart, x never within 125 px of the previous (or, wrapping, the first). */
function layout(width: number, height: number): { x: number; y: number }[] {
  let y = 0;
  const pts: { x: number; y: number }[] = [];
  while (y < height) {
    const nextY = y + random(65, 80);
    let x: number | undefined;
    for (let guard = 0; x === undefined && guard < 1000; guard++) {
      const cand = random(50, width - 50);
      const prev = pts[pts.length - 1];
      const farFromPrev = !prev || Math.abs(prev.x - cand) > MIN_X_GAP;
      const farFromFirst = nextY <= height || !pts[0] || Math.abs(pts[0].x - cand) > MIN_X_GAP;
      if (farFromPrev && farFromFirst) x = cand;
    }
    pts.push({ y, x: x ?? random(50, width - 50) });
    y = nextY;
  }
  return pts;
}

interface Bubble {
  scale: number;
  x: number;
  y: number;
  seedX: number;
  seedY: number;
  noiseX: number;
  noiseY: number;
  intro: number;
  el: HTMLDivElement;
}

export const LogoRiver: Controller = (el) => {
  const source = target(el, "LogoRiver", "source");
  const container = target(el, "LogoRiver", "bubbleContainer");
  if (!source || !container) return;

  const customers = shuffle(
    Array.from(source.children as HTMLCollectionOf<HTMLElement>).map((c) => ({
      name: c.dataset.jsCustomerName ?? "",
      logoUrl: c.dataset.jsCustomerLogoUrl ? localLogoUrl(c.dataset.jsCustomerLogoUrl) : "",
    })),
  );
  if (!customers.length) return;

  const noise = createNoise();
  const reduced = prefersReducedMotion();
  let bubbles: Bubble[] = [];
  let loadState: "idle" | "loading" | "loaded" = "idle";
  let inView = false;
  let hidden = document.hidden;
  let raf = 0;
  let last: number | undefined;
  let noiseT = 0;
  let scrollY = 0;
  let disposed = false;

  const render = (b: Bubble) => {
    const x = b.x + b.noiseX;
    const y = b.y + b.noiseY + scrollY;
    if (y < -200) b.y += RIVER_HEIGHT;
    const e = ease(b.intro);
    const s = (e / 20 + 0.95) * b.scale;
    b.el.style.opacity = String(e);
    b.el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  };

  const tick = (now: number) => {
    // Elapsed time since the previous frame; paused time (offscreen / hidden tab) is not counted.
    const dt = last === undefined ? 0 : now - last;
    last = now;
    noiseT += dt * NOISE_PER_MS;
    scrollY -= dt * RISE_PX_PER_MS;
    bubbles.forEach((b) => {
      b.noiseX = noise(b.seedX + noiseT) * NOISE_PX - NOISE_PX / 2;
      b.noiseY = noise(b.seedY + noiseT) * NOISE_PX - NOISE_PX / 2;
      if (b.intro < 1) b.intro = Math.min(1, b.intro + dt / INTRO_MS);
      render(b);
    });
    raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = undefined;
  };
  const startIfActive = () => {
    if (disposed || loadState !== "loaded" || !inView || hidden || raf || reduced) return;
    raf = requestAnimationFrame(tick);
  };

  const createBubbles = () => {
    const pts = layout(RIVER_WIDTH, RIVER_HEIGHT);
    bubbles = pts.map((p, i) => {
      const { name, logoUrl } = customers[i % customers.length];
      const b = document.createElement("div");
      const label = document.createElement("span");
      label.className = "LogoRiver__customerName";
      label.innerText = name;
      b.className = "LogoRiver__bubble";
      if (logoUrl) b.style.backgroundImage = `url("${logoUrl}")`;
      b.appendChild(label);
      container.appendChild(b);
      return { scale: i % 2 === 0 ? 0.7 : 0.6, x: p.x, y: p.y, seedX: Math.random() * 100, seedY: Math.random() * 100, noiseX: 0, noiseY: 0, intro: reduced ? 1 : 0, el: b };
    });
    bubbles.forEach(render);
  };

  const loadImages = () =>
    Promise.all(
      customers
        .filter((c) => c.logoUrl)
        .map(
          (c) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = c.logoUrl;
            }),
        ),
    );

  const onEnter = async () => {
    inView = true;
    if (loadState === "idle") {
      loadState = "loading";
      await loadImages();
      if (disposed) return;
      createBubbles();
      loadState = "loaded";
    }
    startIfActive();
  };
  const onLeave = () => {
    inView = false;
    stop();
  };

  const offIO = scrollObserver(el, 0.001, () => void onEnter(), onLeave);
  const offVis = onPageVisibility((h) => {
    hidden = h;
    if (h) stop();
    else startIfActive();
  });

  return () => {
    disposed = true;
    offIO();
    offVis();
    stop();
    bubbles.forEach((b) => b.el.remove());
    bubbles = [];
  };
};
