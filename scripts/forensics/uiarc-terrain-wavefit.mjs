import fs from 'node:fs/promises';
import { lm } from './lib/numeric.mjs';

// Fit every column's rise to a damped spring with a start delay, then regress the delay on (hour, day).
//   node uiarc-terrain-wavefit.mjs <heights.json> [from-ms] [to-ms]
const [file, from = '0', to = '1e9'] = process.argv.slice(2);
const frames = JSON.parse(await fs.readFile(file, 'utf8')).frames.filter(f => f.t >= Number(from) && f.t <= Number(to));
function response(t, w, z) {
  if (t <= 0) return 1;
  if (Math.abs(z - 1) < 1e-4) return (1 + w * t) * Math.exp(-w * t);
  if (z < 1) { const wd = w * Math.sqrt(1 - z * z); return Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t)); }
  const s = Math.sqrt(z * z - 1), a = w * (z + s), b = w * (z - s);
  return (a * Math.exp(-b * t) - b * Math.exp(-a * t)) / (a - b);
}
const rows = [];
for (let cell = 0; cell < 168; cell++) {
  const pts = frames.map(f => ({ t: (f.t - Number(from)) / 1000, v: f.h[cell] })).filter(p => p.v != null);
  const start = pts[0].v, end = pts.at(-1).v;
  if (Math.abs(end - start) < 0.5) continue;
  const resid = x => pts.map(p => (end + (start - end) * response(p.t - x[2], Math.exp(x[0]), x[1])) - p.v);
  let best = null;
  for (const d of [0, 0.3, 0.6, 0.9]) for (const w of [3, 6, 10]) { const fit = lm(resid, [Math.log(w), 1, d], { iterations: 80 }); if (Number.isFinite(fit.cost) && (!best || fit.cost < best.cost)) best = fit; }
  rows.push({ cell, i: cell % 24, j: Math.floor(cell / 24), w: Math.exp(best.x[0]), z: best.x[1], d: best.x[2], rms: Math.sqrt(best.cost / pts.length), span: Math.abs(end - start) });
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log('cells fitted', rows.length, 'omega mean', mean(rows.map(r => r.w)).toFixed(3), 'zeta mean', mean(rows.map(r => r.z)).toFixed(3), 'rms mean', mean(rows.map(r => r.rms)).toFixed(4));
// least-squares delay = a + b*i + c*j (+ d*i*j) over the cells that rise
const X = rows.map(r => [1, r.i, r.j, r.i * r.j]), y = rows.map(r => r.d);
function lstsq(X, y) { const n = X[0].length, A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0); X.forEach((row, k) => row.forEach((v, a) => { b[a] += v * y[k]; row.forEach((u, c) => { A[a][c] += v * u; }); })); const M = A.map((row, i) => [...row, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((row, i) => row[n] / row[i]); }
const [a, bi, cj, dij] = lstsq(X, y);
console.log(`delay(s) = ${a.toFixed(4)} + ${bi.toFixed(5)} * hour + ${cj.toFixed(5)} * day + ${dij.toFixed(6)} * hour * day`);
const pred = r => a + bi * r.i + cj * r.j + dij * r.i * r.j;
console.log('delay residual rms', Math.sqrt(mean(rows.map(r => (pred(r) - r.d) ** 2))).toFixed(4));
// radial alternatives
for (const [name, fn] of [['dist from (0,0)', r => Math.hypot(r.i, r.j)], ['dist from (0,0) scaled day*3.4', r => Math.hypot(r.i, r.j * 3.43)], ['i + j', r => r.i + r.j], ['i + 2j', r => r.i + 2 * r.j]]) {
  const xs = rows.map(fn), mx = mean(xs), my = mean(y);
  const slope = xs.reduce((s, v, k) => s + (v - mx) * (y[k] - my), 0) / xs.reduce((s, v) => s + (v - mx) ** 2, 0), ic = my - slope * mx;
  console.log(name, 'slope', slope.toFixed(5), 'intercept', ic.toFixed(4), 'rms', Math.sqrt(mean(xs.map((v, k) => (ic + slope * v - y[k]) ** 2))).toFixed(4));
}
console.log('sample', JSON.stringify(rows.filter(r => (r.i % 11 === 0) && (r.j % 3 === 0)).map(r => [r.i, r.j, +r.d.toFixed(3), +r.w.toFixed(2), +r.z.toFixed(2), +r.rms.toFixed(3)])));
