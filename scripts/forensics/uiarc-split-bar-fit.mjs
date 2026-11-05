import fs from 'node:fs';

// Fits the motion recorded by uiarc-split-bar-motion.mjs: how far a segment edge travels, when it starts, and which spring (critically damped or not) explains the arc.
const dir = process.env.SPLIT_BAR_TRACES ?? 'docs/research/uiarc-split-bar';
const load = name => JSON.parse(fs.readFileSync(`${dir}/motion-${name}.json`, 'utf8'));
const parse = clip => { // "0px calc(58.429% + 1px) 0px calc(0% + 0px) round 4px" -> [right %, left %]
  const nums = [...clip.matchAll(/calc\(([\d.]+)%/g)].map(m => Number(m[1]));
  return { right: nums[0], left: nums[1] };
};
const edgeSeries = (rec, seg, edge) => rec.frames.map(f => ({ t: (f.t - rec.t0) / 1000, v: parse(f.segs[seg].clip)[edge] }));

function movement(series) {
  const v0 = series[0].v, vEnd = series[series.length - 1].v, total = vEnd - v0;
  const startIdx = series.findIndex(p => Math.abs(p.v - v0) > Math.abs(total) * 0.01);
  return { v0, vEnd, total, start: startIdx < 0 ? null : series[startIdx].t };
}
// least-squares over progress p(t) after the start: critically damped p = 1 - (1 + w t) e^{-w t}
function fitCritical(series, m) {
  let best = { w: 0, err: Infinity };
  for (let w = 2; w <= 40; w += 0.05) {
    let err = 0, n = 0;
    for (const p of series) { if (p.t < m.start) continue; const t = p.t - m.start, model = 1 - (1 + w * t) * Math.exp(-w * t); err += (model - (p.v - m.v0) / m.total) ** 2; n++; }
    if (err / n < best.err) best = { w, err: err / n };
  }
  return best;
}
// spring with stiffness k, damping c, mass 1 (motion library parameters)
function springStep(k, c, t) {
  const w0 = Math.sqrt(k), z = c / (2 * w0);
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
  if (z === 1) return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}
function fitSpring(series, m) {
  let best = { k: 0, c: 0, err: Infinity };
  for (let k = 60; k <= 600; k += 10) for (let c = 10; c <= 60; c += 1) {
    let err = 0, n = 0;
    for (const p of series) { if (p.t < m.start) continue; err += (springStep(k, c, p.t - m.start) - (p.v - m.v0) / m.total) ** 2; n++; }
    if (err / n < best.err) best = { k, c, err: err / n };
  }
  return best;
}
const settleTime = (series, m) => { // last time the edge is >1% of the travel away from its end
  for (let i = series.length - 1; i >= 0; i--) if (Math.abs(series[i].v - m.vEnd) > Math.abs(m.total) * 0.01) return series[Math.min(i + 1, series.length - 1)].t - m.start;
  return 0;
};

for (const [name, seg, edge] of [['hide-direct', 0, 'right'], ['hide-direct', 2, 'left'], ['hide-direct-then-show', 0, 'right'], ['hover-direct', 0, 'right'], ['hover-direct', 1, 'right'], ['hover-small', 4, 'left'], ['period-30', 0, 'right'], ['period-30', 1, 'right']]) {
  const rec = load(name), series = edgeSeries(rec, seg, edge), m = movement(series);
  if (m.start === null || Math.abs(m.total) < 0.2) { console.log(name, 'seg', seg, edge, 'no movement', m); continue; }
  const c = fitCritical(series, m), s = fitSpring(series, m);
  console.log(`${name} seg${seg} ${edge}: ${m.v0.toFixed(2)}% -> ${m.vEnd.toFixed(2)}% (${m.total.toFixed(2)}), starts ${(m.start * 1000).toFixed(0)} ms after input, settles ${(settleTime(series, m) * 1000).toFixed(0)} ms; critical w=${c.w.toFixed(2)} rms=${Math.sqrt(c.err).toFixed(4)}; spring k=${s.k} c=${s.c} rms=${Math.sqrt(s.err).toFixed(4)}`);
}

// hover: dim opacity of the others, widening, readout swap
const hover = load('hover-direct'), last = hover.frames[hover.frames.length - 1], first = hover.frames[0];
console.log('hover-direct opacities start', first.segs.map(s => s.opacity), 'end', last.segs.map(s => s.opacity));
console.log('hover-direct clips start', first.segs.map(s => s.clip), '\nend', last.segs.map(s => s.clip));
console.log('hover-direct readout end', JSON.stringify(last.readout));
const idx = hover.frames.findIndex(f => f.readout.length > 1);
console.log('readout crossfade first frames', JSON.stringify(hover.frames.slice(idx, idx + 4).map(f => ({ t: Math.round(f.t - hover.t0), r: f.readout }))));
const small = load('hover-small'), sl = small.frames[small.frames.length - 1];
console.log('hover-small end clips', sl.segs.map(s => s.clip), 'nameW', sl.segs.map(s => s.nameW), 'opac', sl.segs.map(s => s.opacity));
const shake = load('last-visible-shake');
console.log('shake: distinct legend transforms / frames', shake.frames.length);
