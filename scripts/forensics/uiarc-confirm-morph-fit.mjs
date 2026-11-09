import fs from 'node:fs';

// Reads the traces of uiarc-confirm-morph-motion.mjs and prints what they show: pill springs, hold fill (linear? how long? how it drains), the order the parts
// arrive in, the sequence of states with their times, and the timeouts.   UIARC_TRACES=<folder> node scripts/forensics/uiarc-confirm-morph-fit.mjs
const dir = process.env.UIARC_TRACES;
const load = name => JSON.parse(fs.readFileSync(`${dir}/confirm-${name}.json`, 'utf8'));
const ms = value => Math.round(value);

function critical(series, start, v0, total) { // best omega of 1 - (1 + wt) e^{-wt} over progress
  let best = { w: 0, err: Infinity };
  for (let w = 3; w <= 60; w += 0.1) {
    let err = 0, n = 0;
    for (const p of series) { if (p.t < start) continue; const t = (p.t - start) / 1000; err += ((1 - (1 + w * t) * Math.exp(-w * t)) - (p.v - v0) / total) ** 2; n++; }
    if (n && err / n < best.err) best = { w, err: err / n };
  }
  return { omega: +best.w.toFixed(2), rms: +Math.sqrt(best.err).toFixed(4) };
}
function underdamped(series, start, v0, total) { // stiffness k, damping c, unit mass
  const step = (k, c, t) => { const w0 = Math.sqrt(k), z = c / (2 * w0); if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); } const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s); return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1); };
  let best = { k: 0, c: 0, err: Infinity };
  for (let k = 80; k <= 1200; k += 20) for (let c = 8; c <= 80; c += 1) {
    let err = 0, n = 0;
    for (const p of series) { if (p.t < start) continue; err += (step(k, c, (p.t - start) / 1000) - (p.v - v0) / total) ** 2; n++; }
    if (n && err / n < best.err) best = { k, c, err: err / n };
  }
  return { k: best.k, c: best.c, rms: +Math.sqrt(best.err).toFixed(4) };
}
function widthMotion(name, label) {
  const rec = load(name), series = rec.frames.map(f => ({ t: f.t, v: f.width }));
  const v0 = series[0].v, vEnd = series.at(-1).v, total = vEnd - v0, startIdx = series.findIndex(p => Math.abs(p.v - v0) > Math.abs(total) * 0.01);
  if (startIdx < 0) { console.log(label, 'no width change'); return; }
  const start = series[startIdx].t, peak = Math.max(...series.map(p => p.v)), low = Math.min(...series.map(p => p.v));
  let settle = 0; for (let i = series.length - 1; i >= 0; i--) if (Math.abs(series[i].v - vEnd) > Math.abs(total) * 0.01) { settle = series[Math.min(i + 1, series.length - 1)].t - start; break; }
  console.log(`${label}: ${v0} -> ${vEnd} px (peak ${peak}, low ${low}), starts ${ms(start - (rec.marks.click ?? rec.input))} ms after the click, settles in ${ms(settle)} ms, critical`, JSON.stringify(critical(series, start, v0, total)), 'free spring', JSON.stringify(underdamped(series, start, v0, total)));
}
// the sequence of (state, face) with the time each began, relative to the input
function sequence(name, key = 'down') {
  const rec = load(name), from = (rec.marks[key] ?? rec.marks.click ?? 0), out = []; let last = '';
  for (const f of rec.frames) { const id = `${f.state}/${f.face}`; if (id !== last) { out.push(`${ms(f.t - from)}ms ${id} (w ${f.width})`); last = id; } }
  return out;
}
// when each part of a face first becomes visible and clear
function arrival(name, faceName) {
  const rec = load(name), seen = new Map();
  for (const f of rec.frames) for (const face of f.faces) if (face.face === faceName) face.parts.forEach((part, i) => {
    const key = `${i}:${part.text}`, blur = Number((/blur\(([\d.]+)px\)/.exec(part.filter) ?? [])[1] ?? 0), o = Number(part.opacity === '' ? 1 : part.opacity);
    const row = seen.get(key) ?? {}; if (row.first === undefined && o > 0.02) row.first = f.t; if (row.half === undefined && o >= 0.5) row.half = f.t; if (row.clear === undefined && o >= 0.98 && blur < 0.05) row.clear = f.t; if (row.maxBlur === undefined || blur > row.maxBlur) row.maxBlur = blur; seen.set(key, row);
  });
  const base = rec.marks.click ?? rec.input;
  return [...seen.entries()].map(([key, row]) => `${key} first ${row.first === undefined ? '-' : ms(row.first - base)} half ${row.half === undefined ? '-' : ms(row.half - base)} clear ${row.clear === undefined ? '-' : ms(row.clear - base)} blur<=${row.maxBlur.toFixed(1)}px`);
}

console.log('--- the question opens (width grows on the morph spring)');
widthMotion('open-hold', 'open');
console.log(arrival('open-hold', 'confirming').join('\n'));
const openRec = load('open-hold'); console.log('idle face leaves:', openRec.frames.filter(f => f.faces.some(x => x.face === 'idle')).map(f => ({ t: ms(f.t - openRec.marks.click), o: f.faces.find(x => x.face === 'idle')?.opacity })).filter((x, i, a) => i === 0 || x.o !== a[i - 1].o).slice(0, 12).map(x => `${x.t}:${x.o}`).join(' '));
console.log('--- cancelled (width shrinks on the smooth spring)');
widthMotion('cancel', 'cancel');
console.log(arrival('cancel', 'idle').join('\n'));

console.log('--- hold all the way (succeeds)');
{
  const rec = load('hold-full-succeeds');
  const down = rec.marks.down; // frames and marks share one origin: the moment recording started
  const filling = rec.frames.filter(f => f.state === 'confirming' && f.fillRight !== null && f.fillRight < 99.9);
  const first = filling[0], last = rec.frames.filter(f => f.fillRight !== null && f.fillRight > 0.05).at(-1);
  console.log('fill starts', ms(first.t - down), 'ms after the press, reaches', last.fillRight, '% left at', ms(last.t - down), 'ms; state changes:', sequence('hold-full-succeeds').join(' | '));
  // linearity: progress vs time between 5 % and 95 %
  const pts = rec.frames.filter(f => f.state === 'confirming' && f.fillRight !== null).map(f => ({ t: f.t - down, p: 100 - f.fillRight })).filter(p => p.p > 3 && p.p < 97);
  if (pts.length > 4) { const n = pts.length, sx = pts.reduce((a, p) => a + p.t, 0), sy = pts.reduce((a, p) => a + p.p, 0), sxx = pts.reduce((a, p) => a + p.t * p.t, 0), sxy = pts.reduce((a, p) => a + p.t * p.p, 0); const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), icpt = (sy - slope * sx) / n; const rms = Math.sqrt(pts.reduce((a, p) => a + (p.p - (slope * p.t + icpt)) ** 2, 0) / n); console.log(`fill is linear: ${slope.toFixed(5)} %/ms (full in ${ms(100 / slope)} ms), intercept ${icpt.toFixed(2)} %, rms ${rms.toFixed(2)} % over ${n} frames`); }
}
console.log('--- hold all the way (fails)'); console.log(sequence('hold-full-fails').join(' | '));
console.log('--- hold on the keyboard'); console.log(sequence('hold-keyboard').join(' | '));

console.log('--- released early: the fill drains back');
for (const hold of [250, 600, 1000]) {
  const rec = load(`hold-release-${hold}`), up = rec.marks.up, frames = rec.frames.filter(f => f.fillRight !== null);
  const atUp = frames.find(f => f.t >= up), peak = atUp ? 100 - atUp.fillRight : null;
  const after = frames.filter(f => f.t >= up).map(f => ({ t: f.t, v: 100 - f.fillRight }));
  if (!after.length || peak < 1) { console.log(hold, 'ms: nothing to drain', peak); continue; }
  const startIdx = after.findIndex(p => p.v < peak - 0.5), start = after[Math.max(0, startIdx)].t;
  const series = after.map(p => ({ t: p.t, v: p.v }));
  let end = 0; for (let i = series.length - 1; i >= 0; i--) if (series[i].v > 0.5) { end = series[Math.min(i + 1, series.length - 1)].t - start; break; }
  console.log(`held ${hold} ms (filled ${peak.toFixed(1)} % at release): drains from ${ms(start - up)} ms after release, empty in ${ms(end)} ms; critical`, JSON.stringify(critical(series, start, peak, -peak)), 'free spring', JSON.stringify(underdamped(series, start, peak, -peak)), 'min', Math.min(...series.map(p => p.v)).toFixed(2));
  console.log('   hold duration to fill ratio: filled/held =', (peak / hold * 1000).toFixed(2), '%/s; state after:', [...new Set(rec.frames.map(f => f.state))].join(','));
}

console.log('--- undo'); console.log(sequence('undo', 'click').join(' | '));
console.log('--- retry'); console.log(sequence('retry', 'click').join(' | '));
console.log('--- an unanswered question'); console.log(sequence('question-timeout', 'click').join(' | '));
console.log('--- a result left alone'); {
  const rec = load('result-timeout'), seq = []; let last = '';
  for (const f of rec.frames) { const id = `${f.state}/${f.face}`; if (id !== last) { seq.push(`${ms(f.t)}ms ${id} (w ${f.width})`); last = id; } }
  console.log(seq.join(' | '));
}

// ---- parts arriving in reading order (needs traces recorded with computed styles)
function partsFit(name, faceName, label) {
  const rec = load(name), base = rec.marks.click ?? rec.input, rows = [];
  const parts = new Map();
  for (const f of rec.frames) for (const face of f.faces) if (face.face === faceName) face.parts.forEach((part, i) => {
    const row = parts.get(i) ?? { text: part.text, op: [], blur: [] };
    row.op.push({ t: f.t, v: Number(part.opacity) }); row.blur.push({ t: f.t, v: Number((/blur\(([\d.e-]+)px\)/.exec(part.filter) ?? [])[1] ?? 0) }); parts.set(i, row);
  });
  const faceOp = rec.frames.map(f => ({ t: f.t, v: Number(f.faces.find(x => x.face === faceName)?.opacity ?? NaN) })).filter(p => !Number.isNaN(p.v));
  for (const [i, row] of parts) {
    const startAt = row.op.findIndex(p => p.v > 0.01); if (startAt < 0) continue;
    const start = row.op[startAt].t, o = critical(row.op, start, 0, 1), blurSeries = row.blur.map(p => ({ t: p.t, v: p.v }));
    const b0 = Math.max(...blurSeries.map(p => p.v)), bFit = critical(blurSeries.slice(startAt), start, b0, -b0);
    rows.push(`  part ${i} "${row.text}": opacity starts ${ms(start - base)} ms after the input, critical ${o.omega} (rms ${o.rms}); blur from ${b0.toFixed(1)}px, critical ${bFit.omega} (rms ${bFit.rms})`);
  }
  console.log(`${label}: face "${faceName}" opacity first frame ${faceOp.find(p => p.v > 0.01) ? ms(faceOp.find(p => p.v > 0.01).t - base) : '-'} ms`); console.log(rows.join('\n'));
}
console.log('--- parts arriving in reading order');
partsFit('open-hold', 'confirming', 'open');
partsFit('cancel', 'idle', 'cancel');
partsFit('undo', 'idle', 'undo');
{
  const rec = load('open-hold'), base = rec.marks.click, idle = rec.frames.map(f => ({ t: f.t - base, v: Number(f.faces.find(x => x.face === 'idle')?.opacity ?? NaN) })).filter(p => !Number.isNaN(p.v));
  const leaving = idle.filter(p => p.v < 0.999), end = idle.find(p => p.v < 0.01);
  console.log('idle face fades out: starts', leaving[0] ? ms(leaving[0].t) : '-', 'ms, gone at', end ? ms(end.t) : '-', 'ms; samples', idle.filter((p, i) => i % 3 === 0 && p.v < 1 && p.v > 0).slice(0, 8).map(p => `${ms(p.t)}:${p.v.toFixed(2)}`).join(' '));
}
