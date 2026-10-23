// Column heights over time: the local springs and delays against the heights recovered from the recorded frames.
//   node --experimental-strip-types scripts/forensics/uiarc-terrain-columns-sim.mjs <series-dir> <scenario> <rise: intro|metric|flatten|unflatten> [from-heights-scenario]
import fs from 'node:fs/promises';
import path from 'node:path';
import { Columns } from '../../src/components/sites/skilled/terrain/terrain-columns.ts';

const [dir, scenario, rise, fromName] = process.argv.slice(2);
const heights = async n => JSON.parse(await fs.readFile(path.join(dir, `${n}.heights.json`), 'utf8')).frames;
const frames = await heights(scenario);
const finalH = frames.at(-1).h.map(v => Math.max(0, v ?? 0));
const startH = fromName ? (await heights(fromName)).at(-1).h.map(v => Math.max(0, v ?? 0)) : (rise === 'unflatten' || rise === 'intro' ? finalH.map(() => 0) : frames[0].h.map(v => Math.max(0, v ?? 0)));
const cols = new Columns();
// the Columns class normalises to MAX_HEIGHT, so feed world heights directly
cols.setValues(startH.map(h => h), 'metric', false, true);
cols.springs.forEach((s, k) => s.snap(startH[k]));
cols.setValues(rise === 'flatten' ? startH : finalH, rise, rise === 'flatten');
let prev = frames[0].t, sum = 0, n = 0, worst = 0;
const rows = [];
for (const f of frames) {
  cols.step(Math.max(0, f.t - prev) / 1000); prev = f.t;
  let e = 0;
  for (let k = 0; k < 168; k++) if (f.h[k] != null) { const d = Math.abs(cols.shown[k] - Math.max(0, f.h[k])); e = Math.max(e, d); sum += d; n++; }
  worst = Math.max(worst, e); rows.push([f.t, e]);
}
console.log(`${scenario} ${rise}: frames ${frames.length}  worst column error ${worst.toFixed(3)} units (${(worst * 15.6).toFixed(1)} px)  mean ${(sum / n).toFixed(4)} units`);
