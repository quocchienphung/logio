// End-to-end comparison in a real browser: the local terrain on /skilled against the frames recorded from the public preview, at the same canvas size.
// The local block is narrowed to 664 px so its plot is 624 x 292 CSS px, exactly the preview's plot at a 1440 px viewport.
//   node scripts/forensics/uiarc-terrain-compare.mjs <trace-dir> [base-url]        output: docs/research/uiarc-terrain/compare.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { traceInit, startTrace, stopTrace } from './lib/canvas-trace.mjs';

const [dir, base = 'http://localhost:3000'] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = async name => JSON.parse(await fs.readFile(path.join(dir, `${name}.json`), 'utf8'));
const results = [];

/** Frame-by-frame difference of the platform corners, matching each local frame with the recorded frame at the same time since the first frame. */
function compare(name, mine, theirs, align = 'frame') {
  const a = mine.frames.map(f => ({ t: f.t, p: f.polys[0].p })), b = theirs.frames.map(f => ({ t: f.t, p: f.polys[0].p }));
  // line the recordings up on their first drawn frame (a click draws at once), or, for a drag whose first frames precede the movement, on the press
  const anchor = trace => trace.events?.find(e => e.type === 'pointerdown')?.t;
  const ea = anchor(mine), eb = anchor(theirs), press = align === 'press' && ea !== undefined && eb !== undefined, ta = press ? ea : a[0].t, tb = press ? eb : b[0].t;
  let j = 0; const errors = [];
  for (const frame of a) {
    const t = frame.t - ta;
    if (t < 0) continue;
    while (j + 1 < b.length && b[j + 1].t - tb <= t) j++;
    const next = b[Math.min(j + 1, b.length - 1)], cur = b[j], span = (next.t - cur.t) || 1, f = Math.min(1, Math.max(0, (t - (cur.t - tb)) / span));
    const rec = cur.p.map((v, i) => v + (next.p[i] - v) * f);
    errors.push(Math.max(...frame.p.map((v, i) => Math.abs(v - rec[i]))));
  }
  const sorted = errors.slice().sort((x, y) => x - y);
  const result = { name, localFrames: a.length, sourceFrames: b.length, localSeconds: +((a.at(-1).t - a[0].t) / 1000).toFixed(2), sourceSeconds: +((b.at(-1).t - b[0].t) / 1000).toFixed(2), meanPx: +(errors.reduce((x, y) => x + y, 0) / errors.length).toFixed(2), p95Px: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2), maxPx: +sorted.at(-1).toFixed(2), finalPx: +errors.at(-1).toFixed(2) };
  results.push(result); console.log(JSON.stringify(result));
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript(traceInit('at__canvas'));
  await context.addInitScript(() => { addEventListener('DOMContentLoaded', () => { window.__trace.rec = true; }); });
  const page = await context.newPage();
  await page.addInitScript(() => { const style = document.createElement('style'); style.textContent = '.sk-terrain .at { width: 664px !important; margin-inline: 0 !important; }'; addEventListener('DOMContentLoaded', () => document.head.appendChild(style)); });
  await page.goto(`${base}/skilled`, { waitUntil: 'networkidle' });
  await page.locator('.sk-terrain .at').scrollIntoViewIfNeeded();
  const size = await page.evaluate(() => [document.querySelector('.at__plot').clientWidth, document.querySelector('.at__plot').clientHeight]);
  console.log('local plot', JSON.stringify(size));
  await sleep(7000);
  const intro = await stopTrace(page);
  // the first frame of the local intro is the first frame drawn after the data arrived
  compare('intro', intro, await load('load'));
  const plot = page.locator('.at__plot'), box = await plot.boundingBox();
  const run = async (name, source, action, ms = 3500, align = 'frame') => { await startTrace(page); await action(); await sleep(ms); const t = await stopTrace(page); if (t.frames.length) compare(name, t, await load(source), align); else console.log(name, 'no frames'); };
  await run('metric Deliveries', 'metric-deploys', () => page.getByRole('button', { name: 'Deliveries', exact: true }).click(), 2500);
  await sleep(1000);
  await run('metric Errors', 'metric-errors', () => page.getByRole('button', { name: 'Errors', exact: true }).click(), 2500);
  await sleep(1000);
  await run('metric Operations', 'metric-sessions', () => page.getByRole('button', { name: 'Operations', exact: true }).click(), 2500);
  await sleep(1500);
  await run('flatten to top view', 'flatten-top', () => page.getByRole('button', { name: 'Top view', exact: true }).click());
  await sleep(1200);
  await run('back to perspective', 'flatten-perspective', () => page.getByRole('button', { name: 'Perspective', exact: true }).click());
  await sleep(1200);
  await run('zoom keys', 'zoom-keys', async () => { await plot.focus(); await page.keyboard.press('+'); await sleep(250); await page.keyboard.press('+'); await sleep(250); await page.keyboard.press('-'); }, 2800);
  await sleep(1500);
  // replay the recorded drag with its own pacing (the events' times, relative to the press)
  const recorded = (await load('orbit-drag-slow')).events.filter(e => ['pointerdown', 'pointermove', 'pointerup'].includes(e.type));
  const down = recorded.find(e => e.type === 'pointerdown'), cx = box.x + box.width / 2, cy = box.y + box.height * 0.45;
  await run('drag orbit (recorded pacing)', 'orbit-drag-slow', async () => {
    let clock = down.t;
    for (const e of recorded.filter(r => r.t >= down.t)) {
      await sleep(Math.max(0, e.t - clock - 2)); clock = e.t;
      if (e.type === 'pointerdown') { await page.mouse.move(cx, cy); await page.mouse.down(); }
      else if (e.type === 'pointermove') await page.mouse.move(cx + (e.x - down.x), cy + (e.y - down.y));
      else await page.mouse.up();
    }
  }, 4200, 'press');
  await fs.writeFile('docs/research/uiarc-terrain/compare.json', JSON.stringify({ viewport: '1440x1000', plot: size, results }, null, 1));
  await context.close();
} finally { await browser.close(); }
