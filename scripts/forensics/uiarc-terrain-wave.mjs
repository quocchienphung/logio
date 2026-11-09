import fs from 'node:fs/promises';
import { cellsOf } from './lib/terrain-solve.mjs';

// Column height of every cell over time (world units), from the recorded frames and their fitted camera. Output: <out>.heights.json
//   node uiarc-terrain-wave.mjs <trace.json> <series.json> <out.json> [step]
const [tracePath, seriesPath, out, step = '1'] = process.argv.slice(2);
const trace = JSON.parse(await fs.readFile(tracePath, 'utf8'));
const series = JSON.parse(await fs.readFile(seriesPath, 'utf8')).series;
const size = trace.frames.find(f => f.size)?.size ?? [623, 292];
const frames = [];
// series is one entry per frame that had a platform, in the same order as trace.frames
for (let i = 0; i < trace.frames.length; i += Number(step)) {
  const s = series[i];
  if (!s) continue;
  const cam = { yaw: s.yaw * Math.PI / 180, pitch: s.pitch * Math.PI / 180, dist: s.dist, F: s.scale * s.dist, ty: 0, cx: s.cx, cy: s.cy, tx: 0, tz: 0 };
  const solved = cellsOf(trace.frames[i], cam, size, true);
  const h = new Array(168).fill(null);
  for (const c of solved.cells) if (!c.bad) h[c.j * 24 + c.i] = +c.h.toFixed(4);
  frames.push({ i, t: s.t, h, top: solved.cells.filter(c => !c.bad).map(c => [c.j * 24 + c.i, c.top, c.front, c.side]) });
}
await fs.writeFile(out, JSON.stringify({ frames }));
console.log('frames solved', frames.length, 'of', trace.frames.length);
