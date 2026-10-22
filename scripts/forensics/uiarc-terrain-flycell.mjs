// Which column would a fly with the measured rule (zoom 1.5, shift 7 px, pivot rule) have to target to reproduce a recorded final platform?
import fs from 'node:fs/promises';
import path from 'node:path';
import { TerrainCamera } from '../../src/components/sites/skilled/terrain/terrain-camera.ts';
import { cellX, cellZ } from '../../src/components/sites/skilled/terrain/terrain-math.ts';
import { flyPivotHeight } from '../../src/components/sites/skilled/terrain/terrain-constants.ts';
import { platformCorners } from './lib/terrain-sim.mjs';
const [dir, name, start] = process.argv.slice(2);
const size = { width: 622.81, height: 291.63 };
const data = JSON.parse(await fs.readFile(path.join(dir, `${name}.series.json`), 'utf8'));
const f = JSON.parse(await fs.readFile(path.join(dir, 'load.heights.json'), 'utf8')).frames.at(-1);
const heights = Array.from({ length: 168 }, (_, k) => Math.max(0, f.h[k] ?? 0));
const target = data.series.at(-1).plat;
const rows = [];
for (let index = 0; index < 168; index++) {
  const cam = new TerrainCamera(size); cam.setHeights(heights); cam.snapToRest(); if (start) cam.setView(JSON.parse(start));
  cam.flyTo({ x: cellX(index % 24), y: flyPivotHeight(heights[index]), z: cellZ(Math.floor(index / 24)) }); cam.snap();
  const mine = platformCorners(cam.pose, size);
  rows.push({ index, rms: Math.sqrt(mine.reduce((s, v, i) => s + (v - target[i]) ** 2, 0) / 8) });
}
rows.sort((a, b) => a.rms - b.rms);
console.log(rows.slice(0, 4).map(r => `cell ${r.index} (hour ${r.index % 24} day ${Math.floor(r.index / 24)}) rms ${r.rms.toFixed(2)}`).join(' | '));
