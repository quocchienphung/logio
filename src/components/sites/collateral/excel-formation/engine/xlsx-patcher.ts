import { unzipSync, zipSync } from "fflate";
import type { Workbook } from "./types.ts";
import { readWorkbook } from "./xlsx-reader.ts";
import { columnIndex, columnLetters, writeXmlText } from "./text.ts";

/**
 * Corrected-copy export. The approved patches are written into the original file's XML at their exact cell: styles, filters, hidden rows,
 * other sheets, defined names and every untouched cell stay as they were. Nothing is rewritten through a JSON round trip.
 */
export interface CellPatch { sheet: string; row: number; col: number; value: string; asNumber: boolean }
export interface PatchReport { bytes: Uint8Array; changedCells: number; sheetsTouched: string[] }

export class PatchError extends Error {
  constructor(message: string) { super(message); this.name = "PatchError"; }
}

const FIXED_TIME = Date.UTC(1980, 0, 1);

function cellXml(ref: string, style: string, patch: CellPatch): string {
  const s = style ? ` s="${style}"` : "";
  return patch.asNumber ? `<c r="${ref}"${s}><v>${patch.value.trim()}</v></c>` : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${writeXmlText(patch.value)}</t></is></c>`;
}

/** Find `<tag r="N"` where N is exactly the row number (not a longer one that starts with it). */
function findRow(xml: string, row: number, from: number, end: number): number {
  const needle = `<row r="${row}"`;
  let at = xml.indexOf(needle, from);
  while (at >= 0 && at < end) {
    const next = xml.charCodeAt(at + needle.length);
    if (next === 32 || next === 62 || next === 47) return at;
    at = xml.indexOf(needle, at + 1);
  }
  return -1;
}

/** Rewrite one `<row>`: returns its new text and where the old one ended in the original XML. */
function patchRow(xml: string, rowAt: number, rowNumber: number, patches: CellPatch[]): { text: string; end: number } {
  const headEnd = xml.indexOf(">", rowAt);
  const selfClosing = xml.charCodeAt(headEnd - 1) === 47;
  let head = xml.slice(rowAt, selfClosing ? headEnd - 1 : headEnd);
  let body = selfClosing ? "" : xml.slice(headEnd + 1, xml.indexOf("</row>", headEnd));
  const end = selfClosing ? headEnd + 1 : headEnd + 1 + body.length + 6;
  for (const patch of patches) {
    const ref = columnLetters(patch.col) + rowNumber;
    const needle = `<c r="${ref}"`;
    let at = body.indexOf(needle);
    while (at >= 0) { const next = body.charCodeAt(at + needle.length); if (next === 32 || next === 62 || next === 47) break; at = body.indexOf(needle, at + 1); }
    if (at >= 0) {
      const tagEnd = body.indexOf(">", at);
      const style = /\ss="(\d+)"/.exec(body.slice(at, tagEnd + 1))?.[1] ?? "";
      const cellEnd = body.charCodeAt(tagEnd - 1) === 47 ? tagEnd + 1 : body.indexOf("</c>", tagEnd) + 4;
      body = body.slice(0, at) + cellXml(ref, style, patch) + body.slice(cellEnd);
    } else {
      // The cell does not exist yet: insert it before the first cell of a later column, keeping the row in column order.
      let insertAt = body.length;
      for (const match of body.matchAll(/<c r="([A-Z]+)\d+"/g)) if (columnIndex(match[1]) > patch.col) { insertAt = match.index!; break; }
      body = body.slice(0, insertAt) + cellXml(ref, "", patch) + body.slice(insertAt);
      head = head.replace(/\sspans="[^"]*"/, "");
    }
  }
  return { text: head + ">" + body + "</row>", end };
}

/** Where a row that is not in the file belongs: right before the first row with a larger number, or before `</sheetData>`. */
function insertionPoint(xml: string, from: number, rowNumber: number, dataEnd: number): number {
  let pos = from;
  while (true) {
    const at = xml.indexOf("<row r=\"", pos);
    if (at < 0 || at >= dataEnd) return dataEnd;
    if (Number(/^<row r="(\d+)"/.exec(xml.slice(at, at + 24))![1]) > rowNumber) return at;
    pos = at + 8;
  }
}

/** One forward pass over the sheet: untouched XML is copied as it is, only the rows with approved patches are rewritten. */
function patchSheet(xml: string, patches: CellPatch[]): string {
  const byRow = new Map<number, CellPatch[]>();
  for (const patch of patches) (byRow.get(patch.row) ?? byRow.set(patch.row, []).get(patch.row)!).push(patch);
  const dataStart = xml.indexOf("<sheetData");
  const dataEnd = xml.indexOf("</sheetData>");
  if (dataStart < 0 || dataEnd < 0) throw new PatchError("The sheet has no data section, so nothing was exported.");
  const out: string[] = [];
  let cursor = 0;
  for (const [rowNumber, rowPatches] of [...byRow].sort((a, b) => a[0] - b[0])) {
    const rowAt = findRow(xml, rowNumber, cursor, dataEnd);
    if (rowAt >= 0) {
      const { text, end } = patchRow(xml, rowAt, rowNumber, rowPatches);
      out.push(xml.slice(cursor, rowAt), text);
      cursor = end;
    } else {
      const at = insertionPoint(xml, cursor, rowNumber, dataEnd);
      const fresh = `<row r="${rowNumber}"></row>`;
      const { text } = patchRow(fresh, 0, rowNumber, rowPatches);
      out.push(xml.slice(cursor, at), text);
      cursor = at;
    }
  }
  out.push(xml.slice(cursor));
  return out.join("");
}

export function patchWorkbookBytes(original: Uint8Array, workbook: Workbook, patches: CellPatch[]): PatchReport {
  const files = unzipSync(original);
  const bySheet = new Map<string, CellPatch[]>();
  for (const patch of patches) (bySheet.get(patch.sheet) ?? bySheet.set(patch.sheet, []).get(patch.sheet)!).push(patch);
  const touched: string[] = [];
  for (const [sheetName, list] of bySheet) {
    const part = workbook.sheets.find(sheet => sheet.name === sheetName)?.part;
    if (!part || !files[part]) throw new PatchError(`Sheet ${sheetName} was not found in the file, so nothing was exported.`);
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(files[part]);
    files[part] = new TextEncoder().encode(patchSheet(xml, list));
    touched.push(sheetName);
  }
  const bytes = zipSync(files, { level: 6, mtime: FIXED_TIME });
  return { bytes, changedCells: patches.length, sheetsTouched: touched };
}

export interface RoundTripReport { ok: boolean; changedCells: number; wrongValues: number; unexpectedChanges: number; sheetsCompared: number }
/**
 * Re-read the exported bytes and compare them with the original workbook: every patched cell must hold exactly its approved value and every
 * other cell must be identical. Fails closed: a single difference makes `ok` false.
 */
export function verifyRoundTrip(before: Workbook, exported: Uint8Array, patches: CellPatch[]): RoundTripReport {
  const after = readWorkbook(exported, { fileName: before.fileName, fileHash: before.fileHash });
  const patched = new Map(patches.map(patch => [`${patch.sheet}\u0001${patch.row}\u0001${patch.col}`, patch]));
  let wrong = 0, unexpected = 0;
  for (const sheet of before.sheets) {
    const other = after.sheets.find(item => item.name === sheet.name);
    if (!other) { unexpected++; continue; }
    const rows = new Map(other.rows.map(row => [row.r, row]));
    const seen = new Set<string>();
    for (const row of sheet.rows) {
      const twin = rows.get(row.r);
      if (!twin || twin.hidden !== row.hidden) unexpected++;
      const width = Math.max(row.cells.length, twin?.cells.length ?? 0);
      for (let col = 0; col < width; col++) {
        const key = `${sheet.name}\u0001${row.r}\u0001${col}`;
        const patch = patched.get(key);
        const a = row.cells[col], b = twin?.cells[col];
        if (patch) { seen.add(key); if ((b?.v ?? "") !== (patch.asNumber ? patch.value.trim() : patch.value)) wrong++; }
        else if ((a?.v ?? "") !== (b?.v ?? "") || (a?.t === "n") !== (b?.t === "n")) unexpected++;
      }
    }
    // A patched cell in a row that did not exist before.
    for (const [key, patch] of patched) if (patch.sheet === sheet.name && !seen.has(key)) { const cell = rows.get(patch.row)?.cells[patch.col]; if ((cell?.v ?? "") !== (patch.asNumber ? patch.value.trim() : patch.value)) wrong++; }
    if (other.hiddenRows !== sheet.hiddenRows || other.autoFilter !== sheet.autoFilter || other.mergeCount !== sheet.mergeCount) unexpected++;
  }
  return { ok: wrong === 0 && unexpected === 0, changedCells: patches.length, wrongValues: wrong, unexpectedChanges: unexpected, sheetsCompared: before.sheets.length };
}

export const exportName = (fileName: string) => fileName.replace(/\.xlsx$/i, "") + ".reviewed.xlsx";
