import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { buildSmallFixture } from './lib/collateral-fixture.mjs';

const base = process.argv[2] || 'http://localhost:3002';
const workspace = `queue-qa-${Date.now()}`;
const api = `${base}/api/workspace/workspaces/${workspace}/collateral-queue`;
const out = 'docs/research/collateral-queue/local';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [], foreign = [];
const check = (name, ok) => { assert.ok(ok, name); results.push(name); console.log(`PASS ${name}`); };
const original = Buffer.from(buildSmallFixture());
const payload = name => ({ name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: original });
const list = async () => (await (await fetch(api)).json()).data;
const waitFor = async predicate => { for (let i = 0; i < 120; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error('Timed out waiting for saved queue state'); };
const context = async (options = {}, id = workspace) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await ctx.addInitScript(id => {
    localStorage.setItem('affectui:active-workspace', JSON.stringify(id));
    localStorage.setItem('affectui:news', '0');
    localStorage.setItem('affectui:workspaces', JSON.stringify([{ id, name: 'Queue QA' }]));
    localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() }));
  }, id);
  return ctx;
};
const open = async (ctx, section = 'excel-formation') => {
  const p = await ctx.newPage();
  p.on('pageerror', error => errors.push(error.message));
  p.on('request', r => { const url = new URL(r.url()); if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) foreign.push(url.href); });
  await p.goto(`${base}/personalize?section=${section}`, { waitUntil: 'networkidle' });
  await p.locator(section === 'queue' ? '.queue-card' : '.cr-import').waitFor();
  await p.waitForTimeout(1000);
  return p;
};
const goQueue = async p => { await p.locator('.ui-as-side__nav').getByRole('button', { name: 'Queue', exact: true }).click(); await p.locator('.queue-card').waitFor(); await p.waitForTimeout(500); };
const holdOn = async (p, locator, ms) => {
  await locator.scrollIntoViewIfNeeded(); const r = await locator.boundingBox();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up();
};
const dialog = p => p.getByRole('dialog');
const ask = async p => { if (await dialog(p).locator('.cm__confirm').count()) return; await dialog(p).getByRole('button', { name: 'Delete original', exact: true }).click(); await dialog(p).locator('.cm__confirm').waitFor(); await p.waitForTimeout(500); };
try {
  const ctx = await context();
  const p = await open(ctx);
  check('No step tabs exist before a workbook has been processed', await p.getByRole('tab').count() === 0);
  const center = await p.locator('.cr-import__center').evaluate(n => { const r = n.getBoundingClientRect(), panel = document.querySelector('.ui-as-main').getBoundingClientRect(); return { dx: Math.abs(r.x + r.width / 2 - panel.x - panel.width / 2), dy: Math.abs(r.y + r.height / 2 - innerHeight / 2) }; });
  check('Upload group is centered in the section and viewport', center.dx < 2 && center.dy < 18);
  await p.screenshot({ path: `${out}/desktop-idle.png` });
  await p.locator('input[type=file]').setInputFiles({ name: 'Wrong.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b') });
  await p.locator('.import-unfurl__error').waitFor();
  check('Invalid file never reveals steps or creates a false successful upload', await p.getByRole('tab').count() === 0 && (await list()).length === 0);

  await p.evaluate(() => {
    window.__queueSteps = [];
    const start = performance.now();
    const frame = now => {
      const tabs = [...document.querySelectorAll('[role=tab]')];
      window.__queueSteps.push({ t: now - start, tabs: tabs.map(n => ({ text: n.textContent, opacity: +getComputedStyle(n).opacity, transform: getComputedStyle(n).transform })), ready: !!document.querySelector('.import-unfurl__body') && document.querySelector('.import-unfurl').textContent.includes('Workbook opened') });
      if (now - start < 2200) requestAnimationFrame(frame);
    }; requestAnimationFrame(frame);
  });
  await p.locator('input[type=file]').setInputFiles(payload('First workbook.xlsx'));
  await p.getByText('Workbook opened', { exact: true }).waitFor();
  await waitFor(async () => (await list()).some(e => e.status === 'ready'));
  await p.waitForTimeout(2200);
  const frames = await p.evaluate(() => window.__queueSteps);
  await fs.writeFile(`${out}/step-reveal-frames.json`, JSON.stringify(frames, null, 2));
  check('Four steps appear after actual processing succeeds', await p.getByRole('tab').count() === 4 && frames.filter(f => f.tabs.length).every(f => f.ready));
  check('Steps reveal sequentially with distinct intermediate opacities', frames.some(f => f.tabs.length === 4 && f.tabs[0].opacity > .3 && f.tabs[3].opacity < .2));
  check('Unfurl preview still contains the real worksheet', (await p.locator('.import-unfurl__grid').innerText()).includes('NGAYDULIEU'));
  await p.screenshot({ path: `${out}/desktop-processed.png` });
  let entries = await list();
  const first = entries[0];
  check('Queue records actual bytes, SHA-256 and worker sheet/row counts', first.name === 'First workbook.xlsx' && first.size === original.length && first.sha256 === createHash('sha256').update(original).digest('hex') && first.sheets === 1 && first.rows === 4);
  const bytes = Buffer.from(await (await fetch(`${api}/${first.id}`)).arrayBuffer());
  check('Saved original downloads byte-for-byte intact', bytes.equals(original));
  const diskDir = path.resolve('.logio-data', 'workspaces', workspace, 'collateral-queue', first.id);
  check('Upload writes a real file inside the project data directory', (await fs.readFile(path.join(diskDir, 'original.xlsx'))).equals(original));

  await p.locator('input[type=file]').setInputFiles(payload('Second workbook.xlsx'));
  await p.getByText('Workbook opened', { exact: true }).waitFor();
  await waitFor(async () => (await list()).length === 2 && (await list()).every(e => e.status === 'ready'));
  await goQueue(p); await p.locator('.queue-row').nth(1).waitFor();
  check('Queue is the third Collateral page and retains repeated uploads as separate history', (await p.locator('.workspace-folder__children .ui-as-side__item').allTextContents()).join('|').includes('Excel formation') && await p.locator('.queue-row').count() === 2);
  await p.getByRole('searchbox').fill('First');
  await p.locator('.queue-row').filter({ hasText: 'Second workbook.xlsx' }).waitFor({ state: 'detached' });
  check('Search filters actual saved names', await p.locator('.queue-row').count() === 1 && (await p.locator('.queue-row').innerText()).includes('First workbook.xlsx'));
  await p.getByRole('searchbox').fill('');
  await p.locator('select').selectOption('failed');
  await p.locator('.queue-row').first().waitFor({ state: 'detached' });
  check('Status filter reports no matches rather than inventing rows', await p.locator('.queue-row').count() === 0 && (await p.locator('.queue-list').innerText()).includes('No files match'));
  await p.locator('select').selectOption('all');
  // the surface leaves the row's own rectangle and settles into the panel without overshoot (frames sampled while it travels)
  const rowRect = await p.locator('.queue-row__button').first().boundingBox();
  await p.evaluate(() => {
    window.__morph = [];
    const start = performance.now();
    const frame = now => {
      const s = document.querySelector('.queue-pop__surface');
      if (s && s.offsetParent !== null || s?.closest('dialog')?.open) { const r = s.getBoundingClientRect(); window.__morph.push({ t: now - start, x: r.x, y: r.y, w: r.width, h: r.height, o: +getComputedStyle(s).opacity }); }
      if (now - start < 1800) requestAnimationFrame(frame);
    }; requestAnimationFrame(frame);
  });
  await p.getByRole('button', { name: 'First workbook.xlsx · Scanned', exact: true }).click();
  await dialog(p).waitFor(); await p.waitForTimeout(260); await p.screenshot({ path: `${out}/queue-popup-midflight.png` }); await p.waitForTimeout(1500);
  const morph = await p.evaluate(() => window.__morph);
  await fs.writeFile(`${out}/queue-popup-morph-frames.json`, JSON.stringify(morph));
  const firstFrame = morph[0], lastFrame = morph.at(-1);
  check('The pop-up grows out of the clicked row (first frame is the row rectangle) and settles on the 480px panel', firstFrame && Math.abs(firstFrame.w - rowRect.width) < 25 && Math.abs(firstFrame.x - rowRect.x) < 25 && Math.abs(lastFrame.w - 480) < 1);
  check('The morph never overshoots its final width and settles within 1.2s (a calm 0.62s spring; the dev server adds frame time)', morph.every((f, i) => f.w >= 479.5 && f.h >= Math.min(firstFrame.h, lastFrame.h) - .5 && (i === 0 || f.w <= morph[i - 1].w + .5)) && (morph.find(f => Math.abs(f.w - 480) < .6 && Math.abs(f.h - lastFrame.h) < .6)?.t ?? 9999) - firstFrame.t < 1200);
  const pop = await dialog(p).evaluate(n => { const r = n.getBoundingClientRect(), surface = n.querySelector('.queue-pop__surface'), c = getComputedStyle(surface); return { width: r.width, radius: c.borderTopLeftRadius, cx: Math.abs(r.x + r.width / 2 - innerWidth / 2), cy: Math.abs(r.y + r.height / 2 - innerHeight / 2), scrim: getComputedStyle(n, '::backdrop').backdropFilter, aside: !!document.querySelector('.queue-detail'), title: getComputedStyle(n.querySelector('.queue-pop__title')).fontSize }; });
  check('Selecting history opens the Card quick look: centred 30rem panel, 34px corners, 22px title, 7px scrim blur, no side panel', pop.width === 480 && pop.radius === '34px' && pop.title === '22px' && pop.cx < 1 && pop.cy < 1 && pop.scrim.includes('blur(7px)') && !pop.aside);
  check('The pop-up names the original and holds its facts and actions', (await dialog(p).innerText()).includes('First workbook.xlsx') && await dialog(p).getByRole('button', { name: 'Download', exact: true }).isVisible());
  await p.screenshot({ path: `${out}/queue-popup-desktop.png` });
  await p.keyboard.press('Escape'); await dialog(p).waitFor({ state: 'hidden' });
  check('Escape closes the pop-up and returns focus to the row', await p.evaluate(() => document.activeElement?.classList.contains('queue-row__button')));
  await p.screenshot({ path: `${out}/queue-desktop.png`, fullPage: true });
  await p.getByRole('button', { name: 'First workbook.xlsx · Scanned', exact: true }).click(); await dialog(p).waitFor();
  const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download', exact: true }).click()]);
  check('Queue download uses the real original filename', download.suggestedFilename() === 'First workbook.xlsx');
  await p.getByRole('button', { name: 'Open in JSON', exact: true }).click();
  await p.getByRole('heading', { name: 'JSON formation', exact: true }).waitFor();
  check('Queue reopens original into the same real Excel/JSON worker', await p.locator('.cr-map-table tbody tr').count() === 40 && (await list()).length === 2);
  await p.locator('.ui-as-side__nav').getByRole('button', { name: /^Excel formation/ }).click();
  await p.getByText('Workbook opened', { exact: true }).waitFor();
  check('Moving back to Excel keeps the Queue workbook and preview', (await p.locator('.cl-file').innerText()).includes('First workbook.xlsx'));
  await goQueue(p);

  const reload = await open(await context(), 'queue');
  await reload.locator('.queue-row').nth(1).waitFor();
  check('Upload history survives a new browser session', await reload.locator('.queue-row').count() === 2);
  const other = await open(await context({}, `${workspace}-other`), 'queue');
  check('Another workspace cannot see this history', await other.locator('.queue-row').count() === 0);
  await p.getByRole('button', { name: 'First workbook.xlsx · Scanned', exact: true }).click(); await dialog(p).waitFor(); await p.waitForTimeout(400);
  await ask(p);
  const confirm = dialog(p).locator('.cm__confirm');
  await holdOn(p, confirm, 380); await p.waitForTimeout(900);
  check('Early release rewinds and never deletes a file', (await list()).some(e => e.id === first.id));
  await confirm.focus(); await p.keyboard.down('Space'); await p.waitForTimeout(300); await p.keyboard.press('Shift+Tab'); await p.keyboard.up('Space'); await p.waitForTimeout(900);
  check('Moving focus away cancels a keyboard hold', (await list()).some(e => e.id === first.id));
  const r = await confirm.boundingBox(); await p.mouse.move(r.x + 10, r.y + 10); await p.mouse.down(); await p.waitForTimeout(200); await p.mouse.move(r.x - 80, r.y - 80); await p.waitForTimeout(1500); await p.mouse.up();
  check('Dragging off the button cancels a pointer hold and does not close the pop-up', (await list()).some(e => e.id === first.id) && await dialog(p).evaluate(n => n.dataset.state === 'open'));

  await p.route(`**/collateral-queue/${first.id}`, async route => { if (route.request().method() === 'DELETE') await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Synthetic delete failure' } }) }); else await route.continue(); });
  await ask(p); await holdOn(p, dialog(p).locator('.cm__confirm'), 1400); await p.waitForTimeout(500);
  check('A rejected delete keeps the row and offers Retry', (await list()).some(e => e.id === first.id) && await dialog(p).getByRole('button', { name: 'Retry' }).isVisible());
  await p.unroute(`**/collateral-queue/${first.id}`);
  await p.route(`**/collateral-queue/${first.id}`, async route => { if (route.request().method() === 'DELETE') await new Promise(resolve => setTimeout(resolve, 700)); await route.continue(); });
  await dialog(p).getByRole('button', { name: 'Retry' }).click(); await p.waitForTimeout(300);
  check('Retry runs the delete and waits for the server before showing Deleted', await dialog(p).locator('.cm__face').getByText('Deleting', { exact: true }).isVisible() && (await list()).some(e => e.id === first.id));
  await dialog(p).getByRole('button', { name: 'Undo' }).waitFor();
  await p.unroute(`**/collateral-queue/${first.id}`);
  await p.screenshot({ path: `${out}/queue-popup-deleted.png` });
  check('Deleted shows Undo in the pop-up and the row has left the list', await p.locator('.queue-row').count() === 1 && await dialog(p).locator('.queue-pop__live').evaluate(n => n.hasAttribute('inert')));
  check('The server no longer lists the file during the undo window', !(await list()).some(e => e.id === first.id));
  await dialog(p).getByRole('button', { name: 'Undo' }).click();
  await waitFor(async () => (await list()).some(e => e.id === first.id));
  await p.waitForTimeout(600);
  check('Undo restores the original, its record and its bytes', await p.locator('.queue-row').count() === 2 && (await fs.readFile(path.join(diskDir, 'original.xlsx'))).equals(original) && await dialog(p).isVisible());

  // delete again, close the pop-up inside the window: Undo stays in a bar under the header
  await ask(p); await holdOn(p, dialog(p).locator('.cm__confirm'), 1400);
  await dialog(p).getByRole('button', { name: 'Undo' }).waitFor();
  await p.getByRole('button', { name: /^Close/ }).click(); await dialog(p).waitFor({ state: 'hidden' });
  check('Closing the pop-up early keeps Undo in a bar', await p.locator('.queue-undo').isVisible());
  await p.locator('.queue-undo').getByRole('button', { name: 'Undo' }).click();
  await waitFor(async () => (await list()).some(e => e.id === first.id)); await p.waitForTimeout(500);
  check('Undo from the bar restores it', await p.locator('.queue-row').count() === 2 && await p.locator('.queue-undo').count() === 0);

  // delete for good: after the 8 second window the files are gone
  await p.getByRole('button', { name: 'First workbook.xlsx · Scanned', exact: true }).click(); await dialog(p).waitFor(); await p.waitForTimeout(400);
  await ask(p); await holdOn(p, dialog(p).locator('.cm__confirm'), 1400);
  await dialog(p).getByRole('button', { name: 'Undo' }).waitFor();
  await dialog(p).waitFor({ state: 'hidden', timeout: 15000 });
  await waitFor(async () => !(await fs.stat(diskDir).catch(() => null)));
  check('After the undo window the pop-up closes by itself and original and record are deleted on disk', !(await list()).some(e => e.id === first.id) && await p.locator('.queue-row').count() === 1 && await p.locator('.queue-undo').count() === 0);
  await reload.getByRole('button', { name: 'Refresh', exact: true }).click(); await reload.waitForTimeout(500);
  check('Deletion appears in another session', await reload.locator('.queue-row').count() === 1);

  // Save failure must leave the real workbook usable and expose a concrete retry.
  await p.locator('.ui-as-side__nav').getByRole('button', { name: /^Excel formation/ }).click();
  await p.route('**/collateral-queue', async route => { if (route.request().method() === 'POST') await route.fulfill({ status: 507, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Synthetic disk full' } }) }); else await route.continue(); });
  await p.locator('input[type=file]').setInputFiles(payload('Retry save.xlsx')); await p.getByText('Workbook opened', { exact: true }).waitFor();
  check('Disk save failure is explicit while browser analysis stays usable', (await p.locator('.cr-archive').innerText()).includes('has not been saved') && await p.getByRole('tab').count() === 4 && (await list()).length === 1);
  await p.unroute('**/collateral-queue'); await p.locator('.cr-archive').getByRole('button', { name: 'Retry', exact: true }).click();
  await waitFor(async () => (await list()).length === 2 && (await list()).every(e => e.status === 'ready'));
  check('Retry saves the retained original once with real processing status', (await list()).some(e => e.name === 'Retry save.xlsx' && e.status === 'ready'));
  await p.locator('input[type=file]').setInputFiles({ name: 'Corrupt.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('corrupt workbook') });
  await p.locator('.import-unfurl__error').waitFor(); await waitFor(async () => (await list()).some(e => e.name === 'Corrupt.xlsx' && e.status === 'failed'));
  check('Corrupt XLSX remains in upload history with actual parse failure and hidden steps', await p.getByRole('tab').count() === 0);
  await goQueue(p); await p.getByRole('button', { name: 'Corrupt.xlsx · Could not scan', exact: true }).click(); await p.waitForTimeout(500);
  check('Failed upload shows its real error; JSON entry is disabled', await p.locator('.queue-pop__facts dd[data-problem]').isVisible() && await p.getByRole('button', { name: 'Open in JSON', exact: true }).isDisabled());
  await p.keyboard.press('Escape'); await dialog(p).waitFor({ state: 'hidden' });

  for (const width of [320, 390, 768, 1920]) {
    await p.setViewportSize({ width, height: width < 600 ? 844 : 1000 }); await p.waitForTimeout(900);
    check(`Queue fits ${width}px without horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width === 390) await p.screenshot({ path: `${out}/queue-mobile.png`, fullPage: true });
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole('button', { name: 'Corrupt.xlsx · Could not scan', exact: true }).click(); await dialog(p).waitFor(); await p.waitForTimeout(500);
  const phone = await dialog(p).evaluate(n => { const r = n.getBoundingClientRect(); return { left: r.left, right: innerWidth - r.right, fits: r.bottom <= innerHeight && r.top >= 0 }; });
  check('Pop-up keeps a 16px gutter and fits on a 390px phone', phone.left >= 15 && phone.right >= 15 && phone.fits);
  await p.screenshot({ path: `${out}/queue-popup-mobile.png` });
  await p.keyboard.press('Escape'); await dialog(p).waitFor({ state: 'hidden' });
  const reduced = await open(await context({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }), 'queue');
  await reduced.locator('.queue-row').first().waitFor();
  await reduced.locator('.queue-row__button').first().click(); await reduced.getByRole('dialog').waitFor();
  await reduced.waitForTimeout(500);
  const calm = await reduced.getByRole('dialog').evaluate(n => ({ transform: n.querySelector('.queue-pop__surface').style.transform, duration: getComputedStyle(n.querySelector('.queue-pop__details')).animationDuration, clip: n.querySelector('.queue-pop__content').style.clipPath }));
  check('Reduced motion drops the morph and keeps a short fade', calm.transform === '' && calm.clip === '' && parseFloat(calm.duration) <= .12);
  await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(600);
  await p.evaluate(() => { document.querySelector('.ui-as').classList.add('dark'); document.querySelector('.ui-as').setAttribute('data-theme', 'dark'); });
  await p.screenshot({ path: `${out}/queue-dark.png`, fullPage: true });
  check('No outside requests or browser exceptions occurred', foreign.length === 0 && errors.length === 0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed: results.length, results, errors, foreign }, null, 2));
  console.log(`${results.length} queue workflow checks passed.`);
} finally {
  await browser.close();
  for (const entry of await list()) await fetch(`${api}/${entry.id}`, { method: 'DELETE' });
}
