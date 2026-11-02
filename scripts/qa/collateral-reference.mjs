// Read-only structural check of the engine against the confidential reference workbook (path as the first argument).
// Prints ONLY counts, timings and category names: never a cell value, name, code or description.
import fs from 'node:fs';
import { readWorkbook } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-reader.ts';
import { fingerprintBytes } from '../../src/components/sites/collateral/excel-formation/engine/text.ts';
import { MAU9_PROFILE } from '../../src/components/sites/collateral/excel-formation/engine/mapping-profiles.ts';
import { profileWorkbook } from '../../src/components/sites/collateral/excel-formation/engine/profile.ts';
import { detectIssues } from '../../src/components/sites/collateral/excel-formation/engine/detect.ts';

const path = process.argv[2] || 'docs/MAU9_20260930 ok.xlsx';
if (!fs.existsSync(path)) { console.log('Reference workbook not present; nothing verified.'); process.exit(0); }
const bytes = new Uint8Array(fs.readFileSync(path));
const mem = () => Math.round(process.memoryUsage().rss / 1048576);
let t = performance.now();
const fileHash = await fingerprintBytes(bytes);
const wb = readWorkbook(bytes, { fileName: 'reference.xlsx', fileHash });
console.log(`read: ${Math.round(performance.now() - t)} ms | rss ${mem()} MB | sheets ${wb.sheets.map(s => `${s.rows.length} rows/${s.hiddenRows} hidden/${s.emptyRows} empty`).join(' ; ')}`);
t = performance.now();
const profile = profileWorkbook(wb, MAU9_PROFILE);
console.log(`profile: ${Math.round(performance.now() - t)} ms | primary sheet found: ${profile.primary !== null} | roles: ${profile.sheets.map(s => s.role).join(',')} | resolved ${profile.mapping?.resolved.length}/${MAU9_PROFILE.columns.length} | ambiguous ${profile.mapping?.ambiguous.length} | missing ${profile.mapping?.missing.length} | unknown ${profile.mapping?.unknown.length}`);
t = performance.now();
const result = detectIssues(wb, profile, MAU9_PROFILE);
console.log(`detect: ${Math.round(performance.now() - t)} ms | rss ${mem()} MB | issues ${result.stats.issues} on ${result.stats.affectedRows} rows of ${result.stats.rowsScanned} | blockers ${result.blockers.length}`);
console.log('by severity:', JSON.stringify(result.stats.bySeverity));
console.log('by category:', JSON.stringify(result.stats.byCategory));
const perField = {};
for (const issue of result.issues) { const k = `${issue.field}/${issue.category}`; perField[k] = (perField[k] ?? 0) + 1; }
console.log('by field/category:', JSON.stringify(Object.fromEntries(Object.entries(perField).sort((a, b) => b[1] - a[1]).slice(0, 24))));
const q = result.issues.filter(i => i.category === 'QUESTION_MARK_IN_WORD');
const withSuggestion = q.filter(i => i.suggestions?.length).length;
const withCandidates = q.filter(i => i.tokens?.some(token => token.candidates.length)).length;
const noCandidates = q.filter(i => i.severity !== 'low' && !i.tokens?.some(token => token.candidates.length)).length;
console.log(`question marks: ${q.length} cells | whole-cell suggestion ${withSuggestion} | some candidate words ${withCandidates} | no evidence at all ${noCandidates} | low-severity (probably real) ${q.filter(i => i.severity === 'low').length}`);
console.log('severity of ? cells:', JSON.stringify(q.reduce((m, i) => (m[i.severity] = (m[i.severity] ?? 0) + 1, m), {})));
console.log('issues with a deterministic fix:', result.issues.filter(i => i.fix).length, '| bulk-capable:', result.issues.filter(i => i.fix && ['trim', 'collapse-spaces', 'normalize-space-chars', 'strip-invisible'].includes(i.fix.kind)).length);
const desc = result.issues.filter(i => i.category === 'DESCRIPTION_CONFLICT').length;
console.log('description conflicts:', desc);

// ── corrected-copy export on the real workbook (the values written are PLACEHOLDERS for load testing, never real corrections) ──
import { openSession, exportCorrected } from '../../src/components/sites/collateral/excel-formation/engine/session.ts';
import { applyEdits, emptyReview, summarize } from '../../src/components/sites/collateral/excel-formation/engine/review.ts';
const session = await openSession(bytes, 'reference.xlsx');
const targets = session.scan.issues.filter(i => i.category === 'QUESTION_MARK_IN_WORD').slice(0, 5000);
let state = emptyReview();
t = performance.now();
state = applyEdits(state, session.ctx, targets.map(i => ({ sheet: i.sheet, row: i.row, col: i.col, value: i.originalValue.replaceAll('?', 'x') })));
console.log(`review: ${targets.length} edits applied in ${Math.round(performance.now() - t)} ms | summary ${JSON.stringify(summarize(state, session.ctx).byStatus)} | blocking ${summarize(state, session.ctx).blocking}`);
t = performance.now();
const out = exportCorrected(session, state);
console.log(`export: ${Math.round(performance.now() - t)} ms | rss ${mem()} MB | changed ${out.changedCells} | size ${(out.bytes.length / 1048576).toFixed(1)} MB (original ${(bytes.length / 1048576).toFixed(1)} MB) | roundTrip ${JSON.stringify(out.roundTrip)}`);
if (process.env.CREDIT_WRITE_EXPORT) fs.writeFileSync(process.env.CREDIT_WRITE_EXPORT, out.bytes);

// ── grouped JSON against the reference JSON (counts only; the reference is never printed) ──
import { planJson } from '../../src/components/sites/collateral/json-formation/engine/json-session.ts';
const refPath = process.argv[3] || 'docs/D4030420260930.001.json';
{
  const meta = { KB001: '20260930', KB002: 'x', KB003: 'x', KB004: 'x' };
  const clean = emptyReview();
  t = performance.now();
  const plan = planJson(session, clean, meta, { ownerPolicy: 'first', order: 'code' }, summarize(clean, session.ctx));
  console.log(`json plan (2 builds + checks): ${Math.round(performance.now() - t)} ms | rss ${mem()} MB | checks ${plan.checks.map(c => `${c.id}:${c.ok ? 'ok' : 'NO'}`).join(' ')}`);
  console.log('reconciliation:', JSON.stringify(plan.reconciliation));
  if (fs.existsSync(refPath)) {
    // The reference is not valid UTF-8: read it byte for byte (latin1) so only structure and ASCII values are compared.
    const ref = JSON.parse(fs.readFileSync(refPath).toString('latin1'));
    const ours = (await import('../../src/components/sites/collateral/json-formation/engine/json-report.ts')).buildReport(session.workbook, session.wprofile, session.profile, (row, col) => row.cells[col]?.v ?? '', meta, { ownerPolicy: 'first', order: 'code' }).report;
    const ascii = s => !/[^\x20-\x7e]/.test(s);
    const refMap = new Map(), ourMap = new Map();
    const walk = (root, map) => { root.CNTCTD.forEach((b, bi) => b.KHACHHANG.forEach((c, ci) => c.THONGTINBD.forEach((a, ai) => map.set([b.TTC01, c.TTC03, a.TS001].join('|'), { a, bi, ci, ai })))); };
    walk(ref, refMap); walk(ours, ourMap);
    const eq = {}, tot = {}; const note = (k, ok) => { tot[k] = (tot[k] ?? 0) + 1; if (ok) eq[k] = (eq[k] ?? 0) + 1; };
    let both = 0, onlyOurs = 0, onlyRef = 0;
    for (const [k, v] of ourMap) { const r = refMap.get(k); if (!r) { onlyOurs++; continue; } both++; const a = v.a, b = r.a;
      for (const f of ['TS001', 'TS002', 'TS003', 'TS004', 'TS007']) note(f, a[f] === b[f]);
      for (const f of ['TS005', 'TS006', 'TS008']) note(f, Number(a[f].$num) === b[f]);
      if (ascii(a.TS013) && ascii(b.TS013)) note('TS013(ascii)', a.TS013 === b.TS013);
      if (a.TS009.every(ascii) && b.TS009.every(ascii)) { note('TS009 same list+order', JSON.stringify(a.TS009) === JSON.stringify(b.TS009)); note('TS009 same set', JSON.stringify([...a.TS009].sort()) === JSON.stringify([...b.TS009].sort())); }
      note('TS012 count', a.TS012.length === b.TS012.length);
      const o = a.TS012[0], p = b.TS012[0]; if (o && p && ascii(o.TS0121) && ascii(p.TS0121)) note('TS012 first owner', o.TS0121 === p.TS0121 && o.TS0122 === p.TS0122 && o.TS0123 === p.TS0123);
      note('TS010..TS016 empty arrays', ['TS010', 'TS011', 'TS014', 'TS015', 'TS016'].every(f => a[f].length === 0 && b[f].length === 0));
    }
    for (const k of refMap.keys()) if (!ourMap.has(k)) onlyRef++;
    console.log(`reference compare: assets ours ${ourMap.size} | reference ${refMap.size} | in both ${both} | only ours ${onlyOurs} | only reference ${onlyRef}`);
    console.log('branches ours/ref', ours.CNTCTD.length, ref.CNTCTD.length, '| customers', ours.CNTCTD.reduce((n, b) => n + b.KHACHHANG.length, 0), ref.CNTCTD.reduce((n, b) => n + b.KHACHHANG.length, 0));
    console.log('field agreement:', Object.keys(tot).map(k => `${k} ${eq[k] ?? 0}/${tot[k]}`).join(' | '));
    // Order: are branches / customers / assets in the same sequence as the reference?
    const refOrder = [...refMap.keys()], ourOrder = [...ourMap.keys()].filter(k => refMap.has(k));
    let sameOrder = 0; refOrder.forEach((k, i) => { if (ourOrder[i] === k) sameOrder++; });
    console.log(`asset order identical to the reference at ${sameOrder}/${refOrder.length} positions`);
  }
}
