import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import { buildXlsx } from "../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs";
import { MAU9_PROFILE } from "../../src/components/sites/collateral/excel-formation/engine/mapping-profiles.ts";
import { openSession } from "../../src/components/sites/collateral/excel-formation/engine/session.ts";
import { emptyReview } from "../../src/components/sites/collateral/excel-formation/engine/review.ts";
import { autoRepair } from "../../src/components/sites/collateral/excel-formation/engine/auto-repair.ts";

const count = Number(process.argv[2]);
if (!count) {
  const results = [];
  for (const size of [100, 5000, 50000]) for (const mode of ["repeated", "unique"]) {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--expose-gc", import.meta.filename, String(size), mode], { encoding: "utf8", maxBuffer: 1024 * 1024 });
    if (result.status !== 0) throw new Error(`Benchmark failed: ${size}/${mode}\n${result.stderr}\n${result.stdout}`);
    const measured = JSON.parse(result.stdout.trim()); results.push(measured);
    console.log(JSON.stringify(measured));
  }
  await writeFile("docs/auto-repair/benchmark-results.json", JSON.stringify({ environment: { node: process.version, platform: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem() }, methodology: "Synthetic known-source retrieval; not model generalization. Each input is an isolated Node process; maxRSS is process high-water mark including fixture generation.", results }, null, 2));
} else {
  const mode = process.argv[3], columns = MAU9_PROFILE.columns, rows = [columns.map(c => c.header)];
  let expectedApplied = 0, corruptCells = 0;
  const clean = i => mode === "unique" ? `Ban ghi ${i} may moc thiet bi` : "May moc thiet bi san xuat";
  const broken = i => mode === "unique" ? `Ban ghi ${i} m?y moc thiet bi` : "May moc thi?t bi san xuat";
  for (let i = 1; i <= count; i++) {
    const isBroken = i % 5 === 0, noSource = i % 11 === 0;
    if (isBroken) { corruptCells += noSource ? 2 : 1; if (!noSource) expectedApplied++; }
    rows.push(columns.map(c => {
      if (c.header === 'MACNTCTD') return '000001';
      if (c.header === 'MAKH') return `C${i}`;
      if (c.header === 'MASOBD') return `A${i}`;
      if (c.header === 'MOTABDS') return isBroken ? broken(i) : clean(i);
      if (c.header === 'MOTABD') return isBroken && noSource ? broken(i) : clean(i);
      if (c.role === 'amount') return { n: "1234.5599999999999" };
      if (c.role === 'date') return '20260101';
      if (c.role === 'dateDMY') return '03/11/2026';
      if (c.role === 'name') return 'Synthetic Person';
      if (c.role === 'freeText') return 'Synthetic text';
      return '00123';
    }));
  }
  const bytes = buildXlsx([{ name: "Synthetic", rows, hiddenRows: [2] }]);
  rows.length = 0; global.gc?.();
  const start = performance.now(), s = await openSession(bytes, 'benchmark.xlsx'), opened = performance.now() - start;
  let progressEvents = 0, maxYieldGapMs = 0, last = performance.now();
  const result = await autoRepair(s, emptyReview(), { onProgress: () => { const now = performance.now(); maxYieldGapMs = Math.max(maxYieldGapMs, now - last); last = now; progressEvents++; } });
  assert.equal(result.report.applied, expectedApplied);
  assert.ok(result.report.unresolved <= corruptCells - expectedApplied, 'the calibrated model can only reduce what stays unresolved');
  let exact = 0;
  for (const patch of Object.values(result.state.patches)) if (patch.source === 'auto_source' && patch.value === clean(patch.row - 1)) exact++;
  assert.equal(exact, expectedApplied);
  let characterTotal = 0, characterMatches = 0, wholeCellsExact = 0;
  const descriptionCols = ['MOTABDS', 'MOTABD'].map(h => columns.findIndex(c => c.header === h));
  for (let i = 5; i <= count; i += 5) for (const col of i % 11 === 0 ? descriptionCols : [descriptionCols[0]]) {
    const expected = clean(i), actual = result.state.patches[`Synthetic\u0001${i + 1}\u0001${col}`]?.value ?? broken(i);
    characterTotal += expected.length;
    for (let at = 0; at < expected.length; at++) if (expected[at] === actual[at]) characterMatches++;
    if (actual === expected) wholeCellsExact++;
  }
  assert.ok(wholeCellsExact >= expectedApplied);
  assert.equal(result.report.locations.length, corruptCells, 'No clean synthetic cell was flagged');
  assert.ok(Object.values(result.state.patches).every(p => descriptionCols.includes(p.col) && !p.asNumber), 'No protected field write');
  const cancelStart = performance.now(); let cancellationFlag = false;
  await assert.rejects(autoRepair(s, emptyReview(), { cancelled: () => cancellationFlag, onProgress: p => { if (p.stage === 'evidence_index' && p.processedRows >= 500 || count < 500 && p.stage === 'candidate_generation') cancellationFlag = true; } }), /cancelled/);
  if (count === 50000 && mode === 'unique') { await mkdir('docs/auto-repair/synthetic-artifacts', { recursive: true }); await writeFile('docs/auto-repair/synthetic-artifacts/large.xlsx', bytes); }
  console.log(JSON.stringify({ rows: count, columns: columns.length, mode, inputBytes: bytes.length, outputBytes: result.bytes.length, cellsAccounted: result.report.cellsAccounted, parseProfileDetectMs: Math.round(opened), ...Object.fromEntries(Object.entries(result.report.timings).map(([k, v]) => [k + 'Ms', Math.round(v)])), peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024), progressEvents, maxYieldGapMs: Math.round(maxYieldGapMs), cancellationMs: Math.round(performance.now() - cancelStart), applied: expectedApplied, modelAccepted: result.report.modelAccepted, outputCellsChanged: result.report.metrics.outputCellsChanged, outputUnexpectedChanges: result.report.metrics.outputUnexpectedChanges, exactSourceRestored: exact, corruptedCells: corruptCells, unresolved: result.report.unresolved, retrievalPrecision: exact / expectedApplied, coverage: expectedApplied / corruptCells, characterMatches, characterTotal, characterAccuracy: characterMatches / characterTotal, wholeCellExactMatch: wholeCellsExact / corruptCells, falsePositiveCorruption: 0, cleanCells: result.report.cellsAccounted - corruptCells, protectedDataViolations: 0, unresolvedRate: result.report.unresolved / corruptCells, modelGeneralization: 'not_measured' }));
}
