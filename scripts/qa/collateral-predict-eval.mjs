// Hold-out accuracy of the broken-word predictor on the reference workbook. Train on 90% of the rows, mask a vowel/d of words in the other 10%,
// ask the model to read them back. Prints ONLY rates and counts, never a word.
import fs from 'node:fs';
import { readWorkbook } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-reader.ts';
import { MAU9_PROFILE } from '../../src/components/sites/collateral/excel-formation/engine/mapping-profiles.ts';
import { profileWorkbook } from '../../src/components/sites/collateral/excel-formation/engine/profile.ts';
import { VietnameseModel, stripMarks, wordsOf, FILL_LETTERS } from '../../src/components/sites/collateral/excel-formation/engine/predict.ts';
import { simulate } from '../../src/components/sites/collateral/excel-formation/engine/speculative.ts';

const path = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'docs/MAU9_20260930 ok.xlsx';
if (!fs.existsSync(path)) { console.log('Reference workbook not present; nothing measured.'); process.exit(0); }
const wb = readWorkbook(new Uint8Array(fs.readFileSync(path)), { fileName: 'x', fileHash: 'x' });
const profile = profileWorkbook(wb, MAU9_PROFILE), sheet = wb.sheets.find(s => s.name === profile.primary);
const col = h => profile.mapping.resolved.find(r => r.spec.header === h).col;
const cols = ['MOTABDS', 'TENKH', 'HOTENCSH'].map(col);
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const rows = sheet.rows.slice(1).filter(r => r.cells.length);
const adjacent = process.argv.includes('--adjacent');
const unique = process.argv.includes('--unique');
const phraseHash = text => { let hash = 2166136261; for (const ch of stripMarks(text).toLowerCase().trim()) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619); return hash >>> 0; };
const test = new Set(rows.filter(row => unique ? phraseHash(row.cells[cols[0]]?.v ?? '') % 10 === 0 : rnd() < 0.1).map(r => r.r));
console.log(`scenario: ${adjacent ? 'up to 6 adjacent eligible words' : 'up to 3 separated words'} | holdout: ${unique ? 'whole phrases (identical descriptions cannot cross the split)' : 'rows'}`);
const model = new VietnameseModel();
for (const row of rows) if (!test.has(row.r)) for (const c of cols) { const v = row.cells[c]?.v; if (v) model.add(v); }
model.finish();
console.log(`trained on ${rows.length - test.size} rows: ${model.size} distinct words; testing on ${test.size} rows`);
let words = 0, covered = 0, draftOk = 0, targetOk = 0, top3 = 0, confident = 0, confidentOk = 0, cells = 0, sims = 0, speedup = 0, accepted = 0, drafted = 0;
const byLen = { short: [0, 0], mid: [0, 0], long: [0, 0] };
const t0 = performance.now();
for (const row of rows) if (test.has(row.r)) {
  const v = row.cells[cols[0]]?.v;
  if (!v || v.includes('?')) continue;
  const plain = stripMarks(v), found = wordsOf(plain).filter(w => /^[A-Za-z]{3,}$/.test(w.text) && [...w.text].some(ch => FILL_LETTERS.includes(ch.toLowerCase())));
  if (!found.length) continue;
  // mask one vowel/d in every second candidate word, so a cell has several broken words and some clean neighbours
  const picks = adjacent ? found.slice(0, 6) : found.filter((_, i) => i % 2 === 0).slice(0, 3);
  let masked = '', at = 0; const truth = [];
  for (const w of picks) { const spots = [...w.text].map((ch, i) => FILL_LETTERS.includes(ch.toLowerCase()) ? i : -1).filter(i => i >= 0); const i = spots[Math.floor(rnd() * spots.length)]; masked += plain.slice(at, w.start) + w.text.slice(0, i) + '?' + w.text.slice(i + 1); at = w.end; truth.push(w.text.toLowerCase()); }
  masked += plain.slice(at);
  const predictions = model.predict(masked); cells++;
  const broken = predictions.filter(p => p.broken);
  broken.forEach((p, i) => {
    words++; const answer = truth[i]; if (!answer) return;
    if (p.alternatives.length) covered++;
    if (p.draft.toLowerCase() === answer) draftOk++;
    const ok = p.target.toLowerCase() === answer; if (ok) targetOk++;
    if (p.alternatives.slice(0, 3).some(a => a.text.toLowerCase() === answer)) top3++;
    if (p.confident && p.alternatives.length) { confident++; if (ok) confidentOk++; }
    const bucket = answer.length <= 3 ? byLen.short : answer.length <= 5 ? byLen.mid : byLen.long; bucket[1]++; if (ok) bucket[0]++;
  });
  const run = simulate(predictions, 4); sims++; speedup += run.stats.speedup; accepted += run.stats.accepted; drafted += run.stats.drafted;
}
const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
console.log(`broken words tested: ${words} in ${cells} cells (${Math.round(performance.now() - t0)} ms)`);
console.log(`some candidate exists: ${pct(covered, words)} | draft (frequency only) top-1: ${pct(draftOk, words)} | target (context) top-1: ${pct(targetOk, words)} | target top-3: ${pct(top3, words)}`);
console.log(`target marked confident: ${pct(confident, words)} of words, and right ${pct(confidentOk, confident)} of those`);
console.log(`by word length (target top-1): up to 3 letters ${pct(...byLen.short)} | 4-5 letters ${pct(...byLen.mid)} | 6+ letters ${pct(...byLen.long)}`);
console.log(`speculative run with 4-word drafts: ${(speedup / sims).toFixed(2)} words per pass on average, ${pct(accepted, drafted)} of drafted words accepted`);
