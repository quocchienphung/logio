
import type { ColumnSpec } from "./mapping-sample";

export type Severity = "critical" | "high" | "medium" | "low";

export type IssueStatus = "open" | "edited" | "verified" | "accepted_exception";

export type IssueCategory =
  | "QUESTION_MARK_IN_WORD" | "UNICODE_REPLACEMENT" | "ENCODING_MOJIBAKE" | "INVISIBLE_OR_CONTROL" | "DIACRITIC_POLICY" | "WHITESPACE_ANOMALY"
  | "DESCRIPTION_CONFLICT" | "INVALID_CODE_OR_DATE" | "MISSING_REQUIRED" | "CONFLICTING_DUPLICATE" | "ARRAY_PARSE_AMBIGUOUS"
  | "UNKNOWN_COLUMN" | "TYPE_MISMATCH" | "FORMULA_UNRESOLVED" | "DUPLICATE_HEADER" | "INCOMPLETE_GROUP";

export interface Suggestion {
  value: string;
  
  basis: "corpus" | "decoded" | "mechanical";
  
  support: number;
}

export interface TokenCandidates {
  start: number;
  end: number;
  text: string;
  candidates: { text: string; support: number }[];
}

export type FixKind = "trim" | "collapse-spaces" | "normalize-space-chars" | "strip-invisible" | "strip-diacritics" | "decode-mojibake";

export interface Fix { kind: FixKind; lossy: boolean }

export interface Issue {
  id: string;
  fileHash: string;
  sheet: string;
  
  row: number;
  
  column: string;
  col: number;
  field: string;
  category: IssueCategory;
  severity: Severity;
  originalValueFingerprint: string;
  
  originalValue: string;
  
  proposedValue?: string;
  fix?: Fix;
  
  suggestions?: Suggestion[];
  tokens?: TokenCandidates[];
  reason: string;
  
  marks?: { start: number; end: number; label?: string }[];
  
  group?: { level: "asset" | "branch" | "customer"; key: string };
  
  block?: { id: string; anchor: string };
  
  related?: { row: number; column: string; value?: string }[];
  status: IssueStatus;
  correctedValue?: string;
  exceptionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  ruleVersion: string;
}

export interface HeaderCell { col: number; letter: string; text: string }

export type SheetRole = "primary" | "csv-packed" | "empty" | "other";

export interface ColumnStats { filled: number; types: Record<string, number>; leadingZero: number }

export interface SheetProfile {
  name: string;
  role: SheetRole;
  
  headerRow: number | null;
  headers: HeaderCell[];
  dataRows: number;
  hiddenRows: number;
  emptyRows: number;
  mergeCount: number;
  autoFilter: boolean;
  formulaCount: number;
  columns: Record<number, ColumnStats>;
  
  match: number;
  ambiguousHeader?: boolean;
}

export interface ResolvedColumn { spec: ColumnSpec; col: number }

export interface MappingResolution {
  resolved: ResolvedColumn[];
  
  ambiguous: { spec: ColumnSpec; cols: number[] }[];
  missing: ColumnSpec[];
  unknown: HeaderCell[];
  duplicates: { text: string; cols: number[] }[];
}

export interface WorkbookProfile {
  version: 1;
  fileName: string;
  fileHash: string;
  size: number;
  profileId: string;
  profileVersion: number;
  sheets: SheetProfile[];
  primary: string | null;
  mapping: MappingResolution | null;
  notes: string[];
}

export interface ScanStats {
  rowsScanned: number;
  rowsHidden: number;
  rowsEmptySkipped: number;
  cellsScanned: number;
  issues: number;
  bySeverity: Record<Severity, number>;
  byCategory: Partial<Record<IssueCategory, number>>;
  affectedRows: number;
  corpusWords: number;
  ms: number;
}

export interface IssueState { status: IssueStatus; correctedValue?: string; exceptionReason?: string; reviewedAt?: string; suggestionRejected?: boolean; stillPresent?: boolean }

export interface BulkItem { issueId: string; sheet: string; row: number; col: number; field: string; from: string; to: string }

export interface ReviewSummary {
  total: number;
  byStatus: Record<IssueStatus, number>;
  
  blocking: number;
  blockingBySeverity: Partial<Record<Severity, number>>;
  exceptions: number;
  patched: number;
}

export interface Alternative { text: string; score: number; support: number }

export interface WordPrediction {
  index: number; text: string; start: number; end: number;
  broken: boolean;
  
  draft: string;
  
  target: string;
  
  alternatives: Alternative[];
  
  confident: boolean;
  
  basis: "context" | "frequency" | "none" | "clean";
  
  contextSupport?: number;
  
  margin?: number;
  
  fallback?: boolean;
}

export interface DuplicatePlan {
  scope: "asset"; sheet: string; anchor: { row: number; col: number }; rows: number[]; cells: number;
  skippedEdited: number; skippedExceptions: number; distinctAssets: number; canPropagate: boolean;
  hiddenRows: number;
  reason: "eligible" | "protected_or_unmapped" | "no_matching_rows";
}

export interface ReportMeta { KB001: string; KB002: string; KB003: string; KB004: string }

export type OwnerPolicy = "distinct" | "first";

export type OrderPolicy = "code" | "source";

export interface FileNaming { tctd: string; sequence: string }

export interface ReportOptions { ownerPolicy: OwnerPolicy; order: OrderPolicy; file?: FileNaming }

export interface Reconciliation {
  rowsInSheet: number;
  rowsGrouped: number;
  rowsUnmatched: number;
  rowsEmptySkipped: number;
  branches: number;
  customers: number;
  assets: number;
  
  contracts: number;
  
  duplicateContractRows: number;
  owners: number;
  assetsWithoutOwner: number;
  assetsWithSeveralOwners: number;
  
  assetsWithShared: number;
  assetsWithProject: number;
  assetsWithLand: number;
  assetsWithVehicle: number;
  
  rowsPerAsset: Record<string, number>;
  
  assetsWithValueConflicts: number;
  
  patchedCellsNotUsed: number;
  patchedCells: number;
}

export interface Verification { ok: boolean; utf8: boolean; parses: boolean; schemaErrors: string[];  keyOrderOk: boolean; templateErrors: string[]; bytes: number }

export interface ExportCheck { id: string; ok: boolean; detail?: string }

export interface JsonPlan {
  reconciliation: Reconciliation;
  checks: ExportCheck[];
  
  ready: boolean;
  verification: Verification | null;
  problems: string[];
  
  workbookDate: string | null;
  options: ReportOptions;
  
  fileName: string | null;
  zipName: string | null;
  
  timings?: { build: number; verify: number; replay: number };
  
  epoch?: number;
}

export interface OpenResult {
  fileName: string;
  size: number;
  fileHash: string;
  profile: WorkbookProfile;
  issues: Issue[];
  stats: ScanStats;
  blockers: string[];
  
  headers: Record<number, string>;
}

export interface ReviewView {
  states: Record<string, IssueState>;
  introduced: Issue[];
  summary: ReviewSummary;
  canUndo: boolean;
  canRedo: boolean;
}

export interface RowCell { col: number; letter: string; header: string; value: string }

export interface RowContext { row: number; hidden: boolean; cells: RowCell[] }

export interface SheetWindow {
  fileName: string;
  sheet: string;
  target: { row: number; col: number; letter: string; header: string };
  
  columns: { col: number; letter: string; header: string; gapBefore: boolean }[];
  rows: { r: number; hidden: boolean; header: boolean; gapBefore: boolean; values: string[] }[];
  totalRows: number;
  totalCols: number;
  hiddenRows: number;
}

export interface GridMeta { fileName: string; sheet: string; sheets?: string[]; columns: { col: number; letter: string; header: string; weight: number }[]; firstRow: number; lastRow: number; headerRow: number; hiddenRows: number }

export interface GridRow { r: number; hidden: boolean; header: boolean; values: string[] }

