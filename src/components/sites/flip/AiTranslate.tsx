"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, ChevronDown, Languages, RotateCcw } from "lucide-react";
import { chunkWords, splitSentences, SOURCE_CODE } from "./flip-model";
import "./flip-tokens.css";
import "./ai-translate.css";

export interface AiTranslateOption { code: string; name: string; meta: string }
export interface TranslateRequest { text: string; from: string; to: string; signal: AbortSignal }
export interface AiTranslateLabels {
  translate: string; showOriginal: string; showTranslation: string; menuLabel: string; original: string; retry: string; couldnt: string;
  trigger: (name: string) => string; translating: (name: string) => string; translated: (from: string, to: string) => string; showing: string;
  announceStart: (name: string) => string; announceDone: (from: string, to: string) => string; announceOriginal: string; announceFailed: string;
}
const DEFAULT_LABELS: AiTranslateLabels = {
  translate: "Translate", showOriginal: "Show original", showTranslation: "Show translation", menuLabel: "Translate to", original: "Original", retry: "Retry", couldnt: "Couldn't translate",
  trigger: name => `Translate to, ${name}`, translating: name => `Translating to ${name}`, translated: from => `Translated from ${from}`, showing: "Showing original",
  announceStart: name => `Translating to ${name}.`, announceDone: (from, to) => `Translated from ${from} to ${to}.`, announceOriginal: "Showing original.", announceFailed: "Couldn't translate.",
};
export interface AiTranslateProps {
  /** The text to translate, in its original form. A new text clears the cached translations. */
  text: string;
  /** What the original is called in the picker and in "Translated from …". */
  sourceName?: string;
  /** The chip above the text, e.g. "Detected · French". */
  detected?: { label: string; value: string };
  options: AiTranslateOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (code: string) => void;
  /** Resolve the whole translation, or return an async iterable that yields text as it is made. The signal aborts when another choice is made or the card goes. */
  translate: (request: TranslateRequest) => Promise<string> | AsyncIterable<string>;
  onTranslate?: (result: { from: string; to: string; text: string }) => void;
  onError?: (error: Error, request: { from: string; to: string }) => void;
  author?: { name: string; role?: string; avatar?: ReactNode } | null;
  timestamp?: string;
  model: { name: string; mark?: ReactNode };
  labels?: Partial<AiTranslateLabels>;
  /** How a text falls into the units that the translation replaces one by one (sentences by default). */
  splitUnits?: (text: string) => string[];
  /** How a unit is cut into the pieces that arrive every 34 ms (3 to 6 words by default). */
  chunker?: (unit: string, seed: number) => string[];
  /** Draw the text in a fixed-width face, without wrapping (rows of a table). */
  mono?: boolean;
  lang?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const CHUNK_MS = 34;
const SPRING = { type: "spring", visualDuration: 0.24, bounce: 0 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>(resolve => { const timer = setTimeout(resolve, ms); signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true }); });
const isIterable = (value: unknown): value is AsyncIterable<string> => !!value && typeof (value as AsyncIterable<string>)[Symbol.asyncIterator] === "function";

interface View { key: number; code: string; text: string; busy: boolean; pending: string[]; chunks: string[] }
type Status = { kind: "idle" } | { kind: "streaming"; to: string } | { kind: "done"; to: string } | { kind: "original" } | { kind: "error"; to: string; message: string };

/**
 * A message card where picking a language streams the translation in place, unit by unit over the dimmed original, with a detected chip, a Show
 * original toggle and a status line credited to a mark. Rebuilt from the open preview of UIArc's AI translate (a Pro component: DOM, declared CSS and
 * recordings of the rendered page; docs/research/ai-translate/). It translates nothing by itself: `translate` does, and what it returns is streamed.
 */
export function AiTranslate(props: AiTranslateProps) {
  const { text, sourceName, detected, options, translate, onTranslate, onError, author, timestamp, model, className, mono } = props;
  const labels = useMemo<AiTranslateLabels>(() => ({ ...DEFAULT_LABELS, ...props.labels }), [props.labels]);
  const splitUnits = props.splitUnits ?? splitSentences, chunker = props.chunker ?? chunkWords;
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  const source = sourceName ?? labels.original;
  const nameOf = useCallback((code: string) => code === SOURCE_CODE ? source : options.find(o => o.code === code)?.name ?? code, [options, source]);

  const [innerValue, setInnerValue] = useState(props.defaultValue ?? SOURCE_CODE);
  const shown = props.value ?? innerValue;
  const [view, setView] = useState<View>({ key: 0, code: SOURCE_CODE, text, busy: false, pending: [], chunks: [] });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [announce, setAnnounce] = useState("");
  const [open, setOpen] = useState(false);
  const cache = useRef(new Map<string, string>());
  const last = useRef<string | null>(null);
  const run = useRef<AbortController | null>(null);
  const keyCounter = useRef(0);
  const viewRef = useRef(view);
  useLayoutEffect(() => { viewRef.current = view; });
  const current = useRef({ text, translate, onTranslate, onError, splitUnits, chunker, labels, nameOf, source });
  useLayoutEffect(() => { current.current = { text, translate, onTranslate, onError, splitUnits, chunker, labels, nameOf, source }; });

  const choose = useCallback((code: string) => { if (props.value === undefined) setInnerValue(code); props.onValueChange?.(code); }, [props]);

  /** A whole swap: the old text leaves in 100 ms and the new one arrives in 160 ms with a 2 px rise. */
  const swap = useCallback((code: string, body: string) => setView({ key: ++keyCounter.current, code, text: body, busy: false, pending: [], chunks: [] }), []);

  const stream = useCallback(async (to: string) => {
    run.current?.abort();
    const controller = new AbortController(), signal = controller.signal;
    run.current = controller;
    const c = current.current;
    const before = viewRef.current;
    const onScreen = before.chunks.length || before.text ? (before.chunks.join("") + before.pending.join("")) || before.text : c.text;
    const pending = c.splitUnits(onScreen);
    setStatus({ kind: "streaming", to }); setAnnounce(c.labels.announceStart(c.nameOf(to)));
    setView(v => ({ ...v, code: to, busy: true, pending, chunks: [], text: "" }));
    const queue: { chunk: string; first: boolean }[] = [];
    let produced = false, finished = false, failure: Error | null = null;
    const emit = async () => {
      let index = 0;
      while (!signal.aborted) {
        const item = queue.shift();
        if (!item) { if (finished) return; await sleep(8, signal); continue; }
        setView(v => ({ ...v, chunks: [...v.chunks, item.chunk], pending: item.first ? v.pending.slice(1) : v.pending }));
        if (!reduce) await sleep(CHUNK_MS, signal);
        index++;
      }
      void index;
    };
    const feed = (unit: string) => { const pieces = c.chunker(unit, queue.length); pieces.forEach((chunk, i) => queue.push({ chunk, first: i === 0 })); produced = true; };
    const consumer = emit();
    let full = "";
    try {
      const result = c.translate({ text: c.text, from: SOURCE_CODE, to, signal });
      if (isIterable(result)) {
        let buffer = "";
        for await (const delta of result) {
          if (signal.aborted) break;
          full += delta; buffer += delta;
          const units = c.splitUnits(buffer);
          // only complete units go out; the last one may still be growing
          while (units.length > 1) { feed(units.shift()!); }
          buffer = units[0] ?? "";
        }
        if (!signal.aborted && buffer) feed(buffer);
      } else {
        full = await result;
        if (!signal.aborted) c.splitUnits(full).forEach(feed);
      }
    } catch (error) {
      if (!signal.aborted) failure = error instanceof Error ? error : new Error(String(error));
    }
    finished = true;
    if (signal.aborted) return;
    await consumer;
    if (signal.aborted) return;
    if (failure || (!produced && !full)) {
      const error = failure ?? new Error("Nothing came back");
      // the text that was on screen comes back
      setView({ key: ++keyCounter.current, code: before.code, text: onScreen, busy: false, pending: [], chunks: [] });
      setStatus({ kind: "error", to, message: error.message });
      setAnnounce(c.labels.announceFailed);
      c.onError?.(error, { from: SOURCE_CODE, to });
      run.current = null;
      return;
    }
    cache.current.set(to, full);
    last.current = to;
    c.onTranslate?.({ from: SOURCE_CODE, to, text: full });
    setView(v => ({ ...v, busy: false, pending: [], text: "" }));
    setStatus({ kind: "done", to }); setAnnounce(c.labels.announceDone(c.source, c.nameOf(to)));
    run.current = null;
  }, [reduce]);

  // The language on screen follows `shown`: a cached one swaps, a new one streams, the original swaps back.
  const requested = useRef<string>(SOURCE_CODE);
  const retries = useRef(0);
  useEffect(() => {
    if (requested.current === shown) return;
    requested.current = shown;
    run.current?.abort(); run.current = null;
    if (shown === SOURCE_CODE) { queueMicrotask(() => { swap(SOURCE_CODE, current.current.text); setStatus({ kind: "original" }); setAnnounce(current.current.labels.announceOriginal); }); return; }
    const cached = cache.current.get(shown);
    if (cached !== undefined) { queueMicrotask(() => { swap(shown, cached); last.current = shown; setStatus({ kind: "done", to: shown }); setAnnounce(current.current.labels.announceDone(current.current.source, current.current.nameOf(shown))); }); return; }
    queueMicrotask(() => { void stream(shown); });
  }, [shown, stream, swap]);
  // A new text clears what was translated and shows the new original.
  const seenText = useRef(text);
  useEffect(() => {
    if (seenText.current === text) return;
    seenText.current = text; cache.current.clear(); last.current = null; run.current?.abort(); run.current = null; requested.current = SOURCE_CODE;
    queueMicrotask(() => { swap(SOURCE_CODE, text); setStatus({ kind: "idle" }); if (props.value === undefined) setInnerValue(SOURCE_CODE); });
  }, [text, swap, props.value]);
  useEffect(() => () => { run.current?.abort(); }, []);

  const retry = () => { if (status.kind !== "error") return; retries.current++; void stream(status.to); };
  const pick = (code: string) => { setOpen(false); if (code === shown && status.kind === "error" && code !== SOURCE_CODE) { retry(); return; } if (code !== shown) choose(code); };
  const showingOriginal = shown === SOURCE_CODE;
  const toggle = () => { if (showingOriginal) { if (last.current) choose(last.current); } else choose(SOURCE_CODE); };

  // ---- the height follows the text on a critically damped spring; a resize of the window cuts straight to the new height
  const height = useMotionValue<number | "auto">("auto");
  const stack = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  useEffect(() => {
    const node = stack.current; if (!node) return;
    const observer = new ResizeObserver(() => {
      const next = node.getBoundingClientRect().height, wide = node.getBoundingClientRect().width;
      const resized = Math.abs(wide - width.current) > 0.5 && width.current !== 0; width.current = wide;
      const from = height.get();
      if (reduce || resized || from === "auto") { height.set(next); return; }
      animate(height as ReturnType<typeof useMotionValue<number>>, next, SPRING);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [height, reduce]);

  const statusNode = (() => {
    const mark = <span className="at-mark" title={model.name}>{model.mark}</span>;
    if (status.kind === "streaming") return { key: `s-${status.to}`, tone: "", body: <>{mark}<span className="at-statusText">{labels.translating(nameOf(status.to))}</span></> };
    if (status.kind === "done") return { key: `d-${status.to}`, tone: "", body: <>{mark}<span className="at-statusText">{labels.translated(source, nameOf(status.to))}</span></> };
    if (status.kind === "original") return { key: "o", tone: "", body: <>{mark}<span className="at-statusText">{labels.showing}</span></> };
    if (status.kind === "error") return { key: `e-${retries.current}`, tone: "error", body: <><AlertTriangle size={16} className="at-errorIcon" aria-hidden="true" /><span className="at-statusText" title={status.message}>{labels.couldnt}</span><button type="button" className="at-retry" onClick={retry}><RotateCcw size={13} aria-hidden="true" />{labels.retry}</button></> };
    return { key: "i", tone: "", body: <>{mark}<span className="at-statusText">{model.name}</span></> };
  })();

  return <section ref={props.ref} className={`at-root${className ? ` ${className}` : ""}`} aria-label={author ? author.name : undefined}>
    <header className="at-head">
      {author !== null && author && <div className="at-author"><span className="at-avatar" role="img" aria-label={author.name}>{author.avatar ?? author.name.slice(0, 1)}</span><div className="at-byline"><span className="at-name">{author.name}</span><span className="at-meta">{[author.role, timestamp].filter(Boolean).join(" · ")}</span></div></div>}
      {detected && <span className="at-chip"><span className="at-chipLabel">{detected.label}</span>{detected.value}</span>}
    </header>
    <motion.div className="at-textClip" style={{ height }}>
      <div className="at-textStack" ref={stack}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.p key={view.key} lang={props.lang} className="at-text" data-mono={mono || undefined} aria-busy={view.busy}
            initial={reduce ? false : { opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.16, ease: EASE } }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1, ease: "easeOut" } }}>
            {view.chunks.map((chunk, i) => <span key={i} className="at-chunk">{chunk}</span>)}
            {view.pending.map((unit, i) => <span key={`p${view.pending.length - i}${unit.length}${i}`} className={`at-pending${reduce ? " at-pendingStill" : ""}`}>{unit}{mono && i < view.pending.length - 1 ? "\n" : ""}</span>)}
            {!view.chunks.length && !view.pending.length && (view.text || <span className="at-empty">—</span>)}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
    <footer className="at-foot">
      <div className="at-controls">
        <button type="button" className="at-trigger" aria-haspopup="menu" aria-expanded={open} data-state={open ? "open" : "closed"} aria-label={labels.trigger(nameOf(shown))} onClick={() => setOpen(value => !value)}
          onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}>
          <Languages size={15} strokeWidth={1.75} className="at-triggerIcon" aria-hidden="true" />
          <span className="at-stack" aria-hidden="true">
            <span className="at-stackItem" data-active={showingOriginal || undefined}>{labels.translate}</span>
            {options.map(option => <span key={option.code} className="at-stackItem" data-active={shown === option.code || undefined}>{option.name}</span>)}
          </span>
          <ChevronDown size={14} className="at-chevron" aria-hidden="true" />
        </button>
        <button type="button" className="at-toggle" aria-pressed={showingOriginal && !!last.current} disabled={showingOriginal && !last.current} onClick={toggle}>
          <span className="at-stack"><span className="at-stackItem" data-active={!showingOriginal || undefined} aria-hidden={showingOriginal}>{labels.showOriginal}</span><span className="at-stackItem" data-active={showingOriginal || undefined} aria-hidden={!showingOriginal}>{labels.showTranslation}</span></span>
        </button>
        <LanguageMenu open={open} onClose={() => setOpen(false)} uid={uid} label={labels.menuLabel} options={[{ code: SOURCE_CODE, name: source, meta: labels.original }, ...options]} checked={shown} onPick={pick} reduce={reduce} />
      </div>
      <div className="at-status"><AnimatePresence initial={false} mode="popLayout">
        <motion.span key={statusNode.key} className="at-statusItem" data-tone={statusNode.tone || undefined} initial={reduce ? false : { opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.16, ease: EASE } }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1, ease: "easeOut" } }}>{statusNode.body}</motion.span>
      </AnimatePresence></div>
    </footer>
    <span className="fl-srOnly" role="status" aria-live="polite">{announce}</span>
  </section>;
}

/** The language menu: a radio group with the current language checked. It fades and scales from 98% in 150 ms, and out in 100 ms. */
function LanguageMenu({ open, onClose, uid, label, options, checked, onPick, reduce }: { open: boolean; onClose: () => void; uid: string; label: string; options: AiTranslateOption[]; checked: string; onPick: (code: string) => void; reduce: boolean }) {
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(Math.max(0, options.findIndex(o => o.code === checked)));
  const menu = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  useEffect(() => { if (open) { queueMicrotask(() => { setMounted(true); setActive(Math.max(0, options.findIndex(o => o.code === checked))); }); } else if (mounted) { const timer = setTimeout(() => setMounted(false), reduce ? 0 : 110); return () => clearTimeout(timer); } }, [open, mounted, reduce, options, checked]);
  useEffect(() => { if (open && mounted) menu.current?.focus({ preventScroll: true }); }, [open, mounted]);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { const node = menu.current; if (node && !node.contains(event.target as Node) && !(event.target as HTMLElement).closest(".at-trigger")) onClose(); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onClose]);
  if (!mounted) return null;
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const n = options.length;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(i => (i + 1) % n); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(i => (i - 1 + n) % n); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(n - 1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(options[active].code); document.querySelector<HTMLElement>(".at-trigger")?.focus(); }
    else if (event.key === "Escape") { event.preventDefault(); onClose(); document.querySelector<HTMLElement>(".at-trigger")?.focus(); }
    else if (event.key === "Tab") onClose();
    else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      const now = Date.now(); typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLowerCase(), at: now };
      const hit = options.findIndex(o => o.name.toLowerCase().startsWith(typed.current.text)); if (hit >= 0) setActive(hit);
    }
  };
  return <div ref={menu} className="at-menu" role="menu" aria-orientation="vertical" aria-labelledby={`${uid}-menu`} data-state={open ? "open" : "closed"} tabIndex={-1} onKeyDown={onKey}>
    <div className="at-menuLabel" id={`${uid}-menu`}>{label}</div>
    <div role="group">{options.map((option, i) => <div key={option.code} role="menuitemradio" aria-checked={option.code === checked} className="at-item" data-highlighted={i === active || undefined} tabIndex={-1}
      onPointerMove={() => setActive(i)} onClick={() => { onPick(option.code); document.querySelector<HTMLElement>(".at-trigger")?.focus(); }}>
      <span className="at-itemCheck" aria-hidden="true">{option.code === checked && <Check size={14} strokeWidth={2} />}</span><span className="at-itemName">{option.name}</span><span className="at-itemMeta">{option.meta}</span></div>)}</div>
  </div>;
}
