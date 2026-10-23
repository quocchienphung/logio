"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { Archive, ArrowRight, CheckCircle2, ChevronDown, Code2, FileCode2, Fingerprint, FolderGit2, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { totalSkillBytes, type SkillRecord } from "./skill-model";

const size = (bytes: number) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
const labels = { citeSources: "Cite sources", verifyBeforeAnswer: "Verify before answering", askWhenUncertain: "Ask when uncertain" };
const spring = { type: "spring" as const, stiffness: 350, damping: 34 };

export function SkillCard({ skill, expanded, onToggle, onDeliver, onArchive, onRestore }: {
  skill: SkillRecord; expanded: boolean; onToggle: () => void; onDeliver: () => void; onArchive: () => void; onRestore: () => void;
}) {
  const id = useId();
  return <motion.article layout="position" className="sk-card" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={spring}>
    <div className="sk-card-title"><button aria-expanded={expanded} aria-controls={id} onClick={onToggle}><span>{skill.name}</span><ChevronDown size={14} /></button><time dateTime={skill.importedAt}>{new Date(skill.importedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Ho_Chi_Minh" })}</time></div>
    <div className="sk-card-meta"><FolderGit2 size={12} /><span>{skill.sourceUrl ? new URL(skill.sourceUrl).pathname.split("/").slice(1, 3).join("/") : "Your workspace"}</span><span>·</span><Code2 size={12} /><span>{skill.target}</span><span>·</span><span>{size(totalSkillBytes(skill))}</span></div>
    <div className="sk-card-state"><span><CheckCircle2 size={14} />{skill.status === "archived" ? "Archived" : "Ready to deliver"}</span><span className="sk-checksum"><Fingerprint size={12} />SHA-256</span><div className="sk-card-actions">{skill.status === "ready" ? <><button className="sk-secondary sk-small" onClick={onDeliver}><Send size={12} />Deliver</button><button className="sk-icon-button" aria-label={`Archive ${skill.name}`} onClick={onArchive}><Archive size={14} /></button></> : <button className="sk-secondary sk-small" onClick={onRestore}><RotateCcw size={12} />Restore</button>}</div></div>
    <motion.div id={id} initial={false} animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }} transition={spring} className="sk-card-details" inert={!expanded} aria-hidden={!expanded}>
      <div className="sk-detail-grid">
        <div><h3>Instructions</h3><p>{skill.description}</p><pre tabIndex={expanded ? 0 : -1}>{skill.instructions}</pre><div className="sk-provenance"><ShieldCheck size={14} /><span>{skill.files ? `${skill.files.length + 1} captured files · external tools may still be required.` : "Instruction file only · supporting files may be required."}</span></div>{skill.sourceUrl && <a href={skill.sourceUrl} target="_blank" rel="noreferrer">Inspect original source<ArrowRight size={12} /></a>}</div>
        <div>{skill.files && skill.files.length > 0 && <div className="sk-file-list"><h3>Supporting files <span>{skill.files.length}</span></h3><div className="sk-file-scroll" tabIndex={expanded ? 0 : -1} role="group" aria-label={`${skill.name} supporting files`}>{skill.files.map(file => <div key={file.path} title={`SHA-256: ${file.sha256}`}><FileCode2 size={12} /><code>{file.path}</code><span>{size(file.bytes)}</span></div>)}</div></div>}<dl><dt>SHA-256</dt><dd title={skill.sha256}>{skill.sha256}</dd><dt>Revision</dt><dd>{skill.sourceRef || "Authored locally"}</dd><dt>Agent instructions</dt><dd>{(Object.keys(labels) as (keyof typeof labels)[]).filter(key => skill.guardrails[key]).map(key => labels[key]).join(" · ") || "No additional guardrails"}</dd></dl></div>
      </div>
    </motion.div>
  </motion.article>;
}
