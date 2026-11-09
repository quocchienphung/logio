// Write the small, committed fixtures the unit tests check the terrain against: frames and series recorded from the public preview.
//   node scripts/forensics/uiarc-terrain-fixtures.mjs <trace-dir> <series-dir>      output: docs/research/uiarc-terrain/fixtures/
import fs from 'node:fs/promises';
import path from 'node:path';

const [traceDir, seriesDir] = process.argv.slice(2);
const out = 'docs/research/uiarc-terrain/fixtures';
await fs.mkdir(out, { recursive: true });
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const round = (v, n = 2) => +v.toFixed(n);
const heightsOf = async name => { const f = (await readJson(path.join(seriesDir, `${name}.heights.json`))).frames.at(-1); return Array.from({ length: 168 }, (_, k) => round(Math.max(0, f.h[k] ?? 0), 4)); };

// whole frames: the settled rest view and the settled top view (polygons and labels)
for (const [name, trace, series] of [['rest', 'load', 'load'], ['top', 'flatten-top', 'flatten-top'], ['dark', 'dark-load', null]]) {
  const t = await readJson(path.join(traceDir, `${trace}.json`)), frame = t.frames.at(-1);
  const pose = series ? (await readJson(path.join(seriesDir, `${series}.series.json`))).series.at(-1) : null;
  await fs.writeFile(path.join(out, `frame-${name}.json`), JSON.stringify({
    source: `uiarc.dev/components/blocks/activity-terrain, ${trace}, last frame`, size: [622.81, 291.63],
    pose: pose && { yaw: pose.yaw, pitch: pose.pitch, scale: pose.scale, dist: pose.dist, cx: pose.cx, cy: pose.cy },
    polys: frame.polys.map(p => ({ p: p.p, f: p.f })), labels: frame.labels.map(l => ({ text: l.text, x: l.x, y: l.y, fill: l.fill })),
  }));
}
await fs.writeFile(path.join(out, 'heights.json'), JSON.stringify({ note: 'settled world heights (grid units) of the sample metrics, Monday first, hour by hour', operations: await heightsOf('load'), deliveries: await heightsOf('metric-deploys'), errors: await heightsOf('metric-errors') }));

// camera scenarios: the platform corners of every frame, and the input events that drove them
for (const name of ['load', 'flatten-top', 'flatten-perspective', 'orbit-drag-slow', 'orbitv-down', 'zoom-keys', 'peak-fly', 'peak-leave', 'metric-deploys', 'metric-errors']) {
  const d = await readJson(path.join(seriesDir, `${name}.series.json`));
  await fs.writeFile(path.join(out, `camera-${name}.json`), JSON.stringify({
    events: d.events.filter(e => ['pointerdown', 'pointermove', 'pointerup', 'keydown', 'click', 'wheel'].includes(e.type)).map(e => ({ type: e.type, t: round(e.t, 1), x: e.x && round(e.x, 1), y: e.y && round(e.y, 1), key: e.key, shift: e.shift, ctrl: e.ctrl, dy: e.dy })),
    series: d.series.map(s => ({ t: round(s.t, 1), plat: s.plat })),
  }));
}
// column waves: heights of every column over time (every few frames)
for (const [name, every] of [['load', 4], ['metric-deploys', 3]]) {
  const frames = (await readJson(path.join(seriesDir, `${name}.heights.json`))).frames.filter((_, i) => i % every === 0);
  await fs.writeFile(path.join(out, `columns-${name}.json`), JSON.stringify({ frames: frames.map(f => ({ t: round(f.t, 1), h: f.h.map(v => (v == null ? null : round(v, 3))) })) }));
}
const sizes = await Promise.all((await fs.readdir(out)).map(async f => [f, (await fs.stat(path.join(out, f))).size]));
console.log(sizes.map(([f, s]) => `${f} ${(s / 1024).toFixed(0)}KB`).join('\n'), '\ntotal', (sizes.reduce((a, [, s]) => a + s, 0) / 1024).toFixed(0), 'KB');
