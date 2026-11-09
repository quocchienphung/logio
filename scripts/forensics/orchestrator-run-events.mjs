// Reads a recording of orchestrator-run.mjs and prints when each thing changed (an event list), to read the run's script and timings.
// Usage: node scripts/forensics/orchestrator-run-events.mjs [file]
import fs from 'node:fs/promises';

const file = process.argv[2] || 'docs/research/orchestrator/source/agent-orchestrator/run-cdefault.json';
const frames = JSON.parse(await fs.readFile(file, 'utf8'));
const t0 = frames.find(f => f.run && f.run !== '')?.t ?? 0;
const events = [];
const note = (t, what) => events.push([+(t - t0).toFixed(0), what]);
let prev = null;
for (const f of frames) {
  const p = prev;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!p || p.run !== f.run) note(f.t, `run button: ${f.run}`);
  if (!p || p.leadStatus !== f.leadStatus) note(f.t, `lead status: ${f.leadStatus}`);
  if (!p || p.plan.length !== f.plan.length) note(f.t, `plan items: ${f.plan.length}`);
  if (!p || p.sumStatus !== f.sumStatus) note(f.t, `summary status: ${f.sumStatus}`);
  if (!p || p.sumHint !== f.sumHint) note(f.t, `summary hint: ${f.sumHint.slice(0, 60)}`);
  if ((!p || p.sumText === 0) && f.sumText > 0) note(f.t, 'summary text starts');
  if ((!p || !p.totals) && f.totals) note(f.t, `totals: ${f.totals[1]}`);
  if (!p || p.live !== f.live) note(f.t, `announce: ${f.live}`);
  f.lanes.forEach((lane, i) => {
    const q = p?.lanes?.[i];
    if (!q || q.ph !== lane.ph) note(f.t, `lane${i + 1} phase: ${lane.ph}`);
    if (!q || q.act !== lane.act) note(f.t, `lane${i + 1} activity: ${lane.act} [${lane.actIcon}]`);
    if (!q || q.title !== lane.title) note(f.t, `lane${i + 1} title: ${lane.title}`);
    if (q && q.out === '' && lane.out !== '') note(f.t, `lane${i + 1} output starts`);
    if (q && q.out !== '' && lane.out === '') note(f.t, `lane${i + 1} output cleared`);
    if (q && q.settled !== lane.settled) note(f.t, `lane${i + 1} settled: ${lane.settled}`);
    if (q && q.metHidden !== lane.metHidden) note(f.t, `lane${i + 1} metrics hidden: ${lane.metHidden}`);
    if (q && q.log !== lane.log) note(f.t, `lane${i + 1} log rows: ${lane.log}`);
    if (!q || q.met !== lane.met) { if (!q || q.met === '' || lane.met === '') note(f.t, `lane${i + 1} metrics: ${lane.met}`); }
  });
  if (p) {
    f.branches.forEach((v, i) => { if (v !== p.branches[i]) note(f.t, `branch${i} ${v ? 'on' : 'off'}`); });
    f.ports.forEach((v, i) => { if (v !== p.ports[i]) note(f.t, `port${i} ${v ? 'on' : 'off'}`); });
    if (f.pulses.length > p.pulses.length) note(f.t, `pulse added (${f.pulses.length}) ${f.pulses.at(-1).slice(0, 7).join(',')}`);
    if (f.pulses.length < p.pulses.length) note(f.t, `pulse removed (${f.pulses.length})`);
  }
  prev = f;
}
for (const [t, what] of events) console.log(String(t).padStart(6), what);
// the run's total length and the final lane texts
const last = frames.at(-1);
console.log('\nfinal lanes:'); last.lanes.forEach((l, i) => console.log(i + 1, l.ph, l.title, '|', l.act, '|', l.out, '|', l.met, '|', l.time));
console.log('final totals:', last.totals, '| lead:', last.leadStatus, last.leadTime);
