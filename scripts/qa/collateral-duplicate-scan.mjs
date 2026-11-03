// LOCAL aggregate-only scan. Never print/export cell text, entity identifiers, sheet names or value hashes.
import { readFile } from "node:fs/promises";
import { openSession } from "../../src/components/sites/collateral/excel-formation/engine/session.ts";
import { applyEdits, emptyReview, groupRows } from "../../src/components/sites/collateral/excel-formation/engine/review.ts";
import { autoRepair } from "../../src/components/sites/collateral/excel-formation/engine/auto-repair.ts";
import { buildXlsx } from "../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs";
import { duplicateSummary } from "../../src/components/sites/collateral/excel-formation/engine/duplicate-repairs.ts";
const path = process.argv[2];
if (!path) {
  const headers = ["MACNTCTD", "MAKH", "MASOBD", "MALOAIBD", "GIATRI", "MOTABDS", "MOTABD"];
  const row = ["B", "C", "A", "303", { n: "1" }, "May moc thi?t bi", "May moc thi?t bi"];
  const s = await openSession(buildXlsx([{ name: "Synthetic", rows: [headers, row, row, row] }]), "synthetic.xlsx");
  const issue = s.scan.issues.find(i => i.category === "QUESTION_MARK_IN_WORD");
  const state = applyEdits(emptyReview(), s.ctx, [{ sheet: "Synthetic", row: 2, col: 5, value: "May moc thiet bi" }, { sheet: "Synthetic", row: 2, col: 6, value: "May moc thiet bi" }]);
  const automatic = await autoRepair(s, emptyReview());
  console.log(JSON.stringify({ synthetic: true, repeatedRows: 3, questionIssues: s.scan.issues.filter(i => i.category === "QUESTION_MARK_IN_WORD").length, conflictingDuplicateIssues: s.scan.issues.filter(i => i.category === "CONFLICTING_DUPLICATE").length, currentIssueGroupRows: groupRows(s.ctx, issue).length, cellsChangedByCurrentApproveWithTwin: Object.keys(state.patches).length, otherBrokenRowsRemain: 2, autoAppliedWithoutCleanSource: automatic.report.applied }));
} else {
  const bytes = new Uint8Array(await readFile(path));
  const s = await openSession(bytes, "local-input.xlsx");
  const sheet = s.ctx.sheet;
  if (!sheet) throw new Error("The local input has no primary mapped worksheet.");
  const header = s.wprofile.sheets.find(p => p.name === sheet.name).headerRow;
  const cols = s.wprofile.mapping.resolved;
  const col = h => cols.find(c => c.spec.header === h)?.col;
  const keys = [s.profile.groupBy.branch, s.profile.groupBy.customer, s.profile.groupBy.asset].map(col);
  const textCols = cols.filter(c => c.spec.role === "freeText" && !/(?:^|\.)(?:plate|province)$/.test(c.spec.field));
  const exactRows = new Map(), sameAsset = new Map(), sameText = new Map();
  let rowsWithQuestion = 0, cellsWithQuestion = 0;
  for (const row of sheet.rows) {
    if (row.r <= header) continue;
    const hasQuestion = row.cells.some(c => c?.v.includes("?"));
    if (!hasQuestion) continue;
    rowsWithQuestion++;
    const rowKey = JSON.stringify(row.cells.map(c => c ? [c.t, c.v, !!c.f] : null));
    exactRows.set(rowKey, (exactRows.get(rowKey) ?? 0) + 1);
    const identity = keys.every(k => k !== undefined && row.cells[k]?.v && !/[?\ufffd]/.test(row.cells[k].v)) ? JSON.stringify(keys.map(k => row.cells[k].v)) : null;
    for (const { col, spec } of textCols) {
      const cell = row.cells[col]; if (!cell || cell.f || cell.protectedText || !cell.v.includes("?")) continue;
      cellsWithQuestion++;
      const field = spec.comparisonOf ?? spec.header;
      const add = (map, key) => { const entry = map.get(key) ?? { rows: new Set(), cells: 0, identities: new Set() }; entry.rows.add(row.r); entry.cells++; if (identity) entry.identities.add(identity); map.set(key, entry); };
      add(sameText, JSON.stringify([field, cell.v]));
      if (identity) add(sameAsset, JSON.stringify([field, identity, cell.v]));
    }
  }
  const summary = map => { const groups = [...map.values()].filter(g => g.rows.size > 1); return { groups: groups.length, rowOccurrences: groups.reduce((n,g) => n + g.rows.size,0), cells: groups.reduce((n,g) => n + g.cells,0), largestGroupRows: Math.max(0,...groups.map(g => g.rows.size)), groupsSpanningDifferentAssets: groups.filter(g => g.identities.size > 1).length }; };
  const full = [...exactRows.values()].filter(n => n > 1);
  console.log(JSON.stringify({ localOnly: true, inputBytes: bytes.length, primaryDataRows: sheet.rows.filter(r => r.r > header).length, rowsWithQuestion, eligibleTextCellsWithQuestion: cellsWithQuestion, wholeRowDuplicatesWithQuestion: { groups: full.length, rows: full.reduce((a,b) => a+b,0), redundantRows: full.reduce((a,b) => a+b-1,0) }, repeatedCorruptTextWithinAsset: summary(sameAsset), repeatedCorruptTextAcrossAssets: summary(sameText), engineDuplicateSummary: duplicateSummary(s), note: "Counts only. Equal corrupted text is not proof of the missing letters. Row occurrences may overlap across different text fields." }, null, 2));
}
