// Fits a spring (mass 1; stiffness, damping) to a recorded 0..1 progress series: grid search over natural frequency and damping ratio, start time free.
// Reads the recordings of orchestrator-motion.mjs / orchestrator-run.mjs. Usage: node scripts/forensics/orchestrator-fit.mjs
import fs from 'node:fs/promises';

const directory = 'docs/research/orchestrator/source';
export function springAt(omega, zeta, t) {
  if (t <= 0) return 0;
  if (Math.abs(zeta - 1) < 1e-6) return 1 - (1 + omega * t) * Math.exp(-omega * t);
  if (zeta < 1) { const wd = omega * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t)); }
  const s = omega * Math.sqrt(zeta * zeta - 1), r1 = -zeta * omega + s, r2 = -zeta * omega - s;
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}
export function fit(points) {
  // points: [[tSeconds, progress 0..1]]
  let best = { rmse: Infinity };
  const t0 = points.find(p => p[1] > 0.004)?.[0] ?? 0;
  for (let omega = 4; omega <= 140; omega += 0.5) for (let zeta = 0.4; zeta <= 2.6; zeta += 0.02) for (let shift = -0.03; shift <= 0.03; shift += 0.005) {
    let sum = 0;
    for (const [t, y] of points) { const d = springAt(omega, zeta, t - t0 + shift) - y; sum += d * d; }
    const rmse = Math.sqrt(sum / points.length);
    if (rmse < best.rmse) best = { rmse, omega, zeta, shift, stiffness: omega * omega, damping: 2 * zeta * omega };
  }
  return best;
}
const progress = (series, index, from, to) => series.map(s => [s.t / 1000, (s.els[0][index] - from) / (to - from)]).filter(p => Number.isFinite(p[1]));
const show = (name, f) => console.log(name.padEnd(34), `omega ${f.omega.toFixed(1)} zeta ${f.zeta.toFixed(2)} -> stiffness ${f.stiffness.toFixed(0)} damping ${f.damping.toFixed(1)}  rmse ${f.rmse.toFixed(4)}`);

const lane = JSON.parse(await fs.readFile(`${directory}/motion-orch-lane.json`, 'utf8'));
const tc = JSON.parse(await fs.readFile(`${directory}/motion-toolcall-group.json`, 'utf8'));
const results = {};
const run = (name, series, index, from, to) => { const f = fit(progress(series, index, from, to).filter(p => p[0] < 1.2)); results[name] = f; show(name, f); };
run('orchestrator transcript open (height)', lane.open, 0, 0, lane.open.at(-1).els[0][0]);
run('orchestrator transcript open (opacity)', lane.open, 2, 0, 1);
run('orchestrator transcript close (height)', lane.close.map(s => ({ t: s.t, els: [[lane.open.at(-1).els[0][0] - s.els[0][0], ...s.els[0].slice(1)]] })), 0, 0, lane.open.at(-1).els[0][0]);
run('tool group unfold (height)', tc.unfold, 0, tc.unfold[0].els[0][0], tc.unfold.at(-1).els[0][0]);
run('tool group fold (height)', tc.fold, 0, tc.fold[0].els[0][0], tc.fold.at(-1).els[0][0]);

// plan items from the run recording
const frames = JSON.parse(await fs.readFile(`${directory}/agent-orchestrator/run-cdefault.json`, 'utf8'));
const start = frames.findIndex(f => f.plan.length === 1 && f.plan[0][0] === 0);
const plan = frames.slice(start, start + 120).map(f => ({ t: f.t - frames[start].t, els: [[f.plan[0][1], 0, f.plan[0][0]]] }));
run('plan item opacity', plan, 2, 0, 1);
await fs.writeFile(`${directory}/spring-fit.json`, JSON.stringify(results, null, 1));
