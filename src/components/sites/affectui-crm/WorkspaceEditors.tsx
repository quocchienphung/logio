"use client";

import { useState } from "react";
import { Check, ChevronDown, ImagePlus, Plus } from "lucide-react";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { Combobox } from "../affectui-combobox/Combobox";
import { QuickSettings } from "../settings-command/QuickSettings";
import type { SettingsValues } from "../settings-command/settings-model";
import { BackendError, storeFile } from "@/lib/workspace-backend";
import { useResource, useWorkspaceBackend } from "@/lib/workspace-backend/react";
import { resources } from "../workspace-resources";


export interface WorkspaceProfile { name: string; email: string; role: string; avatar?: string }
export interface WorkspacePreferences { dark: boolean; emailNotifications: boolean; desktopNotifications: boolean; theme?: "light" | "dark" | "system" }
export interface CustomView { id: string; name: string; layout: "table" | "board"; owner: string }
export type EditorKind = "Profile" | "Appearance & notifications" | "Help & feedback" | "Full changelog" | "Create workspace" | "New view";

export function WorkspaceEditors({ kind, open, onClose, profile, setProfile, settings, onSaveSettings, onOpenSettings, createWorkspace, createView, owners, notify }: {
  kind: EditorKind; open: boolean; onClose: () => void;
  profile: WorkspaceProfile; setProfile: (profile: WorkspaceProfile) => void;
  settings: SettingsValues; onSaveSettings: (values: SettingsValues) => void; onOpenSettings: (from: { x: number; y: number; width: number; height: number } | null) => void;
  createWorkspace: (name: string) => void; createView: (view: CustomView) => void;
  owners: string[]; notify: (message: string) => void;
}) {
  return <WorkspaceDialog open={open} title={kind} onClose={onClose} wide={kind === "Help & feedback"}>
    {kind === "Profile" && <ProfileForm key={profile.name + (open ? "open" : "closed")} profile={profile} onSave={value => { setProfile(value); onClose(); notify("Profile updated"); }} />}
    {kind === "Appearance & notifications" && <QuickSettings key={open ? "quick-open" : "quick-closed"} values={settings} onSave={value => { onSaveSettings(value); onClose(); notify("Preferences saved"); }} onOpenAll={() => { const box = document.querySelector("dialog[open]")?.getBoundingClientRect(); onClose(); onOpenSettings(box ? { x: box.left, y: box.top, width: box.width, height: box.height } : null); }} />}
    {kind === "Create workspace" && <form onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const name=String(new FormData(form).get("name")).trim();if(!name)return;createWorkspace(name);form.reset();onClose();}}><label className="crm-field">Workspace name<input name="name" placeholder="Workspace name" required maxLength={40} autoFocus /></label><p>Start with an empty company list, contacts and reports.</p><div className="workspace-form-actions"><button type="submit" className="ui-button" data-variant="primary" data-size="sm"><Plus size={14} />Create workspace</button></div></form>}
    {kind === "New view" && <form onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const name=String(data.get("name")).trim();if(!name)return;createView({id:crypto.randomUUID(),name,layout:data.get("layout")==="board" ? "board" : "table",owner:String(data.get("owner") || "")});form.reset();onClose();}}><label className="crm-field">View name<input name="name" placeholder="My sales view" required maxLength={50} autoFocus /></label><div className="crm-field"><Combobox label="Layout" name="layout" defaultValue="table" options={[{value:"table",label:"Table"},{value:"board",label:"Board"}]} /></div><div className="crm-field"><Combobox label="Owner" name="owner" defaultValue="" options={[{value:"",label:"All owners"},...owners.map(owner=>({value:owner,label:owner}))]} /></div><div className="workspace-form-actions"><button type="submit" className="ui-button" data-variant="primary" data-size="sm">Create view</button></div></form>}
    {kind === "Help & feedback" && <HelpPanel notify={notify} />}
    {kind === "Full changelog" && <div className="workspace-changelog">{[
      {title:"Reports, with a clearer picture",text:"Explore revenue by channel, compare periods, export CSV files and save named reports."},
      {title:"Shared folders",text:"Keep your sales documents together. Open Sales docs to upload files, edit drafts and download copies."},
      {title:"A better way to work",text:"Edit cells, paste ranges and move companies through your pipeline. Your workspace changes are saved in this browser."},
    ].map((entry,index)=><article key={entry.title}><span className="workspace-change-dot"><Check size={12} /></span><div><small>Update {3-index}</small><h3>{entry.title}</h3><p>{entry.text}</p></div></article>)}</div>}
  </WorkspaceDialog>;
}

function ProfileForm({ profile, onSave }: { profile: WorkspaceProfile; onSave: (profile: WorkspaceProfile) => void }) {
  const [avatar,setAvatar]=useState(profile.avatar || "");
  const [error,setError]=useState("");
  const backend=useWorkspaceBackend();
  return <form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);const name=String(data.get("name")).trim();if(!name)return;onSave({name,email:String(data.get("email")),role:String(data.get("role")),avatar});}}>
    <label className="workspace-avatar-upload">{avatar ? <img src={avatar} alt="Profile picture preview" /> : <span>{profile.name.split(" ").map(word=>word[0]).slice(0,2).join("")}</span>}<span><ImagePlus size={15} />Choose profile picture</span><input aria-label="Choose profile picture" type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{
      const file=event.target.files?.[0];if(!file)return;
      if(file.size>2*1024*1024){setError("Choose an image smaller than 2 MB.");return;}
      storeFile(backend,undefined,"avatar",file).then(url=>{setAvatar(url);setError("");}).catch(failure=>setError(failure instanceof BackendError ? failure.message : "This image could not be opened."));
    }} /></label>{error && <p className="workspace-form-error" role="alert">{error}</p>}
    <label className="crm-field">Name<input name="name" defaultValue={profile.name} required maxLength={60} /></label><label className="crm-field">Email<input name="email" type="email" defaultValue={profile.email} required /></label><label className="crm-field">Role<input name="role" defaultValue={profile.role} /></label><div className="workspace-form-actions"><button type="submit" className="ui-button" data-variant="primary" data-size="sm">Save profile</button></div>
  </form>;
}

function HelpPanel({ notify }: { notify: (message: string) => void }) {
  const [expanded,setExpanded]=useState<string|null>("How do I edit company data?");
  const [feedback,setFeedback]=useResource(resources.feedback, undefined, []);
  const [saved,setSaved]=useState(false);
  const faqs=[
    {question:"How do I edit company data?",answer:"Double-click a cell or press Enter. Use Tab to move, Shift + arrow keys to select a range, and Ctrl/Cmd + C or V to copy and paste. Ctrl/Cmd + Z undoes a change."},
    {question:"How do reports work?",answer:"Open Reports in the sidebar. Choose 7, 30 or 90 days, inspect the charts, export the data as CSV, or save a named report to reopen later."},
    {question:"Where is my data saved?",answer:"Companies, contacts, views, documents and saved reports are stored in this browser, separately for each workspace. They are available after a refresh on the same device."},
  ];
  return <div className="workspace-help"><div>{faqs.map(faq=><section key={faq.question}><button type="button" aria-expanded={expanded===faq.question} onClick={()=>setExpanded(expanded===faq.question ? null : faq.question)}>{faq.question}<ChevronDown size={14} /></button><div className="workspace-help-answer" data-open={expanded===faq.question ? "" : undefined}><div><p>{faq.answer}</p></div></div></section>)}</div><form onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const text=String(new FormData(form).get("feedback")).trim();if(!text)return;setFeedback([...feedback,{id:crypto.randomUUID(),text}]);setSaved(true);form.reset();notify("Feedback saved on this device");}}><label className="crm-field">Feedback<textarea name="feedback" placeholder="What could work better?" required rows={4} maxLength={2000} onChange={()=>setSaved(false)} /></label><button type="submit" className="ui-button" data-variant="primary" data-size="sm">Save feedback</button>{saved && <p className="workspace-success" role="status"><Check size={14} />Saved on this device.</p>}</form></div>;
}
