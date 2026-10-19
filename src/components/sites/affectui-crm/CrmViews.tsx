"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { CrmIcon } from "./CrmIcon";
import { numberFormat, stages, tones, type CrmEngine } from "./crm-engine";

export const crmTabs = ["Company CRM", "Team strategy", "Pixel integration", "Sales docs"] as const;
export type CrmTab = (typeof crmTabs)[number];

export function PipelineBoard({ engine }: { engine: CrmEngine }) {
  return <div className="ui-as-board">{stages.map(stage => {
    const rows = engine.rows.filter(row => row.stage === stage);
    return <section className="ui-as-board__col" key={stage} aria-label={`${stage} pipeline`} onDragOver={event => event.preventDefault()} onDrop={event => {
      event.preventDefault(); const id = event.dataTransfer.getData("text/plain");
      engine.change(engine.rows.map(row => row.id === id ? { ...row, stage } : row));
    }}>
      <header><span className="ui-as-board__dot" data-tone={tones[stage]} />{stage}<span className="ui-as-board__count">{rows.length}</span><span className="ui-as-board__sum">${numberFormat.format(rows.reduce((sum, row) => sum + row.value, 0))}</span></header>
      {rows.map(row => <article className="ui-as-board__card" key={row.id} draggable onDragStart={event => event.dataTransfer.setData("text/plain", row.id)}><span className="ui-as-board__name"><span className="ui-as-board__logo"><CrmIcon name={row.company} size={20} /></span>{row.company || "Untitled"}</span><b>${numberFormat.format(row.value)}</b><span className="ui-as-board__meta">{row.owner} · {row.lastContact}</span><label className="crm-board-move">Move to<select aria-label={`Move ${row.company} to stage`} value={row.stage} onChange={event => engine.change(engine.rows.map(item => item.id === row.id ? { ...item, stage: event.target.value } : item))}>{[...stages,"Lost"].map(value => <option key={value}>{value}</option>)}</select></label></article>)}
    </section>;
  })}</div>;
}

const snippet = `<script async src="https://cdn.acme.com/pixel.js"></script>
<script>
  window.acme = window.acme || [];
  acme.push(["init", "px_4f9a21"]);
  acme.push(["track", "page_view"]);
</script>`;

export function PixelIntegration() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"waiting" | "busy" | "ok">("waiting");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if(copyTimer.current) clearTimeout(copyTimer.current); }, []);
  return <div className="ui-as-pixel"><h2>Install the tracking pixel</h2><p>Add this snippet to every page, right before the closing &lt;/head&gt; tag. Visits and sign-ups then show up on each company.</p>
    <div className="ui-as-pixel__code"><button type="button" className="ui-as-tool ui-as-tool--label" onClick={async () => {
      try { await navigator.clipboard.writeText(snippet); setCopied(true); copyTimer.current = setTimeout(() => setCopied(false), 1800); }
      catch { setCopied(false); }
    }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button><pre>{snippet}</pre></div>
    <div className="ui-as-pixel__status" data-state={status}><span className="ui-as-pixel__light" /><span><b>{status === "ok" ? "Pixel connected" : status === "busy" ? "Checking connection…" : "Waiting for the first event"}</b><span>{status === "ok" ? "Demo event received. Your pixel is ready." : "Install the snippet, then check the connection."}</span></span><button type="button" className="ui-as-tool ui-as-tool--label" disabled={status === "busy"} onClick={() => { setStatus("busy"); timer.current = setTimeout(() => setStatus("ok"), 1400); }}>{status === "busy" ? "Checking…" : "Check connection"}</button></div>
  </div>;
}

const documents = [
  { title: "Sales-Playbook", type: "DOC", color: "blue", meta: "Document · Mara Klein · Today" },
  { title: "Pricing-2025", type: "PDF", color: "rose", meta: "PDF · Lea Braun · Yesterday" },
  { title: "Pipeline-Forecast", type: "XLS", color: "emerald", meta: "Spreadsheet · Jonas Weber · 3 days ago" },
  { title: "Objection-Handling", type: "DOC", color: "blue", meta: "Document · Tom Fischer · Last week" },
];

export function SalesDocuments() {
  const [open, setOpen] = useState<(typeof documents)[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <div className="ui-as-crm-docs">{documents.map(doc => <button type="button" className="ui-as-template" key={doc.title} onClick={() => { setOpen(doc); dialog.current?.showModal(); }}><span className="ui-as-template__preview"><span className="ui-as-doc" data-color={doc.color} aria-hidden="true"><span className="ui-as-doc__art"><span className="ui-as-doc__back" /><span className="ui-as-doc__page" data-type={doc.type}>{doc.type === "XLS" ? <span className="ui-as-sheet">{Array.from({length:18},(_,index)=><i key={index} />)}</span> : <>{doc.type === "PDF" ? <i className="ui-as-doc__image" /> : <i className="ui-as-doc__title" />}{Array.from({length:doc.type === "PDF" ? 3 : 5},(_,index)=><i className="ui-as-doc__line" key={index} />)}</>}</span><span className="ui-as-doc__type">{doc.type}</span></span></span></span><b className="ui-as-template__name">{doc.title}</b><span className="ui-as-meta">{doc.meta}</span></button>)}</div>
    <dialog ref={dialog} className="crm-dialog" onClick={event => { if(event.target === event.currentTarget) dialog.current?.close(); }}><div className="crm-dialog__head"><h2>{open?.title}</h2><button type="button" aria-label="Close document" onClick={() => dialog.current?.close()}><X size={18} /></button></div><p>{open?.meta}</p><p>This preview includes the document cover. The reference demo does not provide a document file.</p></dialog>
  </>;
}
