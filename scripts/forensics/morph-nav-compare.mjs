import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const out = 'docs/research/morph-nav';
const before = JSON.parse(await fs.readFile(`${out}/before/geometry.json`));
const after = JSON.parse(await fs.readFile(`${out}/after/geometry.json`));
const reports = [];
for (const state of ['idle','isolated-Products','isolated-Solutions','isolated-Developers','isolated-Resources']) {
  const clean = value => JSON.parse(JSON.stringify(value, (key,v)=>['transition','willChange'].includes(key) ? undefined : v));
  assert.deepEqual(clean(after[state]), clean(before[state]), `${state}: geometry/content/styles unchanged`);
  const file = state.toLowerCase();
  const a = PNG.sync.read(await fs.readFile(`${out}/before/${file}.png`));
  const b = PNG.sync.read(await fs.readFile(`${out}/after/${file}.png`));
  assert.equal(a.width,b.width); assert.equal(a.height,b.height);
  const diff = new PNG({width:a.width,height:a.height});
  const pixels = pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.1});
  await fs.writeFile(`${out}/qa/diff-${file}.png`,PNG.sync.write(diff));
  reports.push({state,geometryIdentical:true,width:a.width,height:a.height,differentPixels:pixels,percent:pixels/(a.width*a.height)*100});
}
await fs.writeFile(`${out}/comparison.json`,JSON.stringify(reports,null,2)); console.log(reports);
