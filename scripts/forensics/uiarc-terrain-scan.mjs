// One parameter at a time: mean corner error of a set of recorded scenarios for a range of values of a camera tuning parameter.
//   node --experimental-strip-types scripts/forensics/uiarc-terrain-scan.mjs <series-dir> <param> <from> <to> <step> <scenario> [scenario ...]
import fs from 'node:fs/promises';
import path from 'node:path';
import { simulateCamera } from './lib/terrain-sim.mjs';
const [dir, param, from, to, step, ...names] = process.argv.slice(2);
const size = { width: 622.81, height: 291.63 };
const heightsOf = async n => { const f = JSON.parse(await fs.readFile(path.join(dir, `${n}.heights.json`), 'utf8')).frames.at(-1); return Array.from({ length: 168 }, (_, k) => Math.max(0, f.h[k] ?? 0)); };
const heights = { load: await heightsOf('load') };
const data = Object.fromEntries(await Promise.all(names.map(async n => [n, JSON.parse(await fs.readFile(path.join(dir, `${n}.series.json`), 'utf8'))])));
for (let v = Number(from); v <= Number(to) + 1e-9; v += Number(step)) {
  const means = names.map(n => simulateCamera({ name: n, size, series: data[n].series, events: data[n].events ?? [], heights, tuning: { [param]: v } }).mean);
  console.log(param, v.toFixed(2), means.map(m => m.toFixed(2)).join(' '), 'avg', (means.reduce((a, b) => a + b, 0) / means.length).toFixed(2));
}
