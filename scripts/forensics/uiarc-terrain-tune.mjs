// Tune the camera's motion parameters so its platform corners follow a recorded scenario (least squares over every frame).
//   node --experimental-strip-types scripts/forensics/uiarc-terrain-tune.mjs <series-dir> load
import fs from 'node:fs/promises';
import path from 'node:path';
import { lm } from './lib/numeric.mjs';
import { TerrainCamera } from '../../src/components/sites/skilled/terrain/terrain-camera.ts';
import { makeView, projectPoint } from '../../src/components/sites/skilled/terrain/terrain-math.ts';
import { PLATFORM_HALF_D, PLATFORM_HALF_W, CELLS } from '../../src/components/sites/skilled/terrain/terrain-constants.ts';

const [dir, name] = process.argv.slice(2);
const size = { width: 622.81, height: 291.63 };
const data = JSON.parse(await fs.readFile(path.join(dir, `${name}.series.json`), 'utf8'));
const f = JSON.parse(await fs.readFile(path.join(dir, 'load.heights.json'), 'utf8')).frames.at(-1);
const heights = Array.from({ length: CELLS }, (_, k) => Math.max(0, f.h[k] ?? 0));
const corners = [[-PLATFORM_HALF_W, -PLATFORM_HALF_D], [PLATFORM_HALF_W, -PLATFORM_HALF_D], [PLATFORM_HALF_W, PLATFORM_HALF_D], [-PLATFORM_HALF_W, PLATFORM_HALF_D]];
const names = ['introZoom', 'introScaleOmega', 'introAngleOmega', 'introAngleZeta'];
const fixed = { frameOmega: Number(process.env.FRAME_OMEGA || 10), introDelay: 0.19 };
function run(tuning) {
  const cam = new TerrainCamera(size, { ...fixed, ...tuning }); cam.setHeights(heights); cam.startIntro(); cam.step(0.014);
  const out = { x: 0, y: 0, depth: 0 }, res = []; let prev = data.series[0].t;
  for (const frame of data.series) {
    cam.step(Math.max(0, frame.t - prev) / 1000); prev = frame.t;
    const view = makeView(cam.pose, size);
    corners.forEach(([x, z], i) => { projectPoint(view, x, 0, z, out); res.push(out.x - frame.plat[2 * i], out.y - frame.plat[2 * i + 1]); });
  }
  return res;
}
const x0 = [0.87, 4.3, 2.7, 0.95];
const residual = x => run(Object.fromEntries(names.map((n, i) => [n, n === 'introAngleZeta' ? Math.min(0.999, Math.max(0.4, x[i])) : x[i]])));
const before = residual(x0), rms = r => Math.sqrt(r.reduce((s, v) => s + v * v, 0) / r.length);
console.log('before rms', rms(before).toFixed(2), 'px');
const fit = lm(residual, x0, { iterations: 60, step: 1e-3 });
const after = residual(fit.x);
console.log('after rms', rms(after).toFixed(2), 'px', 'max', Math.max(...after.map(Math.abs)).toFixed(2));
console.log(JSON.stringify(Object.fromEntries(names.map((n, i) => [n, +fit.x[i].toFixed(4)]))));
