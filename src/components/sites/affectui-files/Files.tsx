"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDownUp, ArrowLeft, Check, ChevronDown, ChevronRight, FileUp, Filter, Grid2X2, List, LoaderCircle, LockKeyhole, MoreHorizontal, Plus, Search, Share2, Upload, Users, X } from "lucide-react";
import { useResource, useWorkspaceBackend } from "@/lib/workspace-backend/react";
import { resources } from "../workspace-resources";
import { WorkspaceDialog } from "../affectui-crm/WorkspaceDialog";
import { AssistantMenu } from "../affectui-assistant/AssistantMenu";
import { subscribeLocation } from "../guide-navigation/navigation-model";
import { FileArtwork, FolderArtwork } from "./FileArtwork";
import { FileEditor, FolderForm, TemplateForm } from "./FilesDialogs";
import { defaultFolders, emptyLibrary, fileKind, kindLabels, seedFileLibrary } from "./files-model";
import type { FileAccess, FileKind, LibraryFile } from "./files-model";
import { downloadLibraryFile, uploadLibraryFile } from "./file-transfer";
import "./files.css";

type FolderDialog = { kind: "create" } | { kind: "edit" | "share"; name: string };
interface PendingUpload { id: string; file: File; folder: string | null; template: boolean; error?: string }
function AccessIcon({ access }: { access: FileAccess }) { return access === "shared" ? <Users size={12} /> : <LockKeyhole size={12} />; }
function Tabs({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="files-tabs" role="tablist" aria-label={label}>{values.map((item, i) => <button type="button" role="tab" aria-selected={value === item} tabIndex={value === item ? 0 : -1} key={item} onClick={() => onChange(item)} onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? values.length - 1 : (i + (event.key === "ArrowRight" ? 1 : -1) + values.length) % values.length;
    onChange(values[next]); event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
  }}>{item}</button>)}</div>;
}
function SearchField({ target, value, onChange }: { target: string; value: string; onChange: (value: string) => void }) {
  return <label className="files-search"><Search size={15} /><input type="search" aria-label={`Search ${target}`} placeholder={`Search ${target}...`} value={value} onChange={event => onChange(event.target.value)} /></label>;
}

export function Files({ workspaceId, userName, notify }: { workspaceId: string; userName: string; notify: (text: string) => void }) {
  const backend = useWorkspaceBackend();
  const [folders, setFolders, folderSync] = useResource(resources.folders, workspaceId, backend.remote ? [] : workspaceId === "acme" ? defaultFolders : []);
  const [library, setLibrary, sync] = useResource(resources.fileLibrary, workspaceId, backend.remote ? emptyLibrary : seedFileLibrary(workspaceId));
  const folder = useSyncExternalStore(subscribeLocation, () => new URLSearchParams(window.location.search).get("folder"), () => null);
  const [folderTab, setFolderTab] = useState("All"), [fileTab, setFileTab] = useState("All");
  const [folderSearch, setFolderSearch] = useState(""), [fileSearch, setFileSearch] = useState("");
  const [folderDesc, setFolderDesc] = useState(false), [fileDesc, setFileDesc] = useState(false), [list, setList] = useState(false);
  const [types, setTypes] = useState<FileKind[]>([]);
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null), [newTemplate, setNewTemplate] = useState(false), [fileId, setFileId] = useState<string | null>(null);
  const [remove, setRemove] = useState<{ kind: "folder" | "file"; id: string } | null>(null), [help, setHelp] = useState(false), [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const fileInput = useRef<HTMLInputElement>(null), controllers = useRef(new Map<string, AbortController>()), alive = useRef(true), dragDepth = useRef(0);

  useEffect(() => { alive.current = true; const active = controllers.current; return () => { alive.current = false; active.forEach(controller => controller.abort()); }; }, []);
  const loading = sync.phase === "loading" || folderSync.phase === "loading";
  const unavailable = loading || !!sync.error || !!folderSync.error;
  const editing = library.items.find(item => item.id === fileId);
  const selectedFolderExists = !folder || folders.includes(folder);
  const accessOf = (name: string): FileAccess => Object.hasOwn(library.folderAccess, name) ? library.folderAccess[name] : "private";
  const sortedFolders = folders.filter(name => name.toLowerCase().includes(folderSearch.toLowerCase()) && (folderTab === "All" || accessOf(name) === folderTab.toLowerCase())).slice().sort((a, b) => (folderDesc ? -1 : 1) * a.localeCompare(b));
  const visibleFiles = library.items.filter(item => (folder ? item.folder === folder : item.template) && item.name.toLowerCase().includes(fileSearch.toLowerCase()) && (fileTab === "All" || (fileTab === "Mine" ? item.mine : !item.mine && item.access === "shared")) && (!types.length || types.includes(item.kind))).slice().sort((a, b) => (fileDesc ? -1 : 1) * a.name.localeCompare(b.name));

  function openFolder(name: string | null) {
    const url = new URL(window.location.href); if (name) url.searchParams.set("folder", name); else url.searchParams.delete("folder");
    window.history.pushState({}, "", url); window.dispatchEvent(new PopStateEvent("popstate")); setFileSearch(""); setFileTab("All"); setTypes([]);
  }
  function saveFolder(name: string, access: FileAccess) {
    const previous = folderDialog && "name" in folderDialog ? folderDialog.name : null;
    setFolders(current => previous ? current.map(value => value === previous ? name : value) : [...current, name]);
    setLibrary(current => {
      const folderAccess = { ...current.folderAccess, [name]: access }; if (previous && previous !== name) delete folderAccess[previous];
      return { folderAccess, items: current.items.map(item => item.folder === (previous || name) ? { ...item, folder: name, access } : item) };
    });
    if (previous && folder === previous && name !== previous) openFolder(name);
    setFolderDialog(null); notify(previous ? "Folder updated" : "Folder created");
  }
  function saveFile(file: LibraryFile) {
    setLibrary(current => ({ ...current, items: current.items.map(item => item.id === file.id ? { ...file, access: file.folder ? accessOf(file.folder) : file.access } : item) }));
    setFileId(null); notify("File updated");
  }
  function confirmDelete() {
    if (!remove) return;
    if (remove.kind === "folder") {
      setFolders(current => current.filter(name => name !== remove.id));
      // Keep files as unfiled items instead of losing uploaded binaries when a folder is removed.
      setLibrary(current => { const folderAccess = { ...current.folderAccess }; delete folderAccess[remove.id]; return { folderAccess, items: current.items.map(item => item.folder === remove.id ? { ...item, folder: null, template: true, access: "private" } : item) }; });
      if (folder === remove.id) openFolder(null);
    } else { setLibrary(current => ({ ...current, items: current.items.filter(item => item.id !== remove.id) })); setFileId(null); }
    notify(remove.kind === "folder" ? "Folder removed. Its files are now private templates." : "File deleted"); setRemove(null);
  }
  async function download(file: LibraryFile) { try { await downloadLibraryFile(file); } catch (error) { notify(error instanceof Error ? error.message : "Could not download this file."); } }
  async function copyFolderLink(name: string) {
    try { const url = new URL(window.location.href); url.searchParams.set("section", "files"); url.searchParams.set("folder", name); await navigator.clipboard.writeText(url.href); notify("Folder link copied. Access follows your saved sharing setting."); }
    catch { notify("Could not copy the link. You can copy this page’s URL from your browser."); }
  }
  async function performUpload(entry: PendingUpload) {
    const controller = new AbortController(); controllers.current.set(entry.id, controller);
    setUploads(current => current.map(item => item.id === entry.id ? { ...item, error: undefined } : item));
    try {
      const stored = await uploadLibraryFile(backend, workspaceId, entry.file, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      const file: LibraryFile = { id: entry.id, name: entry.file.name, kind: fileKind(entry.file.name, entry.file.type), owner: userName, mine: true, access: entry.folder ? accessOf(entry.folder) : "private", folder: entry.folder, template: entry.template, size: entry.file.size, mime: entry.file.type || "application/octet-stream", createdAt: new Date().toISOString(), ...stored };
      setLibrary(current => ({ ...current, items: [...current.items.filter(item => item.id !== file.id), file] }));
      setUploads(current => current.filter(item => item.id !== entry.id)); notify(`${entry.file.name} uploaded`);
    } catch (error) {
      if (!alive.current || controller.signal.aborted) return;
      setUploads(current => current.map(item => item.id === entry.id ? { ...item, error: error instanceof Error ? error.message : "Upload failed. Try again." } : item));
    } finally { controllers.current.delete(entry.id); }
  }
  function queueFiles(files: File[], target = { folder, template: !folder }) {
    if (unavailable) { notify("Wait for the file library to load, or retry the connection."); return; }
    if (files.length > 10) { notify("Upload up to 10 files at a time."); return; }
    const entries = files.map(file => ({ id: crypto.randomUUID(), file, ...target }));
    setUploads(current => [...current, ...entries]); for (const entry of entries) void performUpload(entry);
  }
  function chooseFiles() { fileInput.current?.click(); }
  const typeMenu = <AssistantMenu title="File type" className="files-tool files-tool--label" active={!!types.length} label={<><Filter size={15} />{types.length ? `Type · ${types.length}` : "Type"}<ChevronDown size={12} /></>}>{close => <>
    <button type="button" role="menuitem" className="ui-as-menu__item" onClick={() => { setTypes([]); close(); }}>Clear all</button>
    {(["document", "pdf", "spreadsheet", "image", "other"] as FileKind[]).map(type => <button type="button" role="menuitemcheckbox" aria-checked={types.includes(type)} className="ui-as-menu__item" key={type} onClick={() => setTypes(current => current.includes(type) ? current.filter(item => item !== type) : [...current, type])}><span className="ui-as-menu__label">{kindLabels[type]}</span>{types.includes(type) && <Check size={14} />}</button>)}
  </>}</AssistantMenu>;

  return <div className="files-page" data-dragging={dragging || undefined} aria-busy={loading} onDragEnter={event => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); dragDepth.current++; setDragging(true); }} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDragLeave={() => { if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }} onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); if (event.dataTransfer.files.length) queueFiles([...event.dataTransfer.files]); }}>
    <input ref={fileInput} type="file" multiple hidden onChange={event => { queueFiles([...event.target.files || []]); event.target.value = ""; }} />
    {dragging && <div className="files-drop"><Upload size={32} /><strong>Drop files to upload</strong><span>{folder || "Add to file templates"}</span></div>}
    {folder ? <><nav className="files-breadcrumb" aria-label="Breadcrumb"><button type="button" onClick={() => openFolder(null)}>Files</button><ChevronRight size={12} /><span>{folder}</span></nav><div className="files-folder-heading"><FolderArtwork /><h1>{folder}</h1><div className="files-heading-actions"><AssistantMenu title="Folder actions" className="files-tool" label={<><MoreHorizontal size={17} /><span className="sr-only">Folder actions</span></>} end>{close => <><button type="button" role="menuitem" className="ui-as-menu__item" disabled={!selectedFolderExists || unavailable} onClick={() => { close(); setFolderDialog({ kind: "edit", name: folder }); }}>Edit folder</button><button type="button" role="menuitem" className="ui-as-menu__item" disabled={!selectedFolderExists || unavailable} onClick={() => { close(); setRemove({ kind: "folder", id: folder }); }}>Delete folder</button></>}</AssistantMenu><button type="button" className="files-button" disabled={!selectedFolderExists || unavailable} onClick={() => setFolderDialog({ kind: "share", name: folder })}><Share2 size={14} />Share</button><button type="button" className="files-button files-button--primary" disabled={!selectedFolderExists || unavailable} onClick={() => chooseFiles()}><Plus size={15} />Upload files</button></div></div></> : <><h1 className="files-title">Files</h1><p className="files-subtitle">See files you recently used in chats and manage files saved in folders. <button type="button" onClick={() => setHelp(true)}>Learn more</button></p></>}
    {(sync.error || folderSync.error) && <div className="files-error-banner" role="alert"><span>{sync.error?.message || folderSync.error?.message}</span><button type="button" onClick={() => { sync.retry(); folderSync.retry(); }}>Retry</button></div>}
    {loading && <p className="files-hint" role="status"><LoaderCircle size={14} className="files-spin" />Loading your files…</p>}
    {!folder && <section className="files-section" aria-labelledby="files-folders-title"><h2 id="files-folders-title">Folders</h2><div className="files-toolbar"><Tabs label="Folder visibility" values={["All", "Shared", "Private"]} value={folderTab} onChange={setFolderTab} /><div className="files-toolbar-right"><button type="button" className="files-tool" aria-label={folderDesc ? "Sort folders A to Z" : "Sort folders Z to A"} onClick={() => setFolderDesc(!folderDesc)}><ArrowDownUp size={15} /></button><div className="files-view" role="group" aria-label="Folder view"><button type="button" aria-label="Grid view" aria-pressed={!list} onClick={() => setList(false)}><Grid2X2 size={15} /></button><button type="button" aria-label="List view" aria-pressed={list} onClick={() => setList(true)}><List size={15} /></button></div><SearchField target="folders" value={folderSearch} onChange={setFolderSearch} /><button type="button" className="files-button files-button--primary" disabled={unavailable} onClick={() => setFolderDialog({ kind: "create" })}><Plus size={15} />Create folder</button></div></div>
      <div className="files-folders" data-view={list ? "list" : "grid"}>{sortedFolders.map(name => <div className="files-folder-card" key={name}><button type="button" className="files-folder-open" onClick={() => openFolder(name)}><FolderArtwork /><span><b>{name}</b><span className="files-meta"><AccessIcon access={accessOf(name)} />{accessOf(name) === "shared" ? "Shared" : "Private"} · {library.items.filter(item => item.folder === name).length} files</span></span></button></div>)}</div>
      {!loading && !sortedFolders.length && <div className="files-empty"><FolderArtwork /><strong>{folders.length ? "No matching folders" : "Your folders live here"}</strong><p>{folders.length ? "Try another search or visibility filter." : "Create a folder to keep files and chats together."}</p>{!!folders.length && <button type="button" onClick={() => { setFolderSearch(""); setFolderTab("All"); }}>Clear filters</button>}</div>}
    </section>}
    {folder && !selectedFolderExists && !loading ? <div className="files-empty"><strong>Folder not found</strong><p>It may have been renamed or removed from this workspace.</p><button type="button" onClick={() => openFolder(null)}><ArrowLeft size={14} />Back to files</button></div> : <section className={`files-section${folder ? " files-section--contents" : ""}`} aria-label={folder ? "Folder files" : "File templates"}>
      {!folder && <h2>File templates</h2>}<div className="files-toolbar"><Tabs label="File ownership" values={["All", "Mine", "Shared with me"]} value={fileTab} onChange={setFileTab} /><div className="files-toolbar-right">{typeMenu}<button type="button" className="files-tool" aria-label={fileDesc ? "Sort files A to Z" : "Sort files Z to A"} onClick={() => setFileDesc(!fileDesc)}><ArrowDownUp size={15} /></button><SearchField target={folder ? "files" : "templates"} value={fileSearch} onChange={setFileSearch} />{!folder && <AssistantMenu title="Add template" className="files-button" end label={<><Plus size={15} />Add template</>}>{close => <><button type="button" role="menuitem" className="ui-as-menu__item" disabled={unavailable} onClick={() => { close(); setNewTemplate(true); }}><Plus size={14} />Create template</button><button type="button" role="menuitem" className="ui-as-menu__item" disabled={unavailable} onClick={() => { close(); chooseFiles(); }}><FileUp size={14} />Upload template</button></>}</AssistantMenu>}</div></div>
      <div className="files-grid">{visibleFiles.map(file => <button type="button" className="files-template" key={file.id} onClick={() => setFileId(file.id)}><span className="files-template-preview"><FileArtwork kind={file.kind} /></span><b>{file.name}</b><span className="files-meta">{kindLabels[file.kind]} · {file.owner} · <AccessIcon access={file.access} />{file.access === "shared" ? "Shared" : "Private"}</span></button>)}</div>
      {!loading && !visibleFiles.length && <div className="files-empty"><FileUp size={28} /><strong>{fileSearch || types.length || fileTab !== "All" ? "No matching files" : "A home for your files"}</strong><p>{fileSearch || types.length || fileTab !== "All" ? "Try another search or clear the filters." : "Drop files here or upload from your device."}</p><button type="button" disabled={unavailable} onClick={() => { if (fileSearch || types.length || fileTab !== "All") { setFileSearch(""); setTypes([]); setFileTab("All"); } else chooseFiles(); }}>{fileSearch || types.length || fileTab !== "All" ? "Clear filters" : "Upload files"}</button></div>}
    </section>}
    {!!uploads.length && <div className="files-uploads" aria-live="polite">{uploads.map(entry => <div key={entry.id}>{entry.error ? <FileUp size={16} /> : <LoaderCircle size={16} className="files-spin" />}<span><b>{entry.file.name}</b><small role={entry.error ? "alert" : undefined}>{entry.error || "Uploading…"}</small></span>{entry.error && <button type="button" onClick={() => void performUpload(entry)}>Retry</button>}<button type="button" aria-label={`Cancel upload ${entry.file.name}`} onClick={() => { controllers.current.get(entry.id)?.abort(); setUploads(current => current.filter(item => item.id !== entry.id)); }}><X size={15} /></button></div>)}</div>}
    <WorkspaceDialog open={!!folderDialog} title={folderDialog?.kind === "share" ? "Share folder" : folderDialog?.kind === "edit" ? "Edit folder" : "Create folder"} onClose={() => setFolderDialog(null)}>{folderDialog && <FolderForm key={"name" in folderDialog ? folderDialog.name : "create"} name={"name" in folderDialog ? folderDialog.name : ""} access={"name" in folderDialog ? accessOf(folderDialog.name) : "private"} names={folders} onSave={saveFolder} onCancel={() => setFolderDialog(null)} sharing={folderDialog.kind === "share"} onCopy={"name" in folderDialog ? () => void copyFolderLink(folderDialog.name) : undefined} />}</WorkspaceDialog>
    <WorkspaceDialog open={newTemplate} title="Create template" onClose={() => setNewTemplate(false)}>{newTemplate && <TemplateForm onCancel={() => setNewTemplate(false)} onSave={(name, kind, text) => { setLibrary(current => ({ ...current, items: [...current.items, { id: crypto.randomUUID(), name, kind, owner: userName, mine: true, access: "private", folder: null, template: true, size: new Blob([text]).size, mime: "text/plain", text, createdAt: new Date().toISOString() }] })); setNewTemplate(false); notify("Template created"); }} />}</WorkspaceDialog>
    <WorkspaceDialog open={!!editing} title="File details" onClose={() => setFileId(null)}>{editing && <FileEditor key={editing.id} file={editing} folders={folders} folderAccess={library.folderAccess} onSave={saveFile} onDownload={() => void download(editing)} onDelete={() => setRemove({ kind: "file", id: editing.id })} />}</WorkspaceDialog>
    <WorkspaceDialog open={!!remove} title={remove?.kind === "folder" ? "Delete folder?" : "Delete file?"} onClose={() => setRemove(null)}><p>{remove?.kind === "folder" ? "The folder will be removed. Its files will be kept as private file templates." : "This file will be removed from your library. This action cannot be undone."}</p><div className="files-actions"><button type="button" className="files-button" onClick={() => setRemove(null)}>Cancel</button><button type="button" className="files-button files-button--danger" onClick={confirmDelete}>Delete {remove?.kind}</button></div></WorkspaceDialog>
    <WorkspaceDialog open={help} title="Files in your workspace" onClose={() => setHelp(false)}><p>Organize documents in folders, reuse file templates, and choose the same folders when starting a chat. Search, filter, or switch to list view to find what you need.</p><p>Upload up to 10 files at a time, 20 MB each. Private items are personal; shared items belong to your workspace. Your backend controls access when connected.</p><p>{backend.remote ? "Your workspace backend stores files and changes." : "Files are stored in this browser on this device. Connect your workspace backend to sync across devices."}</p></WorkspaceDialog>
  </div>;
}
