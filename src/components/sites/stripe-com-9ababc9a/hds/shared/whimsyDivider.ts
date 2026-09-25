// WhimsyDivider (reference chunk 381, lazy-mounted by Divider module 24384).
// Each empty `.divider-wrapper` mounts its divider once it comes within 500px of the viewport. Below
// 940px the divider is a plain 1px line. On desktop the line is drawn on a 2D canvas as short hatch
// segments (base length 8px, overlap 1.35x); moving the pointer over the divider rotates nearby
// segments like a spring (influence radius 150px, cosine falloff, stiffness 0.02 + pointer speed,
// damping 0.92, amplitude 1.3 rad in the travel direction, 120px edge fade). The simulation runs at
// most 60fps and stops once every segment has settled (drawn from a cached settled bitmap).
// It pauses outside the viewport (50px margin). Colour = the container's --divider-color.

import { type Breakpoint, type Cleanup, combine, getBreakpoint, listen, observeIntersection, observeResize, onBreakpointChange } from "./runtime";

const PARAMS = { waveAmplitude: 1.3, influenceRadius: 150, stiffness: 0.02, damping: 0.92, edgeFadeDistance: 120 };
const FALLBACK_COLOR = "#E5EDF5";
const SEGMENT_BASE = 8;

interface Segment {
  x: number;
  y: number;
  baseY: number;
  angle: number;
  velocity: number;
  length: number;
}

class DividerEngine {
  private ctx: CanvasRenderingContext2D;
  private segments: Segment[] = [];
  private active = new Set<number>();
  private pointerX = -1000;
  private lastPointerX = -1000;
  private pointerVelocityX = 0;
  private lastDirection = 1;
  private raf: number | null = null;
  private hovering = false;
  private lastFrame = 0;
  private readonly frameInterval = 1000 / 60;
  private visible = false;
  private settled = true;
  private cache: HTMLCanvasElement | OffscreenCanvas | null = null;
  private cacheValid = false;
  private dpr = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private color: string,
    private width: number,
    private height: number,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.setupCanvas();
    this.initSegments();
  }

  private setupCanvas() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private initSegments() {
    const count = Math.max(10, Math.floor(this.width / SEGMENT_BASE) + 2);
    const step = this.width / (count - 1);
    const prevVel = this.segments.map((s) => s.velocity);
    const prevAngle = this.segments.map((s) => s.angle);
    this.segments = [];
    this.active.clear();
    for (let i = 0; i < count; i += 1) {
      const y = this.height / 2;
      const angle = prevAngle[i] ?? 0;
      const velocity = prevVel[i] ?? 0;
      this.segments.push({ x: i * step, y, baseY: y, angle, velocity, length: 1.35 * step });
      if (angle !== 0 || velocity !== 0) this.active.add(i);
    }
    this.settled = this.active.size === 0;
    this.cacheValid = false;
  }

  private renderCache() {
    const w = this.width * this.dpr;
    const h = this.height * this.dpr;
    if (!this.cache || this.cache.width !== w || this.cache.height !== h) {
      if (typeof OffscreenCanvas !== "undefined") this.cache = new OffscreenCanvas(w, h);
      else {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        this.cache = c;
      }
    }
    const ctx = this.cache.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (const s of this.segments) {
      const half = 0.5 * s.length;
      ctx.moveTo(s.x - half, s.baseY);
      ctx.lineTo(s.x + half, s.baseY);
    }
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.cacheValid = true;
  }

  pointer(x: number) {
    const dx = x - this.lastPointerX;
    if (Math.abs(dx) < 100) {
      this.pointerVelocityX = dx;
      if (Math.abs(dx) > 1) this.lastDirection = Math.sign(dx);
    }
    this.lastPointerX = this.pointerX;
    this.pointerX = x;
    this.hovering = true;
    this.wake();
  }

  leave() {
    this.hovering = false;
    this.pointerX = -1000;
    this.pointerVelocityX = 0;
    this.wake();
  }

  /** Returns true once every segment is at rest. */
  private step(): boolean {
    let done = true;
    const speed = Math.min(Math.abs(this.pointerVelocityX) / 60, 1);
    const k = PARAMS.stiffness + 0.1 * speed;
    const invR = 1 / PARAMS.influenceRadius;
    const pitch = this.width / (this.segments.length - 1);
    const from = Math.max(0, Math.floor((this.pointerX - PARAMS.influenceRadius) / pitch) - 1);
    const to = Math.min(this.segments.length - 1, Math.ceil((this.pointerX + PARAMS.influenceRadius) / pitch) + 1);
    for (let i = 0; i < this.segments.length; i += 1) {
      const s = this.segments[i];
      const near = this.hovering && i >= from && i <= to;
      if (!near && !this.active.has(i)) continue;
      let edge = 1;
      if (PARAMS.edgeFadeDistance > 0) {
        const d = Math.min(s.x, this.width - s.x);
        if (d < PARAMS.edgeFadeDistance) edge = d / PARAMS.edgeFadeDistance;
      }
      const dx = s.x - this.pointerX;
      let target = 0;
      let influence = 0;
      if (this.hovering && Math.abs(dx) < PARAMS.influenceRadius) {
        const f = (1 + Math.cos(dx * invR * Math.PI)) / 2;
        target = f * PARAMS.waveAmplitude * this.lastDirection * edge;
        influence = f * edge;
        if (Math.abs(this.pointerVelocityX) > 0.1) s.velocity += this.pointerVelocityX * influence * 0.0015;
      }
      s.velocity += (target - s.angle) * k;
      s.velocity *= PARAMS.damping;
      s.angle += s.velocity;
      if (influence <= 0.01 && Math.abs(s.angle) < 0.001 && Math.abs(s.velocity) < 0.001) {
        s.angle = 0;
        s.velocity = 0;
        this.active.delete(i);
      } else {
        this.active.add(i);
        done = false;
      }
    }
    this.pointerVelocityX *= 0.9;
    return done;
  }

  draw() {
    const { ctx } = this;
    if (this.settled) {
      if (!this.cacheValid) this.renderCache();
      if (this.cache) {
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.drawImage(this.cache, 0, 0, this.cache.width, this.cache.height, 0, 0, this.width, this.height);
        return;
      }
    }
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.strokeStyle = this.color;
    ctx.lineCap = "butt";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const s of this.segments) {
      if (s.angle !== 0) continue;
      const half = 0.5 * s.length;
      ctx.moveTo(s.x - half, s.y);
      ctx.lineTo(s.x + half, s.y);
    }
    ctx.stroke();
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (const s of this.segments) {
      if (s.angle === 0) continue;
      const half = 0.5 * s.length;
      const cx = half * Math.cos(s.angle);
      const cy = half * Math.sin(s.angle);
      ctx.moveTo(s.x - cx, s.y - cy);
      ctx.lineTo(s.x + cx, s.y + cy);
    }
    ctx.stroke();
  }

  private animate = (t: number) => {
    const elapsed = t - this.lastFrame;
    if (elapsed >= this.frameInterval) {
      const done = this.step();
      this.draw();
      this.lastFrame = t - (elapsed % this.frameInterval);
      if (done && !this.hovering) {
        this.settled = true;
        this.stop();
        return;
      }
    }
    this.raf = requestAnimationFrame(this.animate);
  };

  private stop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private startLoop() {
    if (this.raf === null && this.visible) {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.animate);
    }
  }

  private wake() {
    this.cacheValid = false;
    if (this.settled && this.visible) {
      this.settled = false;
      this.startLoop();
    } else if (!this.settled && this.raf === null && this.visible) this.startLoop();
  }

  start() {
    this.visible = true;
    this.draw();
    if (!this.settled) this.startLoop();
  }

  pause() {
    this.visible = false;
    this.stop();
    this.lastFrame = 0;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.setupCanvas();
    this.initSegments();
    this.cacheValid = false;
    this.draw();
  }

  destroy() {
    this.pause();
    this.cache = null;
  }
}

function mountDivider(wrapper: HTMLElement): Cleanup {
  const container = document.createElement("div");
  container.className = "divider-container";
  const line = document.createElement("div");
  line.className = "divider-line";
  container.append(line);
  wrapper.append(container);

  let desktopCleanup: Cleanup | null = null;
  const enableCanvas = (): Cleanup => {
    container.classList.add("divider-container--is-canvas-active");
    const holder = document.createElement("div");
    holder.className = "divider-canvas-wrapper";
    const canvas = document.createElement("canvas");
    canvas.className = "divider-canvas";
    canvas.setAttribute("aria-hidden", "true");
    holder.append(canvas);
    container.append(holder);
    const color = getComputedStyle(container).getPropertyValue("--divider-color").trim() || FALLBACK_COLOR;
    let r = canvas.getBoundingClientRect();
    let engine: DividerEngine;
    try {
      engine = new DividerEngine(canvas, color, r.width, r.height);
    } catch {
      holder.remove();
      container.classList.remove("divider-container--is-canvas-active");
      return () => {};
    }
    engine.start();
    const onPointer = (clientX: number) => engine.pointer(clientX - r.left);
    const cleanups: Cleanup[] = [
      observeResize(
        canvas,
        ({ width, height }) => {
          r = canvas.getBoundingClientRect();
          if (width && height) engine.resize(width, height);
        },
        { delay: 150 },
      ),
      observeIntersection(container, (v) => (v ? engine.start() : engine.pause()), { rootMargin: "50px" }),
      listen(container, "mousemove", (e) => onPointer(e.clientX)),
      listen(container, "mouseleave", () => engine.leave()),
      listen(container, "touchmove", (e) => e.touches.length && onPointer(e.touches[0].clientX)),
      listen(container, "touchstart", (e) => e.touches.length && onPointer(e.touches[0].clientX)),
      listen(container, "touchend", () => engine.leave()),
      listen(container, "touchcancel", () => engine.leave()),
    ];
    return () => {
      combine(cleanups)();
      engine.destroy();
      holder.remove();
      container.classList.remove("divider-container--is-canvas-active");
    };
  };
  const sync = (bp: Breakpoint) => {
    if (bp === "desktop" && !desktopCleanup) desktopCleanup = enableCanvas();
    else if (bp !== "desktop" && desktopCleanup) {
      desktopCleanup();
      desktopCleanup = null;
    }
  };
  sync(getBreakpoint());
  return combine([onBreakpointChange(sync), () => desktopCleanup?.(), () => container.remove()]);
}

/** Mounts a divider in every empty `.divider-wrapper` once it is within 500px of the viewport. */
export function mountWhimsyDividers(root: ParentNode): Cleanup {
  return combine(
    Array.from(root.querySelectorAll<HTMLElement>(".divider-wrapper"))
      .filter((w) => w.childElementCount === 0)
      .map((wrapper) => {
        let mounted: Cleanup | null = null;
        const stop = observeIntersection(
          wrapper,
          (v) => {
            if (v && !mounted) mounted = mountDivider(wrapper);
          },
          { rootMargin: "500px", once: true },
        );
        return () => {
          stop();
          mounted?.();
        };
      }),
  );
}
