// Run the local camera through a recorded scenario and compare the platform corners it would draw with the ones the public preview drew, frame by frame.
//   node --experimental-strip-types scripts/forensics/uiarc-terrain-sim.mjs <series-dir> <scenario> [verbose]
import fs from 'node:fs/promises';
import path from 'node:path';
import { simulateCamera } from './lib/terrain-sim.mjs';

const [dir, name, verbose] = process.argv.slice(2);
const SIZE = process.env.TERRAIN_SIZE ? JSON.parse(process.env.TERRAIN_SIZE) : [622.81, 291.63];
const size = { width: SIZE[0], height: SIZE[1] };
const load = async n => JSON.parse(await fs.readFile(path.join(dir, `${n}.series.json`), 'utf8'));
const heightsOf = async n => { const f = JSON.parse(await fs.readFile(path.join(dir, `${n}.heights.json`), 'utf8')).frames.at(-1); return Array.from({ length: 168 }, (_, k) => Math.max(0, f.h[k] ?? 0)); };
const data = await load(name);
const heights = { load: await heightsOf('load') };
if (name.startsWith('metric-')) {
  heights[name] = await heightsOf(name);
  heights.before = await heightsOf(name === 'metric-deploys' ? 'load' : name === 'metric-errors' ? 'metric-deploys' : 'metric-errors');
}
const result = simulateCamera({ name, size, series: data.series, events: data.events ?? [], heights, touch: !!process.env.TERRAIN_TOUCH });
if (verbose) for (let k = 0; k < result.rows.length; k += Math.max(1, Math.floor(result.rows.length / 24))) { const r = result.rows[k]; console.log(String(Math.round(r.t)).padStart(6), 'err', r.error.toFixed(2).padStart(7), 'mine', r.yaw.toFixed(2), r.pitch.toFixed(2), r.scale.toFixed(2), ' recorded', data.series[k].yaw.toFixed(2), data.series[k].pitch.toFixed(2), data.series[k].scale.toFixed(2)); }
console.log(`${name}: frames ${result.errors.length}  max corner error ${result.max.toFixed(2)}px  mean ${result.mean.toFixed(2)}px  p95 ${result.p95.toFixed(2)}px`);
