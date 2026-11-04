import { MAU9_PROFILE } from "./mapping-sample.ts";
import { columnLetters } from "./display.ts";
import type { GridMeta, GridRow, Issue, JsonPlan, OpenResult, ReportOptions, WordPrediction } from "./types.ts";
import type { QueueEntry } from "../queue/queue-model.ts";

export const SAMPLE_NAME = "Collateral sample.xlsx";
export const SAMPLE_SIZE = 28672;
export const SAMPLE_HASH = "demo-collateral-preview";
export const SAMPLE_COLUMNS = MAU9_PROFILE.columns.map((spec, col) => ({ col, letter: columnLetters(col), header: spec.header, weight: /MOTA|TEN|DIACHI/.test(spec.header) ? 3 : 1 }));
const sampleRows: Record<string, string>[] = [
  { MACNTCTD: "BR001", TENCNTCTD: "Sample branch", MAKH: "CUS001", TENKH: "Sample customer", MASOBD: "AS001", MOTABDS: "Can h? mau", MOTABD: "Can h? mau", GIATRI: "1500000000" },
  { MACNTCTD: "BR001", TENCNTCTD: "Sample branch", MAKH: "CUS001", TENKH: "Sample customer", MASOBD: "AS001", MOTABDS: "Can h? mau", MOTABD: "Can h? mau", GIATRI: "1500000000" },
  { MACNTCTD: "BR001", TENCNTCTD: "Sample branch", MAKH: "CUS002", TENKH: "  Sample company  ", MASOBD: "AS002", MOTABDS: "Nha mau", GIATRI: "2400000000" },
  { MACNTCTD: "BR002", TENCNTCTD: "Sample office", MAKH: "CUS003", TENKH: "Sample studio", MASOBD: "AS003", MOTABDS: "Xe mau", GIATRI: "700000000" },
  { MACNTCTD: "BR002", TENCNTCTD: "Sample office", MAKH: "CUS003", TENKH: "Sample studio", MASOBD: "AS004", MOTABDS: "Dat mau", GIATRI: "900000000" },
  { MACNTCTD: "BR002", TENCNTCTD: "Sample office", MAKH: "CUS004", TENKH: "Sample workshop", MASOBD: "AS005", MOTABDS: "Tai san mau", GIATRI: "500000000" },
];
export const SAMPLE_GRID: GridRow[] = [
  { r: 1, hidden: false, header: true, values: SAMPLE_COLUMNS.map(c => c.header) },
  ...sampleRows.map((row, i) => ({ r: i + 2, hidden: false, header: false, values: SAMPLE_COLUMNS.map(c => row[c.header] ?? "") })),
];
export const SAMPLE_GRID_META: GridMeta = { fileName: SAMPLE_NAME, sheet: "Sample assets", sheets: ["Sample assets"], columns: SAMPLE_COLUMNS, firstRow: 1, lastRow: 7, headerRow: 1, hiddenRows: 0 };
const issue = (id: string, row: number, header: string, text: string, proposed: string, category: Issue["category"], severity: Issue["severity"]): Issue => ({
  id, row, col: SAMPLE_COLUMNS.find(c => c.header === header)!.col, column: SAMPLE_COLUMNS.find(c => c.header === header)!.letter,
  field: MAU9_PROFILE.columns.find(c => c.header === header)!.field, fileHash: SAMPLE_HASH, sheet: "Sample assets", category, severity,
  originalValueFingerprint: "sample", originalValue: text, proposedValue: proposed, suggestions: [{ value: proposed, basis: "corpus", support: 12 }],
  reason: "Sample issue for interaction preview", status: "open", ruleVersion: "simulation",
});
export const SAMPLE_ISSUES: Issue[] = [
  { ...issue("demo-description", 2, "MOTABDS", "Can h? mau", "Can ho mau", "QUESTION_MARK_IN_WORD", "high"), marks: [{ start: 4, end: 6 }], related: [{ row: 3, column: "AK", value: "Can h? mau" }] },
  issue("demo-twin", 2, "MOTABD", "Can h? mau", "Can ho mau", "QUESTION_MARK_IN_WORD", "high"),
  { ...issue("demo-space", 4, "TENKH", "  Sample company  ", "Sample company", "WHITESPACE_ANOMALY", "low"), fix: { kind: "trim", lossy: false } },
];
export function sampleResult(name = SAMPLE_NAME, size = SAMPLE_SIZE): OpenResult {
  const headers = SAMPLE_COLUMNS.map(c => ({ col: c.col, letter: c.letter, text: c.header }));
  return {
    fileName: name, size, fileHash: SAMPLE_HASH, issues: structuredClone(SAMPLE_ISSUES), blockers: [], headers: Object.fromEntries(headers.map(h => [h.col, h.text])),
    profile: { version: 1, fileName: name, size, fileHash: SAMPLE_HASH, profileId: "sample", profileVersion: 1, primary: "Sample assets", notes: ["UI simulation · sample data only"],
      sheets: [{ name: "Sample assets", role: "primary", headerRow: 1, headers, dataRows: 6, hiddenRows: 0, emptyRows: 0, mergeCount: 0, autoFilter: false, formulaCount: 0, columns: {}, match: 1 }],
      mapping: { resolved: MAU9_PROFILE.columns.map((spec, col) => ({ spec, col })), ambiguous: [], missing: [], unknown: [], duplicates: [] } },
    stats: { rowsScanned: 6, rowsHidden: 0, rowsEmptySkipped: 0, cellsScanned: 240, issues: 3, bySeverity: { critical: 0, high: 2, medium: 0, low: 1 }, byCategory: { QUESTION_MARK_IN_WORD: 2, WHITESPACE_ANOMALY: 1 }, affectedRows: 2, corpusWords: 48, ms: 800 },
  };
}
export const SAMPLE_WORDS: WordPrediction[] = [
  { index: 0, text: "Can", start: 0, end: 3, broken: false, draft: "Can", target: "Can", alternatives: [], confident: true, basis: "clean" },
  { index: 1, text: "h?", start: 4, end: 6, broken: true, draft: "ha", target: "ho", alternatives: [{ text: "ho", score: 1, support: 12 }, { text: "ha", score: .4, support: 4 }], confident: true, basis: "context", contextSupport: 12 },
  { index: 2, text: "mau", start: 7, end: 10, broken: false, draft: "mau", target: "mau", alternatives: [], confident: true, basis: "clean" },
];
export const SAMPLE_DOCUMENT = { simulation: true, KB001: "20261104", KB002: "Sample preparer", KB003: "0000000000", KB004: "sample@example.test", CNTCTD: [
  { TTC01: "BR001", TTC02: "Sample branch", KHACHHANG: [{ TTC03: "CUS001", TTC04: "Sample customer", THONGTINBD: [{ TS001: "AS001", TS005: 1500000000, TS013: "Can ho mau", TS009: ["DEMO-001"] }] }] },
  { TTC01: "BR002", TTC02: "Sample office", KHACHHANG: [{ TTC03: "CUS003", TTC04: "Sample studio", THONGTINBD: [{ TS001: "AS003", TS005: 700000000, TS013: "Xe mau", TS009: ["DEMO-002"] }] }] },
] };
/** Scripted workflow outcomes, never validation of a selected workbook. */
export function sampleJsonPlan(options: ReportOptions, ready = false): JsonPlan {
  return { ready, workbookDate: "20261104", options, fileName: "collateral-sample.json", zipName: "collateral-sample.zip", epoch: 1,
    verification: null, problems: [], timings: { build: 360, verify: 420, replay: 280 },
    checks: ["mapping", "serious-issues", "metadata", "file-name", "grouping", "counts", "schema", "template", "utf8", "replay", "ts013"].map(id => ({ id, ok: ready || !["metadata", "file-name"].includes(id), detail: "Simulated check" })),
    reconciliation: { rowsInSheet: 6, rowsGrouped: 6, rowsUnmatched: 0, rowsEmptySkipped: 0, branches: 2, customers: 4, assets: 5, contracts: 6, duplicateContractRows: 0, owners: 5, assetsWithoutOwner: 0, assetsWithSeveralOwners: 0, assetsWithShared: 0, assetsWithProject: 1, assetsWithLand: 2, assetsWithVehicle: 1, rowsPerAsset: { "1": 4, "2": 1 }, assetsWithValueConflicts: 0, patchedCellsNotUsed: 0, patchedCells: 0 },
  };
}
export function sampleQueue(): QueueEntry[] {
  return [
    { id: "sample-ready", name: SAMPLE_NAME, size: SAMPLE_SIZE, sha256: "demo-preview-ready", uploadedAt: "2026-11-04T02:30:00Z", status: "ready", sheets: 1, rows: 6 },
    { id: "sample-waiting", name: "Branch sample.xlsx", size: 18432, sha256: "demo-preview-waiting", uploadedAt: "2026-11-04T02:15:00Z", status: "uploaded" },
    { id: "sample-failed", name: "Review sample.xlsx", size: 9216, sha256: "demo-preview-failed", uploadedAt: "2026-11-04T02:00:00Z", status: "failed", error: "Simulated failure · use another sample" },
  ];
}
