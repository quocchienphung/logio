import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. A sweep of drags with known pointer paths: how far the sheet follows the pointer, the rubber band past the
// tallest detent, and which detent (or dismissal) a release at a given position and speed ends on.
const directory = 'docs/research/bottom-sheet/source';
const VH = Number(process.argv[2] || 1000);
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: VH } });
await context.addInitScript(() => {
  window.__on = false; window.__f = []; window.__p = [];
  window.addEventListener('pointermove', e => { if (window.__on) window.__p.push({ t: performance.now() - window.__t0, y: e.clientY }); }, true);
  window.addEventListener('pointerup', e => { if (window.__on) window.__p.push({ t: performance.now() - window.__t0, y: e.clientY, up: true }); }, true);
  window.__go = () => {
    window.__f = []; window.__p = []; window.__on = true; window.__t0 = performance.now();
    const tick = () => { if (!window.__on) return; const d = document.querySelector('[role="dialog"]'); const o = document.querySelector('[class*="bottom-sheet_overlay"], [class*="bottom-sheet_backdrop"]'); if (d) { const m = getComputedStyle(d).transform.match(/matrix\(([^)]+)\)/); window.__f.push({ t: performance.now() - window.__t0, ty: m ? +m[1].split(',')[5] : 0, ov: o ? +getComputedStyle(o).opacity : null }); } else window.__f.push({ t: performance.now() - window.__t0, gone: true }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  window.__stop = () => { window.__on = false; return { frames: window.__f, pointer: window.__p }; };
});
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/bottom-sheet', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const trigger = page.getByRole('button', { name: 'View trip details' });
await trigger.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(600);
const tb = await trigger.boundingBox();
const dialog = page.getByRole('dialog');
const ensureOpen = async () => { if (!(await dialog.count())) { await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(1100); } };
const toDetent = async which => { await ensureOpen(); const g = dialog.getByRole('button', { name: /expand sheet|collapse sheet/i }).first(); await g.focus(); await page.keyboard.press(which === 'tall' ? 'Home' : 'End'); await page.waitForTimeout(1000); };
const tyNow = () => dialog.evaluate(n => { const m = getComputedStyle(n).transform.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[5] : 0; }).catch(() => null);

const meta = await (async () => { await ensureOpen(); const s = await tyNow(); const h = (await dialog.boundingBox()).height; return { smallestTy: s, sheetHeight: h, vars: await dialog.getAttribute('style') }; })();
console.log('meta', JSON.stringify(meta));

/** path: list of [dy from the start, ms to get there]; hold: ms the pointer rests before release */
async function trial(label, start, path, hold = 0) {
  await toDetent(start);
  const startTy = await tyNow();
  const grab = { x: 720, y: (await dialog.boundingBox()).y + 24 };
  await page.evaluate(() => window.__go()); await page.waitForTimeout(30);
  await page.mouse.move(grab.x, grab.y); await page.mouse.down();
  for (const [dy, ms] of path) {
    const steps = Math.max(1, Math.round(ms / 8));
    const from = (await page.evaluate(() => window.__p.at(-1)?.y)) ?? grab.y;
    for (let i = 1; i <= steps; i++) { await page.mouse.move(grab.x, from + (grab.y + dy - from) * i / steps); await page.waitForTimeout(8); }
  }
  if (hold) await page.waitForTimeout(hold);
  const duringTy = await tyNow();
  await page.mouse.up();
  await page.waitForTimeout(1300);
  const rec = await page.evaluate(() => window.__stop());
  const after = await dialog.count() ? await tyNow() : 'dismissed';
  await fs.writeFile(`${directory}/drag-${label}.json`, JSON.stringify({ label, start, startTy, grabY: grab.y, path, hold, duringTy, after, ...rec }));
  // release velocity from the last 60ms of pointer motion
  const ptr = rec.pointer.filter(p => !p.up), up = rec.pointer.find(p => p.up), tUp = up?.t ?? ptr.at(-1).t;
  const recent = ptr.filter(p => p.t >= tUp - 60); const v = recent.length > 1 ? (recent.at(-1).y - recent[0].y) / ((recent.at(-1).t - recent[0].t) / 1000) : 0;
  console.log(label.padEnd(26), 'start', start.padEnd(5), 'pointer dy', String(path.at(-1)[0]).padStart(5), 'ty at release', String(duringTy?.toFixed?.(1)).padStart(7), 'v', String(Math.round(v)).padStart(6), 'px/s ->', after === 'dismissed' ? 'DISMISSED' : `ty ${after.toFixed(1)} (${Math.abs(after) < 5 ? 'tall' : Math.abs(after - meta.smallestTy) < 5 ? 'small' : 'other'})`);
  if (after === 'dismissed') await page.waitForTimeout(400);
}

// Velocity sweep: the pointer moves `step` px every ~16ms for `count` steps, then is released at once.
async function velocityTrial(start, dir, step, count) {
  await toDetent(start);
  const startTy = await tyNow();
  const grab = { x: 720, y: (await dialog.boundingBox()).y + 24 };
  await page.evaluate(() => window.__go()); await page.waitForTimeout(30);
  await page.mouse.move(grab.x, grab.y); await page.mouse.down();
  for (let i = 1; i <= count; i++) { await page.mouse.move(grab.x, grab.y + dir * step * i); await page.waitForTimeout(12); }
  const duringTy = await tyNow();
  await page.mouse.up();
  await page.waitForTimeout(1300);
  const rec = await page.evaluate(() => window.__stop());
  const after = await dialog.count() ? await tyNow() : 'dismissed';
  const label = `v-${start}-${dir > 0 ? 'down' : 'up'}-${step}x${count}`;
  await fs.writeFile(`${directory}/drag-${label}.json`, JSON.stringify({ label, start, startTy, grabY: grab.y, duringTy, after, ...rec }));
  const ptr = rec.pointer.filter(p => !p.up), up = rec.pointer.find(p => p.up);
  const last = ptr.slice(-3); const vLast = last.length > 1 ? (last.at(-1).y - last[0].y) / ((last.at(-1).t - last[0].t) / 1000) : 0;
  const gap = up ? up.t - ptr.at(-1).t : 0;
  console.log(label.padEnd(24), 'ty@release', String(duringTy?.toFixed?.(0)).padStart(4), 'v(last3)', String(Math.round(vLast)).padStart(6), 'gap', String(Math.round(gap)).padStart(3), 'ms ->', after === 'dismissed' ? 'DISMISSED' : `ty ${after.toFixed(0)} ${Math.abs(after) < 5 ? 'tall' : Math.abs(after - meta.smallestTy) < 5 ? 'small' : '?'}`);
  if (after === 'dismissed') await page.waitForTimeout(400);
}
// Fine sweep around the flick threshold, three runs each
for (const step of [8, 9, 10, 11, 12]) for (let run = 0; run < 3; run++) await velocityTrial('small', 1, step, 3);
for (const step of [8, 9, 10, 11, 12]) for (let run = 0; run < 3; run++) await velocityTrial('small', -1, step, 3);
await browser.close();
