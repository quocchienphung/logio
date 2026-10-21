"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Reducer } from "react";
import { AlertTriangle, Check, FolderOpen, Hourglass, LayoutGrid, LoaderCircle, PanelRight, Play, Plug, Plus, Redo2, Repeat, Settings2, Square, Undo2, X } from "lucide-react";
import type { SnapshotSource } from "@/lib/workspace-backend";
import { downloadFile } from "../affectui-crm/workspace-state";
import { AgentTree } from "../affectui-agent-tree/AgentTree";
import { AgentBar } from "../affectui-agent-tree/agent-bar";
import { useWidth } from "../affectui-agent-tree/use-width";
import type { TreeAgent } from "../affectui-agent-tree/tree-model";
import { WorkspaceDialog } from "../affectui-crm/WorkspaceDialog";
import { NodeInspector } from "./NodeInspector";
import { ConfirmDialog, ConnectDialog, LibraryDialog, NewProcessDialog, SettingsDialog } from "./ProcessDialogs";
import { ProcessMap } from "./ProcessMap";
import { ProcessPermissions } from "./ProcessPermissions";
import { roles } from "./roles";
import type { Role, RoleStep } from "./roles";
import type { Point } from "./map-layout";
import { problemsOf, providerOf } from "./catalog";
import { configuredEngine, handleNow, simulatedHandle } from "./engine";
import type { EngineInfo, ProcessEngine, RunHandle } from "./engine";
import { createHistory, historyReducer } from "./history";
import type { History, HistoryAction } from "./history";
import {
  addChild, addLink, checkLink, costFormatter, createBlankProcess, createLibrary, createNode, createSampleProcess, DEFAULT_ROUNDS, duplicateNode, findNode, flattenNodes, instantiate, LIMITS, loopFrom, moveNode, 
  normalizeProcess, parentNode, pruneLinks, removeLink, removeNode, reparentNode, setPosition, clearPositions, templates, touch, uid, updateLink, updateNode, countNodes, waitsFor,
} from "./process-model";
import type { CostUnit, ProcessDoc, ProcessLibrary, ProcessNode } from "./process-model";
import { decisionId, emptyRunStore, isActive } from "./run-model";
import type { RunAction, RunStore } from "./run-model";
import { buildTree, taskIdOf } from "./run-view";
import { createLocalProcessSource, createLocalRunSource } from "./local-sources";
import { useAutosave } from "./use-autosave";
import { peekTick, useTicker } from "./use-ticker";
import "./process.css";

export { createLocalProcessSource, createLocalRunSource } from "./local-sources";

export interface ProcessProps {
  workspaceId: string;
  dataSource?: SnapshotSource<ProcessLibrary>;
  /** Where the simulated engine keeps its runs. Not used with an engine that runs elsewhere. */
  runSource?: SnapshotSource<RunStore>;
  /** What runs the tasks. Defaults to the simulated engine, or the REST engine when the host turns on `serverProcess`. */
  engine?: ProcessEngine;
  /** Data leaves this browser (a REST backend): the saved state is shared, so say so. */
  remote?: boolean;
}

interface Loaded { source: SnapshotSource<ProcessLibrary>; library: ProcessLibrary; runs: RunStore }

export function Process({ workspaceId, dataSource, runSource, engine: suppliedEngine, remote = false }: ProcessProps) {
  const source = useMemo(() => dataSource ?? createLocalProcessSource(`affectui:${workspaceId}:process`), [dataSource, workspaceId]);
  const runs = useMemo(() => runSource ?? createLocalRunSource(`affectui:${workspaceId}:process-run`), [runSource, workspaceId]);
  const engine = useMemo(() => suppliedEngine ?? configuredEngine(), [suppliedEngine]);
  const [result, setResult] = useState<{ source: SnapshotSource<ProcessLibrary>; loaded?: Loaded; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([source.load(controller.signal), engine.kind === "simulated" ? runs.load(controller.signal).catch(() => null) : Promise.resolve(null)]).then(([library, store]) => {
      if (controller.signal.aborted) return;
      const base = library && library.processes.length ? library : createLibrary([createSampleProcess()]);
      setResult({ source, loaded: { source, library: base, runs: store ?? emptyRunStore() } });
    }).catch(error => { if (!controller.signal.aborted) setResult({ source, error: error instanceof Error ? error.message : "Could not load your processes." }); });
    return () => controller.abort();
  }, [source, runs, engine, attempt]);
  const reload = () => { setResult(null); setAttempt(value => value + 1); };
  if (!result || result.source !== source) return <div className="proc-workspace proc-loading" role="status"><LoaderCircle className="proc-spin" size={20} />Loading processes…</div>;
  if (!result.loaded) return <div className="proc-workspace proc-loading" role="alert"><p>{result.error}</p><button className="proc-button" type="button" onClick={reload}>Retry loading</button></div>;
  return <ProcessStudio key={`${workspaceId}-${attempt}`} workspaceId={workspaceId} source={source} runs={runs} engine={engine} initial={result.loaded} remote={remote} onReload={reload} />;
}

type Dialog = "library" | "new" | "connect" | "inspector" | "settings" | { kind: "delete-task"; id: string } | { kind: "delete-process"; id: string } | null;
const POLL_MS = 2000;
const historyOf = historyReducer as Reducer<History<ProcessLibrary>, HistoryAction<ProcessLibrary>>;
const stateLabel = { running: "Running", waiting: "Needs you", done: "Done", failed: "Failed", stopped: "Stopped" } as const;
const isField = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[role=combobox], [role=listbox]") !== null);

function ProcessStudio({ workspaceId, source, runs, engine, initial, remote, onReload }: { workspaceId: string; source: SnapshotSource<ProcessLibrary>; runs: SnapshotSource<RunStore>; engine: ProcessEngine; initial: Loaded; remote: boolean; onReload: () => void }) {
  const [history, dispatch] = useReducer(historyOf, initial.library, createHistory);
  const library = history.present;
  const doc = library.processes.find(item => item.id === library.activeId) ?? library.processes[0];
  const [selectedId, setSelectedId] = useState(doc.root.id);
  const selected = findNode(doc.root, selectedId) ?? doc.root;
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [handles, setHandles] = useState<Record<string, RunHandle>>(() => Object.fromEntries(Object.entries(initial.runs.runs).flatMap(([id, log]) => { const handle = simulatedHandle(log); return handle ? [[id, handle]] : []; })));
  const handle = handles[doc.id];
  const simulated = engine.kind === "simulated";
  const [setPage, pageWidth] = useWidth();
  const narrow = pageWidth > 0 && pageWidth < 940;
  const importRef = useRef<HTMLInputElement>(null);
  const focusName = useRef(false);
  const [view, setView] = useState<"map" | "tree">("map");
  // The settings panel opens when a block is clicked or added, so the map has the whole page until then.
  const [panel, setPanel] = useState(false);
  const [palette, setPalette] = useState(false);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [pickedLinkId, setPickedLinkId] = useState<string | null>(null);
  const [tidied, setTidied] = useState(0);
  const [permissionReview, setPermissionReview] = useState<{ id?: string; revision: number }>({ revision: 0 });
  const actionPending = useRef(false);
  const runRevision = useRef(0);
  function reviewPermission(id?: string) {
    setDialog(null);
    setPermissionReview(current => ({ id, revision: current.revision + 1 }));
  }

  // ----- running -----
  // The clock only ticks while a run is going: the last tick tells whether it still is.
  const stillGoing = (() => { if (!handle) return false; try { return isActive(engine.read(handle, handleNow(handle, peekTick()))); } catch { return false; } })();
  const readNow = useTicker(stillGoing);
  const clock = handle ? handleNow(handle, readNow) : readNow;
  const snapshot = (() => { if (!handle) return null; try { return engine.read(handle, clock); } catch { return null; } })();
  const active = !!snapshot && isActive(snapshot);
  const unit: CostUnit = doc.unit;
  const format = costFormatter(unit);
  const tree = buildTree(doc.root, { snapshot, engines });

  // The simulated engine's runs are saved with the process; a server keeps its own.
  const runStore: RunStore = useMemo(() => ({ version: 1, runs: Object.fromEntries(Object.entries(handles).flatMap(([id, item]) => item.kind === "simulated" ? [[id, item.log]] : [])) }), [handles]);
  const runSave = useAutosave(runStore, initial.runs, useCallback(value => engine.kind === "simulated" ? runs.save(value) : Promise.resolve(), [engine, runs]), 300);
  const save = useAutosave(library, initial.library, useCallback(value => source.save(value), [source]), 600);

  useEffect(() => {
    if (!engine.catalog) return;
    const controller = new AbortController();
    engine.catalog(workspaceId, controller.signal).then(list => { if (!controller.signal.aborted) setEngines(list); }).catch(() => {});
    return () => controller.abort();
  }, [engine, workspaceId]);
  const hasHandle = !!handle;
  useEffect(() => {
    if (!engine.latest || hasHandle) return;
    const controller = new AbortController();
    engine.latest(workspaceId, doc.id, controller.signal).then(found => { if (found && !controller.signal.aborted) setHandles(current => current[doc.id] ? current : { ...current, [doc.id]: found }); }).catch(() => {});
    return () => controller.abort();
  }, [engine, workspaceId, doc.id, hasHandle]);
  const handleRef = useRef(handle);
  useEffect(() => { handleRef.current = handle; });
  useEffect(() => {
    if (!engine.refresh || !active) return;
    const timer = setInterval(() => {
      const current = handleRef.current;
      if (!current || engine.kind === "simulated" || actionPending.current) return;
      const revision = runRevision.current;
      engine.refresh!(workspaceId, current).then(next => { if (revision !== runRevision.current) return; if (next !== current) setHandles(all => all[doc.id] === current ? { ...all, [doc.id]: next } : all); setNotice(note => note?.text.startsWith("Lost contact") ? null : note); })
        .catch(() => { if (revision === runRevision.current) setNotice({ kind: "error", text: "Lost contact with the engine. Trying again…" }); });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [engine, workspaceId, doc.id, active]);

  const fail = (error: unknown, fallback: string) => setNotice({ kind: "error", text: error instanceof Error && error.message ? error.message : fallback });
  async function start(from?: string) {
    runRevision.current += 1;
    setNotice(null);
    try {
      const next = await engine.start(workspaceId, doc, from, Date.now());
      setHandles(current => ({ ...current, [doc.id]: next }));
    } catch (error) { fail(error, "The run could not start."); }
  }
  async function act(action: RunAction) {
    if (!handle || actionPending.current) return false;
    // A block in a later pass of a loop has its own name for the engine; the screen only knows the block.
    const sent: RunAction = action.type === "stop" ? action : { ...action, id: decisionId(snapshot, action.id) };
    actionPending.current = true;
    runRevision.current += 1;
    setNotice(null);
    try {
      const next = await engine.act(workspaceId, handle, sent, Date.now());
      setHandles(current => current[doc.id] === handle ? { ...current, [doc.id]: next } : current);
      return true;
    } catch (error) { fail(error, "That did not work."); return false; }
    finally { actionPending.current = false; }
  }
  const resolve = (agent: TreeAgent, action: "approve" | "reject" | "retry" | "dismiss") => {
    if (action === "approve" || action === "reject") reviewPermission(taskIdOf(agent.id));
    else void act({ type: action, id: taskIdOf(agent.id) });
  };
  const clearRun = () => setHandles(current => { const next = { ...current }; delete next[doc.id]; return next; });

  // ----- editing -----
  const edit = useCallback((change: (doc: ProcessDoc) => ProcessDoc, key?: string) => dispatch({ type: "edit", key, at: Date.now(), next: current => {
    const index = current.processes.findIndex(item => item.id === current.activeId);
    if (index < 0) return current;
    const before = current.processes[index], after = pruneLinks(change(before));
    if (after === before) return current;
    const processes = [...current.processes];
    processes[index] = touch(after);
    return { ...current, processes };
  } }), []);
  const editRoot = (change: (root: ProcessNode) => ProcessNode, key?: string) => edit(item => { const root = change(item.root); return root === item.root ? item : { ...item, root }; }, key);
  const editNode = (id: string, change: (node: ProcessNode) => ProcessNode, field?: string) => editRoot(root => updateNode(root, id, change), field ? `node:${id}:${field}` : undefined);
  const locked = active;

  /** Connects a new block to `parentId`. With a role the block starts as that role (its name, task text and instructions); with a position it goes there. */
  function addBlock(parentId: string, options: { role?: Role; pos?: Point; name?: string; task?: string } = {}) {
    const parent = findNode(doc.root, parentId);
    if (!parent) return;
    const info = options.role ? roles.find(item => item.id === options.role) : undefined;
    const node = createNode({
      name: options.name ?? info?.label ?? "New block", role: options.role ?? "custom", ...(options.task ? { task: options.task } : info ? { task: info.description } : {}),
      ai: { ...parent.ai, instructions: info?.instructions ?? "" }, ...(options.pos ? { pos: options.pos } : {}),
    });
    const next = addChild(doc.root, parentId, node);
    if (next === doc.root) { setNotice({ kind: "error", text: `A process holds up to ${LIMITS.nodes} blocks, ${LIMITS.depth} levels deep.` }); return; }
    editRoot(() => next);
    setCollapsed(current => current.filter(id => id !== parentId));
    setSelectedId(node.id);
    setRevealId(node.id);
    setPalette(false);
    focusName.current = true;
    if (narrow) setDialog("inspector"); else setPanel(true);
  }
  const moveBlock = (id: string, pos: Point) => editRoot(root => setPosition(root, id, pos), `pos:${id}`);
  /** The person drew a connection: from any block to any other. A loop (back to an earlier block) opens its card to set the rounds. */
  function connectBlocks(from: string, to: string) {
    const check = checkLink(doc, from, to);
    if (!check.ok) { setNotice({ kind: "error", text: check.reason }); return; }
    const id = uid("link");
    edit(item => addLink(item, from, to, DEFAULT_ROUNDS, id));
    setNotice(null);
    if (view === "map") setPickedLinkId(id);
    else setNotice({ kind: "info", text: check.kind === "loop" ? `${findNode(doc.root, from)?.name} now loops back to ${findNode(doc.root, to)?.name}.` : `${findNode(doc.root, to)?.name} now waits for ${findNode(doc.root, from)?.name}.` });
  }
  const changeLink = (id: string, change: Parameters<typeof updateLink>[2]) => edit(item => updateLink(item, id, change), `link:${id}:${Object.keys(change).join(",")}`);
  const dropLink = (id: string) => { edit(item => removeLink(item, id)); setPickedLinkId(null); };
  const pickedLink = doc.links?.some(link => link.id === pickedLinkId) ? pickedLinkId : null;
  const addStep = (step: RoleStep) => addBlock(selected.id, { role: step.role, name: step.name, task: step.task });
  function tidyUp() { editRoot(clearPositions); setTidied(count => count + 1); }
  function deleteTask(id: string) {
    const parent = parentNode(doc.root, id);
    editRoot(root => removeNode(root, id));
    setSelectedId(parent?.id ?? doc.root.id);
    setDialog(null);
  }
  function duplicateTask(id: string) {
    const result = duplicateNode(doc.root, id);
    if (!result.copyId) { setNotice({ kind: "error", text: `A process holds up to ${LIMITS.nodes} tasks.` }); return; }
    editRoot(() => result.root);
    setSelectedId(result.copyId);
  }
  function switchTo(id: string) { dispatch({ type: "edit", at: Date.now(), next: current => current.activeId === id ? current : { ...current, activeId: id } }); setSelectedId(library.processes.find(item => item.id === id)?.root.id ?? ""); setCollapsed([]); }
  function addProcess(created: ProcessDoc) {
    if (library.processes.length >= LIMITS.processes) { setNotice({ kind: "error", text: `You can keep up to ${LIMITS.processes} processes.` }); return; }
    dispatch({ type: "edit", at: Date.now(), next: current => ({ ...current, activeId: created.id, processes: [...current.processes, created] }) });
    setSelectedId(created.root.id); setCollapsed([]);
  }
  function createProcess(template: string) {
    const found = templates.find(item => item.id === template);
    addProcess(found ? instantiate(found.create()) : createBlankProcess("Untitled process"));
    setDialog(null);
  }
  function duplicateProcess(id: string) {
    const original = library.processes.find(item => item.id === id);
    if (original) addProcess({ ...instantiate(original), name: `${original.name} (copy)`.slice(0, LIMITS.name) });
  }
  function deleteProcess(id: string) {
    const rest = library.processes.filter(item => item.id !== id);
    if (!rest.length) return;
    dispatch({ type: "edit", at: Date.now(), next: current => ({ ...current, activeId: current.activeId === id ? rest[0].id : current.activeId, processes: rest }) });
    setHandles(current => { const next = { ...current }; delete next[id]; return next; });
    setSelectedId(rest[0].root.id); setDialog(null);
  }
  function exportProcess() { downloadFile(`${doc.name.replace(/[^\w-]+/g, "-").toLowerCase() || "process"}.json`, JSON.stringify({ format: "logio-process", version: 1, process: doc }, null, 2), "application/json"); }
  async function importFile(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error("That file is too large to be a process.");
      const raw = JSON.parse(await file.text()) as { process?: unknown };
      const imported = normalizeProcess(raw?.process ?? raw);
      if (!imported) throw new Error("That file is not a process this page can read.");
      addProcess({ ...instantiate(imported), name: imported.name });
      setNotice({ kind: "info", text: `Imported “${imported.name}” with ${countNodes(imported.root)} tasks.` });
    } catch (error) { fail(error, "That file could not be imported."); }
  }

  useLayoutEffect(() => {
    if (!focusName.current) return;
    focusName.current = false;
    const field = document.querySelector<HTMLInputElement>(".proc-inspector input.proc-input");
    field?.focus({ preventScroll: true }); field?.select();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isField(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "z") { event.preventDefault(); dispatch({ type: event.shiftKey ? "redo" : "undo" }); }
      else if (key === "y") { event.preventDefault(); dispatch({ type: "redo" }); }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const problems = flattenNodes(doc.root).filter(node => problemsOf(node).length);
  const state = snapshot ? stateLabel[snapshot.state] : "Draft";
  const open = dialog && typeof dialog === "object" ? null : dialog;
  // A dialog's own `close` event arrives after the next dialog was chosen, so each one only closes while it is still the current one.
  const closeIf = (match: (current: Dialog) => boolean) => () => setDialog(current => match(current) ? null : current);
  const isKind = (current: Dialog, kind: string) => !!current && typeof current === "object" && current.kind === kind;
  const saveText = save.error ? "Not saved" : save.saving ? "Saving…" : save.dirty ? "Unsaved" : "Saved";

  const inspector = <NodeInspector
    doc={doc} node={selected} engines={engines} simulated={simulated} run={snapshot?.nodes[selected.id]} locked={locked} now={clock}
    onChange={(change, field) => editNode(selected.id, change, field)} onAddChild={() => addBlock(selected.id)} onDuplicate={() => duplicateTask(selected.id)}
    onDelete={() => setDialog({ kind: "delete-task", id: selected.id })} onMove={delta => editRoot(root => moveNode(root, selected.id, delta))}
    onReparent={parentId => editRoot(root => reparentNode(root, selected.id, parentId))} onRunBranch={() => void start(selected.id)}
    onResolve={action => void act({ type: action, id: selected.id })} onReviewPermission={() => reviewPermission(selected.id)}
    onConnect={to => connectBlocks(selected.id, to)} onLinkChange={changeLink} onLinkRemove={dropLink} onAddStep={addStep} onAddNext={role => addBlock(selected.id, { role })} />;

  const runControls = active
    ? <button type="button" className="proc-button proc-button--small" onClick={() => void act({ type: "stop" })}><Square size={12} />Stop</button>
    : <>
      <button type="button" className="proc-button proc-button--dark proc-button--small" onClick={() => void start()}><Play size={12} />{snapshot ? "Run again" : "Run"}</button>
      {snapshot && <button type="button" className="proc-button proc-button--small" onClick={clearRun}>Clear</button>}
    </>;

  const stateChip = <span className="proc-state" data-state={snapshot?.state ?? "draft"}>{state}</span>;
  const saveChip = <span className="proc-save" data-state={save.error ? "error" : save.saving || save.dirty ? "busy" : "ok"} role="status">{save.error ? <AlertTriangle size={13} /> : save.saving ? <LoaderCircle className="proc-spin" size={13} /> : save.dirty ? null : <Check size={13} />}<span>{saveText}</span></span>;
  const mapInset = { right: !narrow && panel ? 372 : 0, top: narrow ? 120 : 72, bottom: 72 };

  return <div className="proc-workspace" ref={setPage} data-narrow={narrow ? "" : undefined} data-view={view}>
    <div className="proc-stage">
      {view === "map"
        ? <ProcessMap
          root={doc.root} tree={tree} selectedId={selected.id} now={clock} formatCost={format} showCost={unit !== "none"} locked={locked} inset={mapInset} fitKey={`${doc.id}:${tidied}`} revealId={revealId}
          links={doc.links ?? []} selectedLinkId={pickedLink} onSelectLink={setPickedLinkId} check={(from, to) => checkLink(doc, from, to)} onConnect={connectBlocks} onLinkChange={changeLink} onLinkRemove={dropLink}
          onSelect={id => { setSelectedId(id); setRevealId(null); setPickedLinkId(null); }} onOpen={id => { setSelectedId(id); if (narrow) setDialog("inspector"); else { setPanel(true); setRevealId(id); } }} onMove={moveBlock} onAdd={(parentId, pos) => addBlock(parentId, { pos })} onDelete={id => setDialog({ kind: "delete-task", id })} />
        : <div className="proc-treewrap" style={{ paddingRight: !narrow && panel ? 372 : undefined }}>
          <AgentTree
            root={tree} title="Tasks" noun={["task", "tasks"]} now={clock} formatCost={format} showCost={unit !== "none"} collapsed={collapsed} onCollapsedChange={setCollapsed}
            onSelect={agent => { setSelectedId(taskIdOf(agent.id)); if (narrow) setDialog("inspector"); }} selectedId={selected.id} onResolve={resolve}
            renderCardActions={agent => {
              const node = findNode(doc.root, agent.id);
              if (!node) return null;
              return <>
                {node.approval && <span className="proc-tag" title="Asks you before it runs">Approval</span>}
                {(() => { const loop = loopFrom(doc, node.id); return loop ? <span className="proc-tag" title={`When it has finished, the blocks from ${findNode(doc.root, loop.to)?.name} down to here run again`}><Repeat size={10} /> back to {findNode(doc.root, loop.to)?.name} ×{loop.rounds ?? 2}</span> : null; })()}
                {waitsFor(doc, node.id).length > 0 && <span className="proc-tag" title="Starts only after these blocks have finished"><Hourglass size={10} /> waits for {waitsFor(doc, node.id).map(from => findNode(doc.root, from)?.name).join(", ")}</span>}
                <button type="button" className="proc-add" aria-label={`Add a sub-task to ${node.name}`} title="Add a sub-task" disabled={locked} onClick={() => addBlock(node.id)}><Plus size={12} /></button>
              </>;
            }}
          />
        </div>}
    </div>

    <div className="proc-top">
      <div className="proc-pill proc-pill--name">
        <h1 className="proc-name"><input aria-label="Process name" value={doc.name} maxLength={LIMITS.name} onChange={event => edit(item => ({ ...item, name: event.target.value }), "name")} onBlur={() => { if (!doc.name.trim()) edit(item => ({ ...item, name: "Untitled process" })); }} /></h1>
        {stateChip}
        <button type="button" className="proc-chip" data-kind={simulated ? "simulated" : "connected"} onClick={() => setDialog("connect")} aria-label={simulated ? "Simulated engine. Connect an engine" : "Connected engine"} title={simulated ? "Nothing is sent to a model. Click to connect an engine." : "A server runs the tasks."}><Plug size={13} /><span>{simulated ? "Simulated" : "Connected"}</span></button>
        <button type="button" className="proc-icon-button" aria-label={`Saved processes (${library.processes.length})`} title="Saved processes" onClick={() => setDialog("library")}><FolderOpen size={16} /></button>
        <button type="button" className="proc-icon-button" aria-label="New process" title="New process" onClick={() => setDialog("new")}><Plus size={16} /></button>
      </div>
      <div className="proc-pill proc-pill--bar agt">
        <AgentBar root={tree} title={view === "map" ? "Blocks" : "Tasks"} noun={view === "map" ? ["block", "blocks"] : ["task", "tasks"]} formatCost={format} showCost={unit !== "none"} onResolve={resolve} onReviewWaiting={() => reviewPermission()} extra={runControls} />
      </div>
    </div>

    <div className="proc-toasts">
      {notice && <div className="proc-notice" data-kind={notice.kind} role={notice.kind === "error" ? "alert" : "status"}><span>{notice.text}</span><button type="button" className="proc-icon-button" aria-label="Dismiss" onClick={() => setNotice(null)}><X size={14} /></button></div>}
      {save.error && <div className="proc-notice" data-kind="error" role="alert"><span>{save.error.code === "conflict" ? "This process was changed somewhere else, so your latest edit was not saved. Reload to see the stored copy." : `${save.error.message} Your edits are kept on this page.`}</span>{save.error.code === "conflict" ? <button type="button" className="proc-button proc-button--small" onClick={onReload}>Reload</button> : <button type="button" className="proc-button proc-button--small" onClick={save.retry}>Retry</button>}</div>}
      {runSave.error && simulated && <div className="proc-notice" data-kind="error" role="alert"><span>The run could not be saved on this browser, so it will not survive a reload.</span><button type="button" className="proc-button proc-button--small" onClick={runSave.retry}>Retry</button></div>}
    </div>

    {view === "map" && doc.root.children.length === 0 && <p className="proc-hint">This is the first block. Select it and use the + around it to connect more blocks, or choose a role under “Add block”.</p>}

    {!narrow && panel && <aside className="proc-side" aria-label="Block settings">
      <button type="button" className="proc-icon-button proc-side__close" aria-label="Close block settings" onClick={() => setPanel(false)}><X size={15} /></button>
      {inspector}
    </aside>}

    {snapshot && <ProcessPermissions key={`${snapshot.id}:${permissionReview.revision}`} doc={handle?.kind === "simulated" ? { ...doc, unit: handle.log.unit } : doc}
      root={handle?.kind === "simulated" ? handle.log.root : doc.root} snapshot={snapshot} simulated={simulated} engines={engines}
      preferredId={permissionReview.id} focusOnOpen={permissionReview.revision > 0}
      onDecide={(id, decision) => act({ type: decision, id })}
      onLocate={id => { setView("map"); setSelectedId(id); setRevealId(id); }} />}

    <div className="proc-dock proc-pill" role="toolbar" aria-label="Map tools">
      <div className="proc-dock__add">
        <button type="button" className="proc-button proc-button--dark proc-button--small" aria-haspopup="menu" aria-expanded={palette} disabled={locked} onClick={() => setPalette(value => !value)}><Plus size={13} />Add block</button>
        {palette && <div className="proc-menu" role="menu" aria-label={`Add a block connected to ${selected.name}`}>
          <p className="proc-menu__title">Connect a new block to <strong>{selected.name}</strong> as</p>
          {roles.map(role => <button key={role.id} type="button" role="menuitem" className="proc-menu__item" onClick={() => addBlock(selected.id, { role: role.id === "custom" ? undefined : role.id })}>
            <span className="proc-menu__dot" style={{ background: role.color }} /><span><strong>{role.label}</strong><small>{role.description}</small></span>
          </button>)}
        </div>}
      </div>
      <span className="proc-sep" />
      <button type="button" className="proc-icon-button" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!history.past.length} onClick={() => dispatch({ type: "undo" })}><Undo2 size={15} /></button>
      <button type="button" className="proc-icon-button" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!history.future.length} onClick={() => dispatch({ type: "redo" })}><Redo2 size={15} /></button>
      <span className="proc-sep" />
      <div className="proc-seg" role="group" aria-label="View">
        <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
        <button type="button" aria-pressed={view === "tree"} onClick={() => setView("tree")}>Tree</button>
      </div>
      {view === "map" && <button type="button" className="proc-icon-button" aria-label="Tidy up the map" title="Tidy up: let the map place every block again" onClick={tidyUp}><LayoutGrid size={15} /></button>}
      <button type="button" className="proc-icon-button" aria-label="Process settings" title="Process settings" onClick={() => setDialog("settings")}><Settings2 size={15} /></button>
      {!narrow && <button type="button" className="proc-icon-button" aria-label="Block settings panel" aria-pressed={panel} title="Block settings" onClick={() => setPanel(value => !value)}><PanelRight size={15} /></button>}
      {problems.length > 0 && <button type="button" className="proc-chip" data-kind="warn" onClick={() => { setSelectedId(problems[0].id); setRevealId(problems[0].id); if (narrow) setDialog("inspector"); else setPanel(true); }}><AlertTriangle size={13} />{problems.length} need{problems.length === 1 ? "s" : ""} attention</button>}
      <span className="proc-sep" />
      {saveChip}
    </div>

    {narrow && <WorkspaceDialog open={open === "inspector"} title="Task settings" onClose={closeIf(current => current === "inspector")} wide><div className="proc-dialog proc-dialog--inspector">{inspector}</div></WorkspaceDialog>}
    <LibraryDialog open={open === "library"} onClose={closeIf(current => current === "library")} library={library} onSwitch={switchTo} onDuplicate={duplicateProcess} onDelete={id => setDialog({ kind: "delete-process", id })} onNew={() => setDialog("new")} />
    <SettingsDialog open={open === "settings"} onClose={closeIf(current => current === "settings")} doc={doc} simulated={simulated} remote={remote}
      onGoal={goal => edit(item => ({ ...item, goal }), "goal")} onUnit={value => edit(item => ({ ...item, unit: value }))} onConnect={() => setDialog("connect")}
      onExport={exportProcess} onImport={() => importRef.current?.click()} onTidy={() => { setDialog(null); tidyUp(); }} />
    <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importFile(file); }} />
    <NewProcessDialog open={open === "new"} onClose={closeIf(current => current === "new")} onCreate={createProcess} />
    <ConnectDialog open={open === "connect"} onClose={closeIf(current => current === "connect")} simulated={simulated} engineCount={engines.length} />
    <ConfirmDialog
      open={isKind(dialog, "delete-task")} onClose={closeIf(current => isKind(current, "delete-task"))} title="Delete task" confirmLabel="Delete"
      message={(() => { const target = dialog && typeof dialog === "object" && dialog.kind === "delete-task" ? findNode(doc.root, dialog.id) : undefined; const count = target ? countNodes(target) - 1 : 0; return target ? `Delete “${target.name}”${count ? ` and its ${count} sub-task${count === 1 ? "" : "s"}` : ""}? You can undo this.` : "Delete this task?"; })()}
      onConfirm={() => { if (dialog && typeof dialog === "object" && dialog.kind === "delete-task") deleteTask(dialog.id); }} />
    <ConfirmDialog
      open={isKind(dialog, "delete-process")} onClose={closeIf(current => isKind(current, "delete-process"))} title="Delete process" confirmLabel="Delete process"
      message={`Delete “${(dialog && typeof dialog === "object" && dialog.kind === "delete-process" ? library.processes.find(item => item.id === dialog.id)?.name : "") ?? ""}” and its run? You can undo this.`}
      onConfirm={() => { if (dialog && typeof dialog === "object" && dialog.kind === "delete-process") deleteProcess(dialog.id); }} />
    <p className="proc-sr" role="status">{providerOf(selected.ai.provider).label} block selected: {selected.name}</p>
  </div>;
}

