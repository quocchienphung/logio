import fs from 'node:fs/promises';
import path from 'node:path';
import { project, W, D } from './lib/terrain-solve.mjs';
import { structure } from './lib/terrain-parse.mjs';
import { lm } from './lib/numeric.mjs';

// Camera pose time series of recorded scenarios from the platform quad of every frame: yaw, pitch, scale (px per unit at the pivot = F / dist),
// camera distance (perspective strength) and pan (cx, cy). Each frame warm-starts from the previous one.
//   node scripts/forensics/uiarc-terrain-series.mjs <scratch-dir> <out-dir> <scenario> [scenario ...]
const [scratch, outDir, ...names] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const world = [[-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [W / 2, 0, D / 2], [-W / 2, 0, D / 2]];
for (const name of names) {
  const trace = JSON.parse(await fs.readFile(path.join(scratch, `${name}.json`), 'utf8'));
  const size = process.env.TERRAIN_SIZE ? JSON.parse(process.env.TERRAIN_SIZE) : (trace.frames.find(f => f.size)?.size ?? [623, 292]);
  const t0 = trace.frames[0]?.t ?? 0;
  let guess = [-0.55, 0.54, 18.88, Math.log(41.985), 16, -11];
  const series = [];
  for (const frame of trace.frames) {
    const plat = structure(frame).platform?.pts;
    if (!plat || plat.length !== 4) continue;
    const residual = x => { const dist = Math.exp(Math.min(6, Math.max(2.5, x[3]))); return world.flatMap((p, n) => { const q = project(p, { yaw: x[0], pitch: x[1], F: x[2] * dist, dist, ty: 0, cx: x[4], cy: x[5] }, size); return [q[0] - plat[n][0], q[1] - plat[n][1]]; }); };
    let fit = lm(residual, guess, { iterations: 60 });
    if (!(fit.cost < 0.05)) for (const g of [[-0.1, 1.3, 10, Math.log(42), 3, -9], [-0.4, 0.8, 12, Math.log(42), 7, -17], [-0.55, 0.54, 18.9, Math.log(42), 16, -11], [0, Math.PI / 2 - 1e-3, 21.5, Math.log(80), 0, 0], [-0.3, 1.2, 11, Math.log(90), 0, 0], [-0.3, 0.9, 11, Math.log(80), 12, -20]]) { const f2 = lm(residual, g, { iterations: 120 }); if (f2.cost < fit.cost) fit = f2; }
    guess = fit.x;
    series.push({ t: +(frame.t - t0).toFixed(2), yaw: +(fit.x[0] * 180 / Math.PI).toFixed(4), pitch: +(fit.x[1] * 180 / Math.PI).toFixed(4), scale: +fit.x[2].toFixed(4), dist: +Math.exp(fit.x[3]).toFixed(3), cx: +fit.x[4].toFixed(3), cy: +fit.x[5].toFixed(3), rms: +Math.sqrt(fit.cost / 8).toFixed(4), plat: plat.flat().map(v => +v.toFixed(2)) });
  }
  await fs.writeFile(path.join(outDir, `${name}.series.json`), JSON.stringify({ size, events: trace.events.map(e => ({ ...e, t: +(e.t - t0).toFixed(2) })), marks: trace.marks.map(m => ({ ...m, t: +(m.t - t0).toFixed(2) })), series }));
  const worst = Math.max(...series.map(s => s.rms));
  console.log(name, 'frames', series.length, 'worst rms', worst.toFixed(3), 'first', JSON.stringify(series[0] && { ...series[0], plat: undefined }), 'last', JSON.stringify(series.at(-1) && { ...series.at(-1), plat: undefined }));
}
