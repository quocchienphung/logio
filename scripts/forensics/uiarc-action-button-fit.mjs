import fs from 'node:fs';

// Reads the traces of uiarc-action-button-motion.mjs: width springs per transition, label and icon tweens, the press scale, hover shadow, repeat presses.
//   UIARC_TRACES=<folder> node scripts/forensics/uiarc-action-button-fit.mjs
const dir = process.env.UIARC_TRACES;
const load = name => JSON.parse(fs.readFileSync(`${dir}/action-${name}.json`, 'utf8'));
const ms = value => Math.round(value);
const blurOf = filter => Number((/blur\(([\d.e-]+)px\)/.exec(filter) ?? [])[1] ?? 0);
const matrix = transform => { const m = /matrix\(([^)]*)\)/.exec(transform); const a = m ? m[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0]; return { sx: a[0], x: a[4], y: a[5] }; };

const bez = (x1, y1, x2, y2) => t => { let s = t; for (let i = 0; i < 20; i++) { const x = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s * s * x2 + s ** 3 - t, dx = 3 * (1 - s) ** 2 * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s * s * (1 - x2); if (Math.abs(dx) < 1e-6) break; s -= x / dx; s = Math.min(1, Math.max(0, s)); } return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s * s * y2 + s ** 3; };
const ease = bez(0.22, 1, 0.36, 1);
const spring = (w, t) => 1 - (1 + w * t) * Math.exp(-w * t);
/** progress series [{t seconds, v 0..1}] -> best critical spring and best ease-standard tween, each with a free start time */
function fitProgress(series) {
  const first = series.find(p => p.v > 0.02);
  if (!first) return null;
  let s = { err: Infinity }, e = { err: Infinity };
  for (let t0 = first.t - 0.09; t0 <= first.t + 0.005; t0 += 0.002) {
    for (let w = 6; w <= 70; w += 0.5) { let sum = 0, n = 0; for (const p of series) { if (p.t < t0) continue; sum += (spring(w, p.t - t0) - p.v) ** 2; n++; } if (n && sum / n < s.err) s = { err: sum / n, t0, w }; }
    for (let d = 0.05; d <= 0.7; d += 0.01) { let sum = 0, n = 0; for (const p of series) { if (p.t < t0) continue; sum += (ease(Math.min(1, (p.t - t0) / d)) - p.v) ** 2; n++; } if (n && sum / n < e.err) e = { err: sum / n, t0, d }; }
  }
  return { spring: { start: ms(s.t0 * 1000), omega: s.w, rms: +Math.sqrt(s.err).toFixed(4) }, tween: { start: ms(e.t0 * 1000), duration: ms(e.d * 1000), rms: +Math.sqrt(e.err).toFixed(4) } };
}
const progress = (frames, base, from, to, pick) => { const total = to - from; return frames.map(f => ({ t: (f.t - base) / 1000, v: (pick(f) - from) / total })).filter(p => Number.isFinite(p.v)); };

const cycle = load('cycle'), down = cycle.marks.down, up = cycle.marks.up;
const change = (a, b) => { const f = cycle.frames.find(x => x.state === b && x.t > down); return f?.t; };
const pendingAt = change('idle', 'pending'), successAt = change('pending', 'success'), idleAt = cycle.frames.find(f => f.state === 'idle' && f.t > (successAt ?? 0))?.t;
console.log(`state changes after the pointer went down: pending +${ms(pendingAt - down)} ms (pointer up at +${ms(up - down)}), success +${ms(successAt - down)} ms, idle +${ms(idleAt - down)} ms`);
console.log(`pending lasted ${ms(successAt - pendingAt)} ms (the demo's own delay), success stayed ${ms(idleAt - successAt)} ms before reset`);

const sizes = state => { const f = cycle.frames.filter(x => x.state === state).at(-1); return { width: f.width, morph: f.morphWidth }; };
console.log('settled button / label widths:', JSON.stringify({ idle: cycle.frames.find(f => f.t > down - 300 && f.state === 'idle').width, pending: sizes('pending'), success: sizes('success') }));

console.log('--- width springs (button width, progress between its own ends)');
for (const [label, a, b] of [['idle -> pending', pendingAt, successAt], ['pending -> success', successAt, idleAt], ['success -> idle', idleAt, null]]) {
  const frames = cycle.frames.filter(f => f.t >= a - 40 && (b === null || f.t < b)); if (!frames.length) continue;
  const v0 = frames[0].width, vEnd = frames.at(-1).width; if (Math.abs(vEnd - v0) < 2) { console.log(label, 'width barely changes', v0, vEnd); continue; }
  console.log(label, `${v0} -> ${vEnd}`, JSON.stringify(fitProgress(progress(frames, a, v0, vEnd, f => f.width))));
}

console.log('--- label crossfade (the entering label rises 2px) and icons');
function crossfade(at, until, label) {
  const frames = cycle.frames.filter(f => f.t >= at - 20 && f.t < until);
  const enter = frames.map(f => { const k = f.morphKids.filter(x => x.cls.includes('label')); return { f, k: k.length > 1 ? k.at(-1) : null }; }).filter(x => x.k);
  if (!enter.length) { console.log(label, 'no label pair seen'); return; }
  const o = enter.map(x => ({ t: (x.f.t - at) / 1000, v: Number(x.k.opacity) })), y = enter.map(x => ({ t: (x.f.t - at) / 1000, v: 1 - matrix(x.k.transform).y / 2 }));
  console.log(label, 'entering label opacity', JSON.stringify(fitProgress(o)), '| rise', JSON.stringify(fitProgress(y)), '| starts at y =', matrix(enter[0].k.transform).y, 'px, blur', blurOf(enter[0].k.filter));
  const out = frames.map(f => { const k = f.morphKids.filter(x => x.cls.includes('label')); return k.length > 1 ? { t: (f.t - at) / 1000, v: 1 - Number(k[0].opacity) } : null; }).filter(Boolean);
  console.log('   leaving label fades', JSON.stringify(fitProgress(out)));
}
crossfade(pendingAt, successAt, 'Save changes -> Saving');
crossfade(successAt, idleAt, 'Saving -> Saved');
crossfade(idleAt, idleAt + 700, 'Saved -> Save changes');
function icons(at, until, label) {
  const frames = cycle.frames.filter(f => f.t >= at - 20 && f.t < until && f.phases.length > 1);
  if (!frames.length) { console.log(label, 'no icon pair'); return; }
  const first = frames[0], leaving = first.phases[0], entering = first.phases[1];
  console.log(label, `leaving icon "${leaving.svg}" -> opacity 0, blur ${blurOf(frames.at(-1).phases[0].filter).toFixed(1)}px (from ${blurOf(leaving.filter)}), x ${matrix(frames.at(-1).phases[0].transform).x}px, scale ${matrix(frames.at(-1).phases[0].transform).sx}; entering icon "${entering.svg}" from opacity ${entering.opacity}, blur ${blurOf(entering.filter)}px, x ${matrix(entering.transform).x}px, scale ${matrix(entering.transform).sx}`);
  console.log('   entering opacity', JSON.stringify(fitProgress(frames.map(f => ({ t: (f.t - at) / 1000, v: Number(f.phases[1].opacity) })))), '| scale', JSON.stringify(fitProgress(frames.map(f => ({ t: (f.t - at) / 1000, v: (matrix(f.phases[1].transform).sx - matrix(entering.transform).sx) / (1 - matrix(entering.transform).sx) })))));
}
icons(pendingAt, pendingAt + 500, 'idle -> pending');
icons(successAt, successAt + 500, 'pending -> success');
icons(idleAt, idleAt + 500, 'success -> idle');
{
  const frames = cycle.frames.filter(f => f.t >= successAt && f.t < successAt + 700), dash = frames.map(f => { const p = f.phases.find(x => /Icon/i.test(x.svg ?? ''))?.dash; return { t: (f.t - successAt) / 1000, v: p ? Number(p.split('px')[0]) : NaN }; }).filter(p => Number.isFinite(p.v));
  console.log('check draws (dash 0 -> 1):', JSON.stringify(fitProgress(dash)));
}

console.log('--- press scale');
{
  const rec = load('press-hold'), d = rec.marks.down, leave = rec.marks.leave;
  const down = rec.frames.filter(f => f.t >= d - 10 && f.t < leave), scale = f => matrix(f.transform).sx;
  console.log('pressed scale settles at', scale(down.at(-1)).toFixed(3), JSON.stringify(fitProgress(down.map(f => ({ t: (f.t - d) / 1000, v: (1 - scale(f)) / (1 - scale(down.at(-1))) })))));
  const rel = rec.frames.filter(f => f.t >= leave); const start = rel.find(f => scale(f) > scale(down.at(-1)) + 0.002)?.t;
  console.log('released: back to', scale(rel.at(-1)).toFixed(3), start ? `starts +${ms(start - leave)} ms after leaving` : '', JSON.stringify(fitProgress(rel.map(f => ({ t: (f.t - (start ?? leave)) / 1000, v: (scale(f) - scale(down.at(-1))) / (1 - scale(down.at(-1))) })))));
}
console.log('--- hover');
{
  const rec = load('hover'), shadows = new Map(); for (const f of rec.frames) shadows.set(f.shadow, (shadows.get(f.shadow) ?? 0) + 1);
  console.log('box-shadows seen:', [...shadows.keys()].map(s => s.slice(0, 110)).join('  ||  '));
  const shadowAt = [rec.marks.in + 100, rec.marks.in + 600, rec.marks.out + 600].map(t => rec.frames.find(f => f.t >= t)?.shadow.slice(0, 100)); console.log('before / hovering / after:', shadowAt.join('  ||  '));
  const bgs = new Set(rec.frames.map(f => f.bg)); console.log('background colours:', [...bgs].join(' | '));
  const trans = rec.frames.map(f => ({ t: f.t - rec.marks.in, s: f.shadow })).filter((p, i, a) => i === 0 || p.s !== a[i - 1].s).slice(0, 14).map(p => `${ms(p.t)}:${p.s.slice(0, 40)}`); console.log('shadow ramps:', trans.join(' '));
}
console.log('--- a second press while pending / showing success');
{
  const rec = load('double'), seq = []; let last = '';
  for (const f of rec.frames) { const id = `${f.state}`; if (id !== last) { seq.push(`${ms(f.t - rec.marks.first)}ms ${id}`); last = id; } }
  console.log('presses at +0 and +', ms(rec.marks.second - rec.marks.first), 'ms ->', seq.join(' | '));
}
console.log('--- keyboard'); {
  const rec = load('keyboard'), seq = []; let last = '';
  for (const f of rec.frames) { if (f.state !== last) { seq.push(`${ms(f.t - rec.marks.down)}ms ${f.state}`); last = f.state; } }
  console.log(seq.join(' | '), '| focus kept while pending:', rec.frames.filter(f => f.state === 'pending').every(f => f.hasFocus));
}
