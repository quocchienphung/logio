import fs from 'node:fs/promises';
import path from 'node:path';
import { project, W, D, cellsOf } from './lib/terrain-solve.mjs';
import { structureFlexible } from './lib/terrain-parse.mjs';
import { lm } from './lib/numeric.mjs';

// Column colour as a function of its height share t: fit, per theme and tone, two oklab anchors (t = 0 and t = 1) to the top faces of a settled frame.
//   node uiarc-terrain-colors.mjs <trace-dir>  light:load  light:metric-deploys  light:metric-errors  dark:dark-load  dark:dark-errors
const [dir, ...specs] = process.argv.slice(2);
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const gam = l => { const s = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, s * 255)); };
function toOklab(r, g, b) { const R = lin(r), G = lin(g), B = lin(b); const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B); return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; }
function fromOklab(L, a, b) { const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3; return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)]; }
const parse = s => /rgb\((\d+) (\d+) (\d+)/.exec(s).slice(1).map(Number);
const size = [622.81, 291.63];
const samples = {};
for (const spec of specs) {
  const [theme, name] = spec.split(':');
  const trace = JSON.parse(await fs.readFile(path.join(dir, `${name}.json`), 'utf8'));
  const frame = trace.frames.at(-1), plat = structureFlexible(frame).platform.pts;
  const world = [[-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [W / 2, 0, D / 2], [-W / 2, 0, D / 2]];
  const residual = x => { const dist = Math.exp(x[3]); return world.flatMap((p, n) => { const q = project(p, { yaw: x[0], pitch: x[1], F: x[2] * dist, dist, ty: 0, cx: x[4], cy: x[5] }, size); return [q[0] - plat[n][0], q[1] - plat[n][1]]; }); };
  const fit = lm(residual, [-0.5586, 0.5414, 18.8948, Math.log(41.957), 16.232, -10.885], { iterations: 100 });
  const dist = Math.exp(fit.x[3]), cam = { yaw: fit.x[0], pitch: fit.x[1], dist, F: fit.x[2] * dist, ty: 0, cx: fit.x[4], cy: fit.x[5], tx: 0, tz: 0 };
  const solved = cellsOf(frame, cam, size, true).cells.filter(c => !c.bad);
  const hmax = Math.max(...solved.map(c => c.h));
  const key = `${theme}:${name.includes('errors') ? 'red' : 'gray'}`;
  (samples[key] ||= []).push(...solved.map(c => ({ t: c.h / hmax, rgb: parse(c.top), front: parse(c.front), side: c.side ? parse(c.side) : null })));
  console.log(spec, 'pose rms', Math.sqrt(fit.cost / 8).toFixed(3), 'cells', solved.length, 'hmax', hmax.toFixed(3));
}
for (const [key, rows] of Object.entries(samples)) {
  // affine in t for each oklab channel
  const lab = rows.map(r => toOklab(...r.rgb));
  const anchors = [0, 1, 2].map(ch => { const n = rows.length, mx = rows.reduce((s, r) => s + r.t, 0) / n, my = lab.reduce((s, v) => s + v[ch], 0) / n; const b = rows.reduce((s, r, k) => s + (r.t - mx) * (lab[k][ch] - my), 0) / rows.reduce((s, r) => s + (r.t - mx) ** 2, 0); return [my - b * mx, my - b * mx + b]; });
  const lo = anchors.map(a => a[0]), hi = anchors.map(a => a[1]);
  let err = 0, worst = 0;
  for (const r of rows) { const p = fromOklab(...lo.map((v, ch) => v + (hi[ch] - v) * r.t)); const e = Math.max(...p.map((v, k) => Math.abs(v - r.rgb[k]))); err += e * e; worst = Math.max(worst, e); }
  console.log(key.padEnd(11), 'cells', rows.length, 'oklab at t=0', lo.map(v => v.toFixed(4)).join(' '), ' t=1', hi.map(v => v.toFixed(4)).join(' '), ' rms(8bit)', Math.sqrt(err / rows.length).toFixed(2), 'worst', worst.toFixed(1), 'rgb@0', fromOklab(...lo).map(Math.round).join(','), 'rgb@1', fromOklab(...hi).map(Math.round).join(','));
}

// Direct sRGB fit: each channel as a cubic in t (what the engine ships), with the measured face shading ratios.
function lstsq(X, y) { const n = X[0].length, A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0); X.forEach((r, k) => r.forEach((v, a) => { b[a] += v * y[k]; r.forEach((u, c) => { A[a][c] += v * u; }); })); const M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / r[i]); }
const poly = {};
for (const [key, rows] of Object.entries(samples)) {
  const X = rows.map(r => [1, r.t, r.t ** 2, r.t ** 3]);
  const coef = [0, 1, 2].map(ch => lstsq(X, rows.map(r => r.rgb[ch])));
  let e2 = 0, worst = 0;
  rows.forEach((r, k) => { for (let ch = 0; ch < 3; ch++) { const v = X[k].reduce((s, x, i) => s + x * coef[ch][i], 0); const e = Math.abs(v - r.rgb[ch]); e2 += e * e; worst = Math.max(worst, e); } });
  poly[key] = coef.map(c => c.map(v => +v.toFixed(3)));
  console.log('cubic', key.padEnd(11), 'rms', Math.sqrt(e2 / rows.length / 3).toFixed(2), 'worst', worst.toFixed(1), JSON.stringify(poly[key]), 'rgb@0', [0, 1, 2].map(ch => coef[ch][0].toFixed(0)).join(','), 'rgb@1', [0, 1, 2].map(ch => coef[ch].reduce((a, b) => a + b, 0).toFixed(0)).join(','));
}

for (const [key, rows] of Object.entries(samples)) {
  const hi = rows.filter(r => r.rgb[0] > 90 && r.side);
  const stat = arr => { const m = arr.reduce((a, b) => a + b, 0) / arr.length; return [m.toFixed(4), Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length).toFixed(4), arr.length]; };
  const sides = hi.map(r => r.side[0] / r.rgb[0]);
  console.log('shade', key.padEnd(11), 'front/top', stat(hi.map(r => r.front[0] / r.rgb[0])).join(' '), '| side/top lo cluster', stat(sides.filter(v => v < 0.77)).join(' '), '| hi cluster', stat(sides.filter(v => v >= 0.77)).join(' '));
}
