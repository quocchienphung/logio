import fs from 'node:fs/promises';
const directory = 'docs/research/cookie-consent/source';
const frames = JSON.parse(await fs.readFile(`${directory}/motion-switch-element.json`, 'utf8'));
function step(k, c, times) { const out = [], dt = 0.0004; let x = 0, v = 0, t = 0, i = 0; while (i < times.length) { while (t < times[i]) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; } return out; }
const x = f => f.thumb === 'none' ? 0 : Number(f.thumb.match(/matrix\(([^)]+)\)/)[1].split(',')[4]);
const series = frames.map(f => ({ t: f.t, p: x(f) / 18 }));
const start = series.find(s => s.p > .0005).t;
const use = series.filter(s => s.t >= start - 4);
let best = { e: Infinity };
for (let k = 40; k <= 900; k += 5) for (let z = .5; z <= 1.6; z += .02) for (const d of [-6, -3, 0, 3, 6]) {
  const c = 2 * z * Math.sqrt(k), m = step(k, c, use.map(s => Math.max(0, (s.t - start - d) / 1000)));
  const e = use.reduce((s, q, i) => s + (q.p - m[i]) ** 2, 0) / use.length; if (e < best.e) best = { e, k, c: +c.toFixed(1), z: +z.toFixed(2), d };
}
console.log(JSON.stringify({ ...best, rmse: +Math.sqrt(best.e).toFixed(4), movesAfterMs: +(start - frames[0].t).toFixed(0), finalPx: x(frames.at(-1)).toFixed(3) }));
