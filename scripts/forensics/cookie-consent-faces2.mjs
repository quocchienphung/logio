import fs from 'node:fs/promises';
const directory = 'docs/research/cookie-consent/source';
const load = async n => JSON.parse(await fs.readFile(`${directory}/motion-${n}.json`, 'utf8'));
// cubic-bezier(x1,y1,x2,y2) evaluated at time fraction x
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; } return Y(t); };
}
const runs = ['bar-to-prefs', 'reopen-to-prefs', 'reset-to-bar', 'prefs-to-reopen', 'prefs-escape-to-reopen', 'accept-to-reopen', 'reject-to-reopen'];
const sets = { in: { op: [], blur: [] }, out: { op: [], blur: [] } };
for (const n of runs) {
  const f = await load(n);
  const sizeStart = f.find(x => Math.abs(x.w - f[0].w) > 0.4).t;
  const names = [...new Set(f.flatMap(x => x.faces.map(q => q.cls)))];
  for (const face of names) {
    const s = f.map(x => { const q = x.faces.find(q => q.cls === face); return q && { t: x.t - sizeStart, op: q.op, blur: parseFloat(q.filter.replace(/blur\(|px\)/g, '')) }; }).filter(Boolean);
    if (Math.abs(s[0].op - s.at(-1).op) < 0.5) continue;
    const dir = s.at(-1).op > s[0].op ? 'in' : 'out';
    sets[dir].op.push(s.map(x => ({ t: x.t, p: dir === 'in' ? x.op : 1 - x.op })));
    sets[dir].blur.push(s.map(x => ({ t: x.t, p: dir === 'in' ? 1 - x.blur / 4 : x.blur / 4 })));
  }
}
const curves = { 'ease-standard .22,1,.36,1': bezier(.22, 1, .36, 1), 'ease-out .0,0,.58,1': bezier(0, 0, .58, 1), 'ease .25,.1,.25,1': bezier(.25, .1, .25, 1), 'linear': x => x, 'easeOut cubic .33,1,.68,1': bezier(.33, 1, .68, 1), 'expo .16,1,.3,1': bezier(.16, 1, .3, 1) };
for (const dir of ['out', 'in']) for (const ch of ['op', 'blur']) {
  const set = sets[dir][ch]; let best = { e: Infinity };
  for (const [cn, fn] of Object.entries(curves)) for (let d = 40; d <= 320; d += 4) for (let delay = -10; delay <= 60; delay += 1) {
    let sum = 0, n = 0;
    for (const run of set) for (const x of run) { const m = fn((x.t - delay) / d); sum += (x.p - m) ** 2; n++; }
    if (sum / n < best.e) best = { e: sum / n, curve: cn, duration: d, delay };
  }
  console.log(dir, ch, JSON.stringify({ ...best, rmse: +Math.sqrt(best.e).toFixed(4) }));
}
// outgoing face: exponential decay and a spring with a wide stiffness range
{
  const set = sets.out.op; let best = { e: Infinity };
  for (let tau = 8; tau <= 40; tau += 0.5) for (let delay = -10; delay <= 20; delay += 0.5) {
    let sum = 0, n = 0; for (const run of set) for (const x of run) { const m = x.t <= delay ? 0 : 1 - Math.exp(-(x.t - delay) / tau); sum += (x.p - m) ** 2; n++; }
    if (sum / n < best.e) best = { e: sum / n, tau, delay };
  }
  console.log('out exp decay', JSON.stringify({ ...best, rmse: +Math.sqrt(best.e).toFixed(4) }));
  const spring = (k, c, times) => { const out = [], dt = 0.0002; let x = 0, v = 0, t = 0, i = 0; while (i < times.length) { while (t < times[i]) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; } return out; };
  let bs = { e: Infinity };
  for (let k = 1500; k <= 12000; k += 500) for (let z = 0.8; z <= 2.5; z += 0.1) for (const delay of [-6, -3, 0, 3]) {
    const c = 2 * z * Math.sqrt(k); let sum = 0, n = 0;
    for (const run of set) { const m = spring(k, c, run.map(x => Math.max(0, (x.t - delay) / 1000))); for (const [i, x] of run.entries()) { sum += (x.p - m[i]) ** 2; n++; } }
    if (sum / n < bs.e) bs = { e: sum / n, k, c: +c.toFixed(1), z: +z.toFixed(2), delay };
  }
  console.log('out spring', JSON.stringify({ ...bs, rmse: +Math.sqrt(bs.e).toFixed(4) }));
}
