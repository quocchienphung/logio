// Which column is under a canvas point at the rest pose (sample data, settled)? Used to identify the cell a recorded click landed on.
import fs from 'node:fs/promises';
import path from 'node:path';
import { TerrainCamera } from '../../src/components/sites/skilled/terrain/terrain-camera.ts';
import { drawTerrain, createScene, lightTheme, pick } from '../../src/components/sites/skilled/terrain/terrain-draw.ts';
const [dir, x, y] = process.argv.slice(2);
const size = { width: 622.81, height: 291.63 };
const f = JSON.parse(await fs.readFile(path.join(dir, 'load.heights.json'), 'utf8')).frames.at(-1);
const heights = Array.from({ length: 168 }, (_, k) => Math.max(0, f.h[k] ?? 0)), max = Math.max(...heights);
const cam = new TerrainCamera(size); cam.setHeights(heights); cam.snapToRest();
const ctx = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 20 }) : () => {}, set: () => true });
const scene = createScene();
drawTerrain(ctx, { pose: cam.pose, size, theme: lightTheme, tone: 'neutral', heights, shares: heights.map(h => h / max), highlight: null, flight: 0, compact: false }, scene);
const index = pick(scene, Number(x), Number(y));
console.log('cell', index, index === null ? '' : `hour ${index % 24} day ${Math.floor(index / 24)} height ${heights[index].toFixed(3)}`);
