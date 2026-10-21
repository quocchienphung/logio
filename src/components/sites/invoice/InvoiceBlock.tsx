"use client";
import { Fragment, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CreditLine, InvoiceData, InvoiceParty } from "./invoice-model";
import { creditTotals, currencySymbol, formatAmount, formatDate, formatMoney, lineCents, safePaymentUrl, toCents, totals } from "./invoice-model";

/** Paths observed in the public preview; no icon package substitutions in the cloned block. */
function BlockIcon({ kind }: { kind: "download" | "credit" | "check" }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={kind === "download" ? "M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" : kind === "credit" ? "M9 14 4.5 9.5 9 5M4.5 9.5h10a5 5 0 0 1 0 10H12" : "m6 12.5 4 4 8-9"} /></svg>;
}
export function Money({ cents, currency }: { cents: number; currency: InvoiceData["currency"] }) {
  const reduced = useReducedMotion();
  return <span className="invoice-money"><AnimatePresence initial={false}><motion.span key={`${currency}-${cents}`} initial={{ opacity: 0, y: reduced ? 0 : 5, filter: reduced ? "none" : "blur(2px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: reduced ? 0 : -5 }} transition={{ duration: reduced ? 0 : .18 }}>{formatMoney(cents, currency)}</motion.span></AnimatePresence></span>;
}
function Party({ title, party }: { title: string; party: InvoiceParty }) {
  return <div className="ui-iv__party"><p className="ui-iv__label">{title}</p><p>{party.name || "Company name"}</p>{party.address.split("\n").map((line, i) => <p key={i}>{line}</p>)}{party.email && <p>{party.email}</p>}{party.taxId && <p>Tax ID: {party.taxId}</p>}</div>;
}
function CreditAmount({ value, max, disabled, label, currency, onChange }: { value: number; max: number; disabled: boolean; label: string; currency: InvoiceData["currency"]; onChange: (value: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  return <label className="ui-iv__amount" data-disabled={disabled || undefined}><span>{currencySymbol(currency)}</span><input inputMode="decimal" aria-label={label} disabled={disabled} value={text ?? formatAmount(value)} onFocus={() => setText(formatAmount(value))} onChange={e => {
    const raw = e.target.value; if (!/^-?[\d,]*(\.\d*)?$/.test(raw)) return;
    setText(raw); const parsed = Number(raw.replaceAll(",", "")); onChange(Math.min(max, Math.max(0, toCents(Number.isFinite(parsed) ? parsed : 0))));
  }} onBlur={() => setText(null)} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label>;
}
interface BlockProps {
  invoice: InvoiceData;
  view: "invoice" | "credit";
  onView: (view: "invoice" | "credit") => void;
  onCredit: (lineId: string, patch: Partial<CreditLine>) => void;
  onIssue: () => void;
  onEditCredit: () => void;
  onPdf: () => void;
  onConfigurePayment: () => void;
  busy: boolean;
}
export function InvoiceBlock({ invoice, view, onView, onCredit, onIssue, onEditCredit, onPdf, onConfigurePayment, busy }: BlockProps) {
  const ids = useId(), tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sum = totals(invoice.lines), credit = creditTotals(invoice), money = (value: number) => <Money cents={value} currency={invoice.currency} />;
  const paymentUrl = safePaymentUrl(invoice.paymentUrl);
  const tabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - index; onView(next === 0 ? "invoice" : "credit"); tabs.current[next]?.focus();
  };
  const brand = <span className="ui-iv__brand"><span className="ui-iv__logo" aria-hidden="true" />{invoice.seller.name || "Your company"}</span>;
  return <section className="ui-iv" data-view={view} aria-label="Invoice and credit note preview">
    <div className="ui-iv__bar"><div className="ui-iv__seg" role="tablist" aria-label="Document"><span className="ui-iv__seg-thumb" aria-hidden="true" />{(["invoice", "credit"] as const).map((item, index) => <button key={item} ref={el => { tabs.current[index] = el; }} type="button" role="tab" id={`${ids}-${item}-tab`} aria-controls={`${ids}-${item}`} tabIndex={item === view ? 0 : -1} aria-selected={item === view} onKeyDown={e => tabKey(e, index)} onClick={() => onView(item)}>{item === "invoice" ? "Invoice" : "Credit note"}</button>)}</div>
      <div className="ui-iv__actions"><button type="button" className="ui-iv__btn" onClick={onPdf}><BlockIcon kind="download" />PDF</button>{view === "invoice" && <button type="button" className="ui-iv__btn" onClick={() => onView("credit")}><BlockIcon kind="credit" />Credit invoice</button>}</div>
    </div>
    <div className="ui-iv__stack">
      <article className="ui-iv__sheet" data-doc="invoice" id={`${ids}-invoice`} role="tabpanel" aria-labelledby={`${ids}-invoice-tab`} aria-hidden={view !== "invoice"} inert={view !== "invoice"}>
        <header className="ui-iv__head"><div><p className="ui-iv__big">{money(sum.total)}</p><p className="ui-iv__due">Due {formatDate(invoice.due)}{paymentUrl ? <a href={paymentUrl} target="_blank" rel="noopener noreferrer">Pay online</a> : <button type="button" className="invoice-pay" onClick={onConfigurePayment}>Pay online</button>}</p></div>{brand}</header>
        <div className="ui-iv__parties"><Party title="From" party={invoice.seller} /><Party title="To" party={invoice.buyer} /></div>
        <div className="ui-iv__terms"><p className="ui-iv__label">Terms</p><dl><div><dt>Invoice no</dt><dd><span className="ui-iv__ref">{invoice.number || "—"}</span></dd></div><div><dt>Invoice date</dt><dd>{formatDate(invoice.issued)}</dd></div><div><dt>Due date</dt><dd>{formatDate(invoice.due)}</dd></div><div><dt>Billing period</dt><dd>{invoice.period || "—"}</dd></div></dl></div>
        <table className="ui-iv__table"><thead><tr><th scope="col">Name</th><th scope="col">Qty</th><th scope="col" className="ui-iv__num">Rate</th><th scope="col" className="ui-iv__num">Tax</th><th scope="col" className="ui-iv__num">Price</th></tr></thead><tbody>{invoice.lines.map((line, index) => <Fragment key={line.id}>{line.group && line.group !== invoice.lines[index - 1]?.group && <tr className="ui-iv__group"><td colSpan={5}>{line.group}</td></tr>}<tr data-indent={line.group ? "" : undefined}><td>{line.name || "Untitled item"}</td><td>{line.qty.toLocaleString("en-US", { maximumFractionDigits: 3 })}</td><td className="ui-iv__num">{formatMoney(toCents(line.rate), invoice.currency)}</td><td className="ui-iv__num">{line.tax}%</td><td className="ui-iv__num">{money(lineCents(line))}</td></tr></Fragment>)}</tbody></table>
        <div className="ui-iv__totals"><div><span>Subtotal</span><span>{money(sum.subtotal)}</span></div><div><span>Tax</span><span>{money(sum.tax)}</span></div><div className="ui-iv__total"><span>Total</span><b data-testid="invoice-total">{money(sum.total)}</b></div></div>{invoice.note && <p className="invoice-paper-note">{invoice.note}</p>}
      </article>
      <article className="ui-iv__sheet" data-doc="credit" id={`${ids}-credit`} role="tabpanel" aria-labelledby={`${ids}-credit-tab`} aria-hidden={view !== "credit"} inert={view !== "credit"}>
        <header className="ui-iv__head"><div><p className="ui-iv__big">Credit note</p><p className="ui-iv__due">{formatMoney(credit.total, invoice.currency)} credited on {formatDate(invoice.credit.date)}{invoice.credit.issued && <span className="ui-iv__badge">Issued</span>}</p></div>{brand}</header>
        <div className="ui-iv__terms"><p className="ui-iv__label">Terms</p><dl><div><dt>Credit note no</dt><dd><span className="ui-iv__ref">{invoice.creditNumber || "—"}</span></dd></div><div><dt>Related invoice</dt><dd><button type="button" className="ui-iv__ref" onClick={() => onView("invoice")}>{invoice.number || "—"}</button></dd></div><div><dt>Billing period</dt><dd>{invoice.period || "—"}</dd></div><div><dt>Date of issue</dt><dd>{formatDate(invoice.credit.date)}</dd></div></dl></div>
        <div className="ui-iv__tray"><p className="ui-iv__tray-title">Lines to credit</p><div className="ui-iv__card"><div className="ui-iv__crow ui-iv__crow--head"><span /><span>Name</span><span className="ui-iv__num">Total</span><span className="ui-iv__num">Credit amount</span></div>{invoice.lines.map(line => {
          const c = invoice.credit.lines.find(c => c.lineId === line.id), disabled = !c?.selected || invoice.credit.issued || busy;
          return <div className="ui-iv__crow" data-off={!c?.selected ? "" : undefined} key={line.id}><button type="button" role="checkbox" aria-checked={c?.selected ?? false} aria-label={`Credit ${line.name || "Untitled item"}`} className="ui-iv__check" disabled={invoice.credit.issued || busy} onClick={() => onCredit(line.id, { selected: !c?.selected })}><BlockIcon kind="check" /></button><span className="ui-iv__cname">{line.name || "Untitled item"}</span><span className="ui-iv__num">{formatMoney(lineCents(line), invoice.currency)}</span><span className="ui-iv__num"><CreditAmount key={`${line.id}-${lineCents(line)}-${invoice.credit.issued}`} value={c?.cents ?? 0} max={lineCents(line)} disabled={disabled} currency={invoice.currency} label={`Credit amount for ${line.name || "Untitled item"}`} onChange={cents => onCredit(line.id, { cents })} /></span></div>;
        })}</div></div>
        <div className="ui-iv__totals"><div><span>Subtotal</span><span>{money(credit.subtotal)}</span></div><div><span>Tax</span><span>{money(credit.tax)}</span></div><div className="ui-iv__total"><span>Adjustment total</span><b data-testid="credit-total">-{money(credit.total)}</b></div><div className="ui-iv__note"><span>Applied to invoice</span><span>-{formatMoney(credit.total, invoice.currency)} {invoice.currency}</span></div></div>
        <div className="ui-iv__issue"><button type="button" className={invoice.credit.issued ? "ui-iv__btn" : "ui-iv__primary"} disabled={busy || (!invoice.credit.issued && credit.total <= 0)} onClick={invoice.credit.issued ? onEditCredit : onIssue}>{busy ? "Saving…" : invoice.credit.issued ? "Edit credit note" : "Issue credit note"}</button></div>
      </article>
    </div>
  </section>;
}
