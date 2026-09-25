// A small timeline engine with the semantics of Motion's `animate(sequence)` (the reference drives its
// hero choreography with Motion's useAnimate; the sequence compiler lives in reference chunk 68067).
// Rules reproduced here:
//  - `at` placement: number = absolute, "+n"/"-n" = relative to the end of the previous segment,
//    "<" = start of the previous segment, "<n" = previous start + n; default = previous end.
//  - A segment's length is max(delay + duration) over its subjects; `delay` may be a stagger function.
//  - Single-value keyframes animate from the previous keyframe of that property ("null" wildcard).
//  - Default duration 0.3s, default ease "easeOut"; holds between segments.
//  - Transforms are composed in Motion's order: translateX translateY scale scaleX scaleY rotate.
// Motion is not bundled; this is a clean re-implementation driven by elapsed time.

import { toEaseFn, type Easing, type EaseFn } from "./easing";

export type Value = number | string;
export type KeyframeValue = Value | ReadonlyArray<Value | null>;
export type Keyframes = Readonly<Record<string, KeyframeValue>>;
export type Stagger = (index: number, total: number) => number;
export interface SegmentOptions {
  duration?: number;
  delay?: number | Stagger;
  ease?: Easing;
  at?: number | string;
}
export type Subject = string | readonly string[] | Element | readonly Element[];
export type Segment = readonly [Subject, Keyframes, SegmentOptions?];

/** Motion's `stagger(each, { startDelay, from })` (reference module 21411). */
export function stagger(each = 0.1, opts: { startDelay?: number; from?: number | "first" | "last" | "center" } = {}): Stagger {
  const { startDelay = 0, from = 0 } = opts;
  return (i, total) => {
    const origin = typeof from === "number" ? from : from === "first" ? 0 : from === "last" ? total - 1 : (total - 1) / 2;
    return startDelay + each * Math.abs(origin - i);
  };
}

interface RawKf {
  value: Value | null;
  at: number;
  easing: Easing | undefined;
}
interface Track {
  el: Element;
  prop: string;
  values: (Value | null)[];
  times: number[];
  eases: EaseFn[];
}

const TRANSFORM_KEYS = ["x", "y", "scale", "scaleX", "scaleY", "rotate"] as const;
type TransformKey = (typeof TRANSFORM_KEYS)[number];
const isTransformKey = (k: string): k is TransformKey => (TRANSFORM_KEYS as readonly string[]).includes(k);

/** Latest values written per element (Motion keeps the same per-element store). */
const latest = new WeakMap<Element, Map<string, Value>>();

function store(el: Element): Map<string, Value> {
  let m = latest.get(el);
  if (!m) latest.set(el, (m = new Map()));
  return m;
}

function readInitial(el: Element, prop: string): Value {
  const m = latest.get(el);
  const v = m?.get(prop);
  if (v !== undefined) return v;
  const cs = getComputedStyle(el);
  if (isTransformKey(prop)) {
    // Like Motion, read the current transform from the computed matrix (server inline styles such as
    // `translate(643px, 0px)` or `scaleX(0.64) scaleY(0.97)` are the starting point).
    if (!cs.transform || cs.transform === "none") return prop.startsWith("scale") ? 1 : 0;
    const m = new DOMMatrixReadOnly(cs.transform);
    if (prop === "x") return m.m41;
    if (prop === "y") return m.m42;
    if (prop === "rotate") return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    const sx = Math.hypot(m.a, m.b);
    const sy = Math.hypot(m.c, m.d);
    return prop === "scaleY" ? sy : sx;
  }
  if (prop.startsWith("--")) return cs.getPropertyValue(prop).trim() || 0;
  if (prop === "opacity") return parseFloat(cs.opacity) || 0;
  if (prop === "clipPath") return cs.clipPath === "none" ? "inset(0 0 0 0)" : cs.clipPath;
  const raw = cs.getPropertyValue(prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
  return raw || 0;
}

// ---- value mixing ---------------------------------------------------------------------------

const NUM_RE = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?([a-z%]*)/gi;

interface Parsed {
  nums: number[];
  units: string[];
  parts: string[];
}
function parse(v: Value): Parsed {
  const s = String(v);
  const nums: number[] = [];
  const units: string[] = [];
  const parts: string[] = [];
  let last = 0;
  for (const m of s.matchAll(NUM_RE)) {
    parts.push(s.slice(last, m.index));
    nums.push(parseFloat(m[0]));
    units.push(m[1] ?? "");
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(s.slice(last));
  return { nums, units, parts };
}

function mix(a: Value, b: Value, p: number): Value {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * p;
  const pa = parse(a);
  const pb = parse(b);
  if (pa.nums.length !== pb.nums.length || pa.parts.join("|") !== pb.parts.join("|")) return p < 1 ? a : b;
  let out = "";
  for (let i = 0; i < pb.nums.length; i++) {
    const unit = pb.units[i] || pa.units[i];
    const n = pa.nums[i] + (pb.nums[i] - pa.nums[i]) * p;
    out += pb.parts[i] + `${Math.round(n * 1e4) / 1e4}${unit}`;
  }
  return out + pb.parts[pb.parts.length - 1];
}

// ---- rendering ------------------------------------------------------------------------------

function fmtTransform(key: TransformKey, v: Value): string {
  if (typeof v === "string") return v;
  if (key === "x" || key === "y") return `${v}px`;
  if (key === "rotate") return `${v}deg`;
  return String(v);
}

function isDefault(key: TransformKey, v: Value): boolean {
  const n = typeof v === "number" ? v : parseFloat(v);
  return key.startsWith("scale") ? n === 1 : n === 0;
}

function applyTransform(el: HTMLElement | SVGElement, m: Map<string, Value>) {
  let s = "";
  for (const k of TRANSFORM_KEYS) {
    const v = m.get(k);
    if (v === undefined || isDefault(k, v)) continue;
    const name = k === "x" ? "translateX" : k === "y" ? "translateY" : k;
    s += `${name}(${fmtTransform(k, v)}) `;
  }
  el.style.transform = s.trim() || "none";
}

function applyValue(el: HTMLElement | SVGElement, prop: string, v: Value) {
  if (prop.startsWith("--")) el.style.setProperty(prop, String(v));
  else if (prop === "opacity") el.style.opacity = String(v);
  else if (prop === "clipPath") el.style.clipPath = String(v);
  else el.style.setProperty(prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), typeof v === "number" ? `${v}px` : v);
}

// ---- compile --------------------------------------------------------------------------------

function nextTime(current: number, at: number | string, prev: number): number {
  if (typeof at === "number") return at;
  if (at.startsWith("+") || at.startsWith("-")) return Math.max(0, current + parseFloat(at));
  if (at === "<") return prev;
  if (at.startsWith("<")) return Math.max(0, prev + parseFloat(at.slice(1)));
  return current;
}

function subjects(scope: ParentNode, s: Subject): Element[][] {
  if (typeof s === "string") return Array.from(scope.querySelectorAll(s)).map((e) => [e]);
  if (s instanceof Element) return [[s]];
  return (s as readonly (string | Element)[]).map((x) => (typeof x === "string" ? Array.from(scope.querySelectorAll(x)) : [x]));
}

function compile(scope: ParentNode, segments: readonly Segment[]) {
  const seqs = new Map<Element, Map<string, RawKf[]>>();
  let prevTime = 0;
  let currentTime = 0;
  let total = 0;
  for (const [subject, keyframes, opts = {}] of segments) {
    if (opts.at !== undefined) currentTime = nextTime(currentTime, opts.at, prevTime);
    let maxDuration = 0;
    const groups = subjects(scope, subject);
    groups.forEach((els, index) => {
      const delay = typeof opts.delay === "function" ? opts.delay(index, groups.length) : (opts.delay ?? 0);
      const duration = opts.duration ?? 0.3;
      const start = currentTime + delay;
      const end = start + duration;
      for (const prop of Object.keys(keyframes)) {
        const raw = keyframes[prop];
        const list: (Value | null)[] = Array.isArray(raw) ? [...(raw as (Value | null)[])] : [raw as Value];
        const offsets = list.length === 1 ? [0, 1] : list.map((_, i) => i / (list.length - 1));
        if (list.length === 1) list.unshift(null);
        for (const el of els) {
          let byProp = seqs.get(el);
          if (!byProp) seqs.set(el, (byProp = new Map()));
          let seq = byProp.get(prop);
          if (!seq) byProp.set(prop, (seq = []));
          // Motion erases keyframes strictly inside the new segment's span.
          for (let i = seq.length - 1; i >= 0; i--) if (seq[i].at > start && seq[i].at < end) seq.splice(i, 1);
          list.forEach((value, i) => seq!.push({ value, at: start + (end - start) * offsets[i], easing: opts.ease }));
        }
      }
      maxDuration = Math.max(maxDuration, delay + duration);
      total = Math.max(total, end);
    });
    prevTime = currentTime;
    currentTime += maxDuration;
  }
  const tracks: Track[] = [];
  for (const [el, byProp] of seqs) {
    for (const [prop, seq] of byProp) {
      seq.sort((a, b) => (a.at !== b.at ? a.at - b.at : a.value === null ? 1 : b.value === null ? -1 : 0));
      const values: (Value | null)[] = [];
      const times: number[] = [];
      const eases: EaseFn[] = [];
      for (const k of seq) {
        values.push(k.value);
        times.push(total > 0 ? k.at / total : 0);
        eases.push(toEaseFn(k.easing, "easeOut"));
      }
      if (times[0] !== 0) {
        times.unshift(0);
        values.unshift(values[0]);
        eases.unshift(toEaseFn("easeInOut"));
      }
      if (times[times.length - 1] !== 1) {
        times.push(1);
        values.push(null);
        eases.push(toEaseFn("linear"));
      }
      tracks.push({ el, prop, values, times, eases });
    }
  }
  return { tracks, total };
}

// ---- playback -------------------------------------------------------------------------------

export interface SequenceControls {
  /** Resolves when the timeline completes (never for infinite repeats or after stop/cancel). */
  finished: Promise<void>;
  /** Freeze in place (Motion `stop`). */
  stop(): void;
  /** Stop and restore the inline styles the timeline touched. */
  cancel(): void;
  pause(): void;
  resume(): void;
  readonly duration: number;
}

export interface PlayOptions {
  /** Number of extra iterations; Infinity loops forever (Motion `repeat`). */
  repeat?: number;
}

interface Resolved {
  el: HTMLElement | SVGElement;
  prop: string;
  values: Value[];
  times: number[];
  eases: EaseFn[];
}

function sample(t: Resolved, p: number): Value {
  const { times, values, eases } = t;
  let i = 0;
  while (i < times.length - 1 && times[i + 1] <= p) i++;
  if (i >= times.length - 1) return values[values.length - 1];
  const span = times[i + 1] - times[i];
  const local = span > 0 ? (p - times[i]) / span : 1;
  return mix(values[i], values[i + 1], eases[i](local));
}

/** Compiles and plays a sequence inside `scope`. */
export function playSequence(scope: ParentNode, segments: readonly Segment[], opts: PlayOptions = {}): SequenceControls {
  const { tracks, total } = compile(scope, segments);
  const repeat = opts.repeat ?? 0;
  // Snapshot inline styles for cancel().
  const originals = new Map<HTMLElement | SVGElement, string | null>();
  const resolved: Resolved[] = tracks.map((t) => {
    const el = t.el as HTMLElement | SVGElement;
    if (!originals.has(el)) originals.set(el, el.getAttribute("style"));
    const values: Value[] = [];
    t.values.forEach((v, i) => values.push(v === null ? (i === 0 ? readInitial(el, t.prop) : values[i - 1]) : v));
    return { el, prop: t.prop, values, times: t.times, eases: t.eases };
  });
  const byEl = new Map<HTMLElement | SVGElement, Resolved[]>();
  for (const r of resolved) {
    let l = byEl.get(r.el);
    if (!l) byEl.set(r.el, (l = []));
    l.push(r);
  }

  const render = (p: number) => {
    for (const [el, list] of byEl) {
      const m = store(el);
      let hasTransform = false;
      for (const r of list) {
        const v = sample(r, p);
        m.set(r.prop, v);
        if (isTransformKey(r.prop)) hasTransform = true;
        else applyValue(el, r.prop, v);
      }
      if (hasTransform) applyTransform(el, m);
    }
  };

  let resolveFinished: () => void = () => {};
  const finished = new Promise<void>((res) => (resolveFinished = res));
  let raf = 0;
  let elapsed = 0;
  let lastTs: number | null = null;
  let paused = false;
  let done = false;
  const durationMs = total * 1000;

  const frame = (ts: number) => {
    raf = 0;
    if (done || paused) return;
    if (lastTs !== null) elapsed += ts - lastTs;
    lastTs = ts;
    const iterations = repeat + 1;
    if (durationMs <= 0 || elapsed >= durationMs * iterations) {
      render(1);
      done = true;
      resolveFinished();
      return;
    }
    const p = (elapsed % durationMs) / durationMs;
    render(p);
    raf = requestAnimationFrame(frame);
  };

  render(0);
  raf = requestAnimationFrame(frame);

  const halt = () => {
    done = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  return {
    finished,
    duration: total,
    stop: halt,
    cancel: () => {
      halt();
      for (const [el, style] of originals) {
        if (style === null) el.removeAttribute("style");
        else el.setAttribute("style", style);
        latest.delete(el);
      }
    },
    pause: () => {
      if (done || paused) return;
      paused = true;
      lastTs = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    resume: () => {
      if (done || !paused) return;
      paused = false;
      raf = requestAnimationFrame(frame);
    },
  };
}
