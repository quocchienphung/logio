// For many recorded flies: the settled platform -> fly zoom, pivot height and shift that reproduce it (pivot at the clicked column, camera angles unchanged).
//   node --experimental-strip-types scripts/forensics/uiarc-terrain-flyfit.mjs <trace-dir> <series-dir> <index> [index ...]
import fs from 'node:fs/promises';
import path from 'node:path';
import { TerrainCamera } from '../../src/components/sites/skilled/terrain/terrain-camera.ts';
import { cellX, cellZ } from '../../src/components/sites/skilled/terrain/terrain-math.ts';
import { platformCorners } from './lib/terrain-sim.mjs';
import { lm } from './lib/numeric.mjs';

const [traceDir, seriesDir, ...indexes] = process.argv.slice(2);
const PREFIX = process.env.PREFIX || 'fly-', START = process.env.START ? JSON.parse(process.env.START) : null;
const size = { width: 622.81, height: 291.63 };
const f = JSON.parse(await fs.readFile(path.join(seriesDir, 'load.heights.json'), 'utf8')).frames.at(-1);
const heights = Array.from({ length: 168 }, (_, k) => Math.max(0, f.h[k] ?? 0));
const rows = [];
for (const name of indexes) {
  const index = Number(name), trace = JSON.parse(await fs.readFile(path.join(traceDir, `${PREFIX}${index}.json`), 'utf8'));
  const p = trace.frames.at(-1).polys[0].p;
  const target = p;
  const h = heights[index];
  const make = (zoom, pivot, dx, dy) => { const cam = new TerrainCamera(size); cam.setHeights(heights); cam.snapToRest(); if (START) cam.setView(START); const b = cam.pose; return platformCorners({ ...b, scale: b.scale * zoom, ox: b.ox + dx, oy: b.oy + dy, tx: cellX(index % 24), ty: pivot, tz: cellZ(Math.floor(index / 24)) }, size); };
  const resid = x => make(...x).map((v, i) => v - target[i]);
  const fit = lm(resid, [1.5, 1, 0, 7], { iterations: 80 });
  const rms = Math.sqrt(fit.cost / 8);
  rows.push({ index, h, zoom: fit.x[0], pivot: fit.x[1], dx: fit.x[2], dy: fit.x[3], rms });
  console.log(`cell ${String(index).padStart(3)} (hour ${String(index % 24).padStart(2)} day ${Math.floor(index / 24)}) h ${h.toFixed(3)}  zoom ${fit.x[0].toFixed(3)} pivot ${fit.x[1].toFixed(3)} (${(fit.x[1] / Math.max(h, 1e-6)).toFixed(3)} of h)  dx ${fit.x[2].toFixed(2)} dy ${fit.x[3].toFixed(2)}  rms ${rms.toFixed(3)}`);
}
