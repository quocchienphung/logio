import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const folder = 'docs/research/collateral-queue/source';
const read = async name => JSON.parse(gunzipSync(await fs.readFile(`${folder}/hold-to-confirm-${name}-frames.json.gz`)));
const release = await read('release');
const complete = await read('complete');
const find = (frame, fragment) => frame.elements.find(e => e.class.includes(fragment));
const progress = f => 1 - Number(find(f, 'fill__').clip.match(/inset\(0px ([\d.]+)%/)[1]) / 100;
const scale = f => Number(find(f, 'button__').transform.match(/matrix\(([\d.]+)/)?.[1] ?? 1);
const width = f => Number(find(f, 'labelFrame').style.match(/width: ([\d.]+)px/)[1]);

// Fits an observed follow, without claiming these are UIArc's implementation constants.
const critical = (t, start, omega) => { const seconds = Math.max(0, t - start) / 1000; return (1 + omega * seconds) * Math.exp(-omega * seconds); };
function fit(points, startMin, startMax) {
  let best = { error: Infinity };
  for (let start = startMin; start <= startMax; start += .5) {
    for (let omega = 2; omega <= 60; omega += .05) {
      let error = 0;
      for (const point of points) error += (critical(point.t, start, omega) - point.value) ** 2;
      if (error < best.error) best = { startMs: start, omega, error };
    }
  }
  const errors = points.map(p => Math.abs(critical(p.t, best.startMs, best.omega) - p.value));
  return { startMs: +best.startMs.toFixed(2), omega: +best.omega.toFixed(2), mass: 1, stiffness: +(best.omega ** 2).toFixed(2), damping: +(2 * best.omega).toFixed(2), rmse: +Math.sqrt(best.error / points.length).toFixed(5), maxError: +Math.max(...errors).toFixed(5), samples: points.length };
}
const peak = release.reduce((a, b) => progress(b) > progress(a) ? b : a);
const rewind = release.filter(f => f.t >= peak.t && progress(f) > 0).map(f => ({ t: f.t, value: progress(f) / progress(peak) }));
const press = complete.filter(f => f.t < 300 && scale(f) > .97001).map(f => ({ t: f.t, value: (scale(f) - .97) / .03 }));
const widthStart = width(complete[0]), widthEnd = width(complete.at(-1));
const firstChange = complete.find(f => width(f) < widthStart - .2).t;
const collapse = complete.filter(f => f.t >= firstChange && width(f) > widthEnd + .02).map(f => ({ t: f.t, value: (width(f) - widthEnd) / (widthStart - widthEnd) }));
const result = {
  note: 'Least-squares critically damped approximations of rendered frame samples, not access to private spring parameters. Press uses a critical approximation; its observed curve may differ.',
  rewind: { ...fit(rewind, peak.t - 20, peak.t + 20), peakMs: peak.t, peakProgress: progress(peak) },
  press: fit(press, -30, 70),
  completionWidth: { ...fit(collapse, firstChange - 25, firstChange + 15), from: widthStart, to: widthEnd },
};
assert.ok(result.rewind.maxError < .012, 'Rewind fitted curve stays within 1.2% of rendered progress');
assert.ok(result.completionWidth.maxError < .03, 'Completion width fitted curve stays within 3% of rendered width delta');
await fs.writeFile(`${folder}/spring-fit.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
