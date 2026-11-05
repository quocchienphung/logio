import fs from 'node:fs/promises';
// Joint spring fit per direction (growing / shrinking) with a free start offset per recording.
const directory = 'docs/research/cookie-consent/source';
const load = async n => JSON.parse(await fs.readFile(`${directory}/motion-${n}.json`, 'utf8'));
function step(k, c, times) { const out = [], dt = 0.0004; let x = 0, v = 0, t = 0, i = 0; while (i < times.length) { while (t < times[i]) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; } return out; }
const series = async n => { const f = await load(n); const from = f[0].w, to = f.at(-1).w; const p = f.map(x => ({ t: x.t, p: (x.w - from) / (to - from) })); const start = p.find(x => Math.abs(x.p) > .004).t; return p.filter(x => x.t >= start - 10).map(x => ({ ...x, s: start })); };
const groups = { grow: ['bar-to-prefs', 'reopen-to-prefs', 'reset-to-bar'], shrink: ['prefs-to-reopen', 'prefs-escape-to-reopen', 'accept-to-reopen', 'reject-to-reopen'] };
const out = {};
for (const [name, runs] of Object.entries(groups)) {
  const data = await Promise.all(runs.map(series));
  let best = { e: Infinity };
  for (let k = 80; k <= 420; k += 5) for (let z = 0.6; z <= 1.25; z += 0.02) {
    const c = 2 * z * Math.sqrt(k); let sum = 0, n = 0;
    for (const run of data) {
      let bestRun = Infinity;
      for (let d = -14; d <= 4; d += 2) { const m = step(k, c, run.map(x => Math.max(0, (x.t - (x.s + d)) / 1000))); const e = run.reduce((s, x, i) => s + (x.p - m[i]) ** 2, 0) / run.length; if (e < bestRun) bestRun = e; }
      sum += bestRun; n++;
    }
    if (sum / n < best.e) best = { e: sum / n, k, c: +c.toFixed(2), z: +z.toFixed(2) };
  }
  out[name] = { stiffness: best.k, damping: best.c, ratio: best.z, rmse: +Math.sqrt(best.e).toFixed(4), runs };
  console.log(name, JSON.stringify(out[name]));
}
await fs.writeFile(`${directory}/spring-joint.json`, JSON.stringify(out, null, 2));
