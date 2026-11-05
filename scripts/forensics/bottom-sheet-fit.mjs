import fs from 'node:fs/promises';

// Fits the sheet's settle spring (mass 1) to the recorded releases, and the backdrop curve and the opening motion.
const directory = 'docs/research/bottom-sheet/source';
const files = (await fs.readdir(directory)).filter(f => f.startsWith('drag-') && f.endsWith('.json'));
const trials = [];
for (const f of files) trials.push(JSON.parse(await fs.readFile(`${directory}/${f}`, 'utf8')));

function simulate(k, c, x0, v0, target, times) {
  const out = [], dt = 0.0005; let x = x0, v = v0, t = 0, i = 0;
  while (i < times.length) { while (t < times[i]) { const a = -k * (x - target) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; }
  return out;
}
function fit(runs, label) {
  let best = { e: Infinity };
  for (let k = 40; k <= 700; k += 5) for (let z = 0.5; z <= 1.6; z += 0.04) {
    const c = 2 * z * Math.sqrt(k); let sum = 0, n = 0;
    for (const r of runs) {
      const m = simulate(k, c, r.x0, r.v0, r.target, r.times);
      for (const [i, y] of r.ys.entries()) { sum += ((y - m[i]) / Math.abs(r.target - r.x0)) ** 2; n++; }
    }
    if (sum / n < best.e) best = { e: sum / n, k, c: +c.toFixed(2), z: +z.toFixed(2) };
  }
  console.log(label.padEnd(26), JSON.stringify({ stiffness: best.k, damping: best.c, ratio: best.z, rmse: +Math.sqrt(best.e).toFixed(4), runs: runs.length }));
  return best;
}

// releases at rest (the pointer held still, so the velocity is ~0): the frames after the pointer-up
const settle = (trial, targetOf) => {
  const up = trial.pointer.find(p => p.up); if (!up) return null;
  const frames = trial.frames.filter(f => !f.gone && f.t >= up.t);
  if (frames.length < 10) return null;
  const x0 = frames[0].ty, target = targetOf(trial);
  if (Math.abs(target - x0) < 30) return null;
  return { x0, v0: 0, target, times: frames.map(f => (f.t - frames[0].t) / 1000), ys: frames.map(f => f.ty), label: trial.label };
};
const target = t => t.after === 'dismissed' ? 960 : t.after;
const rest = trials.filter(t => /rest/.test(t.label)).map(t => settle(t, target)).filter(Boolean);
console.log('release recordings used:', rest.map(r => `${r.label}(${r.x0.toFixed(0)}->${r.target})`).join(' '));
const towardTall = rest.filter(r => r.target === 0), towardSmall = rest.filter(r => r.target === 460), toClosed = rest.filter(r => r.target === 960);
const result = {};
if (rest.length) result.settle = fit(rest, 'all releases');
if (towardTall.length) result.toTall = fit(towardTall, 'to tallest');
if (towardSmall.length) result.toSmall = fit(towardSmall, 'back to smallest');
if (toClosed.length) result.toClosed = fit(toClosed, 'dismissed');

// opening: from the closed position to the first detent
const opening = JSON.parse(await fs.readFile(`${directory}/motion-open.json`, 'utf8')).filter(f => !f.gone);
const tyOf = f => { const m = f.tf.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[5] : 0; };
const startIndex = opening.findIndex(f => tyOf(f) < 959);
const open = opening.slice(Math.max(0, startIndex - 1)).filter(f => f.t < 1300);
const openRun = { x0: tyOf(open[0]), v0: 0, target: 460, times: open.map(f => (f.t - open[0].t) / 1000), ys: open.map(tyOf) };
console.log('opening starts at', openRun.x0.toFixed(1));
result.open = fit([openRun], 'opening 960 -> 460');

// backdrop: opacity as a piecewise-linear function of the sheet's position
const samples = new Map();
for (const t of trials) for (const f of t.frames) if (!f.gone && f.ov != null) samples.set(Math.round(f.ty / 20) * 20, f.ov);
for (const f of opening) samples.set(Math.round(tyOf(f) / 20) * 20, f.ov);
const curve = [...samples.entries()].map(([y, o]) => [y, o]).sort((a, b) => a[0] - b[0]);
const near = y => curve.reduce((best, c) => Math.abs(c[0] - y) < Math.abs(best[0] - y) ? c : best);
console.log('backdrop opacity at tallest / smallest / closed:', near(0)[1], near(460)[1], near(960)[1], '| midway 230:', near(240)[1], 'midway 710:', near(700)[1]);
result.backdrop = { atTallest: near(0)[1], atSmallest: near(460)[1], atClosed: near(960)[1] };
await fs.writeFile(`${directory}/spring-fit.json`, JSON.stringify(result, null, 2));

// closing by Escape / outside click: from the smallest detent to the closed position, and when it is unmounted
for (const name of ['motion-escape-close', 'motion-outside-click-close']) {
  const frames = JSON.parse(await fs.readFile(`${directory}/${name}.json`, 'utf8'));
  const live = frames.filter(f => !f.gone), goneAt = frames.find(f => f.gone)?.t;
  const start = live.findIndex(f => tyOf(f) > 461);
  const run = live.slice(Math.max(0, start - 1));
  const r = { x0: tyOf(run[0]), v0: 0, target: 960, times: run.map(f => (f.t - run[0].t) / 1000), ys: run.map(tyOf) };
  result[name] = fit([r], name);
  console.log('   unmounted', (goneAt - run[0].t).toFixed(0), 'ms after the first movement; last live ty', tyOf(live.at(-1)).toFixed(1));
}
await fs.writeFile(`${directory}/spring-fit.json`, JSON.stringify(result, null, 2));
