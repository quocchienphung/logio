import { unzipSync, strFromU8 } from "fflate";
import type { Cell, CellType, Row, Sheet, StyleKind, Workbook } from "./types.ts";
import { columnIndex, readXmlText } from "./text.ts";

import { LIMITS } from "./limits.ts";
export { LIMITS };

export type ImportErrorCode = "empty" | "legacy-or-encrypted" | "not-xlsx" | "too-large" | "zip-bomb" | "corrupt" | "no-workbook" | "no-sheets";
export class CreditImportError extends Error {
  code: ImportErrorCode;
  constructor(code: ImportErrorCode, message: string) { super(message); this.name = "CreditImportError"; this.code = code; }
}
export interface ReadProgress { phase: "unzip" | "strings" | "styles" | "sheet"; sheet?: string; fraction: number }
export type ProgressFn = (progress: ReadProgress) => void;

const attr = (tag: string, name: string): string | undefined => {
  const key = ` ${name}="`;
  const at = tag.indexOf(key);
  if (at < 0) return undefined;
  const start = at + key.length;
  return tag.slice(start, tag.indexOf("\"", start));
};

/** Reject what is certainly not an OOXML workbook before any decompression is attempted. */
export function checkSignature(bytes: Uint8Array): void {
  if (!bytes.length) throw new CreditImportError("empty", "The file is empty.");
  if (bytes.length > LIMITS.fileBytes) throw new CreditImportError("too-large", "The file is larger than this tool accepts.");
  if (bytes.length >= 8 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) throw new CreditImportError("legacy-or-encrypted", "This is a legacy .xls file or a password-protected workbook. Save it as an unprotected .xlsx first.");
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5))) throw new CreditImportError("not-xlsx", "This file is not an .xlsx workbook.");
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  let at = 0;
  while ((at = xml.indexOf("<si", at)) >= 0) {
    const after = xml.charCodeAt(at + 3);
    if (after !== 62 && after !== 32 && after !== 47) { at += 3; continue; }
    const tagEnd = xml.indexOf(">", at);
    if (xml.charCodeAt(tagEnd - 1) === 47) { out.push(""); at = tagEnd + 1; continue; }
    const end = xml.indexOf("</si>", tagEnd);
    out.push(textRuns(xml.slice(tagEnd + 1, end)));
    at = end + 5;
  }
  return out;
}
/** Concatenate the `<t>` runs of an `<si>` or `<is>`, skipping phonetic (`<rPh>`) runs that are not part of the cell text. */
function textRuns(body: string): string {
  const clean = body.indexOf("<rPh") >= 0 ? body.replace(/<rPh[\s\S]*?<\/rPh>/g, "") : body;
  let text = "";
  let at = 0;
  while ((at = clean.indexOf("<t", at)) >= 0) {
    const after = clean.charCodeAt(at + 2);
    if (after !== 62 && after !== 32 && after !== 47) { at += 2; continue; }
    const tagEnd = clean.indexOf(">", at);
    if (clean.charCodeAt(tagEnd - 1) !== 47) {
      const end = clean.indexOf("</t>", tagEnd);
      text += readXmlText(clean.slice(tagEnd + 1, end));
      at = end + 4;
    } else at = tagEnd + 1;
  }
  return text;
}

const DATE_BUILTIN = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
function parseStyleKinds(xml: string): StyleKind[] {
  const formats = new Map<number, string>();
  for (const match of xml.matchAll(/<numFmt [^>]*>/g)) {
    const id = Number(attr(match[0], "numFmtId"));
    const code = attr(match[0], "formatCode");
    if (Number.isFinite(id) && code !== undefined) formats.set(id, readXmlText(code));
  }
  const block = xml.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  const kinds: StyleKind[] = [];
  for (const match of block.matchAll(/<xf [^>]*?(?:\/>|>)/g)) {
    const id = Number(attr(match[0], "numFmtId") ?? 0);
    const code = formats.get(id);
    if (id === 49 || code === "@") kinds.push("text");
    else if (DATE_BUILTIN.has(id)) kinds.push("date");
    else if (code !== undefined) kinds.push(/[ymdhs]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, "")) ? "date" : "number");
    else kinds.push(id === 0 ? "general" : "number");
  }
  return kinds;
}

interface Targets { name: string; part: string; hidden: boolean }
function sheetTargets(workbookXml: string, relsXml: string): Targets[] {
  const rels = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship [^>]*>/g)) {
    const id = attr(match[0], "Id"), target = attr(match[0], "Target");
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, ""));
  }
  const out: Targets[] = [];
  for (const match of workbookXml.matchAll(/<sheet [^>]*>/g)) {
    const name = attr(match[0], "name"), id = attr(match[0], "r:id");
    const part = id ? rels.get(id) : undefined;
    if (name !== undefined && part) out.push({ name: readXmlText(name), part, hidden: /state="(hidden|veryHidden)"/.test(match[0]) });
  }
  return out;
}

function scanSheet(name: string, part: string, xml: string, strings: string[], progress?: ProgressFn): Sheet {
  const sheet: Sheet = {
    name, part, dimension: attr(xml.match(/<dimension [^>]*>/)?.[0] ?? "", "ref") ?? null, rows: [], hiddenRows: 0, hiddenColumns: 0, mergeCount: 0,
    autoFilter: /<autoFilter[\s>]/.test(xml), formulaCount: 0, emptyRows: 0, maxCol: 0,
  };
  for (const match of xml.matchAll(/<col [^>]*hidden="(?:1|true)"[^>]*>/g)) sheet.hiddenColumns += Number(attr(match[0], "max") ?? 1) - Number(attr(match[0], "min") ?? 1) + 1;
  sheet.mergeCount = Number(attr(xml.match(/<mergeCells [^>]*>/)?.[0] ?? "", "count") ?? 0);
  const dataStart = xml.indexOf("<sheetData");
  const dataEnd = xml.indexOf("</sheetData>");
  if (dataStart < 0 || dataEnd < 0) return sheet;
  let pos = xml.indexOf(">", dataStart) + 1;
  let nextReport = 0;
  while (true) {
    const i = xml.indexOf("<row", pos);
    if (i < 0 || i >= dataEnd) break;
    const follow = xml.charCodeAt(i + 4);
    if (follow !== 32 && follow !== 62 && follow !== 47) { pos = i + 4; continue; }
    const tagEnd = xml.indexOf(">", i);
    const head = xml.slice(i, tagEnd + 1);
    const selfClosing = xml.charCodeAt(tagEnd - 1) === 47;
    const rowNumber = Number(attr(head, "r") ?? sheet.rows.length + sheet.emptyRows + 1);
    const hidden = /\shidden="(?:1|true)"/.test(head);
    if (hidden) sheet.hiddenRows++;
    const rowEnd = selfClosing ? tagEnd + 1 : xml.indexOf("</row>", tagEnd);
    const cells: (Cell | undefined)[] = [];
    let has = false;
    let c = tagEnd + 1;
    let previousCol = -1;
    while (!selfClosing) {
      const at = xml.indexOf("<c", c);
      if (at < 0 || at >= rowEnd) break;
      const nf = xml.charCodeAt(at + 2);
      if (nf !== 32 && nf !== 62 && nf !== 47) { c = at + 2; continue; }
      const cTagEnd = xml.indexOf(">", at);
      const cTag = xml.slice(at, cTagEnd + 1);
      const cSelf = xml.charCodeAt(cTagEnd - 1) === 47;
      const ref = attr(cTag, "r");
      const col = ref ? columnIndex(ref.replace(/\d+$/, "")) : previousCol + 1;
      previousCol = col;
      const type = (attr(cTag, "t") ?? "n") as CellType;
      const style = Number(attr(cTag, "s") ?? 0);
      let bodyEnd = cTagEnd + 1;
      let value: string | undefined;
      let formula = false;
      if (!cSelf) {
        bodyEnd = xml.indexOf("</c>", cTagEnd);
        const body = xml.slice(cTagEnd + 1, bodyEnd);
        formula = body.indexOf("<f") >= 0;
        if (type === "inlineStr") { const isAt = body.indexOf("<is"); value = isAt >= 0 ? textRuns(body.slice(isAt, body.indexOf("</is>") + 5)) : ""; }
        else {
          const v = body.indexOf("<v");
          if (v >= 0) {
            const vEnd = body.indexOf(">", v);
            if (body.charCodeAt(vEnd - 1) !== 47) value = body.slice(vEnd + 1, body.indexOf("</v>", vEnd));
          }
          if (value !== undefined) value = type === "s" ? (strings[Number(value)] ?? "") : type === "n" || type === "b" || type === "e" || type === "d" ? value : readXmlText(value);
        }
        bodyEnd += 4;
      }
      if (formula) sheet.formulaCount++;
      if (formula || (value !== undefined && value !== "")) {
        const cell: Cell = { t: type, v: value ?? "", s: style };
        if (formula) cell.f = true;
        cells[col] = cell;
        has = true;
        if (col + 1 > sheet.maxCol) sheet.maxCol = col + 1;
      }
      c = bodyEnd;
    }
    if (has) sheet.rows.push({ r: rowNumber, hidden, cells }); else sheet.emptyRows++;
    pos = selfClosing ? rowEnd : rowEnd + 6;
    if (progress && pos >= nextReport) { progress({ phase: "sheet", sheet: name, fraction: Math.min(1, (pos - dataStart) / (dataEnd - dataStart)) }); nextReport = pos + 1_500_000; }
  }
  return sheet;
}

export interface ReadOptions { fileName: string; fileHash: string; onProgress?: ProgressFn }
/** Read an .xlsx into a lossless in-memory model. Never executes macros, formulas or external links. */
export function readWorkbook(bytes: Uint8Array, { fileName, fileHash, onProgress }: ReadOptions): Workbook {
  checkSignature(bytes);
  onProgress?.({ phase: "unzip", fraction: 0 });
  const names: string[] = [];
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: entry => {
        names.push(entry.name);
        total += entry.originalSize;
        if (names.length > LIMITS.entries) throw new CreditImportError("zip-bomb", "The archive has too many entries.");
        if (entry.originalSize > LIMITS.entryBytes || total > LIMITS.totalBytes || (entry.size > 0 && entry.originalSize / entry.size > LIMITS.ratio && entry.originalSize > 1_000_000)) throw new CreditImportError("zip-bomb", "The archive expands to an unsafe size.");
        return /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|styles\.xml|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(entry.name);
      },
    });
  } catch (error) {
    if (error instanceof CreditImportError) throw error;
    throw new CreditImportError("corrupt", "The workbook could not be opened. It may be damaged.");
  }
  if (!files["xl/workbook.xml"]) throw new CreditImportError("no-workbook", "This archive is not an Excel workbook (xl/workbook.xml is missing).");
  const workbookXml = strFromU8(files["xl/workbook.xml"]);
  const targets = sheetTargets(workbookXml, files["xl/_rels/workbook.xml.rels"] ? strFromU8(files["xl/_rels/workbook.xml.rels"]) : "");
  if (!targets.length) throw new CreditImportError("no-sheets", "The workbook has no worksheets.");
  onProgress?.({ phase: "strings", fraction: 0 });
  const strings = files["xl/sharedStrings.xml"] ? parseSharedStrings(strFromU8(files["xl/sharedStrings.xml"])) : [];
  onProgress?.({ phase: "styles", fraction: 0 });
  const styleKinds = files["xl/styles.xml"] ? parseStyleKinds(strFromU8(files["xl/styles.xml"])) : [];
  const sheets: Sheet[] = [];
  for (const target of targets) {
    const data = files[target.part];
    if (!data) continue;
    sheets.push(scanSheet(target.name, target.part, strFromU8(data), strings, onProgress));
  }
  const notes: string[] = [];
  if (names.some(name => /vbaProject\.bin$/.test(name))) notes.push("The workbook contains a macro project. It is never executed and is kept untouched.");
  const calc = workbookXml.match(/<calcPr[^>]*>/)?.[0];
  if (calc && /fullCalcOnLoad="1"/.test(calc)) notes.push("The workbook recalculates on load.");
  if (/<definedName /.test(workbookXml)) notes.push("The workbook has defined names.");
  if (targets.some(target => target.hidden)) notes.push("The workbook has hidden sheets.");
  return { fileName, size: bytes.length, fileHash, sheets, styleKinds, notes };
}

export type { Row };
