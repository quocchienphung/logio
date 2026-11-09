import fs from 'node:fs/promises';
import path from 'node:path';
import { lm } from './lib/numeric.mjs';

// Fit a damped spring step response  x(t) = end + (start - end) * r(t - delay)  to a channel of a camera pose series.
//   node uiarc-terrain-spring.mjs <series-dir> <scenario> <channel> [from-ms] [to-ms]
const [dir, name, channel, from = '0', to = '1e9'] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(path.join(dir, `${name}.series.json`), 'utf8'));
const pts = d.series.filter(s => s.t >= Number(from) && s.t <= Number(to)).map(s => ({ t: (s.t - Number(from)) / 1000, v: s[channel] }));
const start = pts[0].v, end = pts.at(-1).v;
// unit-mass spring with natural frequency w and damping ratio z, released from rest at 1, settling to 0
function response(t, w, z) {
  if (t <= 0) return 1;
  if (Math.abs(z - 1) < 1e-4) return (1 + w * t) * Math.exp(-w * t);
  if (z < 1) { const wd = w * Math.sqrt(1 - z * z); return Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t)); }
  const s = Math.sqrt(z * z - 1), a = w * (z + s), b = w * (z - s);
  return (a * Math.exp(-b * t) - b * Math.exp(-a * t)) / (a - b);
}
const residual = x => pts.map(p => (end + (start - end) * response(p.t - x[2], Math.exp(x[0]), x[1])) - p.v);
let best = null;
for (const w of [2, 4, 6, 9, 14]) for (const z of [0.7, 1, 1.5, 2.5]) {
  const fit = lm(residual, [Math.log(w), z, 0], { iterations: 100 });
  if (Number.isFinite(fit.cost) && (!best || fit.cost < best.cost)) best = fit;
}
const w = Math.exp(best.x[0]), z = best.x[1];
const span = Math.abs(end - start) || 1;
console.log(`${name}.${channel} ${start.toFixed(3)} -> ${end.toFixed(3)}  omega ${w.toFixed(3)} rad/s  zeta ${z.toFixed(3)}  delay ${(best.x[2] * 1000).toFixed(1)}ms  stiffness ${(w * w).toFixed(2)} damping ${(2 * z * w).toFixed(2)}  rms ${(Math.sqrt(best.cost / pts.length)).toFixed(4)} (${(100 * Math.sqrt(best.cost / pts.length) / span).toFixed(2)}% of span)`);
