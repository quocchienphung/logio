import fs from 'node:fs/promises';
const directory = 'docs/research/cookie-consent/source';
const runs = JSON.parse(await fs.readFile(`${directory}/motion-entrance-warm.json`, 'utf8'));
function bezier(x1, y1, x2, y2) { const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by; const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t; return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; } return Y(t); }; }
function step(k, c, times) { const out = [], dt = 0.0004; let x = 0, v = 0, t = 0, i = 0; while (i < times.length) { while (t < times[i]) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; } return out; }
const parse = tf => { if (tf === 'none') return { scale: 1, y: 0 }; const m = tf.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number); return { scale: m[0], y: m[5] }; };
const series = runs.map(r => { const t0 = r[0].t; return r.filter(x => x.t - t0 < 900).map(x => ({ t: x.t - t0, op: x.op, scale: (parse(x.tf).scale - .98) / .02, y: 1 - parse(x.tf).y / 24 })); });
for (const ch of ['op', 'y', 'scale']) {
  let best = { e: Infinity };
  for (let k = 60; k <= 700; k += 10) for (let z = .6; z <= 1.6; z += .04) for (const delay of [0, 8, 16, 24, 32, 40, 50]) {
    const c = 2 * z * Math.sqrt(k); let sum = 0, n = 0;
    for (const s of series) { const m = step(k, c, s.map(x => Math.max(0, (x.t - delay) / 1000))); for (const [i, x] of s.entries()) { sum += (x[ch] - m[i]) ** 2; n++; } }
    if (sum / n < best.e) best = { e: sum / n, k, c: +c.toFixed(1), z: +z.toFixed(2), delay };
  }
  let bestT = { e: Infinity };
  for (const [cn, fn] of Object.entries({ expo: bezier(.16, 1, .3, 1), std: bezier(.22, 1, .36, 1), cubic: bezier(.33, 1, .68, 1) })) for (let d = 80; d <= 900; d += 10) for (const delay of [0, 8, 16, 24, 32]) { let sum = 0, n = 0; for (const s of series) for (const x of s) { sum += (x[ch] - fn((x.t - delay) / d)) ** 2; n++; } if (sum / n < bestT.e) bestT = { e: sum / n, curve: cn, d, delay }; }
  console.log(ch, 'spring', JSON.stringify({ ...best, rmse: +Math.sqrt(best.e).toFixed(4) }), '| tween', JSON.stringify({ ...bestT, rmse: +Math.sqrt(bestT.e).toFixed(4) }));
}
