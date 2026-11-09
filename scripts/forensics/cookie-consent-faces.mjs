import fs from 'node:fs/promises';
const directory = 'docs/research/cookie-consent/source';
const load = async n => JSON.parse(await fs.readFile(`${directory}/motion-${n}.json`, 'utf8'));
function step(k, c, times) { const out = [], dt = 0.0004; let x = 0, v = 0, t = 0, i = 0; while (i < times.length) { while (t < times[i]) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; } return out; }
const runs = ['bar-to-prefs', 'reopen-to-prefs', 'reset-to-bar', 'prefs-to-reopen', 'prefs-escape-to-reopen', 'accept-to-reopen', 'reject-to-reopen'];
const data = [];
for (const n of runs) {
  const f = await load(n);
  const sizeStart = f.find(x => Math.abs(x.w - f[0].w) > 0.4).t;
  // incoming = the face whose opacity ends at 1 and started at 0; outgoing = the face that starts at 1
  const names = [...new Set(f.flatMap(x => x.faces.map(q => q.cls)))];
  for (const face of names) {
    const s = f.map(x => ({ t: x.t, op: x.faces.find(q => q.cls === face)?.op, filter: x.faces.find(q => q.cls === face)?.filter })).filter(x => x.op !== undefined);
    if (!s.length) continue;
    const first = s[0].op, last = s.at(-1).op;
    if (Math.abs(first - last) < 0.5) continue;
    const dir = last > first ? 'in' : 'out';
    // blur check
    const err = Math.max(...s.map(x => Math.abs(parseFloat(x.filter.replace(/blur\(|px\)/g, '')) - 4 * (1 - x.op))));
    const startAt = s.find(x => Math.abs(x.op - first) > 0.004)?.t;
    const half = s.find(x => dir === 'in' ? x.op >= 0.5 : x.op <= 0.5)?.t;
    const done = s.find(x => dir === 'in' ? x.op >= 0.99 : x.op <= 0.01)?.t;
    console.log(n.padEnd(24), face.padEnd(10), dir.padEnd(3), 'first move', (startAt - sizeStart).toFixed(0).padStart(5), 'ms vs size start | half', (half - startAt).toFixed(0).padStart(4), '| 99%', (done - startAt).toFixed(0).padStart(4), '| blur=4(1-op) max err', err.toFixed(3));
    data.push({ n, face, dir, series: s.filter(x => x.t >= startAt - 8).map(x => ({ t: x.t - startAt, p: dir === 'in' ? x.op : 1 - x.op })) });
  }
}
for (const dir of ['in', 'out']) {
  const set = data.filter(d => d.dir === dir);
  let best = { e: Infinity };
  for (let k = 100; k <= 2500; k += 25) for (let z = 0.6; z <= 1.6; z += 0.05) {
    const c = 2 * z * Math.sqrt(k); let sum = 0;
    for (const d of set) { const m = step(k, c, d.series.map(x => Math.max(0, x.t / 1000))); sum += d.series.reduce((s, x, i) => s + (x.p - m[i]) ** 2, 0) / d.series.length; }
    if (sum / set.length < best.e) best = { e: sum / set.length, k, c: +c.toFixed(1), z: +z.toFixed(2) };
  }
  console.log('face', dir, 'spring fit', JSON.stringify({ ...best, rmse: +Math.sqrt(best.e).toFixed(4) }));
}
