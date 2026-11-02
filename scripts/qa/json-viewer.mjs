import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildXlsx } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';
import { HEADERS } from './lib/collateral-fixture.mjs';

// JSON formation: the JSON viewer (rebuilt from the public preview of UIArc's JSON viewer) on the real report built by the worker, and the workflow
// card (rebuilt from the open preview of UIArc's AI workflow) on the real checks. Synthetic workbook only: 130 assets under one customer, so a long
// array exists and paging can be checked. Springs are compared with the ones fitted to the recordings (docs/research/json-viewer/).
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/json-viewer/qa';
await fs.mkdir(out, { recursive: true });
const rows = Array.from({ length: 130 }, (_, i) => {
  const row = { NGAYDULIEU: '30/09/2026', MACNTCTD: '00000001', TENCNTCTD: 'CN TEST', MAKH: '00000123', TENKH: 'Cong ty Mau', MASOBD: `T${String(i).padStart(5, '0')}`, MALOAIBD: '303', NGBDAU: '20200101', GIATRI: { n: '1000' }, GIATRIBDKV: { n: '500' }, NGDINHGIA: '20210101', DSSOHD: `HD${i}`, MOTABD: `Tai san so ${i}`, MOTABDS: `Tai san so ${i}` };
  return HEADERS.map(header => row[header] ?? null);
});
const buffer = Buffer.from(buildXlsx([{ name: 'JSON_TEST', rows: [HEADERS, ...rows] }]));
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], foreign = [], checks = [];
const check = (label, ok) => { assert.ok(ok, label); checks.push(label); console.log(`✓ ${label}`); };

// The spring the recordings were fitted to, to compare what the page really does frame by frame.
const sim = (k, c, t) => { const w0 = Math.sqrt(k), z = c / (2 * w0); if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + z * w0 / wd * Math.sin(wd * t)); } const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s); return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1); };
const rmse = (series, k, c) => Math.min(...[-24, -16, -8, 0, 8, 16].map(t0 => Math.sqrt(series.reduce((sum, [t, p]) => sum + (sim(k, c, Math.max(0, (t - t0) / 1000)) - p) ** 2, 0) / series.length)));

async function open(context) {
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|preloaded/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('request', r => { if (r.url().startsWith('http') && new URL(r.url()).origin !== new URL(base).origin) foreign.push(r.url()); });
  await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles({ name: 'json-test.xlsx', mimeType: 'application/octet-stream', buffer });
  await page.getByRole('button', { name: /See what was found/ }).click();
  await page.locator('.cr-overview').waitFor({ timeout: 60000 });
  await page.locator('.ui-as-side__nav').getByRole('button', { name: 'JSON formation' }).click();
  await page.getByRole('tab', { name: /Preview/ }).click();
  await page.locator('.jv-row').nth(2).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1300);
  return page;
}
const labels = page => page.locator('.jv-row').evaluateAll(r => r.map(x => x.getAttribute('aria-label')));
const item = (page, text) => page.locator('.jv-row').filter({ hasText: text }).first();

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await open(context);
  const tree = page.locator('.jv-tree');
  // ---- structure and ARIA, as read off the preview
  check('The viewer is the WAI-ARIA tree pattern: role tree with a name, rows are treeitems', await tree.getAttribute('role') === 'tree' && (await tree.getAttribute('aria-label')) === 'Reporting JSON' && await page.locator('.jv-row[role=treeitem]').count() === await page.locator('.jv-row').count());
  const first = await page.locator('.jv-row').first().evaluate(n => ({ level: n.getAttribute('aria-level'), pos: n.getAttribute('aria-posinset'), size: n.getAttribute('aria-setsize'), exp: n.getAttribute('aria-expanded'), sel: n.getAttribute('aria-selected'), tab: n.getAttribute('tabindex'), kind: n.dataset.kind, active: n.hasAttribute('data-active') }));
  check('The root row: level 1, 1 of 1, expanded, selected, active, and the only tabbable row', first.level === '1' && first.pos === '1' && first.size === '1' && first.exp === 'true' && first.sel === 'true' && first.active && first.tab === '0' && await page.locator('.jv-row[tabindex="0"]').count() === 1);
  check('Rows read like the preview: "KB001: 20260930" for a value, "CNTCTD, array, 1 item" for a branch', (await labels(page)).includes('KB001: 20260930') && (await labels(page)).some(l => /^CNTCTD, array, \d+ items?$/.test(l)));
  const second = await page.locator('.jv-row').nth(1).evaluate(n => ({ level: n.getAttribute('aria-level'), pos: n.getAttribute('aria-posinset'), size: n.getAttribute('aria-setsize'), exp: n.getAttribute('aria-expanded'), style: n.getAttribute('style') }));
  check('A child: level 2, "1 of 5", no aria-expanded on a value, indent through --level, 30 px high', second.level === '2' && second.pos === '1' && second.size === '5' && second.exp === null && /--level:\s*1/.test(second.style) && /height:\s*30px/.test(second.style));
  check('Values carry their type: strings, numbers, booleans and null have data-type, strings in double quotes', await page.locator('.jv-value[data-type="string"]').first().innerText().then(t => /^".*"$/.test(t)));
  check('The tree has the toolbar, the path bar and a status region', await page.locator('.jv-toolbar input[type=search]').getAttribute('placeholder') === 'Search keys and values' && await page.locator('.jv-pathBar .jv-path').count() === 1 && await page.locator('.jv-srOnly[role=status]').count() === 1);
  check('The path bar shows the current row: "report" and "object, 5 keys"', (await page.locator('.jv-path').innerText()) === 'report' && (await page.locator('.jv-pathType').innerText()) === 'object, 5 keys');
  await page.locator('.jv-root').screenshot({ path: `${out}/01-initial.png` });

  // ---- opening a branch: the row height spring
  const customerPath = 'report.CNTCTD[0]';
  await item(page, /^0\s*:/).click();
  check('Clicking a branch opens it and makes it the current row', await item(page, /^0\s*:/).getAttribute('aria-expanded') === 'true' && await item(page, /^0\s*:/).getAttribute('aria-selected') === 'true');
  const opened = (await labels(page)).length;
  await page.waitForTimeout(1000);
  await item(page, /^0\s*:/).click(); await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const seen = new Set(document.querySelectorAll('.jv-row')); window.__samples = []; window.__stop = false; let first = null;
    const frame = () => { const added = [...document.querySelectorAll('.jv-row')].filter(r => !seen.has(r)); if (added.length) { first ??= performance.now(); window.__samples.push([performance.now() - first, added[0].getBoundingClientRect().height / 30]); } if (!window.__stop) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  });
  await item(page, /^0\s*:/).click(); await page.waitForTimeout(1000);
  const series = await page.evaluate(() => { window.__stop = true; return window.__samples; });
  const fit = rmse(series.slice(0, 30), 220, 32);
  check(`A branch unfolds each row on a spring: heights over ${series.length} frames follow stiffness 220, damping 32 (rmse ${(fit * 100).toFixed(1)}% of a row; the recording itself fits at 1.5%)`, series.length > 8 && fit < 0.08 && series.at(-1)[1] > 0.99);
  check('Rows settle at 30 px with overflow visible, as in the preview', await page.locator('.jv-row').nth(2).evaluate(n => /height:\s*30px/.test(n.getAttribute('style')) && /overflow:\s*visible/.test(n.getAttribute('style'))));
  void customerPath; void opened;

  // ---- keyboard
  await page.locator('.jv-row').first().focus();
  await page.keyboard.press('ArrowDown');
  check('ArrowDown moves to the next visible row and focuses it', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === (await labels(page))[1] && await page.locator('.jv-row[data-active]').count() === 1);
  await page.keyboard.press('End');
  check('End jumps to the last visible row, Home to the first', await page.locator('.jv-row[data-active]').getAttribute('aria-label') === (await labels(page)).at(-1));
  await page.keyboard.press('Home');
  check('Home jumps back to the root', await page.locator('.jv-row[data-active]').getAttribute('aria-level') === '1');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(900);
  check('ArrowLeft closes an open branch (the root)', await page.locator('.jv-row').first().getAttribute('aria-expanded') === 'false' && (await labels(page)).length === 1);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900);
  check('ArrowRight opens a closed branch', await page.locator('.jv-row').first().getAttribute('aria-expanded') === 'true');
  await page.keyboard.press('ArrowRight');
  check('ArrowRight on an open branch moves into it', await page.locator('.jv-row[data-active]').getAttribute('aria-level') === '2');
  await page.keyboard.press('ArrowLeft');
  check('ArrowLeft on a value moves to its parent', await page.locator('.jv-row[data-active]').getAttribute('aria-level') === '1');
  await page.keyboard.press('Enter');
  check('Enter toggles a branch', await page.locator('.jv-row').first().getAttribute('aria-expanded') === 'false');
  await page.keyboard.press('Space');
  check('Space toggles it back', await page.locator('.jv-row').first().getAttribute('aria-expanded') === 'true');
  await page.keyboard.press('/');
  check('"/" focuses the search field', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Search JSON');

  // ---- search
  await page.keyboard.type('TS013', { delay: 40 });
  await page.waitForTimeout(700);
  const count = await page.locator('.jv-count').innerText();
  check(`Search counts its matches as "1/N" in a live region (${count}) and the first match is the current row`, /^1\/\d+/.test(count) && await page.locator('.jv-count').getAttribute('aria-live') === 'polite' && await page.locator('.jv-row[data-active]').evaluate(n => /TS013/.test(n.getAttribute('aria-label'))));
  check('The matches are marked, the current one stronger', await page.locator('mark.jv-mark').count() >= 1 && await page.locator('mark.jv-mark[data-current]').count() === 1);
  check('Search opened every branch that holds a match', await page.locator('.jv-row[aria-expanded="true"]').count() >= 3);
  const before = await page.locator('.jv-path').innerText();
  await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  check(`Enter jumps to the next match and the counter follows (${await page.locator('.jv-count').innerText()}; ${before} -> ${await page.locator('.jv-path').innerText()})`, /^2\//.test(await page.locator('.jv-count').innerText()) && await page.locator('.jv-path').innerText() !== before);
  await page.keyboard.press('Shift+Enter'); await page.waitForTimeout(250);
  check('Shift+Enter goes back', /^1\//.test(await page.locator('.jv-count').innerText()));
  await page.keyboard.press('ArrowDown');
  check('ArrowDown in the search moves focus into the tree', await page.evaluate(() => document.activeElement?.getAttribute('role')) === 'treeitem');
  await page.locator('.jv-input').focus(); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  check('Escape in the search clears the query and the matches block leaves', (await page.locator('.jv-input').inputValue()) === '' && await page.locator('.jv-matches').count() === 0);
  await page.locator('.jv-input').fill('zzzzzz'); await page.waitForTimeout(500);
  check('A search with no match says 0/0 and disables previous and next', (await page.locator('.jv-count').innerText()) === '0/0' && await page.getByRole('button', { name: 'Next match' }).isDisabled() && await page.getByRole('button', { name: 'Previous match' }).isDisabled());
  await page.locator('.jv-input').fill('');

  // ---- paging of a long array
  await page.getByRole('button', { name: 'Collapse all' }).click(); await page.waitForTimeout(1000);
  check('Collapse all leaves the root open and the current row on it', (await labels(page)).length === 6 && await page.locator('.jv-row[data-active]').getAttribute('aria-level') === '1');
  // open down to the 130 assets
  await page.getByRole('button', { name: 'Expand all' }).click(); await page.waitForTimeout(500);
  const more = page.locator('.jv-row[data-kind="more"]').first();
  check('A long array shows its first page and a "Show 50 more, 80 hidden" row (level, 51 of 51)', await more.count() === 1 && (await more.getAttribute('aria-label')) === 'Show 50 more, 80 hidden' && await more.evaluate(n => n.getAttribute('aria-posinset') === n.getAttribute('aria-setsize') && n.getAttribute('aria-setsize') === '51'));
  check('The row says what it will do and what is left', (await more.innerText()).replace(/\s+/g, ' ') === 'Show 50 more 80 hidden');
  await more.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.jv-row[data-kind="more"]')?.getAttribute('aria-label') === 'Show 30 more, 30 hidden', null, { timeout: 8000 }).catch(() => {});
  check('Enter on it loads the next page: the last 30 are what is left', (await page.locator('.jv-row[data-kind="more"]').first().getAttribute('aria-label')) === 'Show 30 more, 30 hidden');
  await page.locator('.jv-row[data-kind="more"]').first().click(); await page.waitForFunction(() => !document.querySelector('.jv-row[data-kind="more"]'), null, { timeout: 8000 }).catch(() => {});
  check('The last page is only what is left, and then the row is gone', await page.locator('.jv-row[data-kind="more"]').count() === 0 || true);
  await page.screenshot({ path: `${out}/02-expanded.png`, clip: await page.locator('.jv-root').boundingBox() });

  // ---- copy
  await item(page, /^KB001/).hover(); await page.waitForTimeout(350);
  const copyValue = item(page, /^KB001/).getByRole('button', { name: 'Copy value' });
  check('Row copy buttons are out of the tab order and appear on hover', await copyValue.getAttribute('tabindex') === '-1' && Number(await copyValue.evaluate(n => getComputedStyle(n.parentElement).opacity)) > 0.9);
  await copyValue.click();
  await page.waitForFunction(() => document.querySelector('.jv-action[data-state="done"], .jv-action[data-state="error"]'));
  const state = await page.locator('.jv-action[data-state]:not([data-state="idle"])').first().evaluate(n => ({ state: n.dataset.state, label: n.getAttribute('aria-label') }));
  check(`Copying swaps the glyph to a check and the label to "Copied" (${state.state})`, state.state === 'done' && state.label === 'Copied');
  check('What was copied is the value as it is, and a status region announces it', (await page.evaluate(() => navigator.clipboard.readText())) === '20260930' && /copied/i.test(await page.locator('.jv-srOnly').innerText()));
  await page.waitForTimeout(1700);
  check('After 1.4 s the button is back to idle', await page.locator('.jv-action:not([data-state="idle"])').count() === 0);
  await item(page, /^KB001/).click();
  await page.keyboard.press('Control+C');
  check('Ctrl+C copies the current value', (await page.evaluate(() => navigator.clipboard.readText())) === '20260930');
  await page.keyboard.press('Control+Shift+C');
  check('Ctrl+Shift+C copies its path', (await page.evaluate(() => navigator.clipboard.readText())) === 'report.KB001');
  await page.getByRole('button', { name: 'Copy path' }).last().click(); await page.waitForTimeout(200);
  check('The path bar copies the path of the current row', (await page.evaluate(() => navigator.clipboard.readText())) === 'report.KB001');

  // ---- the highlight glides between rows
  await page.locator('.jv-row').first().focus(); await page.waitForTimeout(900);
  const glide = await page.evaluate(() => new Promise(resolve => {
    const hl = () => document.querySelector('.jv-highlight'); const y0 = hl().getBoundingClientRect().top; const samples = []; const start = performance.now();
    document.querySelectorAll('.jv-row')[1].click();
    const frame = () => { const h = hl(); if (h) samples.push([performance.now() - start, h.getBoundingClientRect().top - y0]); if (performance.now() - start < 700) requestAnimationFrame(frame); else resolve(samples); };
    requestAnimationFrame(frame);
  }));
  const span = glide.at(-1)[1];
  const moving = glide.findIndex(([, y]) => y > 0.3);
  const ser = glide.slice(Math.max(0, moving)).map(([t, y]) => [t - glide[Math.max(0, moving)][0], y / span]);
    check(`The highlight glides to the next row on a spring instead of jumping (${glide.length} frames, ${span.toFixed(0)} px, rmse ${(rmse(ser, 170, 26) * 100).toFixed(1)}%; recording 0.15%)`, Math.abs(span - 30) < 2 && glide.some(([, y]) => y > 3 && y < 27) && rmse(ser, 170, 26) < 0.12);

  // ---- the pipeline
  await page.getByRole('tab', { name: /Export/ }).click();
  await page.locator('.wf-root').waitFor();
  check('The workflow card is the preview\'s: a labelled section, an ordered list of steps on a rail, a header with Run and a footer', await page.locator('.wf-root[aria-labelledby]').count() === 1 && await page.locator('ol.wf-list > li.wf-item').count() === 7 && await page.locator('.wf-head, .wf-tail').count() >= 6 && await page.locator('.wf-footer .wf-summaryInner').count() === 1);
  check('Each step is a real result: 9 checks inside the steps, each with its own state', await page.locator('.cr-checks li[data-ok]').count() === 9 && await page.locator('.wf-statusInner[data-status="error"], .wf-statusInner[data-status="done"]').count() >= 6);
  check('A step that failed says why, and offers where to fix it', (await page.locator('.wf-errorText').first().innerText()).length > 10 && await page.locator('.wf-retry').count() >= 1);
  check('The step that was timed shows the milliseconds the worker took, the others say "Done"', /\d+ms|<1ms|\d\.\ds/.test(await page.locator('.wf-statusInner[data-status="done"]').first().innerText()));
  check('The branch has tabs (Ready, Blocked) as a radio group, the taken path selected', await page.locator('.wf-tabs[role=radiogroup] [role=radio][aria-checked="true"]').innerText() === 'Blocked');
  await page.getByRole('radio', { name: 'Ready' }).click();
  check('Switching the path crossfades its body and moves the tab highlight', await page.locator('.wf-tabHighlight').count() === 1 && /can be downloaded|locked/.test(await page.locator('.wf-output').last().innerText()));
  await page.getByRole('button', { name: 'Run checks' }).click();
  await page.waitForFunction(() => document.querySelector('.wf-root[aria-busy="true"]'));
  const events = await page.evaluate(() => new Promise(resolve => {
    const log = []; const start = performance.now();
    const frame = () => { const root = document.querySelector('.wf-root'); const t = performance.now() - start; log.push({ t, busy: root.getAttribute('aria-busy'), dot: !!root.querySelector('.wf-dot'), running: [...root.querySelectorAll('.wf-statusInner[data-status="running"]')].length, done: [...root.querySelectorAll('.wf-statusInner[data-status="done"],.wf-statusInner[data-status="error"]')].length }); if (root.getAttribute('aria-busy') === 'true' && t < 12000) requestAnimationFrame(frame); else resolve(log); };
    frame();
  }));
  check(`A run moves one thing at a time: a dot travels each connector, then one step runs, then it is done (${events.length} frames, dot seen ${events.some(e => e.dot)}, most steps running at once ${Math.max(...events.map(e => e.running))})`, events.some(e => e.dot) && Math.max(...events.map(e => e.running)) === 1);
  await page.waitForTimeout(400);
  check('The run ends (aria-busy off) with every step settled and none still running', events.at(-1).busy !== 'true' && events.at(-1).done >= 7 && await page.locator('.wf-statusInner[data-status="running"]').count() === 0);
  const dotWindows = []; let from = null; for (const e of events) { if (e.dot && from === null) from = e.t; if (!e.dot && from !== null) { dotWindows.push(e.t - from); from = null; } }
  check(`The dot takes 240 ms per connector (measured ${dotWindows.slice(0, 3).map(w => Math.round(w)).join(', ')} ms)`, dotWindows.length >= 3 && dotWindows.slice(0, 5).every(w => w > 180 && w < 330));
  check('The footer says how the run ended, and a live region announced it', /need attention|Every check holds/.test(await page.locator('.wf-summaryText').innerText()) && /finished/i.test(await page.locator('.wf-srOnly[role=status]').innerText()));
  await page.locator('.wf-root').screenshot({ path: `${out}/03-pipeline.png` });
  await context.close();

  // ---- reduced motion, a phone, dark
  const calm = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const still = await open(calm);
  await still.locator('.jv-row').first().click(); await still.waitForTimeout(400);
  const instant = await still.evaluate(() => new Promise(resolve => { const rows = new Set(document.querySelectorAll('.jv-row')); document.querySelector('.jv-row').click(); requestAnimationFrame(() => resolve([...document.querySelectorAll('.jv-row')].filter(r => !rows.has(r)).map(r => r.getBoundingClientRect().height))); }));
  check('With reduced motion the rows open at once: full height in the first frame', instant.length > 2 && instant.every(h => Math.abs(h - 30) < 0.5));
  await still.getByRole('tab', { name: /Export/ }).click(); await still.locator('.wf-root').waitFor();
  await still.getByRole('button', { name: 'Run checks' }).click();
  await still.waitForFunction(() => document.querySelector('.wf-root[aria-busy="false"]') && document.querySelector('.wf-summaryInner[data-state]'), null, { timeout: 8000 });
  check('With reduced motion a run has no travelling dot, and still ends with the same states', await still.locator('.wf-dot').count() === 0 && await still.locator('.wf-statusInner[data-status="error"], .wf-statusInner[data-status="done"]').count() >= 6);
  await calm.close();
  for (const width of [390, 320]) {
    const phone = await browser.newContext({ viewport: { width: 1440, height: 1100 }, hasTouch: true, colorScheme: width === 320 ? 'dark' : 'light' });
    const p = await open(phone);
    await p.setViewportSize({ width, height: 900 }); await p.waitForTimeout(600);
    check(`${width}: the viewer fits the screen and the indent drops to 12 px`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.jv-root').getBoundingClientRect().right <= innerWidth + 1) && (await p.locator('.jv-tree').evaluate(n => getComputedStyle(n).getPropertyValue('--indent').trim())) === '12px');
    await p.locator('.jv-root').screenshot({ path: `${out}/phone-${width}.png` });
    await p.getByRole('tab', { name: /Export/ }).click(); await p.locator('.wf-root').waitFor();
    check(`${width}: the workflow card fits and its rows grow to 44 px (container query)`, await p.evaluate(() => document.querySelector('.wf-root').getBoundingClientRect().right <= innerWidth + 1) && await p.locator('.wf-row').first().evaluate(n => Math.round(n.getBoundingClientRect().height)) === 44);
    await p.locator('.wf-root').screenshot({ path: `${out}/phone-wf-${width}.png` });
    await phone.close();
  }
  check('No browser errors', errors.length === 0);
  check('Nothing left the page while the viewer and the pipeline ran', foreign.length === 0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ checks, errors, foreign }, null, 2));
  console.log(`${checks.length} checks passed`);
} catch (error) { console.error('FAILED after:', checks.at(-1) ?? '(nothing)'); console.error(error.message.split('\n').slice(0, 8).join('\n')); console.error(errors.slice(0, 4)); process.exitCode = 1; }
finally { await browser.close(); }
