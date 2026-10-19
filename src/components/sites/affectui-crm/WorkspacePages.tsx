"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Download, Mail, Plus, Search, Trash2 } from "lucide-react";
import { CrmIcon } from "./CrmIcon";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { downloadFile, toCsv, useStoredState, type WorkspaceSection } from "./workspace-state";
import { numberFormat, type CrmEngine } from "./crm-engine";
import { AnimatedNumber } from "../affectui-analytics/AnimatedNumber";
import { PipelineBoard } from "./CrmViews";

export interface Contact { id: string; name: string; email: string; role: string }
const initialContacts: Contact[] = [
  { id: "mara", name: "Mara Klein", email: "mara@acme.com", role: "Account manager" },
  { id: "jonas", name: "Jonas Weber", email: "jonas@acme.com", role: "Account executive" },
  { id: "lea", name: "Lea Braun", email: "lea@acme.com", role: "Partner manager" },
  { id: "tom", name: "Tom Fischer", email: "tom@acme.com", role: "Sales representative" },
];

export function WorkspaceHome({ engine, name, navigate, openCompany }: { engine: CrmEngine; name: string; navigate: (section: WorkspaceSection) => void; openCompany: (name: string) => void }) {
  const won = engine.rows.filter(row => row.stage === "Won");
  const pipeline = engine.rows.filter(row => !["Won", "Lost"].includes(row.stage));
  return <div className="workspace-page"><header className="workspace-page-head"><div><h1>Welcome back, {name.split(" ")[0]}</h1><p>Your sales workspace at a glance.</p></div><button type="button" className="ui-as-tool ui-as-tool--label" onClick={() => navigate("Reports")}>View reports<ArrowUpRight size={14} /></button></header>
    <div className="workspace-home-stats">{[{label:"Companies",value:engine.rows.length,target:"Companies"},{label:"Open pipeline",value:pipeline.reduce((sum,row)=>sum+row.value,0),target:"Deals"},{label:"Won revenue",value:won.reduce((sum,row)=>sum+row.value,0),target:"Reports"}].map(stat=><motion.button type="button" whileHover={{y:-3}} whileTap={{scale:0.98}} className="workspace-card" key={stat.label} onClick={()=>navigate(stat.target as WorkspaceSection)}><span>{stat.label}</span><strong><AnimatedNumber value={stat.value} format={value=>`${stat.label === "Companies" ? "" : "$"}${Math.round(value).toLocaleString("en-US")}`} /></strong><small>Open {stat.target.toLowerCase()}<ArrowUpRight size={12} /></small></motion.button>)}</div>
    <section className="workspace-card"><header className="workspace-section-head"><h2>Companies in your pipeline</h2><button type="button" className="ui-as-tool ui-as-tool--label" onClick={()=>navigate("Companies")}>View all</button></header><div className="workspace-recent-list">{engine.rows.slice(0,6).map(row=><button type="button" key={row.id} onClick={()=>openCompany(row.company)}><CrmIcon name={row.company} size={22} /><span>{row.company || "Untitled"}<small>{row.owner || "Unassigned"}</small></span><span>{row.stage}</span><b>${numberFormat.format(row.value)}</b><ArrowUpRight size={14} /></button>)}{!engine.rows.length && <p>No companies yet. Open Companies to add your first record.</p>}</div></section>
  </div>;
}

export function ContactsPage({ engine, workspaceId, notify }: { engine: CrmEngine; workspaceId: string; notify: (text: string) => void }) {
  const [contacts,setContacts]=useStoredState<Contact[]>(`affectui:${workspaceId}:contacts`,workspaceId === "acme" ? initialContacts : []);
  const [query,setQuery]=useState("");
  const [sort,setSort]=useState<"name"|"companies">("name");
  const [editing,setEditing]=useState<Contact|null>(null);
  const [open,setOpen]=useState(false);
  const associated=(contact:Contact)=>engine.rows.filter(row=>row.owner===contact.name);
  const visible=contacts.filter(contact=>`${contact.name} ${contact.email} ${contact.role}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort === "name" ? a.name.localeCompare(b.name) : associated(b).length-associated(a).length);
  return <div className="workspace-page"><header className="workspace-page-head"><div><h1>Contacts</h1><p>{contacts.length} people in your workspace</p></div><button type="button" className="ui-button" data-variant="primary" data-size="sm" onClick={()=>{setEditing(null);setOpen(true);}}><Plus size={14} />New contact</button></header>
    <div className="workspace-toolbar"><label className="workspace-search"><Search size={15} /><input aria-label="Search contacts" placeholder="Search contacts…" value={query} onChange={event=>setQuery(event.target.value)} /></label><select aria-label="Sort contacts" value={sort} onChange={event=>setSort(event.target.value as "name"|"companies")}><option value="name">Name A–Z</option><option value="companies">Most companies</option></select><button type="button" className="ui-as-tool ui-as-tool--label" onClick={()=>downloadFile("contacts.csv",toCsv([["Name","Email","Role","Companies"],...visible.map(contact=>[contact.name,contact.email,contact.role,associated(contact).map(row=>row.company).join("; ")])]),"text/csv;charset=utf-8")}><Download size={14} />Export</button></div>
    <div className="workspace-contact-grid"><AnimatePresence initial={false}>{visible.map(contact=><motion.button type="button" layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}} className="workspace-card workspace-contact" key={contact.id} onClick={()=>{setEditing(contact);setOpen(true);}}><span className="workspace-avatar">{contact.name.split(" ").map(word=>word[0]).join("")}</span><h2>{contact.name}</h2><p>{contact.role}</p><span className="workspace-contact-email"><Mail size={13} />{contact.email}</span><div>{associated(contact).length} companies · ${numberFormat.format(associated(contact).reduce((sum,row)=>sum+row.value,0))}</div></motion.button>)}</AnimatePresence></div>{!visible.length && <div className="workspace-empty"><h2>No contacts found</h2><p>Try a different search or create a contact.</p></div>}
    <WorkspaceDialog open={open} title={editing ? "Edit contact" : "New contact"} onClose={()=>setOpen(false)}><form key={editing?.id || "new"} onSubmit={event=>{
      event.preventDefault();const data=new FormData(event.currentTarget);const name=String(data.get("name")).trim();if(!name)return;
      const contact={id:editing?.id || crypto.randomUUID(),name,email:String(data.get("email")).trim(),role:String(data.get("role")).trim()};
      setContacts(current=>editing ? current.map(item=>item.id===editing.id ? contact : item) : [...current,contact]);
      if(editing && editing.name!==name) engine.change(engine.rows.map(row=>row.owner===editing.name ? {...row,owner:name} : row));
      setOpen(false);notify(editing ? "Contact updated" : "Contact created");
    }}><label className="crm-field">Name<input name="name" defaultValue={editing?.name} required autoFocus /></label><label className="crm-field">Email<input name="email" type="email" defaultValue={editing?.email} required /></label><label className="crm-field">Role<input name="role" defaultValue={editing?.role} /></label><div className="workspace-form-actions">{editing && <button type="button" className="workspace-danger" onClick={()=>{setContacts(contacts.filter(contact=>contact.id!==editing.id));setOpen(false);notify("Contact deleted");}}><Trash2 size={14} />Delete contact</button>}<button type="button" className="ui-as-tool ui-as-tool--label" onClick={()=>setOpen(false)}>Cancel</button><button type="submit" className="ui-button" data-variant="primary" data-size="sm">Save contact</button></div></form></WorkspaceDialog>
  </div>;
}

export function DealsPage({ engine, section, openCompany }: { engine: CrmEngine; section: WorkspaceSection; openCompany: (name: string) => void }) {
  const [query,setQuery]=useState("");
  const [owner,setOwner]=useState("");
  const filter=(row:(typeof engine.rows)[number])=>{
    const matchesSection=section === "New business" ? !["Won","Lost"].includes(row.stage) : section === "Renewals" ? ["Productivity","Planning"].includes(row.category) : section === "Partnerships" ? ["Payments","Developer Tools","E-commerce"].includes(row.category) : true;
    return matchesSection && (!owner || row.owner===owner) && `${row.company} ${row.domain}`.toLowerCase().includes(query.toLowerCase());
  };
  const visible=engine.rows.filter(filter);
  return <div className="workspace-page workspace-deals"><header className="workspace-page-head"><div><h1>{section === "Deals" ? "Deals" : section}</h1><p>{visible.length} companies · ${numberFormat.format(visible.reduce((sum,row)=>sum+row.value,0))} total value</p></div><button type="button" className="ui-as-tool ui-as-tool--label" onClick={()=>downloadFile("pipeline.csv",toCsv([["Company","Owner","Value","Stage"],...visible.map(row=>[row.company,row.owner,row.value,row.stage])]),"text/csv;charset=utf-8")}><Download size={14} />Export pipeline</button></header><div className="workspace-toolbar"><label className="workspace-search"><Search size={15} /><input aria-label="Search deals" placeholder="Search companies…" value={query} onChange={event=>setQuery(event.target.value)} /></label><select aria-label="Filter deals by owner" value={owner} onChange={event=>setOwner(event.target.value)}><option value="">All owners</option>{[...new Set(engine.rows.map(row=>row.owner))].filter(Boolean).map(name=><option key={name}>{name}</option>)}</select><span>6 stages</span></div><div className="workspace-board-panel"><PipelineBoard engine={engine} filter={filter} onOpenCompany={openCompany} includeLost /></div></div>;
}
