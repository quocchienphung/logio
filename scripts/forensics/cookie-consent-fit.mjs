import fs from 'node:fs/promises';

// Fits damped springs (mass 1) to the surface recordings taken by cookie-consent-inspect.mjs.
// Channels: width, height, border radius, horizontal shift, and the face fade (opacity; blur is 4px * (1 - opacity)).
const directory = 'docs/research/cookie-consent/source';
const load = async name => JSON.parse(await fs.readFile(`${directory}/motion-${name}.json`, 'utf8'));
const num = text => parseFloat(text);
const shiftOf = tf => tf === 'none' ? 0 : Number(tf.match(/matrix\(([^)]+)\)/)[1].split(',')[4]);

function step(stiffness, damping, times) {
  const out = [], dt = 0.0005;
  let x = 0, v = 0, t = 0, i = 0;
  while (i < times.length) {
    while (t < times[i]) { const a = -stiffness * (x - 1) - damping * v; v += a * dt; x += v * dt; t += dt; }
    out.push(x); i += 1;
  }
  return out;
}
function fit(series, { kRange = [60, 1400, 10], zRange = [0.3, 1.3, 0.02] } = {}) {
  const from = series[0].v, to = series.at(-1).v;
  if (Math.abs(to - from) < 0.5) return null;
  const norm = series.map(f => ({ t: f.t, p: (f.v - from) / (to - from) }));
  const start = norm.find(f => Math.abs(f.p) > 0.004)?.t ?? 0;
  const use = norm.filter(f => f.t >= start - 8);
  let best = { e: Infinity };
  for (let k = kRange[0]; k <= kRange[1]; k += kRange[2]) for (let z = zRange[0]; z <= zRange[1]; z += zRange[2]) {
    const c = 2 * z * Math.sqrt(k);
    const model = step(k, c, use.map(f => Math.max(0, (f.t - (start - 1)) / 1000)));
    const e = use.reduce((s, f, i) => s + (f.p - model[i]) ** 2, 0) / use.length;
    if (e < best.e) best = { e, k, c, z };
  }
  const peak = Math.max(...norm.map(f => f.p));
  return { from: +from.toFixed(2), to: +to.toFixed(2), start: +start.toFixed(1), stiffness: best.k, damping: +best.c.toFixed(2), ratio: +best.z.toFixed(2), rmse: +Math.sqrt(best.e).toFixed(4), overshoot: +(Math.max(0, peak - 1) * 100).toFixed(2) + '%' };
}

const runs = ['bar-to-prefs', 'prefs-to-reopen', 'reopen-to-prefs', 'prefs-escape-to-reopen', 'reset-to-bar', 'accept-to-reopen', 'reject-to-reopen'];
const report = {};
for (const name of runs) {
  let frames;
  try { frames = await load(name); } catch { continue; }
  const channel = pick => frames.map(f => ({ t: f.t, v: pick(f) }));
  const faceIn = frames.map(f => ({ t: f.t, v: Math.max(0, ...f.faces.filter(q => !/bar/.test(q.cls) && !/chip/.test(q.cls) || false).map(q => q.op)) }));
  report[name] = {
    width: fit(channel(f => f.w)),
    height: fit(channel(f => f.h)),
    radius: fit(channel(f => num(f.radius))),
    shift: fit(channel(f => shiftOf(f.tf))),
  };
  console.log(name);
  for (const [k, v] of Object.entries(report[name])) console.log('  ', k, JSON.stringify(v));
}
await fs.writeFile(`${directory}/spring-fit.json`, JSON.stringify(report, null, 2));
