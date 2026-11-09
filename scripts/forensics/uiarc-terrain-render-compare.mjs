// Draw the local terrain into a recording stand-in for the canvas and compare every polygon with the frame the public preview drew at the same pose.
//   node --experimental-strip-types scripts/forensics/uiarc-terrain-render-compare.mjs <trace-dir> <series-dir> <scenario> <frame> [dark] [tone=neutral|danger] [heights-scenario]
import fs from 'node:fs/promises';
import path from 'node:path';
import { drawTerrain, createScene, lightTheme, darkTheme } from '../../src/components/sites/skilled/terrain/terrain-draw.ts';
import { CELLS, MAX_HEIGHT } from '../../src/components/sites/skilled/terrain/terrain-constants.ts';

const [traceDir, seriesDir, scenario, frameArg, dark, toneArg = 'neutral', heightsFrom = 'load'] = process.argv.slice(2);
const SZ = process.env.TERRAIN_SIZE ? JSON.parse(process.env.TERRAIN_SIZE) : [622.81, 291.63];
const size = { width: SZ[0], height: SZ[1] };
const trace = JSON.parse(await fs.readFile(path.join(traceDir, `${scenario}.json`), 'utf8'));
const frame = trace.frames[Number(frameArg) < 0 ? trace.frames.length + Number(frameArg) : Number(frameArg)];
const series = JSON.parse(await fs.readFile(path.join(seriesDir, `${scenario}.series.json`), 'utf8')).series;
const pose6 = series[Number(frameArg) < 0 ? series.length + Number(frameArg) : Number(frameArg)];
const hs = JSON.parse(await fs.readFile(path.join(seriesDir, `${heightsFrom}.heights.json`), 'utf8')).frames.at(-1);
const heights = Array.from({ length: CELLS }, (_, k) => Math.max(0, hs.h[k] ?? 0));
const max = Math.max(...heights), shares = heights.map(h => h / max);
const flat = pose6.pitch > 89.9 || process.env.FLAT;
const world = heights.map(h => (flat ? 0 : h / max * MAX_HEIGHT));

// the recorded pose, exactly as fitted from this frame
const pose = { yaw: pose6.yaw, pitch: pose6.pitch, dist: pose6.pitch > 89.9 ? 159.6 : pose6.dist, scale: pose6.scale, ox: pose6.cx, oy: pose6.cy, tx: 0, ty: 0, tz: 0 };

const mine = { polys: [], labels: [], texts: [] };
let path_ = [];
const ctx = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineJoin: 'miter', font: '', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1,
  beginPath() { path_ = []; }, moveTo(x, y) { path_.push([x, y]); }, lineTo(x, y) { path_.push([x, y]); }, closePath() {},
  fill() { mine.polys.push({ pts: path_.slice(), fill: this.fillStyle, stroked: false }); },
  stroke() { const last = mine.polys.at(-1); if (last && last.pts.length === path_.length && last.pts.every((p, i) => p[0] === path_[i][0] && p[1] === path_[i][1])) last.stroked = true; },
  clearRect() {}, fillText(text, x, y) { mine.labels.push({ text, x, y, font: this.font, fill: this.fillStyle }); }, setLineDash() {}, roundRect() {},
  measureText(text) { return { width: text.length * 6.2 }; },
};
drawTerrain(ctx, { pose, size, theme: dark ? darkTheme : lightTheme, tone: toneArg, heights: world, shares, highlight: null, flight: pose6.pitch > 89 ? 1 : 0, compact: false }, createScene());

// recorded polygons
const rec = frame.polys.map(p => ({ pts: Array.from({ length: p.p.length / 2 }, (_, i) => [p.p[2 * i], p.p[2 * i + 1]]), fill: p.f }));
const parse = s => /(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(s).slice(1).map(Number);
const centroid = pts => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const used = new Set();
let worstV = 0, sumV = 0, matched = 0, colorWorst = 0, colorSum = 0, missing = 0;
for (const r of rec.slice(1)) {
  if (r.pts.length !== 4) continue;
  const c = centroid(r.pts);
  let best = -1, bestD = 3;
  mine.polys.forEach((m, i) => { if (used.has(i) || m.pts.length !== 4) return; const mc = centroid(m.pts); const d = Math.hypot(mc[0] - c[0], mc[1] - c[1]); if (d < bestD) { bestD = d; best = i; } });
  if (best < 0) { missing++; continue; }
  used.add(best);
  const m = mine.polys[best];
  // vertex error: match each recorded vertex with the nearest of mine
  const err = Math.max(...r.pts.map(p => Math.min(...m.pts.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])))));
  worstV = Math.max(worstV, err); sumV += err; matched++;
  const dc = Math.max(...parse(r.fill).map((v, k) => Math.abs(v - parse(m.fill)[k])));
  colorWorst = Math.max(colorWorst, dc); colorSum += dc;
}
console.log(`${scenario}[${frameArg}] recorded polys ${rec.length}, mine ${mine.polys.length}; matched ${matched}, recorded-without-match ${missing}, mine-unmatched ${mine.polys.length - used.size - 1}`);
console.log(`vertex error: max ${worstV.toFixed(2)}px mean ${(sumV / matched).toFixed(3)}px | colour error: max ${colorWorst} mean ${(colorSum / matched).toFixed(2)} levels`);
const labelsMine = mine.labels.map(l => `${l.text}@${Math.round(l.x)},${Math.round(l.y)}`).join(' ');
console.log('labels mine    ', labelsMine);
console.log('labels recorded', frame.labels.map(l => `${l.text}@${Math.round(l.x)},${Math.round(l.y)}`).join(' '));
