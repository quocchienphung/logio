// What does the local framing predict for the canvas sizes the public preview was recorded at, against the measured rest pose?
import { TerrainCamera } from '../../src/components/sites/skilled/terrain/terrain-camera.ts';
import fs from 'node:fs/promises';
const dir = process.argv[2];
const f = JSON.parse(await fs.readFile(`${dir}/load.heights.json`, 'utf8')).frames.at(-1);
const heights = Array.from({ length: 168 }, (_, k) => Math.max(0, f.h[k] ?? 0));
for (const [w, h, measured] of [[622.81, 291.63, { scale: 18.8948, cx: 16.232, cy: -10.885 }], [742, 344, { scale: 22.7718, cx: 19.677, cy: -12.861 }], [286, 280, { scale: 10.0822, cx: 18.324, cy: -15.1 }]]) {
  const cam = new TerrainCamera({ width: w, height: h }); cam.setHeights(heights); cam.snapToRest();
  const p = cam.pose;
  console.log(`${w}x${h}: predicted scale ${p.scale.toFixed(3)} ox ${p.ox.toFixed(2)} oy ${p.oy.toFixed(2)} yaw ${p.yaw.toFixed(1)} | measured scale ${measured.scale} ox ${measured.cx} oy ${measured.cy}`);
}
