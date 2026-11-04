/// <reference lib="webworker" />
import { readWorkbook, CreditImportError } from "./xlsx-reader.ts";
import { columnLetters, fingerprintBytes } from "./text.ts";
import type { Workbook } from "./types.ts";
import type { GridMeta, GridRow, OpenResult, SheetWindow } from "../../components/sites/collateral/simulation/types.ts";

/** Read-only workbook support for Flip. No corrections, predictions, grouping, export or Queue. */
let workbook: Workbook | null = null;
function meta(name?: string): GridMeta {
  const sheet = workbook?.sheets.find(s => s.name === name) ?? workbook?.sheets[0];
  if (!workbook || !sheet) throw new Error("No workbook open.");
  const header = sheet.rows.find(row => row.cells.some(Boolean));
  return { fileName: workbook.fileName, sheet: sheet.name, sheets: workbook.sheets.map(s => s.name), firstRow: 1, lastRow: sheet.rows.at(-1)?.r ?? 1, headerRow: header?.r ?? 1, hiddenRows: sheet.hiddenRows,
    columns: Array.from({ length: sheet.maxCol }, (_, col) => ({ col, letter: columnLetters(col), header: header?.cells[col]?.v ?? "", weight: /MOTA|TEN|DIACHI/.test(header?.cells[col]?.v ?? "") ? 3 : 1 })) };
}
function rows(from: number, count: number, name?: string): GridRow[] {
  const sheet = workbook?.sheets.find(s => s.name === name) ?? workbook?.sheets[0];
  if (!sheet) return [];
  const m = meta(name), byRow = new Map(sheet.rows.filter(row => row.r >= from && row.r < from + count).map(r => [r.r, r]));
  return Array.from({ length: Math.min(200, count, Math.max(0, m.lastRow - from + 1)) }, (_, i) => { const r = from + i, row = byRow.get(r); return { r, hidden: row?.hidden ?? false, header: r === m.headerRow, values: Array.from({ length: sheet.maxCol }, (_, col) => row?.cells[col]?.v ?? "") }; });
}
self.onmessage = async (event: MessageEvent<{ id: number; type: string; bytes?: ArrayBuffer; name?: string; from?: number; count?: number; row?: number; col?: number; sheet?: string }>) => {
  const r = event.data;
  try {
    let value: OpenResult | GridMeta | GridRow[] | SheetWindow;
    if (r.type === "open" && r.bytes) {
      const bytes = new Uint8Array(r.bytes);
      workbook = readWorkbook(bytes, { fileName: r.name ?? "Workbook.xlsx", fileHash: await fingerprintBytes(bytes) });
      const first = meta();
      const sheets = workbook.sheets.map(sheet => { const m = meta(sheet.name); return { name: sheet.name, role: sheet.rows.length ? "primary" as const : "empty" as const, headerRow: m.headerRow, headers: m.columns.map(c => ({ col: c.col, letter: c.letter, text: c.header })), dataRows: sheet.rows.filter(row => row.r > m.headerRow).length, hiddenRows: sheet.hiddenRows, emptyRows: sheet.emptyRows, mergeCount: sheet.mergeCount, autoFilter: sheet.autoFilter, formulaCount: sheet.formulaCount, columns: {}, match: 0 }; });
      value = { fileName: workbook.fileName, size: bytes.length, fileHash: workbook.fileHash, issues: [], blockers: [], headers: Object.fromEntries(first.columns.map(c => [c.col, c.header])),
        profile: { version: 1, fileName: workbook.fileName, fileHash: workbook.fileHash, size: bytes.length, profileId: "read-only", profileVersion: 1, primary: first.sheet, sheets, mapping: null, notes: [] },
        stats: { rowsScanned: sheets.reduce((n, s) => n + s.dataRows, 0), rowsHidden: 0, rowsEmptySkipped: 0, cellsScanned: workbook.sheets.reduce((n, s) => n + s.rows.reduce((sum, row) => sum + row.cells.filter(Boolean).length, 0), 0), issues: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, byCategory: {}, affectedRows: 0, corpusWords: 0, ms: 0 } };
    } else if (r.type === "meta") value = meta(r.sheet);
    else if (r.type === "rows") value = rows(r.from ?? 1, r.count ?? 10, r.sheet);
    else {
      const m = meta(r.sheet), col = r.col ?? 0, row = r.row ?? 1;
      value = { fileName: m.fileName, sheet: m.sheet, target: { row, col, letter: columnLetters(col), header: m.columns[col]?.header ?? "" }, columns: m.columns.map(c => ({ ...c, gapBefore: false })), rows: rows(Math.max(1, row - 2), 7, r.sheet).map(row => ({ ...row, gapBefore: false })), totalRows: m.lastRow, totalCols: m.columns.length, hiddenRows: m.hiddenRows };
    }
    self.postMessage({ id: r.id, value });
  } catch (error) { self.postMessage({ id: r.id, error: error instanceof Error ? error.message : "Could not read workbook.", code: error instanceof CreditImportError ? error.code : "corrupt" }); }
};
