import fs from 'node:fs/promises';

// Fits a damped spring (mass 1) to the frames recorded by ai-side-panel-motion.mjs.
// Progress is how far the panel has moved from its start toward its end, 0 to 1.
const directory = 'docs/research/ai-side-panel/source';
const WIDTH = 360;
const load = async name => JSON.parse(await fs.readFile(`${directory}/motion-${name}.json`, 'utf8'));
const series = async (name, opening) => {
  const frames = await load(name);
  return frames.map(frame => ({ t: frame.t, p: opening ? (1085.41 - frame.panel[0]) / WIDTH : (frame.panel[0] - 725.41) / WIDTH, reopen: +frame.reopenOpacity }));
};
const runs = { open: await series('open', true), close: await series('close', false), close2: await series('close2', false) };

/** Spring position at time t (seconds) for a step 0 to 1, integrated with small fixed steps. */
function spring(stiffness, damping, times) {
  const out = [], dt = 0.0005;
  let x = 0, v = 0, t = 0, i = 0;
  while (i < times.length) {
    while (t < times[i]) { const a = -stiffness * (x - 1) - damping * v; v += a * dt; x += v * dt; t += dt; }
    out.push(x); i += 1;
  }
  return out;
}
const error = (run, stiffness, damping, delay) => {
  const times = run.map(frame => Math.max(0, (frame.t - delay) / 1000));
  const model = spring(stiffness, damping, times);
  return run.reduce((sum, frame, index) => sum + (frame.p - model[index]) ** 2, 0) / run.length;
};

// The start of the motion: the first frame that has moved more than 0.5%
const startOf = run => run.find(frame => frame.p > 0.005)?.t ?? 0;
const report = {};
for (const [name, run] of Object.entries(runs)) {
  const start = startOf(run), end = run.find(frame => frame.p > 0.995)?.t;
  report[name] = { start, end90: run.find(frame => frame.p > 0.9)?.t - start, end99: end - start };
}
console.log('timing (ms after the first movement)', JSON.stringify(report));

let best = { e: Infinity };
for (let stiffness = 100; stiffness <= 700; stiffness += 10) for (let damping = 14; damping <= 60; damping += 1) {
  let sum = 0;
  for (const run of Object.values(runs)) {
    const trimmed = run.filter(frame => frame.t >= startOf(run) - 20);
    sum += error(trimmed, stiffness, damping, startOf(run) - 2);
  }
  if (sum < best.e) best = { e: sum, stiffness, damping };
}
const ratio = best.damping / (2 * Math.sqrt(best.stiffness));
console.log('best fit', JSON.stringify({ ...best, rmse: Math.sqrt(best.e / 3).toFixed(4), dampingRatio: ratio.toFixed(3) }));
await fs.writeFile(`${directory}/spring-fit.json`, JSON.stringify({ stiffness: best.stiffness, damping: best.damping, mass: 1, dampingRatio: +ratio.toFixed(3), rmse: +Math.sqrt(best.e / 3).toFixed(4), timing: report }, null, 2));

// Reopen button opacity: when it starts fading and how long it takes
for (const [name, key] of [['open', 'opening: reopen button leaves'], ['close', 'closing: reopen button appears']]) {
  const frames = await load(name);
  const from = frames.find((frame, index) => index > 0 && frame.reopenOpacity !== frames[0].reopenOpacity);
  const to = frames.find(frame => Math.abs(+frame.reopenOpacity - +frames.at(-1).reopenOpacity) < 0.01 && frame.t > (from?.t ?? 0));
  console.log(key, 'changes from', from?.t, 'to', to?.t, 'values', frames[0].reopenOpacity, '->', frames.at(-1).reopenOpacity);
}
