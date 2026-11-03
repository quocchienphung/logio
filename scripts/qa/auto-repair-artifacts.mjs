import { mkdir, writeFile } from "node:fs/promises";
import { buildXlsx } from "../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs";
import { repairFixture } from "../../src/components/sites/collateral/excel-formation/engine/auto-repair-fixture.mjs";
import { openSession, patchesOf } from "../../src/components/sites/collateral/excel-formation/engine/session.ts";
import { autoRepair } from "../../src/components/sites/collateral/excel-formation/engine/auto-repair.ts";
import { emptyReview } from "../../src/components/sites/collateral/excel-formation/engine/review.ts";
const directory = "docs/auto-repair/synthetic-artifacts";
await mkdir(directory, { recursive: true });
// The original/repaired workbook and approved patch list are SYNTHETIC independent-validation fixtures only.
const input = repairFixture(), session = await openSession(input, "synthetic.xlsx"), output = await autoRepair(session, emptyReview());
await writeFile(`${directory}/original.xlsx`, input);
await writeFile(`${directory}/repaired.xlsx`, output.bytes);
await writeFile(`${directory}/manifest.json`, JSON.stringify({ patches: patchesOf(output.state), report: output.report }, null, 2));
// Desktop Excel smoke file also exercises formatted text, decimals, hidden rows, cross-sheet formula and Unicode.
const format = buildXlsx([{ name: "Formatting", rows: [["00123", { n: "1234.5599999999999" }, { f: "Other!A1+1", v: "43" }, "😀 tiếng Việt", "a & b <c>"], ["hidden row", { n: "46000" }]], hiddenRows: [2], styles: { 0: 1, 1: 2 }, autoFilter: true }, { name: "Other", rows: [[{ n: "42" }]] }]);
await writeFile(`${directory}/formatting.xlsx`, format);
console.log(JSON.stringify({ syntheticOnly: true, artifacts: 4, approvedPatches: output.report.applied, unresolved: output.report.unresolved }));
