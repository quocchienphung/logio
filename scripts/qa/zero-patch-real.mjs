// Local QA on a real workbook. Prints COUNTS ONLY (no cell text, names or identifiers) and never uploads anything.
//   node --experimental-strip-types scripts/qa/zero-patch-real.mjs "<input.xlsx>" [output.xlsx]
// The output is judged by the independent OOXML parser (fflate + regex), not by the application's reader or patcher.
import { readFileSync, writeFileSync } from "node:fs";
import { openSession } from "../../src/components/sites/collateral/excel-formation/engine/session.ts";
import { emptyReview } from "../../src/components/sites/collateral/excel-formation/engine/review.ts";
import { autoRepair } from "../../src/components/sites/collateral/excel-formation/engine/auto-repair.ts";
import { comparePackages, diffCells } from "../../src/components/sites/collateral/excel-formation/engine/ooxml-independent.mjs";

const [input, output] = process.argv.slice(2);
if (!input) throw new Error("usage: zero-patch-real.mjs <input.xlsx> [output.xlsx]");
const bytes = new Uint8Array(readFileSync(input));
const t0 = performance.now(), session = await openSession(bytes, "input.xlsx"), openMs = performance.now() - t0;
const result = await autoRepair(session, emptyReview()), { report } = result;
if (output) writeFileSync(output, result.bytes);
const pkg = comparePackages(bytes, result.bytes), { changed, structural } = diffCells(bytes, result.bytes);
const byColumn = {}; let qBefore = 0, qAfter = 0, preserved = 0;
for (const c of changed) {
  const key = c.sheet + "!" + c.ref.replace(/\d+/g, ""); byColumn[key] = (byColumn[key] ?? 0) + 1;
  qBefore += (c.before?.match(/\?/g) ?? []).length; qAfter += (c.after?.match(/\?/g) ?? []).length;
  if (c.before?.length === c.after?.length && [...c.before].every((ch, i) => ch === "?" || ch === c.after[i])) preserved++;
}
const out = {
  openMs: Math.round(openMs), repairMs: Math.round(report.timings.total), stageMs: Object.fromEntries(Object.entries(report.timings).map(([k, v]) => [k, Math.round(v)])),
  status: report.status, packageVerdict: pkg.verdict, appMetrics: report.metrics, calibration: report.calibration,
  independent: { partsDiffering: pkg.differing, changedCells: changed.length, byColumn, structuralDifferences: structural.length, questionMarksBefore: qBefore, questionMarksAfter: qAfter, changedCellsWithNonQuestionCharsPreserved: preserved },
  reasonCodes: report.byReasonCode, byStatus: report.byStatus,
};
console.log(JSON.stringify(out, null, 2));
if (pkg.verdict !== "CONTENT_CHANGED" && report.metrics.cellsContainingQuestionMark > 0) { console.log("RESULT: NO_REPAIR_APPLIED / " + pkg.verdict); process.exitCode = 2; }
else if (changed.length !== report.metrics.outputCellsChanged || structural.length) { console.log("RESULT: MISMATCH between the app and the independent parser"); process.exitCode = 3; }
else console.log("RESULT: independent parser confirms " + changed.length + " changed cells");
