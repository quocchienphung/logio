import type { Workbook } from "./types.ts";
import { readWorkbook } from "./xlsx-reader.ts";
import { fingerprintBytes } from "./text.ts";
import { MAU9_PROFILE, type MappingProfile } from "./mapping-profiles.ts";
import { profileWorkbook, type WorkbookProfile } from "./profile.ts";
import { detectIssues, groupKey, type ScanResult } from "./detect.ts";
import type { Issue } from "./types.ts";
import type { ReviewContext, ReviewState } from "./review.ts";
import { cellKey } from "./review.ts";
import { patchWorkbookBytes, verifyRoundTrip, exportName, type CellPatch, type RoundTripReport } from "./xlsx-patcher.ts";

/** Everything the engine holds about one opened workbook. It lives in memory (a Web Worker) and is never saved or sent anywhere. */
export interface Session {
  bytes: Uint8Array;
  workbook: Workbook;
  wprofile: WorkbookProfile;
  profile: MappingProfile;
  scan: ScanResult;
  ctx: ReviewContext;
  options: OpenOptions;
}
export interface OpenOptions { profile?: MappingProfile; overrides?: Record<string, number>; diacriticPolicy?: boolean; onProgress?: (phase: "read" | "scan", fraction: number) => void }

export function buildContext(workbook: Workbook, wprofile: WorkbookProfile, profile: MappingProfile, scan: ScanResult, diacriticPolicy: boolean): ReviewContext {
  const sheet = workbook.sheets.find(item => item.name === wprofile.primary);
  const resolved = wprofile.mapping?.resolved ?? [];
  const byCol = new Map(resolved.map(item => [item.col, item.spec]));
  const colOf = (header: string) => resolved.find(item => item.spec.header === header)?.col;
  const pair = profile.descriptionPair;
  const primary = pair ? colOf(pair.primary) : undefined, secondary = pair ? colOf(pair.secondary) : undefined;
  const branch = colOf(profile.groupBy.branch), customer = colOf(profile.groupBy.customer), asset = colOf(profile.groupBy.asset);
  const rows = new Map(sheet?.rows.map(row => [row.r, row]) ?? []);
  const byCell = new Map<string, Issue[]>();
  for (const issue of scan.issues) { const key = `${issue.row}\u0001${issue.col}`; const list = byCell.get(key); if (list) list.push(issue); else byCell.set(key, [issue]); }
  const members = new Map<string, number[]>();
  const groupRowsOf = (issue: Issue): number[] => {
    if (!issue.group || !sheet || branch === undefined || customer === undefined || asset === undefined) return [issue.row];
    const cached = members.get(issue.id);
    if (cached) return cached;
    const cols = issue.group.level === "asset" ? [branch, customer, asset] : issue.group.level === "customer" ? [branch, customer] : [branch];
    const found = sheet.rows.filter(row => groupKey(row, cols) === issue.group!.key).map(row => row.r);
    members.set(issue.id, found);
    return found;
  };
  let conflictIndex: Map<string, Issue[]> | null = null;
  const conflictsAt = (row: number, col: number): Issue[] => {
    if (!conflictIndex) {
      conflictIndex = new Map();
      for (const issue of scan.issues) if (issue.category === "CONFLICTING_DUPLICATE") for (const member of groupRowsOf(issue)) { const key = `${member}\u0001${issue.col}`; conflictIndex.set(key, [...(conflictIndex.get(key) ?? []), issue]); }
    }
    return conflictIndex.get(`${row}\u0001${col}`) ?? [];
  };
  return {
    groupRowsOf, conflictsAt, issuesAt: (sheetName, row, col) => sheetName === sheet?.name ? byCell.get(`${row}\u0001${col}`) ?? [] : [],
    fileHash: workbook.fileHash, issues: scan.issues, sheet,
    specOfCol: col => byCol.get(col), corpus: col => scan.corpora.get(col),
    original: (sheetName, row, col) => sheetName === sheet?.name ? rows.get(row)?.cells[col]?.v ?? "" : workbook.sheets.find(item => item.name === sheetName)?.rows.find(r => r.r === row)?.cells[col]?.v ?? "",
    groupCols: branch !== undefined && customer !== undefined && asset !== undefined ? { branch, customer, asset } : null,
    twinOf: col => primary !== undefined && secondary !== undefined ? (col === primary ? secondary : col === secondary ? primary : undefined) : undefined,
    diacriticPolicy,
  };
}

export async function openSession(bytes: Uint8Array, fileName: string, options: OpenOptions = {}): Promise<Session> {
  const profile = options.profile ?? MAU9_PROFILE;
  const diacriticPolicy = options.diacriticPolicy !== false;
  const fileHash = await fingerprintBytes(bytes);
  const workbook = readWorkbook(bytes, { fileName, fileHash, onProgress: progress => options.onProgress?.("read", progress.phase === "sheet" ? 0.2 + progress.fraction * 0.8 : 0.1) });
  const wprofile = profileWorkbook(workbook, profile, options.overrides);
  const scan = detectIssues(workbook, wprofile, profile, { diacriticPolicy, onProgress: fraction => options.onProgress?.("scan", fraction) });
  return { bytes, workbook, wprofile, profile, scan, ctx: buildContext(workbook, wprofile, profile, scan, diacriticPolicy), options };
}

/** The approved patches as cell writes for the exporter. */
export function patchesOf(state: ReviewState): CellPatch[] {
  return Object.values(state.patches).map(patch => ({ sheet: patch.sheet, row: patch.row, col: patch.col, value: patch.value, asNumber: patch.asNumber }));
}
export interface ExportedWorkbook { fileName: string; bytes: Uint8Array; changedCells: number; roundTrip: RoundTripReport }
/** Build the corrected copy and prove it: the file is read back and compared with the original before it is offered. */
export function exportCorrected(session: Session, state: ReviewState): ExportedWorkbook {
  const patches = patchesOf(state);
  const report = patchWorkbookBytes(session.bytes, session.workbook, patches);
  const roundTrip = verifyRoundTrip(session.workbook, report.bytes, patches);
  return { fileName: exportName(session.workbook.fileName), bytes: report.bytes, changedCells: report.changedCells, roundTrip };
}
export { cellKey };
