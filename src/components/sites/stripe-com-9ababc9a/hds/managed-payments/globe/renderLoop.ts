// Frame scheduler (reference module 90126, chunk 1086: RenderLoop + its shared RenderLoopManager).
// - The first 12 frames only sample frame times to estimate the display refresh rate (snapped to
//   240/160/144/120/60/30/24 Hz); nothing renders until then.
// - Every 24 frames it compares the achieved rate (average of the frame times minus the 2 slowest)
//   with the refresh rate: >10% slower raises a warning level (max 3), faster than the refresh rate
//   lowers it. Listeners adjust how often they render.
// - Suspends while the document is hidden.
// Averages are "inferred" (the reference's stats helpers, module 80931, are not in the mirror).

const RATES = [240, 160, 144, 120, 60, 30, 24];

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);

export class RenderLoop {
  onPerformanceWarning: (level: number) => void = () => {};
  onPerformanceRecovered: (level: number) => void = () => {};
  private raf: number | null = null;
  private lastFrame = 0;
  private frameTimes: number[] = [];
  private refreshRate: number | undefined;
  private warningLevel = 0;
  private running = false;

  constructor(private render: (now: number) => void) {}

  private onVisibility = () => {
    if (document.hidden) this.stopRaf();
    else if (this.running) this.startRaf();
  };

  private update = (t: number) => {
    this.raf = requestAnimationFrame(this.update);
    const dt = t - this.lastFrame;
    this.lastFrame = t;
    this.frameTimes.push(dt);
    if (this.frameTimes.length >= 12 && this.refreshRate === undefined) {
      const fps = 1000 / mean(this.frameTimes);
      this.refreshRate = RATES.reduce((best, r) => (Math.abs(r - fps) < Math.abs(best - fps) ? r : best));
      this.frameTimes = [];
      return;
    }
    if (this.refreshRate === undefined) return;
    this.render(t);
    if (this.frameTimes.length >= 24) {
      const sorted = this.frameTimes.slice().sort((a, b) => a - b);
      sorted.splice(-2);
      const deficit = this.refreshRate - 1000 / mean(sorted);
      if (deficit > 0.1 * this.refreshRate) {
        const level = Math.min(this.warningLevel + 1, 3);
        if (level !== this.warningLevel) {
          this.warningLevel = level;
          this.onPerformanceWarning(level);
        }
      } else if (deficit < 0 && this.warningLevel > 0) {
        this.warningLevel -= 1;
        this.onPerformanceRecovered(this.warningLevel);
      }
      this.frameTimes = [];
    }
  };

  private startRaf() {
    if (this.raf !== null) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.update);
  }

  private stopRaf() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    if (!document.hidden) this.startRaf();
  }

  stop() {
    this.running = false;
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.stopRaf();
  }
}
