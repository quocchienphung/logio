import fs from 'node:fs/promises';
// Fits the width spring of the main label (a ResizeObserver-driven spring) and the menu's transform spring.
const directory = 'docs/research/split-button/source';
function step(k, c, times) { const out = [], dt = 0.0004; let x = 0, v = 0, t = 0, i = 0; while (i < times.length) { while (t < times[i]) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; } return out; }
function fit(series, label, delays = [-8, -4, 0, 4, 8]) {
  let best = { e: Infinity };
  for (let k = 40; k <= 600; k += 5) for (let z = 0.5; z <= 1.6; z += 0.04) for (const d of delays) {
    const c = 2 * z * Math.sqrt(k), m = step(k, c, series.map(s => Math.max(0, (s.t - d) / 1000)));
    const e = series.reduce((s, q, i) => s + (q.p - m[i]) ** 2, 0) / series.length; if (e < best.e) best = { e, k, c: +c.toFixed(2), z: +z.toFixed(2), d };
  }
  console.log(label.padEnd(18), JSON.stringify({ stiffness: best.k, damping: best.c, ratio: best.z, delay: best.d, rmse: +Math.sqrt(best.e).toFixed(4) }));
  return best;
}
const out = {};
// width: the first rise of the group width after the click (143 -> ~159.4), aligned where it leaves 143.5
{
  const f = JSON.parse(await fs.readFile(`${directory}/motion-main-click.json`, 'utf8'));
  const rise = f.filter(x => x.t < 1500), from = rise[0].group[0], to = Math.max(...rise.map(x => x.group[0]));
  const start = rise.find(x => x.group[0] > from + 0.4).t;
  out.widthGrow = fit(rise.filter(x => x.t >= start - 10 && x.t < start + 900).map(x => ({ t: x.t - start, p: (x.group[0] - from) / (to - from) })), 'label width grows');
  const back = f.filter(x => x.t > 2000), top = back[0].group[0], bottom = back.at(-1).group[0];
  const s2 = back.find(x => x.group[0] < top - 0.4).t;
  out.widthShrink = fit(back.filter(x => x.t >= s2 - 10 && x.t < s2 + 900).map(x => ({ t: x.t - s2, p: (top - x.group[0]) / (top - bottom) })), 'label width shrinks');
}
// menu transform: scale .97 -> 1
{
  const f = JSON.parse(await fs.readFile(`${directory}/motion-menu-open.json`, 'utf8')).filter(x => !x.gone);
  const sc = x => { const m = x.tf.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[0] : 1; };
  const start = f.findIndex(x => x.op > 0.01);
  const run = f.slice(start);
  out.menuScale = fit(run.filter(x => x.t - run[0].t < 900).map(x => ({ t: x.t - run[0].t, p: (sc(x) - 0.97) / 0.03 })), 'menu scale .97->1', [-4, 0, 4]);
}
await fs.writeFile(`${directory}/spring-fit.json`, JSON.stringify(out, null, 2));
