// Browser QA of the Activity terrain section on /skilled: motion, input, keyboard, themes, phone, reduced motion, real data.
//   node scripts/qa/terrain.mjs [base-url]          output: docs/research/uiarc-terrain/qa/
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { traceInit, startTrace, stopTrace } from '../forensics/lib/canvas-trace.mjs';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/uiarc-terrain/qa';
await fs.mkdir(out, { recursive: true });
const results = [], errors = [];
const check = (name, ok, detail = '') => { if (!ok) { results.push({ name, ok: false, detail }); throw new Error(`FAILED: ${name} ${detail}`); } results.push({ name, ok: true, detail }); console.log('ok  ', name, detail);};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const platformOf = frame => frame.polys[0].p;
const bbox = p => ({ w: Math.max(p[0], p[2], p[4], p[6]) - Math.min(p[0], p[2], p[4], p[6]), h: Math.max(p[1], p[3], p[5], p[7]) - Math.min(p[1], p[3], p[5], p[7]), x: Math.min(p[0], p[2], p[4], p[6]), y: Math.min(p[1], p[3], p[5], p[7]) });
const rgbOf = value => { const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value); if (hex) return hex.slice(1).map(h => parseInt(h, 16)); const m = /(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(value); return m ? m.slice(1).map(Number) : null; };
const sameColor = (value, rgb) => { const c = rgbOf(value); return !!c && c.every((v, i) => v === rgb[i]); };
const farthest = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

async function open(browser, { width = 1440, height = 1000, reduced = false, dark = false, touch = false, seed = null, dpr = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: dark ? 'dark' : 'light', hasTouch: touch, isMobile: touch });
  await context.addInitScript(traceInit('at__canvas'));
  if (seed) await context.addInitScript(events => { if (!localStorage.getItem('affectui:acme:skill-events')) localStorage.setItem('affectui:acme:skill-events', JSON.stringify(events)); }, seed);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await page.goto(`${base}/skilled`, { waitUntil: 'networkidle' });
  if (dark) await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
  return { context, page };
}
const root = page => page.locator('.sk-terrain .at');
const plot = page => page.locator('.at__plot');
async function record(page, ms, action) { await startTrace(page); if (action) await action(); await page.waitForTimeout(ms); return stopTrace(page); }
const last = trace => trace.frames.at(-1);

const chrome = await chromium.launch({ channel: 'chrome' });
try {
  // ---------------------------------------------------------------- desktop, no events: the sample week
  {
    const { context, page } = await open(chrome);
    await root(page).waitFor({ timeout: 30000 });
    await root(page).scrollIntoViewIfNeeded();
    // intro (the page was loaded before the trace, so reload the block's data by switching metric back and forth later); here: settled state
    await page.waitForTimeout(4500);
    check('Sample week by default when nothing is recorded', await page.locator('.at[data-source="sample"]').count() === 1 && (await page.locator('.at__note').innerText()).includes('sample week'));
    check('Source switch offers your activity and a sample', (await page.locator('[aria-label="Data"] button').allInnerTexts()).join('|') === 'Your activity|Sample week');
    check('Heading, range and totals match the sample week', (await root(page).innerText()).includes('The shape of your week') && (await root(page).innerText()).includes('Sep 14 to 20, 2026') && (await page.locator('.at__stats .at-number__sr').first().textContent()) === '231,253');
    const canvasLabel = await page.locator('.at__canvas').getAttribute('aria-label');
    check('Canvas has a text summary', /231,253 operations in total, \+8\.6% on last week\. Peak on Wednesday at 15:00 with 4,745\. Wednesday is the busiest day\./.test(canvasLabel));
    const rows = await page.locator('.at table tbody tr').count(), cells = await page.locator('.at table tbody td').count();
    check('Every value is in the table that follows', rows === 7 && cells === 168);
    // idle: nothing is drawn while nothing moves
    const idle = await record(page, 1200);
    check('Idle loop sleeps when nothing moves', idle.frames.length === 0, `frames ${idle.frames.length}`);
    await root(page).screenshot({ path: `${out}/local-rest.png` });
    // hover
    const box = await plot(page).boundingBox();
    const moved = await record(page, 900, async () => { for (let i = 0; i <= 20; i++) { await page.mouse.move(box.x + box.width * (0.35 + i * 0.008), box.y + box.height * 0.34); await sleep(25); } });
    check('Hover shows the panel beside a column', await page.locator('.at__panel[data-show]').count() === 1);
    const panelText = (await page.locator('.at__panel').innerText()).replace(/\s+/g, ' ');
    check('Panel carries day, hour, value, last week, change and share', /^[A-Z][a-z]+day \d\d:00 to \d\d:00 [\d,]+ operations Last week [\d,]+ Change [+−][\d.]+% Share of \w{3} [\d.]+%$/.test(panelText), panelText);
    check('Pointer cursor over a column', await plot(page).getAttribute('data-over') !== null);
    check('Highlight draws guide lines, outline and two label pills', moved.frames.length > 5 && last(moved).lines.length >= 4 && last(moved).other.filter(o => o[0] === 'roundRect').length === 2);
    await root(page).screenshot({ path: `${out}/local-hover.png` });
    await page.mouse.move(box.x - 60, box.y - 60); await page.waitForTimeout(500);
    check('Leaving the plot hides the panel', await page.locator('.at__panel[data-show]').count() === 0);

    // metric switch: a wave
    const wave = await record(page, 1800, () => page.getByRole('button', { name: 'Deliveries', exact: true }).click());
    check('Metric switch animates a wave of column heights', wave.frames.length > 40 && wave.frames.length < 400, `frames ${wave.frames.length}`);
    check('Stats follow the metric', (await page.locator('.at__stats').innerText()).includes('Deliveries this week') && (await page.locator('.at__stats .at-number__sr').first().textContent()) === '1,074');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Errors', exact: true }).click(); await page.waitForTimeout(1600);
    check('Errors use the danger tone and read as bad news when they rise', await page.locator('.at[data-metric="errors"]').count() === 1 && await page.locator('.at__delta').getAttribute('data-tone') === 'bad');
    await root(page).screenshot({ path: `${out}/local-errors.png` });
    await page.getByRole('button', { name: 'Operations', exact: true }).click(); await page.waitForTimeout(1500);

    // peaks fly
    const peak = page.locator('.at__peak').first();
    check('Three peak hours listed', await page.locator('.at__peak').count() === 3);
    const flew = await record(page, 2600, () => peak.click());
    check('Peak button flies in and is pressed', await peak.getAttribute('aria-pressed') === 'true' && await page.locator('.at__reset:not([data-hidden])').count() === 1);
    const settledFly = bbox(platformOf(last(flew))), restBox = bbox(platformOf(last(wave)));
    check('Flying in zooms the terrain', settledFly.w > restBox.w * 1.3, `${settledFly.w.toFixed(0)} vs ${restBox.w.toFixed(0)}`);
    await root(page).screenshot({ path: `${out}/local-fly.png` });
    const back = await record(page, 2600, () => page.getByRole('button', { name: 'Reset view' }).click());
    check('Reset view flies back out', bbox(platformOf(last(back))).w < settledFly.w * 0.8 && await page.locator('.at__reset[data-hidden]').count() === 1);

    // flatten
    const flat = await record(page, 3200, () => page.getByRole('button', { name: 'Top view', exact: true }).click());
    const top = platformOf(last(flat));
    check('Top view is a straight-on rectangle', Math.abs(top[1] - top[3]) < 0.5 && Math.abs(top[0] - top[6]) < 0.5, JSON.stringify(top.map(v => +v.toFixed(1))));
    check('Flattening takes about a second and a half', flat.frames.length > 120 && flat.frames.length < 700, `frames ${flat.frames.length}`);
    await root(page).screenshot({ path: `${out}/local-top.png` });
    const unflat = await record(page, 3200, () => page.getByRole('button', { name: 'Perspective', exact: true }).click());
    const again = platformOf(last(unflat));
    check('Perspective restores the rest pose', farthest(again, platformOf(last(back))) < 1.5, `${farthest(again, platformOf(last(back))).toFixed(2)}px`);

    // orbit by dragging (and momentum)
    const rest = platformOf(last(unflat));
    const drag = await record(page, 3000, async () => { await page.mouse.move(box.x + 300, box.y + 150); await page.mouse.down(); for (let i = 1; i <= 24; i++) { await page.mouse.move(box.x + 300 + i * 5, box.y + 150); await sleep(16); } await page.mouse.up(); });
    check('Dragging orbits the terrain, with momentum after release', farthest(platformOf(last(drag)), rest) > 40 && drag.frames.length > 150, `moved ${farthest(platformOf(last(drag)), rest).toFixed(0)}px over ${drag.frames.length} frames`);
    const wasDragging = await plot(page).getAttribute('data-dragging');
    check('Drag state is cleared on release', wasDragging === null);
    await root(page).screenshot({ path: `${out}/local-orbit.png` });
    const dragV = await record(page, 3000, async () => { await page.mouse.move(box.x + 300, box.y + 150); await page.mouse.down(); for (let i = 1; i <= 20; i++) { await page.mouse.move(box.x + 300, box.y + 150 + i * 5); await sleep(16); } await page.mouse.up(); });
    check('Dragging down tilts the camera (scale and pan follow its pitch)', farthest(platformOf(last(dragV)), platformOf(last(drag))) > 30 && dragV.frames.length > 100, `${farthest(platformOf(last(dragV)), platformOf(last(drag))).toFixed(0)}px over ${dragV.frames.length} frames`);
    // return to the rest pose by dragging back up
    await page.getByRole('button', { name: 'Top view', exact: true }).click(); await page.waitForTimeout(2800);
    await page.getByRole('button', { name: 'Perspective', exact: true }).click(); await page.waitForTimeout(2800);
    await context.close();
  }

  // ---------------------------------------------------------------- keyboard
  {
    const { context, page } = await open(chrome);
    await root(page).waitFor({ timeout: 30000 }); await root(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(4500);
    await page.locator('.sk-terrain').getByRole('button', { name: 'Perspective', exact: true }).focus();
    await page.keyboard.press('Tab');
    check('Tab reaches the plot', await page.evaluate(() => document.activeElement?.classList.contains('at__plot')));
    await page.waitForTimeout(300);
    const live = () => page.locator('.at__sr[aria-live]').innerText();
    check('Focusing from the keyboard highlights the busiest hour', (await page.locator('.at__panel').innerText()).replace(/\s+/g, ' ').startsWith('Wednesday 15:00 to 16:00 4,745'));
    check('The highlighted hour is read out', (await live()) === 'Wednesday 15:00 to 16:00: 4,745 operations, +4.1% on last week.', await live());
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
    check('Arrow right: next hour', (await live()).startsWith('Wednesday 16:00 to 17:00: 3,665'));
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
    check('Arrow down: next day', (await live()).startsWith('Thursday 16:00 to 17:00: 3,226'));
    await page.keyboard.press('Home'); await page.waitForTimeout(200);
    check('Home: first hour of the day', (await live()).startsWith('Thursday 00:00 to 01:00: 197'));
    await page.keyboard.press('End'); await page.waitForTimeout(200);
    check('End: last hour of the day', (await live()).startsWith('Thursday 23:00 to 00:00: 398'));
    const orbit = await record(page, 2500, async () => { await page.keyboard.press('Shift+ArrowRight'); await sleep(150); await page.keyboard.press('Shift+ArrowRight'); });
    check('Shift + arrows orbit the camera', orbit.frames.length > 100);
    await page.keyboard.press('Enter'); await page.waitForTimeout(2600);
    check('Enter flies to the highlighted hour', (await live()).startsWith('Focused on Thursday 23:00 to 00:00') && await page.locator('.at__reset:not([data-hidden])').count() === 1, await live());
    await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
    check('Escape returns to the whole week', (await live()) === 'Returned to the whole week.' && await page.locator('.at__reset[data-hidden]').count() === 1);
    check('The highlight stays after the first Escape', await page.locator('.at__panel[data-show]').count() === 1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    check('A second Escape clears the highlight', await page.locator('.at__panel[data-show]').count() === 0);
    await page.keyboard.press('Shift+ArrowLeft'); await page.keyboard.press('Shift+ArrowLeft'); await page.waitForTimeout(2200);
    await page.keyboard.press('Shift+ArrowUp');
    const zoomIn = await record(page, 1800, async () => { await page.keyboard.press('+'); await sleep(100); await page.keyboard.press('+'); });
    const zoomOut = await record(page, 1800, async () => { await page.keyboard.press('-'); await sleep(100); await page.keyboard.press('-'); await sleep(100); await page.keyboard.press('-'); });
    check('Plus zooms in and minus zooms out', last(zoomIn).polys[0].p && bbox(platformOf(last(zoomIn))).w > bbox(platformOf(last(zoomOut))).w);
    await context.close();
  }

  // ---------------------------------------------------------------- your activity: empty, then real operations
  {
    const { context, page } = await open(chrome);
    await root(page).waitFor({ timeout: 30000 }); await root(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Your activity', exact: true }).click(); await page.waitForTimeout(1800);
    check('Your activity with nothing recorded says so', (await page.locator('.at__empty').innerText()).includes('Nothing recorded this week yet'));
    check('Totals are zero, with no invented peak', (await page.locator('.at__stats .at-number__sr').first().textContent()) === '0' && (await page.locator('.at__stats').innerText()).includes('No busy hours yet'));
    await root(page).screenshot({ path: `${out}/local-empty.png` });
    await page.getByRole('button', { name: 'Preview a sample week' }).click(); await page.waitForTimeout(800);
    check('Preview a sample week switches back', await page.locator('.at[data-source="sample"]').count() === 1);
    await context.close();
  }
  {
    const now = Date.now();
    const seed = [
      { id: 'e1', kind: 'save', label: 'Browser save', t: now - 2 * 60000, durationMs: 4, bytes: 100, outcome: 'success' },
      { id: 'e2', kind: 'import', label: 'Imported', t: now - 90 * 1000, durationMs: 300, bytes: 500, outcome: 'success' },
      { id: 'e3', kind: 'export', label: 'Exported bundle', t: now - 60 * 1000, durationMs: 12, bytes: 900, outcome: 'success' },
      { id: 'e4', kind: 'transfer', label: 'Transfer', t: now - 30 * 1000, durationMs: 40, bytes: 900, outcome: 'error', detail: 'no backend' },
    ];
    const { context, page } = await open(chrome, { seed });
    await root(page).waitFor({ timeout: 30000 }); await root(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(4500);
    check('Real operations replace the sample', await page.locator('.at[data-source="workspace"]').count() === 1 && (await page.locator('.at__stats .at-number__sr').first().textContent()) === '4');
    check('Counted per metric: deliveries are successful exports and transfers, errors are failures', await (async () => { await page.getByRole('button', { name: 'Deliveries', exact: true }).click(); await page.waitForTimeout(1200); const d = await page.locator('.at__stats .at-number__sr').first().textContent(); await page.getByRole('button', { name: 'Errors', exact: true }).click(); await page.waitForTimeout(1200); const e = await page.locator('.at__stats .at-number__sr').first().textContent(); return d === '1' && e === '1'; })());
    await page.getByRole('button', { name: 'Operations', exact: true }).click(); await page.waitForTimeout(1500);
    check('One busy hour holds all four', (await page.locator('.at__peak').count()) === 1 && (await page.locator('.at__peak .at-number__sr').first().textContent()) === '4');
    check('Nothing last week to compare with', (await page.locator('.at__delta').innerText()).includes('no earlier week'));
    await root(page).screenshot({ path: `${out}/local-workspace.png` });
    await context.close();
  }

  // ---------------------------------------------------------------- reduced motion
  {
    const { context, page } = await open(chrome, { reduced: true });
    await root(page).waitFor({ timeout: 30000 }); await root(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
    const metric = await record(page, 1000, () => page.getByRole('button', { name: 'Deliveries', exact: true }).click());
    check('Reduced motion: a metric change lands in one frame', metric.frames.length <= 3, `frames ${metric.frames.length}`);
    const top = await record(page, 1000, () => page.getByRole('button', { name: 'Top view', exact: true }).click());
    check('Reduced motion: top view lands in one frame', top.frames.length <= 3 && Math.abs(platformOf(last(top))[1] - platformOf(last(top))[3]) < 0.5, `frames ${top.frames.length}`);
    await context.close();
  }

  // ---------------------------------------------------------------- dark
  {
    const { context, page } = await open(chrome, { dark: true });
    await root(page).waitFor({ timeout: 30000 }); await root(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(4200);
    const t = await record(page, 600, () => page.getByRole('button', { name: 'Errors', exact: true }).click());
    check('Dark theme draws the dark platform and light labels', sameColor(last(t).polys[0].f, [33, 33, 33]) && sameColor(last(t).labels[0].fill, [140, 140, 140]), `${last(t).polys[0].f} ${last(t).labels[0].fill}`);
    await page.waitForTimeout(1500);
    await root(page).screenshot({ path: `${out}/local-dark.png` });
    // the workspace's own switch lives on its page element, not on <html>
    const light = await record(page, 600, () => page.evaluate(() => { document.documentElement.classList.remove('dark'); delete document.documentElement.dataset.theme; document.querySelector('.crm-page')?.setAttribute('data-theme', 'light'); }));
    check('Switching the workspace theme repaints the terrain', light.frames.length > 0 && sameColor(last(light).polys[0].f, [249, 249, 249]), `${light.frames.length} frames`);
    await context.close();
  }

  // ---------------------------------------------------------------- phone
  {
    const { context, page } = await open(chrome, { width: 390, height: 844, touch: true, dpr: 2 });
    await root(page).waitFor({ timeout: 30000 }); await root(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(4500);
    const sizes = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, plot: [document.querySelector('.at__plot').clientWidth, document.querySelector('.at__plot').clientHeight], touchHint: getComputedStyle(document.querySelector('.at__hintTouch')).display, fineHint: getComputedStyle(document.querySelector('.at__hintFine')).display, cols: getComputedStyle(document.querySelector('.at__stats')).gridTemplateColumns.split(' ').length }));
    check('Phone: no horizontal overflow', sizes.overflow <= 0, JSON.stringify(sizes));
    check('Phone: plot is 280 px tall and the hint is for touch', sizes.plot[1] === 280 && sizes.touchHint === 'inline' && sizes.fineHint === 'none', JSON.stringify(sizes));
    check('Phone: stats in two columns under the plot', sizes.cols === 2);
    await root(page).screenshot({ path: `${out}/local-phone.png` });
    await context.close();
  }
  // WebKit
  const wk = await webkit.launch();
  try {
    const { context, page } = await open(wk);
    await root(page).waitFor({ timeout: 30000 }); await root(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(4500);
    check('WebKit: the terrain draws and flies', await (async () => { const n = await page.evaluate(() => { const c = document.querySelector('.at__canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++; return ink; }); await page.locator('.at__peak').first().click(); await page.waitForTimeout(2200); return n > 5000 && await page.locator('.at__reset:not([data-hidden])').count() === 1; })());
    await context.close();
  } finally { await wk.close(); }
  check('No console or page errors', errors.length === 0, errors.join(' | '));
} catch (error) {
  console.error(String(error.message || error));
  process.exitCode = 1;
} finally {
  await chrome.close();
  await fs.writeFile(`${out}/qa-results.json`, JSON.stringify({ base, results, errors }, null, 1));
  console.log(`${results.filter(r => r.ok).length}/${results.length} checks passed`);
}
