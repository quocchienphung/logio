"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, FilePlus2, FolderOpen, LoaderCircle, Pencil, Plus, Search, Upload, X } from "lucide-react";
import { BackendError } from "@/lib/workspace-backend";
import { SectionSkeleton } from "../shimmer-loader/SectionSkeleton";
import { WorkspaceDialog } from "../affectui-crm/WorkspaceDialog";
import { downloadFile } from "../affectui-crm/workspace-state";
import { createLocalInvoiceSource, type InvoiceDataSource } from "./invoice-data-source";
import { InvoiceBlock } from "./InvoiceBlock";
import { InvoiceEditor } from "./InvoiceEditor";
import { printInvoice } from "./invoice-export";
import { createBlankInvoice, createDefaultInvoice, createLibrary, creditTotals, formatDate, formatMoney, invoiceCsv, LIMITS, normalizeInvoice, normalizeLibrary, syncCredits, totals, uid, validateInvoice } from "./invoice-model";
import type { CreditLine, InvoiceData, InvoiceLibrary } from "./invoice-model";
import "./invoice-reference.css";
import "./invoice.css";

interface InvoiceProps { workspaceId: string; dataSource?: InvoiceDataSource; remote?: boolean }
export function Invoice({ workspaceId, dataSource, remote = false }: InvoiceProps) {
  const source = useMemo(() => dataSource ?? createLocalInvoiceSource(`affectui:${workspaceId}:invoice`), [dataSource, workspaceId]);
  const [result, setResult] = useState<{ source: InvoiceDataSource; library?: InvoiceLibrary; persisted?: boolean; error?: string } | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    source.load(controller.signal).then(value => { if (!controller.signal.aborted) setResult({ source, library: value ?? createLibrary(createDefaultInvoice()), persisted: !!value }); }).catch(error => { if (!controller.signal.aborted) setResult({ source, error: error instanceof Error ? error.message : "Couldn’t load your invoices." }); });
    return () => controller.abort();
  }, [source, attempt]);
  const reload = () => { setResult(null); setAttempt(value => value + 1); };
  if (!result || result.source !== source) return <SectionSkeleton section="Invoice" label="Loading invoices…" />;
  if (!result.library) return <div className="invoice-workspace invoice-loading" role="alert"><p>{result.error}</p><button className="invoice-button" type="button" onClick={reload}>Retry loading</button></div>;
  return <InvoiceStudio key={`${workspaceId}-${attempt}`} source={source} initial={result.library} persisted={!!result.persisted} remote={remote} onReload={reload} />;
}

type Pending = { label: string; run: () => void };
function InvoiceStudio({ source, initial, persisted, remote, onReload }: { source: InvoiceDataSource; initial: InvoiceLibrary; persisted: boolean; remote: boolean; onReload: () => void }) {
  const initialSaved = JSON.stringify(persisted ? initial : { version: 2, activeId: "", documents: [] });
  const [library, setLibrary] = useState(initial), [saved, setSaved] = useState(initialSaved);
  const [view, setView] = useState<"invoice" | "credit">("invoice"), [editing, setEditing] = useState(false), [paymentFocus, setPaymentFocus] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(""), [conflict, setConflict] = useState(false);
  const [modal, setModal] = useState<"library" | "export" | "delete" | null>(null), [search, setSearch] = useState(""), [sort, setSort] = useState("newest"), [pending, setPending] = useState<Pending | null>(null);
  const upload = useRef<HTMLInputElement>(null), saving = useRef(false), savedRef = useRef(initialSaved);
  const invoice = library.documents.find(doc => doc.id === library.activeId), dirty = JSON.stringify(library.documents) !== JSON.stringify((JSON.parse(saved) as InvoiceLibrary).documents);
  const setDoc = useCallback((change: (current: InvoiceData) => InvoiceData) => {
    setLibrary(current => ({ ...current, documents: current.documents.map(doc => doc.id === current.activeId ? change(doc) : doc) })); setMessage(""); setError("");
  }, []);
  const editDoc = (change: (current: InvoiceData) => InvoiceData) => setDoc(current => syncCredits(change(current)));
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", listener); return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); document.querySelector<HTMLButtonElement>("[data-invoice-save]")?.click(); } };
    window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!dirty || busy || !(event.target instanceof Element)) return;
      const nav = event.target.closest<HTMLElement>(".ui-as-side__nav button, .workspace-explore, .ui-as-menu__item[role=menuitemradio]");
      if (!nav || (nav.getAttribute("aria-current") === "page" || nav.getAttribute("aria-checked") === "true")) return;
      event.preventDefault(); event.stopImmediatePropagation(); setPending({ label: "Leave this invoice", run: () => nav.click() });
    };
    document.addEventListener("click", listener, true); return () => document.removeEventListener("click", listener, true);
  }, [dirty, busy]);

  async function persist(next = library, action = "invoice.save", targetId = next.activeId) {
    if (saving.current || conflict) return false;
    const active = next.documents.find(doc => doc.id === next.activeId);
    const invalid = active && validateInvoice(active);
    if (invalid) { setError(invalid); setEditing(true); return false; }
    if (new Set(next.documents.map(doc => doc.number.trim().toLowerCase())).size !== next.documents.length) { setError("Invoice numbers must be unique in this workspace."); setEditing(true); return false; }
    if (!normalizeLibrary(next)) { setError("Some invoice fields are invalid. Review the dates and amounts."); setEditing(true); return false; }
    saving.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await source.save(next, [{ type: action, operationId: uid(), invoiceId: targetId || undefined }]);
      savedRef.current = JSON.stringify(next); setSaved(savedRef.current); setMessage(remote ? "Saved to workspace." : "Saved in this browser."); return true;
    } catch (cause) {
      if (cause instanceof BackendError && cause.code === "conflict") { setConflict(true); setError("This workspace changed elsewhere. Export your edits, then reload the saved copy before continuing."); }
      else setError(cause instanceof Error ? cause.message : "Couldn’t save. Your edits are still here. Try again.");
      return false;
    } finally { saving.current = false; setBusy(false); }
  }
  function guard(label: string, run: () => void) { if (dirty) setPending({ label, run }); else run(); }
  function switchTo(id: string) { setLibrary(current => ({ ...current, activeId: id })); setView("invoice"); setEditing(false); setModal(null); setMessage(""); setError(""); }
  function newInvoice() {
    if (library.documents.length >= LIMITS.documents) { setError(`This workspace supports up to ${LIMITS.documents} invoices.`); return; }
    guard("Create a new invoice", () => { const current = JSON.parse(savedRef.current) as InvoiceLibrary; const doc = createBlankInvoice(current.documents.find(doc => doc.id === invoice?.id), current.documents.map(doc => doc.number)); setLibrary({ ...current, activeId: doc.id, documents: [...current.documents, doc] }); setView("invoice"); setEditing(true); setModal(null); setError(""); setMessage(""); });
  }
  function duplicate() {
    if (!invoice || library.documents.length >= LIMITS.documents) return;
    guard("Duplicate this invoice", () => { const current = JSON.parse(savedRef.current) as InvoiceLibrary; const blank = createBlankInvoice(invoice, current.documents.map(doc => doc.number)); const original = current.documents.find(doc => doc.id === invoice.id) ?? initial.documents.find(doc => doc.id === invoice.id) ?? invoice; const doc = syncCredits({ ...original, id: blank.id, number: blank.number, creditNumber: blank.creditNumber, credit: { ...blank.credit, lines: [] } }); setLibrary({ ...current, activeId: doc.id, documents: [...current.documents, doc] }); setView("invoice"); setEditing(true); setModal(null); });
  }
  async function issue() {
    if (!invoice || creditTotals(invoice).total <= 0) return;
    const updated = { ...invoice, credit: { ...invoice.credit, issued: true } };
    const next = { ...library, documents: library.documents.map(doc => doc.id === updated.id ? updated : doc) };
    if (await persist(next, "invoice.credit.issue")) { setLibrary(next); setMessage(remote ? "Credit note saved to workspace." : "Credit note issued in this browser. No refund was sent."); }
  }
  function patchCredit(id: string, patch: Partial<CreditLine>) { setDoc(doc => ({ ...doc, credit: { ...doc.credit, issued: false, lines: doc.credit.lines.map(line => line.lineId === id ? { ...line, ...patch } : line) } })); }
  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Choose a JSON file smaller than 2 MB."); return; }
    try {
      const raw: unknown = JSON.parse(await file.text()), incoming = normalizeInvoice(raw);
      if (!incoming) throw new Error("Choose a single invoice JSON exported from this workspace.");
      if (library.documents.length >= LIMITS.documents) throw new Error("The invoice library is full.");
      guard("Import this invoice", () => { const current = JSON.parse(savedRef.current) as InvoiceLibrary; const duplicateNumber = current.documents.some(doc => doc.number === incoming.number); const doc = { ...incoming, id: uid(), number: duplicateNumber ? createBlankInvoice(undefined, current.documents.map(doc => doc.number)).number : incoming.number }; setLibrary({ ...current, activeId: doc.id, documents: [...current.documents, doc] }); setEditing(true); setView("invoice"); setError(""); setModal(null); setMessage("Imported for review. Save draft to keep it."); });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t import this file."); }
  }
  async function deleteInvoice() {
    if (!invoice) return;
    const documents = library.documents.filter(doc => doc.id !== invoice.id), next: InvoiceLibrary = { version: 2, activeId: documents[0]?.id ?? "", documents };
    if (await persist(next, "invoice.delete", invoice.id)) { setLibrary(next); setModal(null); setEditing(false); }
  }
  const fileName = (invoice?.number || "invoice").replace(/[^a-zA-Z0-9_-]/g, "-");
  const savedDocuments = (JSON.parse(saved) as InvoiceLibrary).documents;
  const shown = savedDocuments.filter(doc => `${doc.number} ${doc.buyer.name} ${doc.seller.name}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "client" ? a.buyer.name.localeCompare(b.buyer.name) : sort === "amount" ? totals(b.lines).total - totals(a.lines).total : b.issued.localeCompare(a.issued));
  const afterPending = (discard: boolean) => { const run = pending?.run; if (!run) return; if (discard) { setLibrary(JSON.parse(savedRef.current) as InvoiceLibrary); } setPending(null); window.setTimeout(run, 0); };

  return <div className="invoice-workspace"><header className="invoice-workspace-head"><div><div className="invoice-eyebrow">Sales / Invoicing</div><h1>Invoices <span className="invoice-draft-badge">{invoice?.credit.issued ? "Credit issued" : "Draft"}</span></h1><p>Create, review and keep your billing documents in one place.</p></div><div className="invoice-head-actions"><button type="button" className="invoice-button" aria-label="Saved invoices" onClick={() => setModal("library")} disabled={busy}><FolderOpen size={15} />Saved invoices <span className="invoice-count">{savedDocuments.length}</span></button><button type="button" className="invoice-button invoice-button-dark" onClick={newInvoice} disabled={busy}><Plus size={15} />New invoice</button></div></header>
    <input ref={upload} type="file" accept="application/json,.json" className="invoice-sr-only" aria-label="Import invoice JSON" onChange={event => { void importFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    {error && <div className="invoice-feedback invoice-feedback-error" role="alert"><span>{error}</span>{conflict && <button type="button" onClick={() => guard("Reload saved invoices", onReload)}>Reload saved copy</button>}{!conflict && <button type="button" aria-label="Dismiss invoice error" onClick={() => setError("")}><X size={15} /></button>}</div>}
    {invoice ? <><div className="invoice-toolbar"><div><span className="invoice-document-number">{invoice.number || "New invoice"}</span><span className="invoice-save-state" role="status">{busy ? "Saving…" : dirty ? "Unsaved changes" : message || (remote ? "Workspace storage" : "Browser storage")}</span></div><div className="invoice-toolbar-actions"><button type="button" className="invoice-button" aria-expanded={editing} onClick={() => { setEditing(!editing); setPaymentFocus(false); }} disabled={busy}><Pencil size={14} />{editing ? "Close editor" : "Edit invoice"}</button><button type="button" className="invoice-button" onClick={() => setModal("export")}><Download size={14} />Export</button><button type="button" className="invoice-button invoice-button-dark" data-invoice-save disabled={busy || conflict} onClick={() => void persist()}>{busy ? <LoaderCircle className="invoice-spin" size={14} /> : !dirty && message ? <Check size={14} /> : null}Save draft</button></div></div>
      <div className={`invoice-studio${editing ? " invoice-studio--editing" : ""}`}><div className="invoice-preview"><InvoiceBlock key={invoice.id} invoice={invoice} view={view} onView={setView} onCredit={patchCredit} onIssue={() => void issue()} onEditCredit={() => setDoc(doc => ({ ...doc, credit: { ...doc.credit, issued: false } }))} onPdf={() => { try { printInvoice(invoice, view); } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t open print."); } }} onConfigurePayment={() => { setEditing(true); setPaymentFocus(true); setMessage("Add your provider’s HTTPS payment link in Payment & notes."); }} busy={busy || conflict} />
      <p className="invoice-preview-caption">{view === "credit" ? "Choose the lines and amounts to credit. Taxes update automatically." : "Edit your details and line items. The preview and totals update as you type."}</p></div>{editing && <InvoiceEditor key={invoice.id} invoice={invoice} onChange={editDoc} onClose={() => setEditing(false)} busy={busy || conflict} paymentFocus={paymentFocus} />}</div>
      <p className="invoice-storage-note">{remote ? "Documents use your configured workspace API." : "Documents are stored in this browser, separately for each workspace."} Issuing a credit note records an adjustment; it does not transfer money.</p></> : <div className="invoice-empty"><FilePlus2 size={32} /><h2>Your first invoice starts here</h2><p>Create a document or import one of your invoice JSON files.</p><button type="button" className="invoice-button invoice-button-dark" onClick={newInvoice}><Plus size={16} />Create invoice</button><button type="button" className="invoice-button" onClick={() => upload.current?.click()}><Upload size={16} />Import JSON</button></div>}
    <WorkspaceDialog open={modal !== null} title={modal === "library" ? "Saved invoices" : modal === "export" ? "Export invoice" : "Delete invoice?"} onClose={() => setModal(null)} wide={modal === "library"}>{modal === "library" ? <div className="invoice-library"><div className="invoice-library-tools"><label><Search size={16} /><input aria-label="Search invoices" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice or client…" /></label><select aria-label="Sort invoices" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="client">Client name</option><option value="amount">Amount</option></select><button type="button" className="invoice-button" onClick={() => upload.current?.click()}><Upload size={14} />Import</button></div><div className="invoice-library-list">{shown.map(doc => <button type="button" key={doc.id} className="invoice-library-row" onClick={() => guard("Open this invoice", () => { const stored = JSON.parse(savedRef.current) as InvoiceLibrary; setLibrary(stored); switchTo(doc.id); })}><span><strong>{doc.number || "Untitled invoice"}</strong><small>{doc.buyer.name || "No client yet"} · {formatDate(doc.issued)}</small></span><span><b>{formatMoney(totals(doc.lines).total, doc.currency)}</b><small>{doc.currency}{doc.credit.issued ? " · Credit issued" : " · Draft"}</small></span></button>)}{!shown.length && <p className="invoice-library-empty">{search ? "No invoices match your search." : "No saved invoices yet."}</p>}</div><div className="invoice-modal-footer"><button type="button" className="invoice-button" onClick={newInvoice}><Plus size={15} />New invoice</button></div></div> : modal === "export" ? <div className="invoice-export-options"><button type="button" aria-label="Print / Save as PDF" onClick={() => { if (invoice) { try { printInvoice(invoice, view); } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t print."); } } }}><Download size={18} /><span><strong>Print / Save as PDF</strong><small>A dedicated layout for the current document.</small></span></button><button type="button" aria-label="Download CSV" onClick={() => { if (invoice) downloadFile(`${fileName}.csv`, "\uFEFF" + invoiceCsv(invoice), "text/csv;charset=utf-8"); }}><Download size={18} /><span><strong>Download CSV</strong><small>Line items, taxes and calculated totals.</small></span></button><button type="button" aria-label="Download JSON" onClick={() => { if (invoice) downloadFile(`${fileName}.json`, JSON.stringify(invoice, null, 2), "application/json"); }}><Download size={18} /><span><strong>Download JSON</strong><small>Editable document, including credit selections.</small></span></button><button type="button" aria-label="Duplicate invoice" disabled={busy || library.documents.length >= LIMITS.documents} onClick={duplicate}><Copy size={18} /><span><strong>Duplicate invoice</strong><small>Create a draft with a new invoice number.</small></span></button><button type="button" className="invoice-delete-option" disabled={busy || conflict} onClick={() => setModal("delete")}><X size={18} /><span><strong>Delete invoice</strong><small>Remove this document from the workspace.</small></span></button></div> : <div className="invoice-dialog-body"><p>Remove {invoice?.number} and its credit note from this workspace? Export a copy first if you need it.</p><div className="invoice-modal-footer"><button type="button" className="invoice-button" onClick={() => setModal("export")}>Cancel</button><button type="button" className="invoice-button invoice-button-danger" disabled={busy} onClick={() => void deleteInvoice()}>{busy ? "Deleting…" : "Delete invoice"}</button></div></div>}</WorkspaceDialog>
    <WorkspaceDialog open={!!pending} title="Unsaved changes" onClose={() => setPending(null)}><div className="invoice-dialog-body"><p>Save your changes before continuing? Your current edits have not been saved.</p>{error && <p className="invoice-dialog-error" role="alert">{error}</p>}<div className="invoice-modal-footer"><button type="button" className="invoice-button" disabled={busy} onClick={() => setPending(null)}>Keep editing</button><button type="button" className="invoice-button" disabled={busy} onClick={() => afterPending(true)}>Discard changes</button><button type="button" className="invoice-button invoice-button-dark" disabled={busy || conflict} onClick={async () => { if (await persist()) afterPending(false); }}>{busy ? "Saving…" : "Save & continue"}</button></div></div></WorkspaceDialog>
  </div>;
}
