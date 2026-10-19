"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, FolderPlus, Plus, Trash2, Upload } from "lucide-react";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { downloadFile, useStoredState } from "./workspace-state";
import { numberFormat, type CrmEngine } from "./crm-engine";

interface SalesDocument { id:string; title:string; type:string; color:string; meta:string; content:string; folder:string; upload?:string; mime?:string; fileName?:string }
const documents: SalesDocument[]=[
  {id:"playbook",title:"Sales-Playbook",type:"DOC",color:"blue",meta:"Document · Mara Klein · Today",folder:"",content:"# Sales playbook\n\nWorkspace draft\n\n1. Understand the company and its current workflow.\n2. Identify a clear business need and decision maker.\n3. Agree on a measurable success criterion.\n4. Prepare a proposal and schedule the next conversation.\n\nKeep the company record and last contact up to date."},
  {id:"pricing",title:"Pricing-2025",type:"PDF",color:"rose",meta:"PDF · Lea Braun · Yesterday",folder:"",content:"# Pricing 2025\n\nWorkspace draft\n\nAnnual plan — $1,200 per year\nMonthly plan — $120 per month\nTeam seats — $25 per seat per month\nAdd-ons — available with your proposal\n\nUse this editable draft to prepare company-specific pricing."},
  {id:"forecast",title:"Pipeline-Forecast",type:"XLS",color:"emerald",meta:"Spreadsheet · Jonas Weber · 3 days ago",folder:"",content:""},
  {id:"objections",title:"Objection-Handling",type:"DOC",color:"blue",meta:"Document · Tom Fischer · Last week",folder:"",content:"# Objection handling\n\nWorkspace draft\n\nBudget: connect the proposal to a measurable return.\nTiming: agree on the smallest useful next step.\nFit: clarify the workflow and demonstrate the relevant capability.\n\nDocument what the customer needs before following up."},
];

export function SalesDocuments({ engine, workspaceId="acme" }: { engine:CrmEngine; workspaceId?:string }) {
  const [items,setItems]=useStoredState<SalesDocument[]>(`affectui:${workspaceId}:documents`,workspaceId === "acme" ? documents : []);
  const [folders,setFolders]=useStoredState<string[]>(`affectui:${workspaceId}:folders`,[]);
  const [folder,setFolder]=useState("");
  const [selected,setSelected]=useState<SalesDocument|null>(null);
  const [draft,setDraft]=useState("");
  const [create,setCreate]=useState<"document"|"folder"|null>(null);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const upload=useRef<HTMLInputElement>(null);
  const forecast=["# Pipeline forecast","","Workspace data","",...engine.rows.map(row=>`${row.company || "Untitled"} | ${row.owner || "Unassigned"} | $${numberFormat.format(row.value)} | ${row.stage}`)].join("\n");
  const open=(doc:SalesDocument)=>{setSelected(doc);setDraft(doc.id==="forecast" && !doc.content ? forecast : doc.content);setMessage("");};
  const visible=items.filter(doc=>doc.folder===folder);

  return <>
    <div className="workspace-doc-toolbar"><div className="workspace-doc-folders"><button type="button" aria-pressed={folder===""} onClick={()=>setFolder("")}>All documents</button>{folders.map(name=><button type="button" aria-pressed={folder===name} key={name} onClick={()=>setFolder(name)}>{name}</button>)}</div><button type="button" className="ui-as-icon-btn" aria-label="Create folder" onClick={()=>setCreate("folder")}><FolderPlus size={15} /></button><button type="button" className="ui-as-icon-btn" aria-label="Upload document" onClick={()=>upload.current?.click()}><Upload size={15} /></button><button type="button" className="ui-as-icon-btn" aria-label="New document" onClick={()=>setCreate("document")}><Plus size={15} /></button><input ref={upload} type="file" accept=".txt,.md,.csv,.json,.pdf,.png,.jpg,.jpeg,.webp" hidden onChange={event=>{
      const file=event.target.files?.[0];if(!file)return;
      if(file.size>2*1024*1024){setError("Choose a file smaller than 2 MB.");return;}
      const reader=new FileReader();const isText=/\.(txt|md|csv|json)$/i.test(file.name);
      reader.onload=()=>{const doc:SalesDocument={id:crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,""),type:isText ? "DOC" : file.type==="application/pdf" ? "PDF" : "IMG",color:file.type==="application/pdf" ? "rose" : "blue",meta:"Uploaded · Just now",folder,content:isText ? String(reader.result) : "",...(isText ? {} : {upload:String(reader.result)}),mime:file.type,fileName:file.name};setItems(current=>[...current,doc]);setError("");open(doc);};
      if(isText)reader.readAsText(file);else reader.readAsDataURL(file);
      event.target.value="";
    }} /></div>{error && <p className="workspace-form-error" role="alert">{error}</p>}
    <div className="ui-as-crm-docs"><AnimatePresence initial={false}>{visible.map(doc=><motion.button type="button" layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}} className="ui-as-template" key={doc.id} onClick={()=>open(doc)}><span className="ui-as-template__preview"><span className="ui-as-doc" data-color={doc.color} aria-hidden="true"><span className="ui-as-doc__art"><span className="ui-as-doc__back" /><span className="ui-as-doc__page" data-type={doc.type}>{doc.type==="XLS" ? <span className="ui-as-sheet">{Array.from({length:18},(_,index)=><i key={index} />)}</span> : <>{doc.type==="PDF" ? <i className="ui-as-doc__image" /> : <i className="ui-as-doc__title" />}{Array.from({length:doc.type==="PDF" ? 3 : 5},(_,index)=><i className="ui-as-doc__line" key={index} />)}</>}</span><span className="ui-as-doc__type">{doc.type}</span></span></span></span><b className="ui-as-template__name">{doc.title}</b><span className="ui-as-meta">{doc.meta}</span></motion.button>)}</AnimatePresence></div>
    {!visible.length && <div className="workspace-empty"><h2>No documents here yet</h2><p>Create a document or upload a file.</p></div>}
    <WorkspaceDialog open={selected!==null} title={selected?.title || "Document"} onClose={()=>setSelected(null)} wide>
      <p className="workspace-muted">{selected?.meta}{selected?.upload ? "" : " · Workspace draft"}</p>
      {selected?.upload ? selected.mime?.startsWith("image/") ? <img className="workspace-document-image" src={selected.upload} alt={selected.title} /> : <object className="workspace-document-pdf" data={selected.upload} type="application/pdf"><p>Use Download to open this PDF.</p></object> : <label className="crm-field">Document content<textarea aria-label="Document content" className="workspace-document-editor" value={draft} onChange={event=>{setDraft(event.target.value);setMessage("");}} rows={14} /></label>}
      <label className="crm-field">Folder<select aria-label="Document folder" value={selected?.folder || ""} onChange={event=>{if(!selected)return;const updated={...selected,folder:event.target.value};setSelected(updated);setItems(items.map(item=>item.id===updated.id ? updated : item));}}><option value="">All documents</option>{folders.map(name=><option key={name}>{name}</option>)}</select></label>
      <div className="workspace-form-actions"><button type="button" className="workspace-danger" onClick={()=>{setItems(items.filter(item=>item.id!==selected?.id));setSelected(null);}}><Trash2 size={14} />Delete</button><button type="button" className="ui-as-tool ui-as-tool--label" onClick={()=>{if(!selected)return;if(selected.upload){const a=document.createElement("a");a.href=selected.upload;a.download=selected.fileName || selected.title;a.click();}else downloadFile(`${selected.title}.md`,draft,"text/markdown;charset=utf-8");}}><Download size={14} />Download</button>{!selected?.upload && <button type="button" className="ui-button" data-variant="primary" data-size="sm" onClick={()=>{if(!selected)return;setItems(items.map(item=>item.id===selected.id ? {...item,content:draft} : item));setMessage("Draft saved");}}>Save draft</button>}</div>{message && <p className="workspace-success" role="status">{message}</p>}
    </WorkspaceDialog>
    <WorkspaceDialog open={create!==null} title={create==="folder" ? "Create folder" : "New document"} onClose={()=>setCreate(null)}><form key={create} onSubmit={event=>{event.preventDefault();const title=String(new FormData(event.currentTarget).get("name")).trim();if(!title)return;if(create==="folder"){if(!folders.includes(title))setFolders([...folders,title]);setFolder(title);}else{const doc:SalesDocument={id:crypto.randomUUID(),title,type:"DOC",color:"blue",meta:"Document · Just now",content:`# ${title}\n\n`,folder};setItems([...items,doc]);open(doc);}setCreate(null);}}><label className="crm-field">Name<input name="name" required maxLength={80} autoFocus /></label><div className="workspace-form-actions"><button type="submit" className="ui-button" data-variant="primary" data-size="sm">Create {create==="folder" ? "folder" : "document"}</button></div></form></WorkspaceDialog>
  </>;
}
