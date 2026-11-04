import { SAMPLE_COLUMNS, SAMPLE_GRID, SAMPLE_GRID_META, SAMPLE_ISSUES, SAMPLE_NAME, SAMPLE_SIZE, SAMPLE_WORDS, sampleJsonPlan, sampleResult } from "./fixtures.ts";
import type { BulkItem, DuplicatePlan, FixKind, GridMeta, GridRow, IssueState, OpenResult, ReportMeta, ReportOptions, ReviewView, RowContext, SheetWindow } from "./types.ts";

export interface RepairProgress { stage: "evidence_index" | "candidate_generation" | "validation" | "patch" | "package_verification" | "download"; processedRows: number; totalRows: number; applied: number; unresolved: number; elapsedMs: number }
export interface RepairPreview { status: "done" | "cancelled"; changed: number; unresolved: number }
export interface ExportedFile { fileName: string; changedCells: number; ok: boolean; wrongValues: number; unexpectedChanges: number }
export type RestoreOutcome = { ok: true; patches: number; exceptions: number; matches: boolean; rulesChanged: boolean } | { ok: false; error: "cancelled" };
interface Snapshot {
  phase: "idle" | "scanning" | "ready" | "failed";
  progress: { phase: "read" | "scan"; fraction: number };
  failure: { message: string; code?: string } | null;
  result: OpenResult | null; view: ReviewView | null; busy: boolean;
  repairProgress: RepairProgress | null; fileName: string; fileSize: number; diacriticPolicy: boolean; openMs: number; unsaved: boolean;
}
const initial = (): Snapshot => ({ phase: "idle", progress: { phase: "read", fraction: 0 }, failure: null, result: null, view: null, busy: false, repairProgress: null, fileName: "", fileSize: 0, diacriticPolicy: true, openMs: 800, unsaved: false });

/** A disposable UI playback store. It only receives a file's label and size, never its bytes. */
export class CollateralPlayback {
  private snapshot = initial();
  private listeners = new Set<() => void>();
  private timers = new Map<ReturnType<typeof setTimeout>, (ok: boolean) => void>();
  private generation = 0;
  private repairGeneration = 0;
  private past: ReviewView[] = [];
  private future: ReviewView[] = [];
  private cells: Record<string, string> = {};
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private publish(next: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...next }; this.listeners.forEach(listener => listener()); }
  private wait(ms: number): Promise<boolean> {
    return new Promise(resolve => { const timer = setTimeout(() => { this.timers.delete(timer); resolve(true); }, ms); this.timers.set(timer, resolve); });
  }
  dispose = () => { this.generation++; this.repairGeneration++; for (const [timer, resolve] of this.timers) { clearTimeout(timer); resolve(false); } this.timers.clear(); };
  private view(states: Record<string, IssueState>): ReviewView {
    const byStatus = { open: 0, edited: 0, verified: 0, accepted_exception: 0 };
    for (const issue of SAMPLE_ISSUES) byStatus[states[issue.id]?.status ?? "open"]++;
    const blocking = SAMPLE_ISSUES.filter(i => i.severity === "high" && !["verified", "accepted_exception"].includes(states[i.id]?.status ?? "open")).length;
    return { states, introduced: [], canUndo: this.past.length > 0, canRedo: this.future.length > 0, summary: { total: SAMPLE_ISSUES.length, byStatus, blocking, blockingBySeverity: { high: blocking }, exceptions: byStatus.accepted_exception, patched: Object.values(states).filter(s => s.correctedValue !== undefined).length } };
  }
  private commit(states: Record<string, IssueState>) {
    if (this.snapshot.view) this.past.push(this.snapshot.view);
    this.future = []; this.cells = {};
    this.publish({ view: this.view(states) });
  }
  open = async (file: Pick<File, "name" | "size"> = { name: SAMPLE_NAME, size: SAMPLE_SIZE }, policy = this.snapshot.diacriticPolicy) => {
    this.dispose(); const run = this.generation;
    this.past = []; this.future = []; this.cells = {};
    this.publish({ ...initial(), phase: "scanning", fileName: file.name, fileSize: file.size, diacriticPolicy: policy });
    for (let step = 1; step <= 4; step++) {
      if (!await this.wait(200) || run !== this.generation) return;
      this.publish({ progress: { phase: step < 3 ? "read" : "scan", fraction: step < 3 ? step / 2 : (step - 2) / 2 } });
    }
    this.publish({ phase: "ready", result: sampleResult(file.name, file.size), view: this.view({}) });
  };
  close = () => { this.dispose(); this.past = []; this.future = []; this.cells = {}; this.publish(initial()); };
  retry = () => this.open({ name: this.snapshot.fileName || SAMPLE_NAME, size: this.snapshot.fileSize || SAMPLE_SIZE });
  rescan = (policy: boolean, _overrides: Record<string, number> = {}) => {
    void _overrides;
    if (this.snapshot.phase === "idle") this.publish({ diacriticPolicy: policy });
    else void this.open({ name: this.snapshot.fileName, size: this.snapshot.fileSize }, policy);
  };
  edit = async (edits: { row: number; col: number; value: string; source?: string }[]) => {
    const run = this.generation; this.publish({ busy: true });
    if (!await this.wait(240) || run !== this.generation) return;
    const states = { ...this.snapshot.view?.states };
    for (const edit of edits) for (const issue of SAMPLE_ISSUES.filter(i => i.row === edit.row && i.col === edit.col)) states[issue.id] = { status: edit.value === issue.originalValue ? "open" : "verified", correctedValue: edit.value };
    this.commit(states); this.publish({ busy: false });
    return { type: "view" as const, view: this.snapshot.view! };
  };
  reject = async (id: string) => { this.commit({ ...this.snapshot.view?.states, [id]: { ...this.snapshot.view?.states[id], status: "open", suggestionRejected: true } }); };
  reopen = async (id: string) => { const states = { ...this.snapshot.view?.states }; delete states[id]; this.commit(states); };
  accept = async (id: string, reason: string) => { if (!reason.trim()) return false; this.commit({ ...this.snapshot.view?.states, [id]: { status: "accepted_exception", exceptionReason: reason } }); return true; };
  chooseGroup = async (id: string, value: string) => { const issue = SAMPLE_ISSUES.find(i => i.id === id); if (issue) await this.edit([{ row: issue.row, col: issue.col, value }]); };
  undo = async () => {
    const previous = this.past.pop(); if (!previous) return;
    if (this.snapshot.view) this.future.push(this.snapshot.view);
    this.cells = {}; this.publish({ view: this.view(previous.states) });
  };
  redo = async () => {
    const next = this.future.pop(); if (!next) return;
    if (this.snapshot.view) this.past.push(this.snapshot.view);
    this.cells = {}; this.publish({ view: this.view(next.states) });
  };
  bulkPlan = async (kind: FixKind): Promise<BulkItem[]> => SAMPLE_ISSUES.filter(i => i.fix?.kind === kind && !this.snapshot.view?.states[i.id]?.correctedValue).map(i => ({ issueId: i.id, sheet: i.sheet, row: i.row, col: i.col, field: i.field, from: i.originalValue, to: i.proposedValue! }));
  bulkApply = async (kind: FixKind) => { await this.edit((await this.bulkPlan(kind)).map(i => ({ row: i.row, col: i.col, value: i.to }))); };
  groupRows = async (_id: string) => { void _id; return [2, 3]; };
  duplicatePlan = async (id: string, includeTwin: boolean): Promise<DuplicatePlan | null> => {
    const issue = SAMPLE_ISSUES.find(i => i.id === id); if (!issue) return null;
    return { scope: "asset", sheet: issue.sheet, anchor: { row: issue.row, col: issue.col }, rows: [2, 3], cells: includeTwin ? 4 : 2, skippedEdited: 0, skippedExceptions: 0, distinctAssets: 1, canPropagate: true, hiddenRows: 0, reason: "eligible" };
  };
  duplicateApply = async (id: string, value: string, includeTwin: boolean) => {
    const edits = SAMPLE_ISSUES.filter(i => includeTwin ? i.category === "QUESTION_MARK_IN_WORD" : i.id === id).map(i => ({ row: i.row, col: i.col, value }));
    const run = this.generation;
    await this.edit(edits);
    if (run !== this.generation) return null;
    for (const item of edits) this.cells[`3:${item.col}`] = value;
    return { rows: 2, changedCells: includeTwin ? 4 : 2 };
  };
  gridMeta = async (_sheet?: string): Promise<GridMeta> => { void _sheet; return { ...SAMPLE_GRID_META, fileName: this.snapshot.fileName }; };
  gridRows = async (from: number, count: number, _sheet?: string): Promise<GridRow[]> => {
    void _sheet;
    return SAMPLE_GRID.filter(row => row.r >= from && row.r < from + count).map(row => ({ ...row, values: row.values.map((value, col) => this.cells[`${row.r}:${col}`] ?? Object.entries(this.snapshot.view?.states ?? {}).map(([id, state]) => ({ issue: SAMPLE_ISSUES.find(i => i.id === id), state })).find(i => i.issue?.row === row.r && i.issue.col === col)?.state.correctedValue ?? value) }));
  };
  rowContext = async (row: number): Promise<RowContext> => ({ row, hidden: false, cells: SAMPLE_COLUMNS.map((c, col) => ({ col, letter: c.letter, header: c.header, value: SAMPLE_GRID.find(r => r.r === row)?.values[col] ?? "" })) });
  sheetWindow = async (row: number, col: number): Promise<SheetWindow> => ({ fileName: this.snapshot.fileName, sheet: "Sample assets", target: { row, col, letter: SAMPLE_COLUMNS[col]?.letter ?? "A", header: SAMPLE_COLUMNS[col]?.header ?? "" }, columns: SAMPLE_COLUMNS.map(c => ({ ...c, gapBefore: false })), rows: (await this.gridRows(1, 7)).map(r => ({ ...r, gapBefore: false })), totalRows: 7, totalCols: SAMPLE_COLUMNS.length, hiddenRows: 0 });
  predict = async (_row: number, _col: number) => { void _row; void _col; return { text: "Can h? mau", predictions: structuredClone(SAMPLE_WORDS), modelWords: 48 }; };
  exportXlsx = async (): Promise<ExportedFile | null> => {
    const run = this.generation; this.publish({ busy: true });
    if (!await this.wait(500) || run !== this.generation) return null;
    this.publish({ busy: false });
    return { fileName: "collateral-sample.preview.xlsx", changedCells: this.snapshot.view?.summary.patched ?? 0, ok: true, wrongValues: 0, unexpectedChanges: 0 };
  };
  saveProgress = async () => ({ fileName: "collateral-sample.progress.json", patches: this.snapshot.view?.summary.patched ?? 0 });
  loadProgress = async (_file: File): Promise<RestoreOutcome> => {
    void _file;
    await this.edit([{ row: 2, col: SAMPLE_ISSUES[0].col, value: "Can ho mau" }]);
    return { ok: true, patches: 1, exceptions: 0, matches: true, rulesChanged: false };
  };
  jsonPlan = async (_meta: ReportMeta, options: ReportOptions, final = false, _zip = false) => {
    void _meta; void _zip;
    return { plan: sampleJsonPlan(options, final), audit: "Simulation · sample checks only", csv: "simulation,sample\ntrue,true" };
  };
  autoRepair = async (): Promise<{ fileName: string; report: RepairPreview } | null> => {
    const run = this.generation, repair = ++this.repairGeneration;
    this.publish({ busy: true });
    const stages: RepairProgress["stage"][] = ["evidence_index", "candidate_generation", "validation", "patch", "package_verification", "download"];
    for (const [i, stage] of stages.entries()) {
      if (!await this.wait(250) || run !== this.generation) return null;
      if (repair !== this.repairGeneration) { this.publish({ busy: false, repairProgress: null }); return { fileName: "collateral-sample.preview.xlsx", report: { status: "cancelled", changed: 0, unresolved: 3 } }; }
      this.publish({ repairProgress: { stage, processedRows: i + 1, totalRows: 6, applied: i >= 3 ? 2 : 0, unresolved: i >= 3 ? 1 : 3, elapsedMs: (i + 1) * 250 } });
    }
    this.commit(Object.fromEntries(SAMPLE_ISSUES.filter(i => i.category === "QUESTION_MARK_IN_WORD").map(i => [i.id, { status: "verified", correctedValue: i.proposedValue }])));
    this.publish({ busy: false });
    return { fileName: "collateral-sample.preview.xlsx", report: { status: "done", changed: 2, unresolved: 1 } };
  };
  cancelRepair = () => { this.repairGeneration++; };
  clearFailure = () => this.publish({ failure: null });
}
