// Payment-methods "Explore countries": country select -> content swap, animated stats and donut chart.
// Reference modules: v1-CountriesExplorer-5NIIMFFC.js (PaymentMethodHubCountriesExplorer),
// v1-chunk-DU5GGRHT.js (PaymentMethodHubCountryStats), v1-chunk-YZICVOSZ.js (PaymentMethodHubDonutChart).
// Behaviour notes: docs/research/products/motion/pages-b.md.
import { exposeApi, getApi, prefersReducedMotion, target, targetList } from "../lib";
import type { Controller } from "../types";
import { Timeline, bezier, run } from "./motion";

type Stats = Record<string, number>;
type CountryData = Stats;

const COUNTRY_STATS_DURATION = 1000; // DU5GGRHT: animationDuration (0 with ambient animations disabled)
const DONUT_DURATION = 1600; // YZICVOSZ: animationDuration
const SEGMENT_HOVER_DURATION = 700; // YZICVOSZ segment: animationDuration
const SEGMENT_HOVER_TARGET = 8; // segment.hoverTarget (px)
const easeInOutCubic = bezier(0.65, 0, 0.35, 1);
const easeOutQuart = bezier(0.25, 1, 0.5, 1);
const ACTIVE_ITEM = "PaymentMethodHubCountryStats__listItem--isActive";

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
const degToRad = (d: number) => (d * Math.PI) / 180;
const distance = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x1 - x2, y1 - y2);
/** v1-chunk-6P6RD5N4 getAngleBetweenTwoPoints (degrees, 0..360). */
function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  let t = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  if (t < 0) t = 360 + t;
  return t;
}
const normalize = (v: number[]) => {
  const sum = v.reduce((a, b) => a + b, 0);
  return v.map((x) => (x / sum) * 100);
};
const angles = (percents: number[]) => {
  let acc = 0;
  return percents.map((p) => {
    const start = acc;
    acc = start + (p / 100) * 360;
    return { start, end: acc };
  });
};

// ---- Donut chart -----------------------------------------------------------------------------------------

class Segment {
  hoverWidth = 0;
  isBeingHovered = false;
  isAnimating = false;
  private originStart = 0;
  private originEnd = 0;
  private destStart = 0;
  private destEnd = 0;
  private readonly hoverTl = new Timeline();
  constructor(
    readonly color: string,
    public startDegrees: number,
    public endDegrees: number,
  ) {}
  update(t: number): void {
    this.startDegrees = this.originStart + (this.destStart - this.originStart) * t;
    this.endDegrees = this.originEnd + (this.destEnd - this.originEnd) * t;
  }
  updateAnimationValues(start: number, end: number): void {
    this.destStart = start;
    this.destEnd = end;
    this.originStart = this.startDegrees;
    this.originEnd = this.endDegrees;
  }
  draw(ctx: CanvasRenderingContext2D, lineWidth: number, cx: number, cy: number): void {
    ctx.lineWidth = lineWidth + this.hoverWidth;
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.arc(cx, cy, cx - SEGMENT_HOVER_TARGET / 2 - lineWidth / 2, degToRad(this.startDegrees - 90), degToRad(this.endDegrees - 90));
    ctx.stroke();
  }
  mouseEnter(): void {
    this.isBeingHovered = true;
    this.hoverTl.abort("keep");
    this.isAnimating = true;
    run(
      this.hoverTl
        .tween(hoverDuration(), easeOutQuart, (v) => (this.hoverWidth = SEGMENT_HOVER_TARGET * v))
        .then(() => (this.isAnimating = false)),
    );
  }
  mouseLeave(): void {
    this.isBeingHovered = false;
    this.hoverTl.abort("keep");
    this.isAnimating = true;
    // reference: hoverWidth -= hoverWidth * eased(t) on every frame (a per-frame decay that reaches 0 at t=1)
    run(
      this.hoverTl
        .tween(hoverDuration(), easeInOutCubic, (v) => (this.hoverWidth -= this.hoverWidth * v))
        .then(() => (this.isAnimating = false)),
    );
  }
  destroy(): void {
    this.hoverTl.abort("keep");
  }
}
const hoverDuration = () => (prefersReducedMotion() ? 0 : SEGMENT_HOVER_DURATION);

export interface DonutChartApi {
  initialize(items: { id: string; color: string }[]): void;
  onSegmentHoverChange(fn: (e: { index: number; type: "enter" | "leave" }) => void): void;
  animate(values: number[]): void;
  displaySegmentEnter(i: number): void;
  displaySegmentLeave(i: number): void;
}

export const PaymentMethodHubDonutChart: Controller = (el) => {
  const canvas = target<HTMLCanvasElement>(el, "PaymentMethodHubDonutChart", "canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  const tl = new Timeline();
  let segments: Segment[] = [];
  let hoverListener: ((e: { index: number; type: "enter" | "leave" }) => void) | null = null;
  let raf = 0;
  let chartAnimating = false;
  let isIntersecting = false;
  let activeSegmentIndex = -1;
  let mouse: { x: number; y: number } | undefined;
  let offsetLeft: number | undefined;
  let offsetTop: number | undefined;
  let halfWidth = 0;
  let halfHeight = 0;
  let lineWidth = 0;
  const cleanups: (() => void)[] = [];

  const isAnimating = () => chartAnimating || segments.some((s) => s.isAnimating);
  const draw = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    segments.forEach((s) => s.draw(ctx, lineWidth, halfWidth, halfHeight));
    if (isAnimating()) raf = requestAnimationFrame(draw);
  };
  const resize = () => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    halfWidth = w / 2;
    halfHeight = h / 2;
    const { left, top } = el.getBoundingClientRect();
    offsetLeft = left;
    offsetTop = top + window.scrollY;
    lineWidth = parseFloat(getComputedStyle(el).getPropertyValue("--donutChartLineWidth")) || 0;
    draw();
  };
  const hoveredSegment = (x: number, y: number): Segment | null => {
    const a = angleBetween(x, y, halfWidth, halfHeight);
    const rotated = a - 90 > 0 ? a - 90 : 360 + (a - 90);
    const seg = segments.find(({ startDegrees, endDegrees }) => startDegrees <= rotated && endDegrees >= rotated);
    if (!seg) return null;
    const d = distance(halfWidth, halfHeight, x, y);
    return d > halfWidth - lineWidth - SEGMENT_HOVER_TARGET / 2 - seg.hoverWidth / 2 && d <= halfWidth - SEGMENT_HOVER_TARGET / 2 + seg.hoverWidth / 2
      ? seg
      : null;
  };
  const calculateHoverState = () => {
    if (mouse === undefined || offsetLeft === undefined || offsetTop === undefined) return;
    const x = mouse.x - offsetLeft;
    const y = mouse.y - offsetTop + window.scrollY;
    const hovered = hoveredSegment(x, y);
    let changed = false;
    segments.forEach((s, i) => {
      if (activeSegmentIndex === i) return;
      if (s === hovered) {
        hoverListener?.({ index: i, type: "enter" });
        if (!s.isBeingHovered) {
          changed = true;
          s.mouseEnter();
        }
      } else if (s.isBeingHovered) {
        hoverListener?.({ index: i, type: "leave" });
        changed = true;
        s.mouseLeave();
      }
    });
    if (changed) draw();
  };
  const onMouseMove = (e: MouseEvent) => {
    mouse = { x: e.clientX, y: e.clientY };
    if (isIntersecting) calculateHoverState();
  };
  const onScroll = () => calculateHoverState();

  const api: DonutChartApi = {
    initialize(items) {
      let resizeTimer = 0;
      const ro = new ResizeObserver(() => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 300);
      });
      ro.observe(document.body);
      cleanups.push(() => {
        ro.disconnect();
        window.clearTimeout(resizeTimer);
      });
      resize();
      const percents = normalize(items.map((it) => parseInt(el.dataset[it.id] || "0", 10) || 0));
      const a = angles(percents);
      segments = items.map((it, i) => new Segment(it.color, a[i].start, a[i].end));
      // reference: IntersectionObserver(threshold .001, onlyOnce): once seen, hover tracking stays on
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].intersectionRatio < 0.001) return;
          isIntersecting = true;
          window.addEventListener("scroll", onScroll, { passive: true });
          io.disconnect();
        },
        { threshold: 0.001 },
      );
      io.observe(el);
      window.addEventListener("mousemove", onMouseMove);
      cleanups.push(() => {
        io.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("mousemove", onMouseMove);
      });
      draw();
    },
    onSegmentHoverChange(fn) {
      hoverListener = fn;
    },
    animate(values) {
      tl.abort("keep");
      const a = angles(normalize(values));
      segments.forEach((s, i) => s.updateAnimationValues(a[i].start, a[i].end));
      chartAnimating = true;
      run(
        tl
          .tween(prefersReducedMotion() ? 0 : DONUT_DURATION, easeInOutCubic, (t) => segments.forEach((s) => s.update(t)))
          .then(() => (chartAnimating = false)),
      );
      draw();
    },
    displaySegmentEnter(i) {
      activeSegmentIndex = i;
      segments[i]?.mouseEnter();
      draw();
    },
    displaySegmentLeave(i) {
      activeSegmentIndex = -1;
      segments[i]?.mouseLeave();
      draw();
    },
  };
  exposeApi(el, "PaymentMethodHubDonutChart", api);
  return () => {
    tl.abort("keep");
    segments.forEach((s) => s.destroy());
    if (raf) cancelAnimationFrame(raf);
    cleanups.forEach((f) => f());
  };
};

// ---- Country stats -----------------------------------------------------------------------------------------

export interface CountryStatsApi {
  animateNumbers(from: Stats, to: Stats): void;
  animateLines(to: Stats): void;
  animateDonutChart(to: Stats): void;
}

export const PaymentMethodHubCountryStats: Controller = (el) => {
  const C = "PaymentMethodHubCountryStats";
  const splitItemEls = targetList<HTMLElement>(el, C, "splitItemEls");
  const statsBarGraphEls = targetList<HTMLElement>(el, C, "statsBarGraphEls");
  const numberEls = targetList<HTMLElement>(el, C, "numberEls");
  const donutEl = el.querySelector<HTMLElement>('[data-js-controller~="PaymentMethodHubDonutChart"]');
  const donut = donutEl ? getApi<DonutChartApi>(donutEl, "PaymentMethodHubDonutChart") : undefined;
  const SPLIT_IDS = splitItemEls.map((t) => t.dataset.jsId || "");
  const GLOBAL_IDS = statsBarGraphEls.map((t) => t.dataset.jsId || "");
  const tl = new Timeline();
  const initialNumbers = numberEls.map((n) => n.textContent);
  const initialBars = statsBarGraphEls.map((b) => b.style.getPropertyValue("--paymentMethodHubCountryStatsBarPercent"));

  const ordered = (d: Stats, split = true, global = true) => [
    ...(split ? SPLIT_IDS.map((id) => d[id]) : []),
    ...(global ? GLOBAL_IDS.map((id) => d[id]) : []),
  ];

  const onSegmentHover = (e: { index: number; type: "enter" | "leave" }) => {
    splitItemEls[e.index]?.classList.toggle(ACTIVE_ITEM, e.type === "enter");
  };
  const onItemEnter = (e: Event) => {
    const t = e.currentTarget as HTMLElement;
    t.classList.add(ACTIVE_ITEM);
    donut?.displaySegmentEnter(splitItemEls.indexOf(t));
  };
  const onItemLeave = (e: Event) => {
    const t = e.currentTarget as HTMLElement;
    t.classList.remove(ACTIVE_ITEM);
    donut?.displaySegmentLeave(splitItemEls.indexOf(t));
  };

  if (donut) {
    donut.initialize(
      splitItemEls.map((t) => ({ id: t.dataset.jsId || "", color: getComputedStyle(t).getPropertyValue("--countryStatsListBulletColor").trim() })),
    );
    donut.onSegmentHoverChange(onSegmentHover);
  }
  splitItemEls.forEach((t) => {
    t.addEventListener("mouseenter", onItemEnter);
    t.addEventListener("mouseleave", onItemLeave);
  });

  const api: CountryStatsApi = {
    animateNumbers(from, to) {
      const a = ordered(from);
      const b = ordered(to);
      const fractions = b.map((v) => +(v % 1).toFixed(4) / 1);
      tl.abort("keep");
      run(
        tl.tween(prefersReducedMotion() ? 0 : COUNTRY_STATS_DURATION, easeInOutCubic, (t) => {
          numberEls.forEach((n, i) => {
            n.textContent = (Math.round(lerp(a[i], b[i], t)) + fractions[i]).toString();
          });
        }),
      );
    },
    animateLines(to) {
      const g = ordered(to, false, true);
      statsBarGraphEls.forEach((bar, i) => bar.style.setProperty("--paymentMethodHubCountryStatsBarPercent", `${-100 + g[i]}%`));
    },
    animateDonutChart(to) {
      donut?.animate(ordered(to, true, false));
    },
  };
  exposeApi(el, C, api);

  return () => {
    tl.abort("keep");
    splitItemEls.forEach((t) => {
      t.removeEventListener("mouseenter", onItemEnter);
      t.removeEventListener("mouseleave", onItemLeave);
      t.classList.remove(ACTIVE_ITEM);
    });
    numberEls.forEach((n, i) => (n.textContent = initialNumbers[i]));
    statsBarGraphEls.forEach((b, i) => b.style.setProperty("--paymentMethodHubCountryStatsBarPercent", initialBars[i]));
  };
};

// ---- Countries explorer --------------------------------------------------------------------------------------

/** The forms group's CountrySelectInput port (reference v1-chunk-QACUWFLV): onChange(fn) + selectedValue. */
interface CountrySelectApi {
  selectedValue: string;
  onChange(fn: (e: { state: { countryCode: string } }) => void): (() => void) | void;
}

export const PaymentMethodHubCountriesExplorer: Controller = (el) => {
  const C = "PaymentMethodHubCountriesExplorer";
  const contentEl = target<HTMLElement>(el, C, "contentEl");
  const dataEl = target<HTMLElement>(el, C, "paymentMethodEl");
  const statsEl = el.querySelector<HTMLElement>('[data-js-controller~="PaymentMethodHubCountryStats"]');
  const stats = statsEl ? getApi<CountryStatsApi>(statsEl, "PaymentMethodHubCountryStats") : undefined;
  const selectHost = el.querySelector<HTMLElement>('[data-js-controller~="CountrySelectInput"]');
  const select = target<HTMLSelectElement>(el, "CountrySelectInput", "select");
  if (!contentEl || !dataEl || !stats || !select) return;

  let data: Record<string, CountryData>;
  try {
    // the reference JSON is double-encoded (a JSON string holding the JSON object)
    data = JSON.parse(JSON.parse(dataEl.innerHTML) as string) as Record<string, CountryData>;
  } catch {
    return;
  }
  const initialContent = Array.from(contentEl.childNodes);
  let templates: Readonly<Record<string, string>> | null = null;
  let alive = true;
  let current: CountryData | undefined = data[select.value];
  if (!current) return;

  const onCountry = (code: string) => {
    const prev = current;
    const next = data[code];
    if (!prev || !next) return;
    current = next;
    const swap = (html: Readonly<Record<string, string>>) => {
      if (!alive || current !== next) return;
      contentEl.innerHTML = html[code] ?? "";
    };
    if (templates) swap(templates);
    else
      import("./data/countryContent").then(
        (m) => {
          templates = m.COUNTRY_CONTENT;
          swap(templates);
        },
        () => undefined,
      );
    stats.animateNumbers(prev, next);
    stats.animateDonutChart(next);
    stats.animateLines(next);
  };

  // Coordinate with the forms group's CountrySelectInput through its API when it is mounted (as the reference's
  // childController), otherwise through the native <select> change event it wraps.
  const selectApi = selectHost ? getApi<CountrySelectApi>(selectHost, "CountrySelectInput") : undefined;
  let off: () => void;
  if (selectApi) {
    const r = selectApi.onChange((e) => onCountry(e.state.countryCode));
    off = typeof r === "function" ? r : () => undefined;
  } else {
    const h = () => onCountry(select.value);
    select.addEventListener("change", h);
    off = () => select.removeEventListener("change", h);
  }

  return () => {
    alive = false;
    off();
    contentEl.replaceChildren(...initialContent);
  };
};
