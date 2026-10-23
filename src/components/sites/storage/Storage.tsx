"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { zipSync } from "fflate";
import { ArrowDownToLine, ArrowRight, BookOpen, Check, CircleHelp, Database, FilePlus2, FileText, FolderOpen, HardDrive, Search, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useResource, useResourceStore, useWorkspaceBackend } from "@/lib/workspace-backend/react";
import { WorkspaceDialog } from "../affectui-crm/WorkspaceDialog";
import { SectionSkeleton } from "../shimmer-loader/SectionSkeleton";
import { StorageOnboarding } from "./StorageOnboarding";
import { StorageDropzone, type StorageDropzoneEntry } from "./StorageDropzone";
import { StorageRun, type StorageRunStep, type StorageRunStatus } from "./StorageRun";
import { StorageTreemap } from "./StorageTreemap";
import { StorageActionButton, StorageButton, StorageButtonGroup, StorageConfirmMorph, StorageCopyButton, StorageExpandingButtonGroup, StorageFloatingButtonGroup, StorageIconMorph, StorageSplitButton } from "./StorageControls";
import { documentExtension, emptyStorage, formatStorageBytes, indexDocument, storageCategories, storageResource, validateDocument, type StorageCategory, type StorageDocument } from "./storage-model";
import { extractDocument } from "./storage-extract";
import { downloadBlob } from "./storage-vault";
import { loadStorageIndex, loadStorageOriginal, removeStorageDocument, searchStorageDocuments, storeStorageDocument } from "./storage-transfer";
import { persistStorage } from "./storage-persistence";
import "./storage.css";

interface QueueEntry extends StorageDropzoneEntry { file:File; category:StorageCategory }
interface PreparedDocument { entryId:string; file:File; document:StorageDocument; text:string; chunks:string[] }
const newSteps=():StorageRunStep[]=>[
  {id:"receive",label:"Receive documents",detail:"Files stay in the review queue until you choose to process them.",status:"pending"},
  {id:"check",label:"Validate & fingerprint",detail:"Check file size and format, calculate SHA-256, and find exact duplicates in this workspace.",status:"pending"},
  {id:"extract",label:"Read document content",detail:"Extract text from PDF, DOCX, spreadsheets and text files locally. Scanned PDFs are retained as originals without an OCR index.",status:"pending"},
  {id:"organize",label:"Organize & refine",detail:"Keep your chosen subject, normalize whitespace and identify recurring keywords. Original content is never rewritten.",status:"pending"},
  {id:"index",label:"Build searchable index",detail:"Split extracted text into overlapping passages and retain its source fingerprint. This is lexical indexing; no AI is invoked.",status:"pending"},
  {id:"store",label:"Review & store",detail:"Review the extracted content, then approve saving the original and its index to your workspace.",status:"pending"},
];
const errorText=(error:unknown)=>error instanceof Error?error.message:"Something went wrong. Please retry.";

export function Storage({workspaceId}:{workspaceId:string}) {
  const backend=useWorkspaceBackend();
  const [library,setLibrary,sync]=useResource(storageResource,workspaceId,emptyStorage);
  const entry=useResourceStore().entry(storageResource,workspaceId,emptyStorage);
  const libraryRef=useRef(library);libraryRef.current=library;
  const [queue,setQueue]=useState<QueueEntry[]>([]);
  const [prepared,setPrepared]=useState<PreparedDocument[]>([]);
  const [status,setStatus]=useState<StorageRunStatus>("idle");
  const [steps,setSteps]=useState(newSteps);
  const [runCount,setRunCount]=useState(0);
  const [category,setCategory]=useState<StorageCategory>("Finance");
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [contentMatches,setContentMatches]=useState<Set<string>|null>(null);
  const [selected,setSelected]=useState<string[]>([]);
  const [detailId,setDetailId]=useState<string|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [previewError,setPreviewError]=useState("");
  const [detailEpoch,setDetailEpoch]=useState(0);
  const [searchError,setSearchError]=useState("");
  const [searchEpoch,setSearchEpoch]=useState(0);
  const [guide,setGuide]=useState(false);
  const [noteOpen,setNoteOpen]=useState(false);
  const [noteTitle,setNoteTitle]=useState("");
  const [noteText,setNoteText]=useState("");
  const [deleteIds,setDeleteIds]=useState<string[]>([]);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [pendingSave,setPendingSave]=useState(false);
  const controller=useRef<AbortController|null>(null),busy=useRef(false),mounted=useRef(true);
  const input=useRef<HTMLInputElement>(null),uploadPanel=useRef<HTMLDivElement>(null),reviewPanel=useRef<HTMLDivElement>(null);
  const reduce=useReducedMotion();
  const locked=status==="running"||status==="review";
  const documents=library.documents;
  const detail=documents.find(d=>d.id===detailId);
  const query=search.toLocaleLowerCase().trim();
  const visible=useMemo(()=>documents.filter(d=>(filter==="All"||d.category===filter)&&(!query||`${d.name} ${d.category} ${d.excerpt} ${d.keywords.join(" ")}`.toLocaleLowerCase().includes(query)||contentMatches?.has(d.id))),[documents,filter,query,contentMatches]);
  const pending=queue.filter(q=>q.status==="pending"||q.status==="error");
  const indexed=documents.filter(d=>d.extraction==="indexed").length;
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
  useEffect(()=>{if(status!=="review")return;const frame=requestAnimationFrame(()=>{reviewPanel.current?.scrollIntoView({behavior:reduce?"instant":"smooth",block:"nearest"});reviewPanel.current?.focus({preventScroll:true});});return()=>cancelAnimationFrame(frame);},[status,reduce]);
  useEffect(()=>{
    let cancelled=false;const abort=new AbortController();
    if(!detailId)return;
    void loadStorageIndex(backend,workspaceId,detailId,abort.signal).then(value=>{if(!cancelled){setPreview(value?.text??null);setPreviewError("");}}).catch(e=>{if(!cancelled){setPreview(null);setPreviewError(errorText(e));}});
    return()=>{cancelled=true;abort.abort();};
  },[backend,workspaceId,detailId,detailEpoch]);
  useEffect(()=>{
    let cancelled=false;const abort=new AbortController();
    if(!query)return;
    const timer=setTimeout(()=>{void searchStorageDocuments(backend,workspaceId,documents.map(d=>d.id),query,abort.signal).then(ids=>{if(!cancelled){setContentMatches(new Set(ids));setSearchError("");}}).catch(e=>{if(!cancelled)setSearchError(`Full-text search is unavailable: ${errorText(e)}`);});},180);
    return()=>{cancelled=true;abort.abort();clearTimeout(timer);};
  },[backend,documents,query,workspaceId,searchEpoch]);
  function patchEntry(id:string,patch:Partial<QueueEntry>){if(mounted.current)setQueue(current=>current.map(q=>q.id===id?{...q,...patch}:q));}
  function stepState(id:string,state:StorageRunStep["status"],detail?:string,meta?:string){if(mounted.current)setSteps(current=>current.map(s=>s.id===id?{...s,status:state,...(detail?{detail}:{}),meta}:s));}
  function addFiles(files:File[]) {
    if(locked||busy.current)return;
    setError("");setNotice("");
    const available=25-queue.filter(q=>q.status!=="ready").length;
    let bytes=queue.filter(q=>q.status!=="ready").reduce((s,q)=>s+q.size,0);
    const entries:QueueEntry[]=[];
    for(const file of files.slice(0,Math.max(0,available))) {
      let reason="";try{validateDocument(file);}catch(e){reason=errorText(e);}
      bytes+=file.size;
      if(bytes>100*1024*1024){setError("Keep each batch under 100 MB. Process this batch before adding more.");break;}
      entries.push({id:crypto.randomUUID(),file,name:file.name,size:file.size,category,status:reason?"error":"pending",progress:0,error:reason||undefined});
    }
    if(files.length>available)setError("Add up to 25 files per batch. Process this batch before adding more.");
    setQueue(current=>[...current.filter(q=>q.status!=="ready"),...entries]);
    if(entries.length)setNotice(`${entries.length} document${entries.length===1?"":"s"} added to the review queue.`);
    if(status!=="idle"){setStatus("idle");setSteps(newSteps());}
  }
  function dismissGuide(){setGuide(false);setLibrary(current=>({...current,onboarded:true}));}
  function openDetail(id:string){setPreview(null);setPreviewError("");setDetailId(id);}
  function chooseFiles(){input.current?.click();}
  async function prepareFiles(onlyId?:string) {
    if(busy.current||locked)return false;
    const batch=queue.filter(q=>(q.status==="pending"||q.status==="error")&&(!onlyId||q.id===onlyId));
    if(!batch.length)return false;
    busy.current=true;controller.current=new AbortController();const signal=controller.current.signal;
    setError("");setNotice("");setPrepared([]);setSteps(newSteps());setRunCount(batch.length);setStatus("running");
    let activeStep="receive";
    try {
      batch.forEach(q=>patchEntry(q.id,{status:"processing",progress:5,error:undefined}));
      stepState("receive","completed",`${batch.length} original files received from your device.`,`${batch.length} ${batch.length===1?"file":"files"}`);
      activeStep="check";stepState(activeStep,"running");
      const hashes=new Set(libraryRef.current.documents.map(d=>d.sha256));
      const checked:{entry:QueueEntry;sha256:string}[]=[];
      for(const entry of batch) {
        signal.throwIfAborted();
        try {
          validateDocument(entry.file);
          const digest=await crypto.subtle.digest("SHA-256",await entry.file.arrayBuffer());signal.throwIfAborted();
          const sha256=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,"0")).join("");
          if(hashes.has(sha256))throw new Error("An identical document is already stored or included in this batch.");
          hashes.add(sha256);checked.push({entry,sha256});patchEntry(entry.id,{progress:22});
        }catch(e){signal.throwIfAborted();patchEntry(entry.id,{status:"error",progress:0,error:errorText(e)});}
      }
      if(!checked.length)throw new Error("No new valid documents to process. Review the file errors below.");
      stepState(activeStep,"completed",`${checked.length} valid files fingerprinted. Exact duplicates were excluded.`,`${checked.length} checked`);
      activeStep="extract";stepState(activeStep,"running");
      const extracted:{entry:QueueEntry;sha256:string;text:string;warning?:string}[]=[];
      for(const item of checked) {
        signal.throwIfAborted();
        try{const result=await extractDocument(item.entry.file,signal,f=>patchEntry(item.entry.id,{progress:22+Math.round(f*30)}));extracted.push({...item,...result});}
        catch(e){signal.throwIfAborted();extracted.push({...item,text:"",warning:`Text could not be extracted: ${errorText(e)} The original can still be stored after your review.`});}
        patchEntry(item.entry.id,{progress:55});
      }
      stepState(activeStep,"completed",`${extracted.filter(d=>d.text.trim()).length} documents yielded text. Originals without readable text are clearly marked in your review.`,`${extracted.length} read`);
      activeStep="organize";stepState(activeStep,"running");
      const organized=extracted.map(item=>({...item,index:indexDocument(item.text)}));
      signal.throwIfAborted();
      organized.forEach(item=>patchEntry(item.entry.id,{progress:68}));
      stepState(activeStep,"completed","Whitespace normalized and frequent keywords counted. Your chosen knowledge area is retained; no content or financial claims are invented.");
      activeStep="index";stepState(activeStep,"running");
      const ready:PreparedDocument[]=organized.map(item=>({entryId:item.entry.id,file:item.entry.file,text:item.index.text,chunks:item.index.chunks,document:{id:crypto.randomUUID(),name:item.entry.name,category:item.entry.category,bytes:item.entry.size,mime:item.entry.file.type||"application/octet-stream",sha256:item.sha256,addedAt:new Date().toISOString(),words:item.index.words,chunks:item.index.chunks.length,excerpt:item.index.excerpt,keywords:item.index.keywords,extraction:item.index.text?"indexed":"original-only",warning:item.warning||(!item.index.text?"No readable text. Only the original will be stored.":undefined)}}));
      const chunks=ready.reduce((s,d)=>s+d.chunks.length,0);
      stepState(activeStep,"completed",`${chunks} overlapping source passages prepared. Search uses original text and frequent keywords.`,`${chunks} ${chunks===1?"passage":"passages"}`);
      ready.forEach(item=>patchEntry(item.entryId,{progress:82}));
      setPrepared(ready);setStatus("review");
      stepState("store","pending","Review the actual extracted text and knowledge areas below. Nothing is saved to your library until you approve.","Your review");
      return true;
    } catch(e) {
      if(signal.aborted){setStatus("stopped");setSteps(current=>current.map(s=>s.status==="running"?{...s,status:"pending",meta:undefined}:s));setNotice("Processing stopped. No unapproved document was saved.");batch.forEach(q=>patchEntry(q.id,{status:"pending",progress:0}));}
      else{setStatus("error");setError(errorText(e));stepState(activeStep,"error",errorText(e));batch.forEach(q=>setQueue(current=>current.map(e=>e.id===q.id&&e.status==="processing"?{...e,status:"error",progress:0,error:errorText(new Error("Processing did not finish. Retry this document."))}:e)));}
      return false;
    } finally {busy.current=false;}
  }
  async function approveFiles() {
    if(busy.current||!prepared.length)return false;
    busy.current=true;controller.current=new AbortController();const signal=controller.current.signal;
    setStatus("running");setError("");stepState("store","running");
    let saved=0;const failed:PreparedDocument[]=[];
    try {
      for(const item of prepared) {
        signal.throwIfAborted();
        try {
          if(libraryRef.current.documents.some(d=>d.sha256===item.document.sha256))throw new Error("This document was already added to the library.");
          await storeStorageDocument(backend,workspaceId,item.document,item.file,{text:item.text,chunks:item.chunks},signal);
          const document=item.document;
          setLibrary(current=>({...current,documents:[document,...current.documents]}));
          libraryRef.current={...libraryRef.current,documents:[document,...libraryRef.current.documents]};
          patchEntry(item.entryId,{status:"ready",progress:100});saved++;
        }catch(e){if(signal.aborted)throw e;failed.push(item);patchEntry(item.entryId,{status:"error",error:errorText(e),progress:82});}
      }
      setPendingSave(true);await persistStorage(entry,backend,workspaceId);setPendingSave(false);
      setPrepared(failed);
      if(failed.length){setStatus("error");stepState("store","error",`${saved} saved; ${failed.length} need attention. Review the file error, then retry.`);setError("Some documents could not be stored. Review the file errors and retry.");}
      else{setStatus("completed");stepState("store","completed",`${saved} originals and their indexes stored. Open a document to review its text and download its original.`,`${saved} saved`);setNotice(`${saved} document${saved===1?"":"s"} stored in your knowledge library.`);}
      return failed.length===0;
    }catch(e){
      if(signal.aborted&&saved){setPendingSave(true);try{await persistStorage(entry,backend,workspaceId);setPendingSave(false);}catch{/* The visible retry keeps the originals accessible until metadata is verified. */}}
      setStatus(signal.aborted?"stopped":"error");setError(signal.aborted?"Storage stopped. Committed originals are retained; retry to finish the batch and verify metadata.":errorText(e));setPrepared(prepared.filter(item=>!libraryRef.current.documents.some(d=>d.id===item.document.id)));stepState("store",signal.aborted?"pending":"error",errorText(e));return false;
    }
    finally{busy.current=false;}
  }
  function discard(){prepared.forEach(item=>patchEntry(item.entryId,{status:"pending",progress:0}));setPrepared([]);setStatus("idle");setSteps(newSteps());setNotice("Review discarded. Your files remain queued.");}
  async function retrySave(){setPendingSave(true);await persistStorage(entry,backend,workspaceId);setPendingSave(false);setError("");if(status==="error"&&!prepared.length){setStatus("completed");stepState("store","completed","The workspace metadata has been saved and verified.");}}
  async function retry(){if(prepared.length)await approveFiles();else if(pendingSave||sync.error)await retrySave();else await prepareFiles();}
  async function downloadDocument(document:StorageDocument){
    downloadBlob(await loadStorageOriginal(backend,workspaceId,document),document.name);
  }
  async function downloadSelected(){
    if(documents.filter(d=>selected.includes(d.id)).reduce((sum,d)=>sum+d.bytes,0)>100*1024*1024)throw new Error("Download up to 100 MB at a time. Select fewer documents for this ZIP.");
    const files:Record<string,Uint8Array>={};
    for(const id of selected){const d=documents.find(d=>d.id===id);if(!d)continue;const original=await loadStorageOriginal(backend,workspaceId,d);files[`${id.slice(0,8)}-${d.name.replace(/[/\\]/g,"_")}`]=new Uint8Array(await original.arrayBuffer());}
    downloadBlob(new Blob([zipSync(files,{level:0}) as Uint8Array<ArrayBuffer>],{type:"application/zip"}),"knowledge-documents.zip");
  }
  async function removeDocuments(ids:string[]){
    setLibrary(current=>({...current,documents:current.documents.filter(d=>!ids.includes(d.id))}));setPendingSave(true);await persistStorage(entry,backend,workspaceId);setPendingSave(false);
    await Promise.all(ids.map(id=>removeStorageDocument(backend,workspaceId,id)));
    setSelected(current=>current.filter(id=>!ids.includes(id)));if(detailId&&ids.includes(detailId))setDetailId(null);setDeleteIds([]);setNotice(`${ids.length} document${ids.length===1?"":"s"} removed from this library.`);
  }
  async function deleteDocuments(){await removeDocuments([...deleteIds]);}
  function exportManifest(){downloadBlob(new Blob([JSON.stringify({version:1,workspaceId,exportedAt:new Date().toISOString(),documents},null,2)],{type:"application/json"}),"knowledge-manifest.json");setNotice("Document manifest exported. Original files are downloaded separately.");}
  async function handleDownload(d:StorageDocument){try{await downloadDocument(d);}catch(e){setError(errorText(e));}}
  if(sync.phase!=="ready")return <SectionSkeleton section="Storage"/>;
  return <div className="stg-workspace" role="region" aria-label="Storage workspace"><div className="stg-content">
    <input ref={input} type="file" className="stg-sr-only" multiple accept=".pdf,.docx,.txt,.md,.csv,.tsv,.sql,.json,.xlsx" tabIndex={-1} onChange={e=>{addFiles([...e.target.files||[]]);e.target.value="";}}/>
    <header className="stg-page-head"><div><div className="stg-eyebrow"><HardDrive size={14}/>Your knowledge library</div><h1>Storage<span className="stg-heading-dot"/></h1><p>A little more knowledge. A clearer picture.</p></div><div className="stg-head-actions"><StorageButton variant="ghost" size="sm" aria-label="Storage guide" onClick={()=>setGuide(true)}><CircleHelp size={17}/><span className="stg-help-label">Guide</span></StorageButton><StorageSplitButton disabled={locked} onClick={chooseFiles} actions={[{id:"upload",label:"Upload documents",icon:<Upload size={16}/>,onClick:chooseFiles},{id:"note",label:"Write a knowledge note",icon:<FilePlus2 size={16}/>,onClick:()=>setNoteOpen(true)},{id:"export",label:"Export document manifest",icon:<ArrowDownToLine size={16}/>,onClick:exportManifest,disabled:!documents.length}]}><StorageIconMorph state={locked?"pause":"plus"}/>Add documents</StorageSplitButton></div></header>
    <div className="stg-stats" aria-label="Library summary">{[{icon:FolderOpen,label:"Documents",value:documents.length.toLocaleString(),note:"Original files in your library"},{icon:Database,label:"Stored data",value:formatStorageBytes(documents.reduce((s,d)=>s+d.bytes,0)),note:backend.remote?"Originals on your connected backend":"Originals saved on this device"},{icon:Search,label:"Searchable",value:indexed.toLocaleString(),note:`${documents.length-indexed} original-only · ${documents.reduce((s,d)=>s+d.chunks,0)} passages`},{icon:BookOpen,label:"Knowledge areas",value:`${new Set(documents.map(d=>d.category)).size} / 4`,note:"Finance, Banking, SQL & Data"}].map(stat=><div className="stg-stat" key={stat.label}><span><stat.icon size={14}/>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div>)}</div>
    <div className="stg-main-grid"><StorageTreemap documents={documents} onOpen={openDetail} onCategory={setFilter}/><aside className="stg-ingestion" aria-label="Add and process documents"><div ref={uploadPanel} className="stg-upload-panel"><div className="stg-panel-title"><h2>Grow your library</h2><span>01 — Import</span></div><p>Bring the sources you want to build on.</p><label className="stg-category-field">Knowledge area<select aria-label="Upload knowledge area" value={category} disabled={locked} onChange={e=>{const value=e.target.value as StorageCategory;setCategory(value);setQueue(current=>current.map(q=>q.status==="ready"?q:{...q,category:value}));}}>{storageCategories.map(c=><option key={c}>{c}</option>)}</select></label><StorageDropzone onFiles={addFiles} disabled={locked} entries={queue} onRemove={id=>{if(!locked)setQueue(current=>current.filter(q=>q.id!==id));}} onRetry={id=>void prepareFiles(id)}/><div className="stg-process-bar"><span>{pending.length?`${pending.length} waiting to process`:"Add a file or write a note"}</span><StorageActionButton action={async()=>{if(!await prepareFiles())throw new Error("Review the file errors before retrying.");}} pendingLabel="Processing" successLabel="Review ready" disabled={locked||!pending.length} size="sm" onError={e=>setError(errorText(e))}>Process files<ArrowRight size={14}/></StorageActionButton></div></div>
      <StorageRun status={status} fileCount={runCount} steps={steps} onStop={()=>controller.current?.abort()} onRetry={()=>void retry().catch(e=>setError(errorText(e)))}>{!!prepared.length&&status!=="running"&&<div ref={reviewPanel} tabIndex={-1} className="stg-review"><div className="stg-review-title"><ShieldCheck size={16}/><strong>Your review, before storage</strong></div><p>Check the content and subject. These are extracts from your files, not generated summaries.</p><div className="stg-review-files">{prepared.map(item=><article key={item.entryId}><strong title={item.document.name}><FileText size={13}/>{item.document.name}</strong><label>Subject<select aria-label={`Knowledge area for ${item.document.name}`} value={item.document.category} onChange={e=>setPrepared(current=>current.map(p=>p.entryId===item.entryId?{...p,document:{...p.document,category:e.target.value as StorageCategory}}:p))}>{storageCategories.map(c=><option key={c}>{c}</option>)}</select></label><div className="stg-review-metrics">{item.document.words.toLocaleString()} words · {item.document.chunks} passages · {item.document.extraction==="indexed"?"Searchable":"Original only"}</div>{item.document.warning&&<p className="stg-warning">{item.document.warning}</p>}{item.document.excerpt&&<blockquote>{item.document.excerpt.slice(0,280)}</blockquote>}<div className="stg-keywords">{item.document.keywords.slice(0,5).map(k=><span key={k}>{k}</span>)}</div></article>)}</div><div className="stg-review-actions"><StorageButton variant="secondary" size="sm" onClick={discard}>Discard</StorageButton><StorageActionButton action={async()=>{if(!await approveFiles())throw new Error("Storage needs attention.");}} pendingLabel="Storing" successLabel="Stored" size="sm"><Check size={14}/>Approve & store</StorageActionButton></div></div>}</StorageRun>
    </aside></div>
    {(error||sync.error)&&<div className="stg-error" role="alert"><span>{error||sync.error?.message||"Verifying document metadata save?"}</span>{(sync.error||pendingSave)&&<StorageButton size="sm" variant="secondary" onClick={()=>void retrySave().catch(e=>setError(errorText(e)))}>Retry save</StorageButton>}<button type="button" aria-label="Dismiss storage error" onClick={()=>setError("")}><X size={14}/></button></div>}
    {searchError&&<div className="stg-error" role="alert"><span>{searchError} Filename and metadata search still work.</span><StorageButton size="sm" variant="secondary" onClick={()=>setSearchEpoch(current=>current+1)}>Retry search</StorageButton></div>}
    <div className="stg-notice" role="status">{notice||""}</div>
    <section className="stg-library" aria-label="Document library"><div className="stg-library-head"><div><h2>Documents<span>{documents.length}</span></h2><p>Your sources, ready when you need them.</p></div><label className="stg-search"><Search size={15}/><input aria-label="Search stored documents" placeholder="Search your knowledge…" maxLength={256} value={search} onChange={e=>{setSearch(e.target.value);setSearchError("");setContentMatches(null);}}/>{search&&<button type="button" aria-label="Clear document search" onClick={()=>{setSearch("");setSearchError("");setContentMatches(null);}}><StorageIconMorph state="close" size={14}/></button>}</label></div><div className="stg-library-toolbar"><StorageButtonGroup label="Filter documents by knowledge area">{["All",...storageCategories].map(c=><button type="button" key={c} aria-pressed={filter===c} onClick={()=>setFilter(c)}>{c}<span>{c==="All"?documents.length:documents.filter(d=>d.category===c).length}</span></button>)}</StorageButtonGroup><span className="stg-save-status"><i data-saving={sync.save==="saving"||undefined}/>{sync.save==="saving"?"Saving…":sync.save==="error"?"Save needs attention":"Saved"}</span></div>
      <div className="stg-documents-table"><div className="stg-table-head"><label><input type="checkbox" aria-label="Select all visible documents" checked={visible.length>0&&visible.every(d=>selected.includes(d.id))} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...visible.map(d=>d.id)])]:selected.filter(id=>!visible.some(d=>d.id===id)))}/><span>Document</span></label><span>Knowledge area</span><span>Size</span><span>Added</span><span/></div><AnimatePresence initial={false}>{visible.map(d=><motion.div layout={!reduce} key={d.id} className="stg-document-row" initial={reduce?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,height:0}}><div className="stg-file-name"><input type="checkbox" aria-label={`Select ${d.name}`} checked={selected.includes(d.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,d.id]:current.filter(id=>id!==d.id))}/><span className="stg-file-type" data-category={d.category}>{documentExtension(d.name)}</span><button type="button" onClick={()=>openDetail(d.id)}><strong>{d.name}</strong><small>{d.extraction==="indexed"?`${d.words.toLocaleString()} words · Indexed`:"Original only"}{d.warning?" · Review note":""}</small></button></div><span className="stg-subject"><i data-category={d.category}/>{d.category}</span><span className="stg-row-bytes">{formatStorageBytes(d.bytes)}</span><span className="stg-row-date">{new Date(d.addedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span><StorageExpandingButtonGroup label={`Actions for ${d.name}`} actions={[{id:"open",label:"Open",icon:<ArrowRight size={14}/>,onClick:()=>openDetail(d.id)},{id:"download",label:"Download",icon:<ArrowDownToLine size={14}/>,onClick:()=>void handleDownload(d)},{id:"delete",label:"Delete",icon:<Trash2 size={14}/>,danger:true,onClick:()=>setDeleteIds([d.id])}]}/></motion.div>)}</AnimatePresence></div>
      {!visible.length&&<div className="stg-library-empty"><span><FolderOpen size={25}/></span><h3>{documents.length?"No documents in this view":"Make room for what you know"}</h3><p>{documents.length?"Try a different subject or search term.":"Drop in your first source. We’ll help you keep it organized."}</p><StorageButton size="sm" variant="secondary" disabled={locked} onClick={()=>{if(documents.length){setSearch("");setSearchError("");setContentMatches(null);setFilter("All");}else chooseFiles();}}>{documents.length?"Clear filters":<><Upload size={14}/>Add your first document</>}</StorageButton></div>}
    </section>
    <footer className="stg-page-foot"><span><ShieldCheck size={13}/>{backend.remote?"Originals and searchable text are stored on your connected backend.":"Stored in this browser · No documents sent to an AI service"}</span><button type="button" onClick={()=>setGuide(true)}>How Storage works<ArrowRight size={12}/></button></footer>
    {!!selected.length&&<div className="stg-selection"><span>{selected.length} selected</span><StorageFloatingButtonGroup label="Selected document actions" actions={[{id:"download",label:"Download ZIP",icon:<ArrowDownToLine size={16}/>,onClick:()=>void downloadSelected().catch(e=>setError(errorText(e)))},{id:"delete",label:"Delete",icon:<Trash2 size={16}/>,danger:true,onClick:()=>setDeleteIds(selected)},{id:"clear",label:"Clear",icon:<X size={16}/>,onClick:()=>setSelected([])}]}/></div>}
    <StorageOnboarding open={guide||!library.onboarded} onClose={dismissGuide} onStart={()=>{dismissGuide();uploadPanel.current?.scrollIntoView({behavior:reduce?"instant":"smooth",block:"center"});}}/>
    <WorkspaceDialog open={!!detail} title={detail?.name||"Document"} onClose={()=>setDetailId(null)} wide>{detail&&<div className="stg-detail"><div className="stg-detail-meta"><span>{detail.category}</span><span>{formatStorageBytes(detail.bytes)}</span><span>{detail.words.toLocaleString()} words</span><span>{detail.chunks} passages</span></div><label className="stg-category-field">Knowledge area<select value={detail.category} onChange={e=>{const category=e.target.value as StorageCategory;setLibrary(current=>({...current,documents:current.documents.map(d=>d.id===detail.id?{...d,category}:d)}));}}>{storageCategories.map(c=><option key={c}>{c}</option>)}</select></label>{detail.warning&&<p className="stg-warning">{detail.warning}</p>}{previewError&&<div className="stg-warning" role="alert">{previewError}<StorageButton size="sm" variant="secondary" onClick={()=>setDetailEpoch(current=>current+1)}>Retry text load</StorageButton></div>}<div className="stg-detail-section"><h3>Source text <StorageCopyButton value={preview??detail.excerpt} label="Copy text" iconOnly/></h3><pre>{preview??(detail.excerpt?`${detail.excerpt}\n\nFull text is unavailable. Showing the saved excerpt.`:"No text index is available. Download the original to review this document.")}</pre></div><div className="stg-keywords">{detail.keywords.map(k=><button type="button" key={k} onClick={()=>{setSearch(k);setContentMatches(null);setFilter("All");setDetailId(null);}}>{k}</button>)}</div><div className="stg-fingerprint"><span>SHA-256</span><code>{detail.sha256}</code><StorageCopyButton value={detail.sha256} label="Copy fingerprint" iconOnly/></div><div className="stg-detail-actions"><StorageConfirmMorph label="Delete document" title="Remove this document?" icon={<Trash2 size={14}/>} onConfirm={async()=>{try{await removeDocuments([detail.id]);}catch(e){setDeleteIds([detail.id]);setError(errorText(e));throw e;}}}/><StorageActionButton action={()=>downloadDocument(detail)} onError={e=>setError(errorText(e))} pendingLabel="Preparing" successLabel="Download ready"><ArrowDownToLine size={15}/>Download original</StorageActionButton></div></div>}</WorkspaceDialog>
    <WorkspaceDialog open={noteOpen} title="Write a knowledge note" onClose={()=>setNoteOpen(false)}><form className="stg-note" onSubmit={e=>{e.preventDefault();const name=noteTitle.trim().replace(/[\\/]/g,"-");addFiles([new File([noteText],`${name}.md`,{type:"text/markdown"})]);setNoteOpen(false);setNoteTitle("");setNoteText("");}}><label>Title<input required maxLength={180} value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="What is this note about?"/></label><label>Content<textarea required value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Write or paste the knowledge you want to keep…" rows={9} maxLength={1000000}/></label><p>Added to your queue as a Markdown document in {category}. Review before storage.</p><StorageButton type="submit" disabled={!noteTitle.trim()||!noteText.trim()}>Add to review queue<ArrowRight size={14}/></StorageButton></form></WorkspaceDialog>
    <WorkspaceDialog open={!!deleteIds.length} title="Remove documents" onClose={()=>setDeleteIds([])}><div className="stg-delete"><p>Remove {deleteIds.length} document{deleteIds.length===1?"":"s"} and {deleteIds.length===1?"its":"their"} searchable index from this workspace?</p><p>Downloaded copies remain available separately. Workspace originals and indexes will be removed.</p><StorageConfirmMorph label={`Remove ${deleteIds.length} document${deleteIds.length===1?"":"s"}`} title="Confirm removal?" confirmLabel="Remove" icon={<Trash2 size={14}/>} onConfirm={deleteDocuments}/></div></WorkspaceDialog>
  </div></div>;
}
