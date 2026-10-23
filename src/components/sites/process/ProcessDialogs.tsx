"use client";

import { useId } from "react";
import { Copy, Download, LayoutGrid, Plug, Plus, Trash2, Upload } from "lucide-react";
import { Combobox } from "../affectui-combobox/Combobox";
import { WorkspaceDialog } from "../affectui-crm/WorkspaceDialog";
import { LIMITS, countNodes, templates, unitLabel } from "./process-model";
import type { CostUnit, ProcessDoc, ProcessLibrary } from "./process-model";

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return <WorkspaceDialog open={open} title={title} onClose={onClose}>
    <div className="proc-dialog"><p>{message}</p>
      <div className="proc-dialog__actions"><button type="button" className="proc-button" onClick={onClose}>Cancel</button><button type="button" className="proc-button proc-button--danger" onClick={onConfirm}>{confirmLabel}</button></div>
    </div>
  </WorkspaceDialog>;
}

const when = (stamp: string) => { const date = new Date(stamp); return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); };

export function LibraryDialog({ open, onClose, library, onSwitch, onDuplicate, onDelete, onNew }: {
  open: boolean; onClose: () => void; library: ProcessLibrary; onSwitch: (id: string) => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void; onNew: () => void;
}) {
  return <WorkspaceDialog open={open} title="Saved processes" onClose={onClose}>
    <div className="proc-dialog">
      <ul className="proc-library">
        {library.processes.map(doc => <li key={doc.id} data-active={doc.id === library.activeId ? "" : undefined}>
          <button type="button" className="proc-library__open" onClick={() => { onSwitch(doc.id); onClose(); }} aria-current={doc.id === library.activeId ? "true" : undefined}>
            <strong>{doc.name}</strong><span>{countNodes(doc.root)} task{countNodes(doc.root) === 1 ? "" : "s"} · {when(doc.updatedAt)}</span>
          </button>
          <button type="button" className="proc-icon-button" aria-label={`Duplicate ${doc.name}`} title="Duplicate" onClick={() => onDuplicate(doc.id)}><Copy size={15} /></button>
          <button type="button" className="proc-icon-button" aria-label={`Delete ${doc.name}`} title="Delete" disabled={library.processes.length < 2} onClick={() => onDelete(doc.id)}><Trash2 size={15} /></button>
        </li>)}
      </ul>
      <div className="proc-dialog__actions"><button type="button" className="proc-button proc-button--dark" onClick={() => { onClose(); onNew(); }}><Plus size={14} />New process</button></div>
    </div>
  </WorkspaceDialog>;
}

export function NewProcessDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (template: string) => void }) {
  return <WorkspaceDialog open={open} title="New process" onClose={onClose}>
    <div className="proc-dialog">
      <p>Start from a blank page or from an example. You can change everything afterwards.</p>
      <ul className="proc-templates">
        <li><button type="button" onClick={() => onCreate("blank")}><strong>Blank</strong><span>One main task. Add the sub-tasks and AI blocks yourself.</span></button></li>
        {templates.map(template => <li key={template.id}><button type="button" onClick={() => onCreate(template.id)}><strong>{template.label}</strong><span>{template.description}</span></button></li>)}
      </ul>
    </div>
  </WorkspaceDialog>;
}

const snippet = `window.__workspaceBackendConfig = {
  baseUrl: "https://api.example.com/v1",
  headers: async () => ({ Authorization: \`Bearer \${await token()}\` }),
  serverProcess: true, // the server runs the tasks
};`;

export function ConnectDialog({ open, onClose, simulated, engineCount }: { open: boolean; onClose: () => void; simulated: boolean; engineCount: number }) {
  return <WorkspaceDialog open={open} title={simulated ? "Connect an engine" : "Connected engine"} onClose={onClose} wide>
    <div className="proc-dialog proc-connect">
      {simulated
        ? <p><strong>This page is running a simulation.</strong> Tasks move through their statuses on a timer and the costs are demo values; no model is called and nothing leaves your browser. Connect an engine to run the tasks for real.</p>
        : <p><strong>A server runs your tasks.</strong> The page sends the plan and your decisions and shows what the server reports.{engineCount ? ` It lists ${engineCount} AI block${engineCount === 1 ? "" : "s"} you can choose.` : " It does not list its AI blocks, so model names are typed."}</p>}
      <h3>How to connect</h3>
      <p>Point the workspace at your API and turn on <code>serverProcess</code> before the workspace loads:</p>
      <pre>{snippet}</pre>
      <p>Your server implements these routes under <code>/workspaces/{"{id}"}/process</code>:</p>
      <ul className="proc-routes">
        <li><code>GET /engines</code> the AI blocks it can run (for example the models installed in a local Ollama)</li>
        <li><code>POST /runs</code> start a run from the plan</li>
        <li><code>GET /runs/{"{runId}"}</code> the run&apos;s newest state (polled while it is active)</li>
        <li><code>POST /runs/{"{runId}"}/actions</code> approve, reject, retry, dismiss or stop</li>
      </ul>
      <p>Your server can forward each task to a local model server, a chat bot or an agent framework. The page never talks to a model itself. The full contract, with the JSON shapes, is in <code>docs/backend-api.md</code> under “Process (engine)”.</p>
      <div className="proc-dialog__actions"><button type="button" className="proc-button" onClick={onClose}>Close</button></div>
    </div>
  </WorkspaceDialog>;
}

export function SettingsDialog({ open, onClose, doc, simulated, remote, onGoal, onUnit, onConnect, onExport, onImport, onTidy }: {
  open: boolean; onClose: () => void; doc: ProcessDoc; simulated: boolean; remote: boolean;
  onGoal: (goal: string) => void; onUnit: (unit: CostUnit) => void; onConnect: () => void; onExport: () => void; onImport: () => void; onTidy: () => void;
}) {
  const id = useId();
  return <WorkspaceDialog open={open} title="Process settings" onClose={onClose}>
    <div className="proc-dialog proc-settings">
      <div className="proc-field"><label className="proc-field__label" htmlFor={`${id}-goal`}>Goal</label>
        <textarea id={`${id}-goal`} className="proc-input proc-input--area" rows={2} value={doc.goal} maxLength={LIMITS.goal} placeholder="What should this process get done?" onChange={event => onGoal(event.target.value)} /></div>
      <Combobox label="Show costs in" searchable={false} value={doc.unit} options={(Object.keys(unitLabel) as CostUnit[]).map(value => ({ value, label: value === "none" ? "No costs" : unitLabel[value] }))} onChange={value => onUnit(value as CostUnit)} />
      <div className="proc-field"><span className="proc-field__label">Engine</span>
        <p className="proc-field__hint">{simulated ? "Simulated: tasks move through their statuses on a timer. Nothing is sent to a model." : "Connected: a server runs the tasks."}</p>
        <div><button type="button" className="proc-button" onClick={onConnect}><Plug size={14} />{simulated ? "Connect an engine" : "About the engine"}</button></div></div>
      <div className="proc-field"><span className="proc-field__label">Map</span>
        <div><button type="button" className="proc-button" onClick={onTidy}><LayoutGrid size={14} />Tidy up the map</button></div>
        <p className="proc-field__hint">Lets the map place every block again. Blocks you moved by hand go back to their automatic place.</p></div>
      <div className="proc-field"><span className="proc-field__label">Backup</span>
        <div className="proc-dialog__actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="proc-button" onClick={onExport}><Download size={14} />Export as JSON</button>
          <button type="button" className="proc-button" onClick={onImport}><Upload size={14} />Import a process</button>
        </div>
        {remote && <p className="proc-field__hint">Saved to your workspace&apos;s server.</p>}</div>
      <div className="proc-dialog__actions"><button type="button" className="proc-button" onClick={onClose}>Done</button></div>
    </div>
  </WorkspaceDialog>;
}
