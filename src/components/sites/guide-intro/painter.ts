/** One continuous, distance-sampled brush pass. Cursor tips and paint share a path. */
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const range = (t: number, start: number, end: number) => clamp((t - start) / (end - start));
export interface PaintPoint { x: number; y: number }
export interface PainterFrame { points: PaintPoint[] }

function layer() {
  const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
  if (!context) throw new Error("The painting canvas could not be opened.");
  return { canvas, context };
}

// Short acceleration/deceleration ramps, with a steady speed through the painting.
function travel(p: number) {
  const ramp = .08;
  if (p < ramp) return p * p / (2 * ramp * (1 - ramp));
  if (p > 1 - ramp) return 1 - (1 - p) ** 2 / (2 * ramp * (1 - ramp));
  return (p - ramp / 2) / (1 - ramp);
}

export class StudioPainter {
  private context: CanvasRenderingContext2D;
  private imageLayer = layer();
  private mask = layer();
  private composite = layer();
  private paths: PaintPoint[][] = [];
  private width = 1;
  private height = 1;
  private last = -1;
  private maskProgress = 0;
  private lastFrame: PainterFrame = { points: [] };

  constructor(private canvas: HTMLCanvasElement, private image: HTMLImageElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The painting canvas could not be opened.");
    this.context = context;
  }

  resize(width: number, height: number) {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / width, 1440 / height);
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    if (w === this.width && h === this.height) return;
    this.width = w; this.height = h; this.canvas.width = w; this.canvas.height = h;
    for (const buffer of [this.imageLayer, this.mask, this.composite]) {
      buffer.canvas.width = w; buffer.canvas.height = h;
    }
    const fit = Math.min(w / this.image.width, h / this.image.height);
    this.imageLayer.context.drawImage(this.image, (w - this.image.width * fit) / 2, (h - this.image.height * fit) / 2, this.image.width * fit, this.image.height * fit);
    this.paths = Array.from({ length: 4 }, (_, index) => this.makePath(index));
    this.last = -1; this.maskProgress = 0;
  }

  /** Resample by physical distance, removing the old sinusoid's speed spikes. */
  private makePath(index: number) {
    const points: PaintPoint[] = [], distances = [0];
    const col = index % 2, row = Math.floor(index / 2), direction = col ? -1 : 1;
    for (let n = 0; n <= 1800; n++) {
      const p = n / 1800;
      const point = {
        x: clamp((col + .5 - Math.cos(p * Math.PI * 12) * .54 * direction) / 2),
        y: clamp((row - .12 + p * 1.24 + Math.sin(p * Math.PI * 24 + index) * .012) / 2),
      };
      if (n) distances.push(distances[n - 1] + Math.hypot((point.x - points[n - 1].x) * this.width, (point.y - points[n - 1].y) * this.height));
      points.push(point);
    }
    const total = distances.at(-1) ?? 1, uniform: PaintPoint[] = [];
    let at = 1;
    for (let n = 0; n <= 1600; n++) {
      const target = n / 1600 * total;
      while (at < distances.length - 1 && distances[at] < target) at++;
      const fraction = (target - distances[at - 1]) / (distances[at] - distances[at - 1] || 1);
      uniform.push({ x: points[at - 1].x + (points[at].x - points[at - 1].x) * fraction, y: points[at - 1].y + (points[at].y - points[at - 1].y) * fraction });
    }
    return uniform;
  }

  private point(index: number, progress: number): PaintPoint {
    const p = clamp((progress - index * .025) / (1 - index * .025));
    const path = this.paths[index], at = p * (path.length - 1), a = Math.floor(at), b = Math.min(path.length - 1, a + 1);
    return { x: path[a].x + (path[b].x - path[a].x) * (at - a), y: path[a].y + (path[b].y - path[a].y) * (at - a) };
  }

  private brushWidth() { return this.height * .105; }

  private paintMask(progress: number) {
    const ctx = this.mask.context;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#fff";
    ctx.lineWidth = this.brushWidth(); ctx.shadowColor = "#fff"; ctx.shadowBlur = ctx.lineWidth * .16;
    const steps = Math.max(1, Math.ceil((progress - this.maskProgress) * 1800));
    for (let i = 0; i < 4; i++) {
      const start = this.point(i, this.maskProgress);
      ctx.beginPath(); ctx.moveTo(start.x * this.width, start.y * this.height);
      for (let n = 1; n <= steps; n++) {
        const p = this.point(i, this.maskProgress + (progress - this.maskProgress) * n / steps);
        ctx.lineTo(p.x * this.width, p.y * this.height);
      }
      ctx.stroke();
    }
    this.maskProgress = progress;
  }

  render(time: number): PainterFrame {
    if (time === this.last) return this.lastFrame;
    const progress = travel(range(time, 350, 8600));
    if (time < this.last) { this.mask.context.clearRect(0, 0, this.width, this.height); this.maskProgress = 0; }
    this.last = time;
    if (progress > this.maskProgress) this.paintMask(progress);
    const ctx = this.context;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, this.width, this.height);
    const composite = this.composite.context;
    composite.globalCompositeOperation = "source-over"; composite.clearRect(0, 0, this.width, this.height);
    composite.drawImage(this.imageLayer.canvas, 0, 0);
    composite.globalCompositeOperation = "destination-in"; composite.drawImage(this.mask.canvas, 0, 0);
    ctx.drawImage(this.composite.canvas, 0, 0);
    // Resolve tiny antialiased edge gaps softly, without a last-frame flash.
    if (time > 8200) {
      ctx.globalAlpha = range(time, 8200, 8600); ctx.drawImage(this.imageLayer.canvas, 0, 0); ctx.globalAlpha = 1;
    }
    const points = Array.from({ length: 4 }, (_, i) => this.point(i, progress));
    if (time > 350 && time < 8600) this.magic(points, time, progress);
    this.lastFrame = { points }; return this.lastFrame;
  }

  private magic(points: PaintPoint[], time: number, progress: number) {
    const ctx = this.context;
    ctx.save(); ctx.globalCompositeOperation = "screen";
    const fade = Math.min(range(time, 350, 800), 1 - range(time, 8100, 8600));
    for (const [index, point] of points.entries()) {
      // A short fading ribbon remains behind the tip, along the actual painted path.
      for (let n = 0; n < 14; n++) {
        const a = this.point(index, Math.max(0, progress - (14 - n) * .0016));
        const b = this.point(index, Math.max(0, progress - (13 - n) * .0016));
        ctx.globalAlpha = fade * n / 14 * .65; ctx.strokeStyle = "#ffe5a4"; ctx.lineWidth = 1.2 + n / 14 * 1.6;
        ctx.beginPath(); ctx.moveTo(a.x * this.width, a.y * this.height); ctx.lineTo(b.x * this.width, b.y * this.height); ctx.stroke();
      }
      const x = point.x * this.width, y = point.y * this.height, radius = this.brushWidth() * .6;
      ctx.globalAlpha = fade;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, "#fffef4e0"); glow.addColorStop(.15, "#ffe6a77a"); glow.addColorStop(1, "#ffe8ae00");
      ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      for (let n = 0; n < 8; n++) {
        const age = (time / 650 + n / 8 + index * .17) % 1, angle = n * 2.4 + index;
        const distance = age * radius, size = (1 - age) * 2.2;
        ctx.globalAlpha = (1 - age) * .85 * fade; ctx.fillStyle = "#fff7d5";
        ctx.beginPath(); ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  dispose() { for (const buffer of [this.imageLayer, this.mask, this.composite]) { buffer.canvas.width = 0; buffer.canvas.height = 0; } }
}
