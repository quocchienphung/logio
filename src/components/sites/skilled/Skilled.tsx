"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Archive, ArrowDownToLine, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Code2, Database, FileCode2, Fingerprint, FolderGit2, HardDrive, Loader2, Plus, Radio, RotateCcw, Search, Send, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import { WorkspaceDialog } from "../affectui-crm/WorkspaceDialog";
import { downloadFile } from "../affectui-crm/workspace-state";
import { SectionSkeleton } from "../shimmer-loader/SectionSkeleton";
import { GitHubMark as Github } from "./GitHubMark";
import { RealtimeStream } from "./RealtimeStream";
import { skillSources, sourceUrl } from "./catalog";
import { createBundle, parseSkillMarkdown, parseSkillRecord, sha256, totalSkillBytes, validateTransferReceipt, type SkillRecord, type SkillTarget } from "./skill-model";
import { useSkills } from "./useSkills";
import "./skilled.css";

type Filter = "all" | "ready" | "archived";
const guardrailDefaults = { citeSources: true, verifyBeforeAnswer: true, askWhenUncertain: true };
type ImportData = Pick<SkillRecord, "name" | "description" | "instructions" | "sourceUrl" | "sourceRef" | "sourcePath" | "sha256" | "bytes" | "files">;

export function Skilled({ workspaceId }: { workspaceId: string }) {
  const { skills, setSkills, sync, events, eventsSync, record, backend, entry } = useSkills(workspaceId);
  const [instructions, setInstructions] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState<SkillTarget>("Local AI");
  const [guardrails, setGuardrails] = useState(guardrailDefaults);
  const [attributes, setAttributes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [catalog, setCatalog] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [agent, setAgent] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [metric, setMetric] = useState("all");
  const [undo, setUndo] = useState<SkillRecord | null>(null);
  const inputFile = useRef<HTMLInputElement>(null);
  const receiptFile = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const ready = skills.filter(skill => skill.status === "ready");
  const chosen = ready.filter(skill => selected.includes(skill.id));
  const visible = skills.filter(skill => (filter === "all" || skill.status === filter) && `${skill.name} ${skill.description} ${skill.target}`.toLowerCase().includes(query.toLowerCase()));
  const measures = events.filter(event => metric === "all" || event.kind === metric);
  const successful = measures.filter(event => event.outcome === "success");
  const sorted = successful.map(event => event.durationMs).sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.ceil(sorted.length * .95) - 1] : null;
  const totalBytes = skills.reduce((sum, skill) => sum + totalSkillBytes(skill), 0);
  const bytes = (value: number) => value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`;
  const tell = (message: string) => { setNotice(message); setError(""); };

  async function addSkill(source = url) {
    if (busy || sync.phase !== "ready" || sync.error) return;
    setBusy(true); setError(""); setNotice("");
    const started = performance.now();
    const controller = new AbortController(); abort.current = controller;
    try {
      let imported: ImportData;
      if (source.trim()) {
        const response = await fetch("/api/skilled/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: source.trim() }), signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Could not read this GitHub skill.");
        imported = result.data as ImportData;
        if (instructions.trim()) {
          const path = "WORKSPACE-INSTRUCTIONS.md";
          if (imported.files?.some(file => file.path.toLowerCase() === path.toLowerCase())) throw new Error("This skill already has WORKSPACE-INSTRUCTIONS.md. Import it first, or clear the additional instructions to preserve its source file.");
          const content = `# Additional workspace instructions\n\n${instructions.trim()}\n`;
          imported.files = [...(imported.files ?? []), { path, content, encoding: "utf8", sha256: await sha256(content), bytes: new TextEncoder().encode(content).length }];
        }
      } else {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) throw new Error("Give the skill a name in lowercase-with-hyphens (up to 64 characters).");
        if (!description.trim() || !instructions.trim()) throw new Error("Add a description and the instructions your agent should follow.");
        const content = instructions.replace(/^\uFEFF/, "").startsWith("---") ? instructions : `---\nname: ${name}\ndescription: ${JSON.stringify(description.trim())}\n---\n\n${instructions.trim()}\n`;
        const metadata = parseSkillMarkdown(content);
        if (metadata.name !== name || metadata.description !== description.trim()) throw new Error("The name and description must match the SKILL.md frontmatter. Edit the file header to change them.");
        imported = { name, description: description.trim(), instructions: content, sourceUrl: "", sourceRef: "", sourcePath: "", sha256: await sha256(content), bytes: new TextEncoder().encode(content).length };
      }
      if (controller.signal.aborted) return;
      if (skills.some(skill => skill.name === imported.name && skill.status !== "archived")) throw new Error("This skill already exists. Archive the old version before adding a new one.");
      if (skills.length >= 200) throw new Error("This workspace holds up to 200 skills.");
      const skill: SkillRecord = { ...imported, id: crypto.randomUUID(), importedAt: new Date().toISOString(), target, status: "ready", guardrails: { ...guardrails } };
      if (!parseSkillRecord(skill) || await sha256(skill.instructions) !== skill.sha256) throw new Error("Skill data or checksum is invalid. Check the source and file size.");
      setSkills(current => [skill, ...current]);
      record({ kind: "import", skillId: skill.id, label: source ? "GitHub skill folder scan" : "Authored instruction", durationMs: performance.now() - started, bytes: totalSkillBytes(skill), outcome: "success" });
      setInstructions(""); setName(""); setDescription(""); setUrl(""); setExpanded(skill.id); setCatalog(false); setFilter("all");
      tell(`${skill.name} added. The save status confirms when it is persisted.`);
    } catch (failure) {
      if (controller.signal.aborted) { tell("Import cancelled."); return; }
      const message = failure instanceof Error ? failure.message : "Could not add this skill.";
      setError(message);
      record({ kind: "import", label: "Skill import", durationMs: performance.now() - started, bytes: 0, outcome: "error", detail: message });
    } finally { setBusy(false); abort.current = null; }
  }

  async function deliver(remote: boolean) {
    if (!chosen.length || busy) return;
    setBusy(true); setError("");
    const started = performance.now();
    try {
      await sync.flush();
      const current = entry.getSnapshot();
      if (current.save !== "idle" || current.error) throw new Error("Wait for the skill library to finish saving before delivery.");
      const bundle = await createBundle(chosen, workspaceId);
      const countBytes = new TextEncoder().encode(JSON.stringify(bundle)).length;
      if (remote) {
        if (!backend.remote || !backend.command) throw new Error("Connect a workspace backend to transfer to an agent.");
        if (!agent.trim()) throw new Error("Enter the agent ID configured in your backend.");
        const result = await backend.command("skill.transfer", workspaceId, { agent: agent.trim(), bundle });
        const receipt = validateTransferReceipt(result, bundle);
        if (!receipt || receipt.agent !== agent.trim()) throw new Error("The backend did not return a matching agent receipt. Delivery is unconfirmed.");
        tell(`Receipt confirmed by ${receipt.agent}. ${receipt.accepted.length} skill(s) received; this does not verify model behavior.`);
      } else {
        downloadFile(`logio-skills-${workspaceId}.json`, JSON.stringify(bundle, null, 2), "application/json");
        tell("Bundle prepared for download. Run the local installer, then load the instructions in your agent.");
      }
      record({ kind: remote ? "transfer" : "export", label: remote ? `Receipt · ${agent}` : "Bundle serialization", durationMs: performance.now() - started, bytes: countBytes, outcome: "success" });
      setTransfer(false);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Delivery failed.";
      setError(message);
      record({ kind: remote ? "transfer" : "export", label: remote ? "Agent transfer" : "Bundle export", durationMs: performance.now() - started, bytes: 0, outcome: "error", detail: message });
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void addSkill(); }
  async function importReceipt(file: File) {
    const started = performance.now();
    try {
      if (file.size > 150000) throw new Error("Receipt file is too large.");
      const raw: unknown = JSON.parse(await file.text());
      const preliminary = validateTransferReceipt(raw);
      if (!preliminary || !preliminary.accepted.length) throw new Error("Invalid receipt file.");
      const matching = ready.filter(skill => preliminary.accepted.some(item => item.id === skill.id));
      const bundle = await createBundle(matching, workspaceId);
      const receipt = validateTransferReceipt(raw, bundle);
      if (!receipt) throw new Error("Receipt does not match this workspace’s skill IDs and checksums.");
      record({ kind: "transfer", label: "Offline file receipt", durationMs: performance.now() - started, bytes: receipt.bytes, outcome: "success", detail: `Receipt verification only; original delivery duration unavailable. ${receipt.agent}` });
      tell(`Receipt imported for ${receipt.accepted.length} instruction file(s). Agent loading and execution remain unverified.`);
      setTransfer(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not read receipt."); }
  }
  function archive(skill: SkillRecord) {
    setSkills(current => current.map(item => item.id === skill.id ? { ...item, status: "archived" } : item));
    setSelected(current => current.filter(id => id !== skill.id)); setUndo(skill); tell(`${skill.name} archived.`);
  }

  if (sync.phase !== "ready") return <SectionSkeleton section="Skilled" />;
  return <div className="sk-workspace">
    <header className="sk-topbar"><div><BookOpen size={16} /><span>Skilled</span><ChevronRight size={13} /><span>Workspace</span></div><span className="sk-storage"><i />{backend.remote ? "Connected backend" : "Browser storage"}</span></header>
    <div className="sk-content">
      <div className="sk-heading"><div><div className="sk-eyebrow">YOUR AGENT’S KNOWLEDGE, ORGANIZED</div><h1>Better skills. Grounded work.</h1><p>Give your agents the instructions to do things right.</p></div><button className="sk-secondary" onClick={() => { setSelected(ready.map(skill => skill.id)); setTransfer(true); }} disabled={!ready.length}><ArrowDownToLine size={15} />Deliver skills<ChevronDown size={13} /></button></div>
      <div className="sk-layout"><div className="sk-primary">
        <section className="sk-task-panel" aria-label="Skill library">
          <form className="sk-composer" onSubmit={submit} aria-label="Add a skill">
            <div className="sk-composer-field"><label className="sk-sr-only" htmlFor="sk-instructions">Skill instructions</label><textarea id="sk-instructions" placeholder={url ? "Additional instructions for this skill (optional)" : "What should your agent know how to do?"} value={instructions} onChange={event => { setInstructions(event.target.value); if (!url) setAttributes(true); }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void addSkill(); } }} maxLength={200000} />
              <div className="sk-composer-bar"><div className="sk-chips"><button type="button" className="sk-chip" onClick={() => { setAttributes(true); document.getElementById("sk-source")?.focus(); }}><Github size={14} /><span>{url ? "GitHub source" : "Add source"}</span><ChevronDown size={12} /></button><label className="sk-chip"><Code2 size={14} /><select aria-label="Skill target" value={target} onChange={event => setTarget(event.target.value as SkillTarget)}><option>Local AI</option><option>AI Agent</option></select></label><button type="button" className="sk-chip" aria-expanded={attributes} onClick={() => setAttributes(!attributes)}><Settings2 size={14} /><span>Attributes</span></button></div><div className="sk-start-slot"><kbd>⌘ ↵</kbd><button className="sk-start" type="submit" disabled={busy || Boolean(sync.error) || (!url.trim() && !instructions.trim())}>{busy ? <Loader2 size={14} className="sk-spin" /> : <Plus size={14} />}Add skill</button></div></div>
            </div>
            <AnimatePresence initial={false}>{attributes && <motion.div className="sk-attributes" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 350, damping: 34 }}><div><label htmlFor="sk-source">GitHub SKILL.md URL <span>optional</span></label><input id="sk-source" type="url" placeholder="https://github.com/owner/repo/blob/main/skills/name/SKILL.md" value={url} onChange={event => setUrl(event.target.value)} />{!url && <div className="sk-form-grid"><label>Skill name<input placeholder="evidence-first-research" value={name} maxLength={64} onChange={event => setName(event.target.value)} /></label><label>Description<input placeholder="When should the agent use this skill?" value={description} maxLength={2048} onChange={event => setDescription(event.target.value)} /></label></div>}<div className="sk-guardrails">{([["citeSources", "Cite sources"], ["verifyBeforeAnswer", "Verify before answering"], ["askWhenUncertain", "Ask when uncertain"]] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={guardrails[key]} onChange={event => setGuardrails({ ...guardrails, [key]: event.target.checked })} />{label}</label>)}</div><p>These are instructions for the receiving agent. Quality still needs evaluation.</p><button type="button" className="sk-text-button" onClick={() => inputFile.current?.click()}><FileCode2 size={13} />Read a local SKILL.md</button><input type="file" accept=".md,text/markdown,text/plain" hidden ref={inputFile} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 200000) { setError("Choose a SKILL.md smaller than 200 KB."); return; } try { const text = await file.text(); const metadata = parseSkillMarkdown(text); setInstructions(text); setName(metadata.name); setDescription(metadata.description); setUrl(""); tell("SKILL.md read. Original contents will be preserved."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid SKILL.md."); } event.target.value = ""; }} /></div></motion.div>}</AnimatePresence>
          </form>
          <div className="sk-library-toolbar"><div className="sk-tabs" role="tablist" aria-label="Filter skills">{([["all", "All skills"], ["ready", "Ready"], ["archived", "Archived"]] as const).map(([id, label], index) => <button key={id} role="tab" aria-selected={filter === id} tabIndex={filter === id ? 0 : -1} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3; setFilter((["all", "ready", "archived"] as const)[next]); (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus(); } }} onClick={() => setFilter(id)}>{filter === id && <motion.span layoutId="skill-filter" transition={{ type: "spring", stiffness: 450, damping: 38 }} />}<span>{label}</span><span className="sk-count">{id === "all" ? skills.length : skills.filter(skill => skill.status === id).length}</span></button>)}</div><button className="sk-icon-button" aria-label="Browse skill sources" onClick={() => setCatalog(true)}><Plus size={16} /></button></div>
          {skills.length > 0 && <label className="sk-search"><Search size={14} /><input aria-label="Search skills" placeholder="Find a skill…" value={query} onChange={event => setQuery(event.target.value)} /><span>{skills.length}/200</span></label>}
          <div className="sk-cards"><AnimatePresence initial={false}>{visible.map(skill => <motion.article layout key={skill.id} className="sk-card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 350, damping: 34 }}>
            <div className="sk-card-title"><button aria-expanded={expanded === skill.id} aria-controls={`detail-${skill.id}`} onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}><span>{skill.name}</span><ChevronDown size={14} /></button><time dateTime={skill.importedAt}>{new Date(skill.importedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Ho_Chi_Minh" })}</time></div>
            <div className="sk-card-meta"><FolderGit2 size={12} /><span>{skill.sourceUrl ? new URL(skill.sourceUrl).pathname.split("/").slice(1, 3).join("/") : "Your workspace"}</span><span>·</span><Code2 size={12} /><span>{skill.target}</span><span>·</span><span>{bytes(totalSkillBytes(skill))}</span></div>
            <div className="sk-card-state"><span><CheckCircle2 size={14} />{skill.status === "archived" ? "Archived" : "Ready to deliver"}</span><span className="sk-checksum"><Fingerprint size={12} />SHA-256</span><div className="sk-card-actions">{skill.status === "ready" ? <><button className="sk-secondary sk-small" onClick={() => { setSelected([skill.id]); setTransfer(true); }}><Send size={12} />Deliver</button><button className="sk-icon-button" aria-label={`Archive ${skill.name}`} onClick={() => archive(skill)}><Archive size={14} /></button></> : <button className="sk-secondary sk-small" onClick={() => { if (skills.some(item => item.id !== skill.id && item.name === skill.name && item.status === "ready")) { setError("Archive the active version before restoring this one."); return; } setSkills(current => current.map(item => item.id === skill.id ? { ...item, status: "ready" } : item)); }}><RotateCcw size={12} />Restore</button>}</div></div>
            <AnimatePresence initial={false}>{expanded === skill.id && <motion.div id={`detail-${skill.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 350, damping: 34 }} className="sk-card-details"><div><h3>Instructions</h3><p>{skill.description}</p><pre>{skill.instructions}</pre><div className="sk-provenance"><ShieldCheck size={14} /><span>{skill.files ? `Skill folder captured: ${skill.files.length + 1} files. External tools or packages may still be required.` : "Instruction file only. Add supporting files from the original source if required."}</span></div>{skill.files && skill.files.length > 0 && <div className="sk-file-list"><h3>Supporting files</h3>{skill.files.map(file => <div key={file.path} title={`SHA-256: ${file.sha256}`}><FileCode2 size={12} /><code>{file.path}</code><span>{bytes(file.bytes)}</span></div>)}</div>}{skill.sourceUrl && <a href={skill.sourceUrl} target="_blank" rel="noreferrer">Inspect original source <ArrowRight size={12} /></a>}<dl><dt>SHA-256</dt><dd>{skill.sha256}</dd><dt>Revision</dt><dd>{skill.sourceRef || "Authored locally"} · {skill.sourcePath || "SKILL.md"}</dd><dt>Agent instructions</dt><dd>{Object.entries(skill.guardrails).filter(([, enabled]) => enabled).map(([key]) => ({ citeSources: "Cite sources", verifyBeforeAnswer: "Verify before answering", askWhenUncertain: "Ask when uncertain" })[key]).join(" · ") || "No additional guardrails"}</dd></dl></div></motion.div>}</AnimatePresence>
          </motion.article>)}</AnimatePresence>{!visible.length && <div className="sk-empty"><div className="sk-empty-icon"><BookOpen size={23} /><span><Plus size={10} /></span></div><h2>{skills.length ? "No skills in this view" : "A little knowledge goes a long way."}</h2><p>{skills.length ? "Try a different filter or search." : "Bring a skill from GitHub, or write your own. Keep the source and instructions together."}</p><button className="sk-secondary" onClick={() => setCatalog(true)}>Explore skill sources<ArrowRight size={14} /></button></div>}</div>
          <footer className="sk-panel-footer"><ShieldCheck size={13} /><span>Traceable instructions. No hidden agent runs.</span><span>{sync.save === "saving" ? "Saving…" : sync.error ? "Save failed" : "Saved"}</span></footer>
        </section>
        <section className="sk-discover"><div className="sk-section-title"><h2>A good place to start</h2><button onClick={() => setCatalog(true)}>View all sources<ArrowRight size={13} /></button></div><div className="sk-source-grid">{skillSources.slice(0, 3).map(source => <button className="sk-source" key={source.path} disabled={busy} onClick={() => { setUrl(sourceUrl(source)); setAttributes(true); setCatalog(false); }}><span className="sk-source-icon"><Github size={17} /></span><span className="sk-source-category">{source.category}</span><h3>{source.name}</h3><p>{source.description}</p><span className="sk-source-owner">{source.owner}<ArrowRight size={13} /></span></button>)}</div></section>
      </div><aside className="sk-observability" aria-label="Skill operations measurement">
        <section className="sk-monitor"><div className="sk-section-title"><h2><Radio size={15} />Realtime stream</h2><span className="sk-observed">Measured</span></div><p className="sk-monitor-description">Your skill operations, as they happen.</p><select className="sk-metric-select" aria-label="Measurement type" value={metric} onChange={event => setMetric(event.target.value)}><option value="all">All operations</option><option value="save">Storage writes</option><option value="import">Imports</option><option value="export">Bundle exports</option><option value="transfer">Agent transfers</option></select><RealtimeStream points={measures.map(event => ({ t: event.t, value: event.durationMs, anomaly: event.outcome === "error" ? "Failed" : undefined }))} label="Operation duration" description="Actual elapsed time · milliseconds" emptyLabel="Add a skill to see your first measurement" unit="ms" /><div className="sk-metrics"><div><span>Operations</span><strong>{measures.length}</strong></div><div><span>p95 duration</span><strong>{p95 === null ? "—" : p95 < 10 ? p95.toFixed(1) : Math.round(p95)}<small>{p95 !== null && " ms"}</small></strong></div><div><span>Errors</span><strong>{measures.filter(event => event.outcome === "error").length}</strong></div></div><div className="sk-monitor-foot"><span><Database size={12} />{backend.remote ? "Configured REST backend" : "This browser only"}</span><span>Latest 200</span></div></section>
        <section className="sk-activity"><div className="sk-section-title"><h2>Activity</h2><span>{events.length}</span></div>{!events.length ? <div className="sk-activity-empty"><span className="sk-quiet-dot" />Waiting for your first operation.</div> : <ol>{events.slice(-6).reverse().map(event => <li key={event.id}><span className="sk-event-icon" data-error={event.outcome === "error"}>{event.outcome === "success" ? <Check size={12} /> : <X size={12} />}</span><div><strong>{event.label}</strong><span title={event.detail}>{event.outcome === "error" ? event.detail : `${bytes(event.bytes)} · ${new Date(event.t).toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" })}`}</span></div><small>{event.durationMs < 10 ? event.durationMs.toFixed(1) : Math.round(event.durationMs)} ms</small></li>)}</ol>}</section>
        <section className="sk-knowledge-note"><Sparkles size={17} /><h3>Grounded starts with a source.</h3><p>Skills guide behavior; they cannot guarantee an answer is correct. Keep evidence, verify outputs, and test with real tasks.</p><div><HardDrive size={13} /><span>{ready.length} ready · {bytes(totalBytes)} of skill files</span></div></section>
      </aside></div>
      {(error || sync.error || eventsSync.error) && <div className="sk-error" role="alert"><CircleAlert size={16} /><span>{error || sync.error?.message || eventsSync.error?.message}</span>{sync.error && <button onClick={sync.retry}>Retry save</button>}{eventsSync.error && <button onClick={eventsSync.retry}>Retry activity save</button>}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={14} /></button></div>}
      <div className="sk-notice" role="status">{notice && <><CheckCircle2 size={14} /><span>{notice}</span>{undo && <button onClick={() => { const previous = undo; if (skills.some(item => item.name === previous.name && item.id !== previous.id && item.status === "ready")) { setError("Archive the active version before undoing."); return; } setSkills(current => current.map(item => item.id === previous.id ? previous : item)); setUndo(null); tell("Archive undone."); }}>Undo</button>}<button aria-label="Dismiss notice" onClick={() => { setNotice(""); setUndo(null); }}><X size={13} /></button></>}</div>
    </div>
    <WorkspaceDialog open={catalog} onClose={() => setCatalog(false)} title="Explore skill sources" wide><div className="sk-dialog-body"><p>Public repositories with real skill folders. Scan the instructions, supporting files and source license at a pinned commit.</p><div className="sk-catalog">{skillSources.map(source => <div key={source.path}><Github size={19} /><div><h3>{source.name}</h3><p>{source.description}</p><a href={sourceUrl(source)} target="_blank" rel="noreferrer">{source.owner}</a></div><button className="sk-secondary" disabled={busy} onClick={() => { setUrl(sourceUrl(source)); setAttributes(true); setCatalog(false); }}>Use source<Plus size={13} /></button></div>)}</div></div></WorkspaceDialog>
    <WorkspaceDialog open={transfer} onClose={() => { if (!busy) setTransfer(false); }} title="Deliver skills" wide><div className="sk-dialog-body"><p>Choose the instructions to include. A downloaded bundle is ready to install; an agent transfer needs a matching receipt from your backend.</p><div className="sk-delivery-list">{ready.map(skill => <label key={skill.id}><input type="checkbox" checked={selected.includes(skill.id)} onChange={event => setSelected(current => event.target.checked ? [...current, skill.id] : current.filter(id => id !== skill.id))} /><span>{skill.name}<small>{skill.target} · {bytes(totalSkillBytes(skill))}</small></span><Fingerprint size={14} /></label>)}</div><div className="sk-delivery-method"><h3><ArrowDownToLine size={15} />Local AI / portable bundle</h3><p>Includes SKILL.md, captured supporting files, source metadata, SHA-256 checksums and your guardrails.</p><code>node scripts/skilled/install-bundle.mjs bundle.json --dir ./agent-skills</code><p>The installer writes files. Your agent must load SKILL.md and LOGIO.md to use them.</p><button type="button" className="sk-text-button" onClick={() => receiptFile.current?.click()}><FileCode2 size={13} />Import installer receipt</button><input ref={receiptFile} type="file" accept=".json,application/json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void importReceipt(file); event.target.value = ""; }} /><button className="sk-start" disabled={!chosen.length || busy} onClick={() => void deliver(false)}>{busy ? <Loader2 size={14} className="sk-spin" /> : <ArrowDownToLine size={14} />}Export {chosen.length} skill{chosen.length !== 1 ? "s" : ""}</button></div><div className="sk-delivery-method"><h3><Send size={15} />Connected AI agent</h3><label>Agent ID<input placeholder="e.g. research-agent" value={agent} onChange={event => setAgent(event.target.value)} disabled={!backend.remote} /></label><p>{backend.remote ? "The workspace backend routes this bundle and returns an acknowledgement. Receipt ≠ model execution." : "No agent backend connected. Configure the workspace REST backend to enable delivery."}</p><button className="sk-secondary" disabled={!backend.remote || !backend.command || !chosen.length || !agent.trim() || busy} onClick={() => void deliver(true)}>Transfer & verify receipt<ArrowRight size={14} /></button></div></div></WorkspaceDialog>
    {busy && <button className="sk-cancel-operation" onClick={() => abort.current?.abort()} disabled={!abort.current}>Cancel import</button>}
  </div>;
}
