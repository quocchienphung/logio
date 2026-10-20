"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { createLocalInvoiceSource } from "./invoice-data-source";
import type { InvoiceDataSource } from "./invoice-data-source";
import { clampQuantity, clampRate, clampTax, createDefaultInvoice, formatDate, formatMoney, formatRate, lineCents, liveQuantity, liveRate, LIMITS, missingDescription, newLine, totals } from "./invoice-model";
import type { InvoiceData, InvoiceLine } from "./invoice-model";
import "./invoice.css";

const EASE = [.22, 1, .36, 1] as const;
const MIN_SAVING_MS = 450;
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** A money value that rolls: the new figure slides in from below when it grows, from above when it shrinks, with a short blur. */
function Money({ cents, className }: { cents: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState({ cents, dir: 1 });
  if (shown.cents !== cents) setShown({ cents, dir: cents >= shown.cents ? 1 : -1 });
  const variants = useMemo<Variants>(() => reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0 } }, exit: { opacity: 0, transition: { duration: 0 } } }
    : {
      enter: (dir: number) => ({ opacity: 0, y: dir * 7, filter: "blur(4px)" }),
      center: { opacity: 1, y: 0, filter: "blur(0px)", transition: { opacity: { duration: .16 }, y: { duration: .28, ease: EASE }, filter: { duration: .28, ease: EASE } } },
      exit: (dir: number) => ({ opacity: 0, y: -dir * 7, filter: "blur(4px)", transition: { opacity: { duration: .16 }, y: { duration: .28, ease: EASE }, filter: { duration: .28, ease: EASE } } }),
    }, [reduce]);
  return <span className={`inv-roll ${className ?? ""}`}><AnimatePresence initial={false} custom={shown.dir}><motion.span key={cents} custom={shown.dir} variants={variants} initial="enter" animate="center" exit="exit">{formatMoney(cents)}</motion.span></AnimatePresence></span>;
}

/**
 * A number box that counts what is typed straight away (empty is zero) and tidies the text when it loses focus.
 */
function NumberBox({ value, live, settle, format, onValue, label, step, min, max, mode, field }: { value: number; live: (text: string) => number; settle: (value: number) => number; format: (value: number) => string; onValue: (value: number) => void; label: string; step: number; min: number; max: number; mode: "numeric" | "decimal"; field: string }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? format(value);
  return <input className="inv-input inv-number" type="number" inputMode={mode} step={step} min={min} max={max} aria-label={label} data-field={field} value={shown}
    onFocus={() => setText(format(value))}
    onChange={(event: ChangeEvent<HTMLInputElement>) => { setText(event.target.value); onValue(live(event.target.value)); }}
    onBlur={() => { const settled = settle(live(text ?? format(value))); onValue(settled); setText(null); }} />;
}

function TextBox({ value, onChange, label, placeholder, className, field, maxLength = LIMITS.text }: { value: string; onChange: (value: string) => void; label: string; placeholder?: string; className?: string; field?: string; maxLength?: number }) {
  return <input className={`inv-input ${className ?? ""}`} value={value} aria-label={label} placeholder={placeholder} maxLength={maxLength} data-field={field} onChange={event => onChange(event.target.value)} />;
}
function AreaBox({ value, onChange, label, className, maxLength = LIMITS.address }: { value: string; onChange: (value: string) => void; label: string; className?: string; maxLength?: number }) {
  return <textarea className={`inv-input inv-area ${className ?? ""}`} value={value} aria-label={label} rows={2} maxLength={maxLength} onChange={event => onChange(event.target.value)} />;
}
/** The date reads as plain text; a transparent date input on top opens the picker and keeps keyboard entry. */
function DateBox({ prefix, value, onChange, label, muted }: { prefix: string; value: string; onChange: (value: string) => void; label: string; muted?: boolean }) {
  return <label className="inv-date" data-muted={muted || undefined}><span>{prefix} {formatDate(value)}</span><input type="date" value={value} aria-label={label} onChange={event => { if (event.target.value) onChange(event.target.value); }} onClick={event => { try { event.currentTarget.showPicker?.(); } catch { /* the field still accepts typing */ } }} /></label>;
}

interface InvoiceProps {
  /** Keys the default browser storage; also remounts the invoice when it changes. */
  workspaceId: string;
  /** Where the draft loads from and saves to. Defaults to this browser's local storage. See invoice-data-source.ts. */
  dataSource?: InvoiceDataSource;
  /** Used when the data source has no saved draft yet. */
  initialData?: InvoiceData;
}

export function Invoice({ workspaceId, dataSource, initialData }: InvoiceProps) {
  const source = useMemo(() => dataSource ?? createLocalInvoiceSource(`affectui:${workspaceId}:invoice`), [dataSource, workspaceId]);
  const [loaded, setLoaded] = useState<{ source: InvoiceDataSource; data: InvoiceData } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    source.load(controller.signal)
      .then(data => { if (!controller.signal.aborted) setLoaded({ source, data: data ?? initialData ?? createDefaultInvoice() }); })
      .catch(() => { if (!controller.signal.aborted) setLoaded({ source, data: initialData ?? createDefaultInvoice() }); });
    return () => controller.abort();
  }, [source, initialData]);
  if (!loaded || loaded.source !== source) return <div className="inv-page"><p className="inv-loading" role="status">Loading invoice…</p></div>;
  return <InvoiceStudio key={workspaceId} source={source} initial={loaded.data} />;
}

type Phase = "idle" | "saving" | "saved" | "error";

function InvoiceStudio({ source, initial }: { source: InvoiceDataSource; initial: InvoiceData }) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const [invoice, setInvoice] = useState(initial);
  const [phase, setPhase] = useState<Phase>("idle"), [status, setStatus] = useState(" "), [focusLine, setFocusLine] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null), sheet = useRef<HTMLElement>(null), edits = useRef(0), saving = useRef(false);
  const sum = useMemo(() => totals(invoice), [invoice]);

  const edit = useCallback((change: (current: InvoiceData) => InvoiceData) => {
    edits.current += 1;
    setInvoice(change);
    setPhase(current => current === "saved" || current === "error" ? "idle" : current);
    setStatus(current => current === " " ? current : " ");
  }, []);
  const patchLine = (id: string, patch: Partial<InvoiceLine>) => edit(current => ({ ...current, lines: current.lines.map(line => line.id === id ? { ...line, ...patch } : line) }));

  function addLine() {
    const { invoice: next, line } = newLine(invoice);
    if (invoice.lines.length >= LIMITS.lines) return;
    edit(() => next); setFocusLine(line.id);
  }
  function removeLine(line: InvoiceLine, index: number) {
    if (invoice.lines.length <= 1) return;
    edit(current => ({ ...current, lines: current.lines.filter(item => item.id !== line.id) }));
    addButton.current?.focus();
    setStatus(`Removed line ${index + 1}.`);
  }
  useEffect(() => {
    if (!focusLine) return;
    sheet.current?.querySelector<HTMLInputElement>(`[data-line="${focusLine}"] [data-field="description"]`)?.focus();
    queueMicrotask(() => setFocusLine(null));
  }, [focusLine, invoice.lines.length]);

  async function save() {
    if (saving.current) return;
    const missing = missingDescription(invoice);
    if (missing >= 0) {
      setStatus("Describe each line before saving.");
      sheet.current?.querySelector<HTMLInputElement>(`[data-line="${invoice.lines[missing].id}"] [data-field="description"]`)?.focus();
      return;
    }
    saving.current = true; setPhase("saving"); setStatus("Saving draft…");
    const version = edits.current, started = performance.now();
    try {
      await source.save(invoice);
      const left = MIN_SAVING_MS - (performance.now() - started);
      if (left > 0) await wait(left);
      if (edits.current === version) { setPhase("saved"); setStatus("Draft saved."); } else { setPhase("idle"); setStatus(" "); }
    } catch { setPhase("error"); setStatus("Couldn’t save the draft. Try again."); }
    finally { saving.current = false; }
  }

  const slotTransition = reduce ? { duration: 0 } : { height: { duration: .42, ease: EASE }, opacity: { duration: .16 } };
  const labelFade = reduce ? { duration: 0 } : { duration: .2, ease: EASE };
  const labelMotion = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : { initial: { opacity: 0, filter: "blur(4px)", y: 4 }, animate: { opacity: 1, filter: "blur(0px)", y: 0 }, exit: { opacity: 0, filter: "blur(4px)", y: -4 } };

  return <div className="inv-page"><div className="inv-frame"><section className="inv-sheet" ref={sheet} aria-labelledby={titleId}>
    <header className="inv-header">
      <div className="inv-identity"><TextBox className="inv-wordmark" label="Company name" placeholder="Company name" value={invoice.from.name} onChange={name => edit(current => ({ ...current, from: { ...current.from, name } }))} /><span className="inv-numberLine"><span>Invoice</span><TextBox className="inv-numberInput" label="Invoice number" value={invoice.number} maxLength={32} onChange={number => edit(current => ({ ...current, number }))} /></span></div>
      <div className="inv-meta"><DateBox prefix="Issued" label="Issue date" value={invoice.issued} onChange={issued => edit(current => ({ ...current, issued }))} /><DateBox muted prefix="Due" label="Due date" value={invoice.due} onChange={due => edit(current => ({ ...current, due }))} /></div>
    </header>
    <div className="inv-heading">
      <h2 id={titleId}>Invoice</h2>
      <div className="inv-parties">
        <div><span>From</span><TextBox className="inv-partyName" label="From name" placeholder="Company name" value={invoice.from.name} onChange={name => edit(current => ({ ...current, from: { ...current.from, name } }))} /><AreaBox label="From address" value={invoice.from.address} onChange={address => edit(current => ({ ...current, from: { ...current.from, address } }))} /></div>
        <div><span>Bill to</span><TextBox className="inv-partyName" label="Bill to name" placeholder="Client name" value={invoice.billTo.name} onChange={name => edit(current => ({ ...current, billTo: { ...current.billTo, name } }))} /><AreaBox label="Bill to address" value={invoice.billTo.address} onChange={address => edit(current => ({ ...current, billTo: { ...current.billTo, address } }))} /></div>
      </div>
    </div>
    <div className="inv-linesHeader" aria-hidden="true"><span>Work</span><span>Qty</span><span>Rate</span><span>Amount</span><span /></div>
    <div role="group" aria-label="Invoice line items"><AnimatePresence initial={false}>{invoice.lines.map((line, index) => <motion.div key={line.id} className="inv-slot" data-line={line.id} initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: { height: { duration: .3, ease: [.4, 0, .2, 1] }, opacity: { duration: .19 } } }} transition={slotTransition}>
      <div className="inv-line">
        <label className="inv-cell inv-descriptionCell"><span className="inv-mobileLabel">Work</span><TextBox label={`Line ${index + 1} description`} placeholder="Describe the work" field="description" value={line.description} onChange={description => patchLine(line.id, { description })} /></label>
        <label className="inv-cell"><span className="inv-mobileLabel">Qty</span><NumberBox label={`Line ${index + 1} quantity`} field="quantity" mode="numeric" step={1} min={LIMITS.quantity.min} max={LIMITS.quantity.max} value={line.quantity} live={liveQuantity} settle={clampQuantity} format={String} onValue={quantity => patchLine(line.id, { quantity })} /></label>
        <label className="inv-cell"><span className="inv-mobileLabel">Rate</span><span className="inv-field"><span className="inv-prefix" aria-hidden="true">$</span><NumberBox label={`Line ${index + 1} rate in dollars`} field="rate" mode="decimal" step={.01} min={LIMITS.rate.min} max={LIMITS.rate.max} value={line.rate} live={liveRate} settle={clampRate} format={formatRate} onValue={rate => patchLine(line.id, { rate })} /></span></label>
        <output className="inv-amount" aria-label={`Line ${index + 1} amount`}><Money cents={lineCents(line)} /></output>
        <button type="button" className="inv-remove" aria-label={`Remove line ${index + 1}`} disabled={invoice.lines.length <= 1} onClick={() => removeLine(line, index)}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>
    </motion.div>)}</AnimatePresence></div>
    <div className="inv-addRow"><button type="button" ref={addButton} onClick={addLine}><Plus size={16} strokeWidth={1.75} aria-hidden="true" />Add line item</button></div>
    <div className="inv-bottom">
      <div className="inv-note"><textarea className="inv-input inv-area" aria-label="Note" rows={2} maxLength={LIMITS.note} value={invoice.note} placeholder="Add a note" onChange={event => edit(current => ({ ...current, note: event.target.value }))} /></div>
      <div className="inv-totals">
        <div><span>Subtotal</span><span className="inv-moneySlot"><Money cents={sum.subtotal} /></span></div>
        <div><span className="inv-taxLabel">Tax · <input className="inv-input inv-tax" type="number" inputMode="decimal" step={.5} min={0} max={100} aria-label="Tax rate in percent" value={invoice.taxRate} onChange={event => edit(current => ({ ...current, taxRate: clampTax(Number.parseFloat(event.target.value)) }))} />%</span><span className="inv-moneySlot"><Money cents={sum.tax} /></span></div>
        <div className="inv-totalLine"><strong>Total due</strong><output aria-live="polite" aria-atomic="true"><Money cents={sum.total} /></output></div>
      </div>
    </div>
    <footer className="inv-footer">
      <p className="inv-srOnly" role="status" aria-live="polite">{status}</p>
      {phase === "error" && <span className="inv-error" aria-hidden="true">Couldn’t save. Try again.</span>}
      <button type="button" className="inv-save" data-phase={phase} aria-busy={phase === "saving" || undefined} onClick={() => void save()}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={phase === "saving" ? "saving" : phase === "saved" ? "saved" : "idle"} className="inv-saveLabel" {...labelMotion} transition={labelFade}>
            {phase === "saving" ? <LoaderCircle className="inv-spin" size={16} strokeWidth={1.75} aria-hidden="true" /> : phase === "saved" ? <><Check size={16} strokeWidth={1.75} aria-hidden="true" />Saved</> : "Save draft"}
          </motion.span>
        </AnimatePresence>
      </button>
    </footer>
  </section></div></div>;
}

export type { InvoiceData, InvoiceLine } from "./invoice-model";
export type { InvoiceDataSource } from "./invoice-data-source";
