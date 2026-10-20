"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { CrmIcon } from "./CrmIcon";
import { Combobox, type ComboboxOption } from "../affectui-combobox/Combobox";
import { numberFormat, stages, tones, type Company, type CrmEngine } from "./crm-engine";
import { useStoredState } from "./workspace-state";

const stageOptions: ComboboxOption[] = [...stages, "Lost"].map(value => ({ value, label: value }));
import { AnimatedNumber } from "../affectui-analytics/AnimatedNumber";
export { SalesDocuments } from "./WorkspaceDocuments";

export const crmTabs = ["Company CRM", "Team strategy", "Pixel integration", "Sales docs"] as const;
export type CrmTab = (typeof crmTabs)[number];

export function PipelineBoard({ engine, filter, onOpenCompany, includeLost = false }: {
  engine: CrmEngine; filter?: (row: Company) => boolean; onOpenCompany?: (name: string) => void; includeLost?: boolean;
}) {
  const [over,setOver]=useState<string|null>(null);
  const reduce=useReducedMotion();
  const visible=filter ? engine.rows.filter(filter) : engine.rows;
  return <LayoutGroup><div className="ui-as-board">{[...stages,...(includeLost ? ["Lost"] : [])].map(stage=>{
    const rows=visible.filter(row=>row.stage===stage);
    return <section className="ui-as-board__col" data-drag-over={over===stage ? "" : undefined} key={stage} aria-label={`${stage} pipeline`} onDragOver={event=>{event.preventDefault();setOver(stage);}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOver(null);}} onDrop={event=>{
      event.preventDefault();const id=event.dataTransfer.getData("text/plain");
      engine.change(engine.rows.map(row=>row.id===id ? {...row,stage} : row));setOver(null);
    }}>
      <header><span className="ui-as-board__dot" data-tone={tones[stage]} />{stage}<span className="ui-as-board__count">{rows.length}</span><span className="ui-as-board__sum">$<AnimatedNumber value={rows.reduce((sum,row)=>sum+row.value,0)} format={value=>numberFormat.format(Math.round(value))} /></span></header>
      {rows.map(row=><motion.article layout layoutId={`deal-${row.id}`} className="ui-as-board__card" key={row.id} draggable onDragStartCapture={event=>event.dataTransfer.setData("text/plain",row.id)} onDragEnd={()=>setOver(null)} whileHover={reduce ? undefined : {y:-1}} transition={{layout:{type:"spring",stiffness:420,damping:35},duration:reduce ? 0 : 0.2}}><button type="button" className="workspace-board-card-open" onClick={()=>onOpenCompany?.(row.company)} aria-label={`Open ${row.company || "untitled company"}`}><span className="ui-as-board__name"><span className="ui-as-board__logo"><CrmIcon name={row.company} size={20} /></span>{row.company || "Untitled"}</span><b>${numberFormat.format(row.value)}</b><span className="ui-as-board__meta">{row.owner} · {row.lastContact}</span></button><div className="crm-board-move"><Combobox size="sm" label="Move to" aria-label={`Move ${row.company} to stage`} value={row.stage} options={stageOptions} onChange={stage=>engine.change(engine.rows.map(item=>item.id===row.id ? {...item,stage} : item))} /></div></motion.article>)}
    </section>;
  })}</div></LayoutGroup>;
}

const snippet=`<script async src="https://cdn.acme.com/pixel.js"></script>
<script>
  window.acme = window.acme || [];
  acme.push(["init", "px_4f9a21"]);
  acme.push(["track", "page_view"]);
</script>`;

export function PixelIntegration({ workspaceId="acme" }: { workspaceId?:string }) {
  const [copied,setCopied]=useState(false);
  const [connected,setConnected]=useStoredState(`affectui:${workspaceId}:pixel-connected`,false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);if(copyTimer.current)clearTimeout(copyTimer.current);},[]);
  return <div className="ui-as-pixel"><h2>Install the tracking pixel</h2><p>Add this snippet to every page, right before the closing &lt;/head&gt; tag. Visits and sign-ups then show up on each company.</p>
    <div className="ui-as-pixel__code"><button type="button" className="ui-as-tool ui-as-tool--label" onClick={async()=>{
      try{await navigator.clipboard.writeText(snippet);setCopied(true);setError("");if(copyTimer.current)clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(false),1800);}catch{setError("Copy is unavailable in this browser. Select the snippet to copy it.");}
    }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button><pre>{snippet}</pre></div>
    <div className="ui-as-pixel__status" data-state={busy ? "busy" : connected ? "ok" : "waiting"}><span className="ui-as-pixel__light" /><span><b>{busy ? "Checking connection…" : connected ? "Pixel connected" : "Waiting for the first event"}</b><span>{connected ? "Demo event received. Your pixel is ready." : "Install the snippet, then check the connection."}</span></span><button type="button" className="ui-as-tool ui-as-tool--label" disabled={busy} onClick={()=>{setBusy(true);timer.current=setTimeout(()=>{setBusy(false);setConnected(true);},1400);}}>{busy && <LoaderCircle size={13} className="workspace-spinner" />}{busy ? "Checking…" : "Check connection"}</button></div>
    {error && <p className="workspace-form-error" role="alert">{error}</p>}
  </div>;
}
