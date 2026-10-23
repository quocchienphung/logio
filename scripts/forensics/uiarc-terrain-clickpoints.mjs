// Canvas coordinates (rest pose, sample data) of the top face centre of chosen columns, to click them in the public preview.
import fs from 'node:fs/promises';
import path from 'node:path';
import { TerrainCamera } from '../../src/components/sites/skilled/terrain/terrain-camera.ts';
import { drawTerrain, createScene, lightTheme } from '../../src/components/sites/skilled/terrain/terrain-draw.ts';
const [dir, list] = process.argv.slice(2);
const size = { width: 622.81, height: 291.63 };
const f = JSON.parse(await fs.readFile(path.join(dir, 'load.heights.json'), 'utf8')).frames.at(-1);
const heights = Array.from({ length: 168 }, (_, k) => Math.max(0, f.h[k] ?? 0)), max = Math.max(...heights);
const cam = new TerrainCamera(size); cam.setHeights(heights); cam.snapToRest();
if (process.env.YAW) cam.setView({ yaw: Number(process.env.YAW) });
const ctx = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 20 }) : () => {}, set: () => true });
const scene = createScene();
drawTerrain(ctx, { pose: cam.pose, size, theme: lightTheme, tone: 'neutral', heights, shares: heights.map(h => h / max), highlight: null, flight: 0, compact: false }, scene);
const out = JSON.parse(list).map(index => { const q = scene.quads, o = index * 24; const x = (q[o] + q[o + 2] + q[o + 4] + q[o + 6]) / 4, y = (q[o + 1] + q[o + 3] + q[o + 5] + q[o + 7]) / 4; return { index, x: +x.toFixed(1), y: +y.toFixed(1), h: +heights[index].toFixed(3) }; });
console.log(JSON.stringify(out));
