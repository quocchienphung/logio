import fs from 'node:fs/promises';
import { structure } from './lib/terrain-parse.mjs';

// Quick look at a recorded scenario: frame cadence, when drawing stops, platform corners and tallest face over time.
const file = process.argv[2];
const every = Number(process.argv[3] || 10);
const trace = JSON.parse(await fs.readFile(file, 'utf8'));
const frames = trace.frames;
console.log('frames', frames.length, 'span ms', frames.length ? (frames.at(-1).t - frames[0].t).toFixed(1) : 0, 'marks', JSON.stringify(trace.marks.map(m => [m.name, Math.round(m.t)])), 'events', trace.events.length);
const t0 = frames[0]?.t ?? 0;
const deltas = frames.slice(1).map((f, i) => f.t - frames[i].t);
console.log('delta median', [...deltas].sort((a, b) => a - b)[deltas.length >> 1]?.toFixed(2), 'max', Math.max(...deltas).toFixed(1));
const gaps = deltas.map((d, i) => [d, i + 1]).filter(([d]) => d > 60).map(([d, i]) => `${i}:${d.toFixed(0)}`);
console.log('gaps >60ms at frame:ms', gaps.join(' '));
frames.forEach((frame, i) => {
  if (i % every && i !== frames.length - 1) return;
  const s = structure(frame);
  const p = s.platform?.pts ?? [];
  const heights = s.cells.map(c => { const side = c.side.pts; return side.length ? Math.hypot(side[0][0] - side[1][0], side[0][1] - side[1][1]) : 0; });
  console.log(String(i).padStart(4), (frame.t - t0).toFixed(1).padStart(8), 'polys', s.count, 'plat', p.map(q => q.map(v => v.toFixed(1)).join(',')).join(' '), 'maxH', Math.max(...heights).toFixed(1), 'other', s.other.length, 'labels', s.labels.length);
});
