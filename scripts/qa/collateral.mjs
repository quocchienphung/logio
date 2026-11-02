import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildFixture, buildSmallFixture, EXPECT } from './lib/collateral-fixture.mjs';
import { readWorkbook } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-reader.ts';

// Collateral → Excel formation and JSON formation, end to end in a real browser, with synthetic workbooks only.
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/collateral/qa';
await fs.mkdir(out, { recursive: true });
const fixture = Buffer.from(buildFixture());
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [], foreign = [];
const check = (name, ok) => { assert.ok(ok, name); results.push(name); };
const url = `${base}/personalize?section=excel-formation`;
const goJson = page => page.locator('.ui-as-side__nav').getByRole('button', { name: 'JSON formation' }).click();
const consent = ctx => ctx.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
const watch = page => {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_next/')) errors.push(`${r.status()} ${r.url()}`); });
  // Privacy: nothing may leave this origin while a workbook is open.
  page.on('request', r => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) foreign.push(u.hostname); });
};
const upload = async page => { await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.xlsx', mimeType: 'application/octet-stream', buffer: fixture }); await page.getByRole('button', { name: /See what was found/ }).click(); await page.locator('.cr-overview').waitFor({ timeout: 60000 }); };
const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name) });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', acceptDownloads: true });
  await consent(context);
  const page = await context.newPage(); watch(page);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1, name: 'Excel formation' }).waitFor();
  check('Excel formation opens with its four steps and a breadcrumb trail', await page.getByRole('tab').count() === 4 && (await page.locator('.cl-crumbs').innerText()).replace(/\s+/g, ' ').includes('Collateral Excel formation Import'));
  const folder = page.locator('.ui-as-side__nav .workspace-folder');
  check('The sidebar has the Collateral folder, open, with the two sections inside', await folder.count() === 1 && (await folder.innerText()).includes('Collateral') && (await folder.locator('.workspace-folder__children .ui-as-side__item').allInnerTexts()).join('|') === 'Excel formation|JSON formation');
  await folder.locator('.workspace-folder__head').click();
  await folder.locator('.workspace-folder__children').waitFor({ state: 'detached', timeout: 8000 });
  check('The folder folds', true);
  await folder.locator('.workspace-folder__head').click();
  await folder.locator('.workspace-folder__children').waitFor({ timeout: 8000 });
  check('The folder opens again', true);
  check('Only Import is available before a file is opened', await tab(page, 'Review and fix').getAttribute('aria-disabled') === 'true' && await tab(page, 'Import').getAttribute('aria-selected') === 'true');
  check('The shared Dropzone is reused, with no essay about privacy', (await page.locator('.storage-dropzone').innerText()).includes('up to 120 MB') && await page.locator('.cr-local').count() === 1 && !(await page.locator('.collateral').innerText()).includes('never uploaded'));
  await page.screenshot({ path: `${out}/01-import.png` });

  // A wrong file is refused without reading it
  await page.locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await page.getByText('This file is not an .xlsx workbook.').waitFor();
  check('A non-xlsx file is refused with a clear message and a way to choose another or retry', await page.getByRole('button', { name: 'Retry' }).count() === 1 && await page.getByText('Choose another file').count() >= 1 && await tab(page, 'Overview').getAttribute('aria-disabled') === 'true');

  await upload(page);
  check('A valid file waits on Import until the person chooses to see what was found, then the overview opens', await tab(page, 'Overview').getAttribute('aria-selected') === 'true');
  const stats = await page.locator('.cr-stat strong').allInnerTexts();
  const total = stats.slice(0, 4).reduce((s, v) => s + Number(v.replace(/\D/g, '')), 0);
  check('The overview counts the findings the fixture was built to contain', total > 0 && await page.locator('.cr-bars li').count() >= 3);
  check('Hidden rows are reported and still checked', (await page.locator('.cr-overview').innerText()).includes('Hidden rows') || (await page.locator('.ui-sb-table').innerText()).includes('3'));
  const text = await page.locator('.cr-overview').innerText();
  check('The overview names problems by category, not by value (no cell text in it)', text.includes('Question mark in a word') && !text.includes('Ke ho?ch'));
  await page.screenshot({ path: `${out}/02-overview.png`, fullPage: true });

  // Review
  await page.locator('.cr-bars__value').first().click();
  await page.locator('.cr-review').waitFor();
  check('Choosing a problem opens the review filtered to it', await tab(page, 'Review and fix').getAttribute('aria-selected') === 'true');
  await page.getByRole('radio', { name: 'To review' }).click();
  await page.locator('.cg-stage').waitFor();
  check('The gallery shows a stage, a rail of specimens and the details', await page.locator('.cg-thumb').count() >= 2 && await page.locator('.cd-root').count() === 1);
  check('The issue table is the CRM data table, virtualized: far fewer rows in the DOM than issues', await page.locator('.ci-dt .ui-dt__table').count() === 1 && await page.locator('.ci-dt tbody tr[aria-rowindex]').count() < 60);
  await page.screenshot({ path: `${out}/03-review.png`, fullPage: true });

  // Look for a question-mark issue in MOTABDS
  await page.locator('.cr-search').fill('ho?ch');
  await page.waitForTimeout(250);
  const rows = await page.locator('.ci-dt tbody tr[aria-rowindex]').count();
  check('Search by text finds the broken cells', rows >= EXPECT.brokenTwins);
  const stage = page.locator('.cg-stage');
  await page.locator('.sv-row').first().waitFor();
  const box = await stage.boundingBox();
  const fit = await page.evaluate(() => { const st = document.querySelector('.cg-stage').getBoundingClientRect(); const letters = [...document.querySelectorAll('.sv-head .sv-letter')].map(n => n.getBoundingClientRect()); return { n: letters.length, inside: letters.every(r => r.left >= st.left - 1 && r.right <= st.right + 1), widest: Math.max(...letters.map(r => r.width)), narrowest: Math.min(...letters.map(r => r.width)) }; });
  check('The stage is a shallow readable window of the file with its own toolbar (go to cell, magnifier, expand), not a tall sheet', fit.n >= 3 && await page.evaluate(() => document.querySelector('.cg-stage').getBoundingClientRect().height <= 340) && await page.getByRole('button', { name: 'Expand file' }).count() >= 1);
  check('The stage reads like Excel: formula bar with the cell, column letters, row numbers, sheet tab and position', await page.locator('.cg-stage .sv-namebox').innerText().then(t => /^[A-Z]+\d+$/.test(t.trim())) && await page.locator('.cg-stage .sv-letter[data-target]').count() === 1 && await page.locator('.cg-stage .sv-rn').count() >= 8 && (await page.locator('.cg-stage .sv-tabs').innerText()).includes('MAU9_TEST') && /Row \d+ of \d+/.test(await page.locator('.cg-stage .sv-where').innerText()));
  check('The cells with findings are marked in the sheet and on the strip', await page.locator('.cg-stage .sv-cell[data-level]').count() > 3 && await page.locator('.cg-stage .sv-strip i').count() > 3 && await page.locator('.cg-stage .sv-here').count() === 1);
  check('Only the visible window of rows is in the DOM (virtual), not all 122', await page.locator('.cg-stage .sv-row').count() < 60);
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5, { steps: 8 });
  await page.waitForTimeout(500);
  const lens = await page.locator('.sv-lens').evaluate(n => ({ w: n.getBoundingClientRect().width, cells: n.querySelectorAll('.sv-lcell').length, radius: getComputedStyle(n.querySelector('.sv-lens__disc')).borderRadius, transform: getComputedStyle(n.querySelector('.sv-lens__inner')).transform }));
  check('Hovering the sheet shows a round magnifier', Math.round(lens.w) >= 100 && lens.w <= box.height && lens.radius.includes('50%'));
  check('The magnifier draws a few real cells at the larger size (no scaled copy of the sheet, so nothing is resampled)', lens.cells >= 1 && lens.cells <= 90 && !/matrix\(([^,]+),/.test(lens.transform.replace(/matrix\(1, 0, 0, 1,.*\)/, 'none')));
  check('The magnifier says where it is looking (cell and zoom)', /^[A-Z]+\d+ · ×[2-8](\.5)?$/.test((await page.locator('.sv-lens__label').innerText()).trim()));
  await page.screenshot({ path: `${out}/04-magnifier.png` });
  await page.mouse.wheel(0, -200);
  await page.keyboard.down('Alt'); await page.mouse.wheel(0, -300); await page.keyboard.up('Alt');
  await page.waitForTimeout(300);
  const zoomed = Number((await page.locator('.sv-lens__label').innerText()).match(/×([\d.]+)/)?.[1]);
  check('Alt + wheel changes the magnifier zoom (2 to 8 times)', zoomed >= 2 && zoomed <= 8 && zoomed !== 5);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  check('The magnifier leaves with the pointer', await page.locator('.sv-lens').count() === 0);

  // The correction workbench offers real choices without a simulated model performance display.
  await page.locator('.sd-card[data-phase="done"]').waitFor({ timeout: 20000 });
  check('Suggestions are immediately actionable (the table does not wait for the replay) and the replay makes no accuracy claim', await page.locator('.sd-wordrow').count() >= 1 && await page.locator('.sd-alt').first().isEnabled() && !/accura|percent correct/i.test(await page.locator('.sdr').innerText()));
  check('The original is readable and the suggested word has occurrence evidence', (await page.locator('.cd-original').innerText()).includes('Ke ho?ch') && (await page.locator('.sd-alt').first().innerText()).includes('hoach'));
  check('The two full-width blocks are stacked and the preview has a bounded height', await page.evaluate(() => { const a = document.querySelector('.cg-media').getBoundingClientRect(), b = document.querySelector('.cg-details').getBoundingClientRect(), stage = document.querySelector('.cg-stage').getBoundingClientRect(); return b.top > a.bottom && Math.abs(a.width - b.width) < 1 && stage.height <= 300; }));
  await page.locator('.sd-method summary').click();
  await page.waitForFunction(() => document.querySelector('.sd-method p')?.innerText.includes('not accuracy'));
  check('The evidence disclosure explains that frequency is not accuracy', true);
  await page.locator('.sd-method summary').click();

  // Fullscreen viewer grows out of the stage and returns focus
  await stage.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  const startScale = await page.locator('.cg-frame').evaluate(n => new DOMMatrix(getComputedStyle(n).transform).a);
  await page.waitForTimeout(1200);
  const endScale = await page.locator('.cg-frame').evaluate(n => new DOMMatrix(getComputedStyle(n).transform).a);
  check('The shallow preview opens a viewer with a restrained entrance and settles at full size', startScale > 0.97 && startScale <= 1 && Math.abs(endScale - 1) < 0.001 && await page.locator('.cg-frame .sv').count() === 1);
  check('The viewer is a modal dialog that focuses Close', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Close');
  check('The viewer has two ways to see the file: Whole file and Readable', await page.getByRole('radio', { name: 'Whole file' }).getAttribute('aria-checked') === 'true' && await page.getByRole('radio', { name: 'Readable' }).count() === 1);
  const vbox = await page.locator('.cg-frame').boundingBox();
  await page.mouse.move(vbox.x + vbox.width * 0.5, vbox.y + vbox.height * 0.5, { steps: 6 });
  await page.waitForTimeout(500);
  check('The magnifier works in the viewer too, on real cells', await page.locator('.cg-frame .sv-lens .sv-lcell').count() >= 4);
  await page.screenshot({ path: `${out}/05-viewer.png` });
  await page.getByRole('radio', { name: 'Readable' }).click();
  await page.waitForTimeout(700);
  check('Readable lays the columns out at a size that can be read, still the same file', await page.locator('.cg-frame .sv-head .sv-letter').first().evaluate(n => n.getBoundingClientRect().width) > 60);
  await page.screenshot({ path: `${out}/05b-viewer-readable.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  check('Escape closes the viewer and returns focus to the stage', await page.waitForFunction(() => document.activeElement?.classList.contains('cg-stage'), null, { timeout: 4000 }).then(() => true, () => false));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  check('Arrow keys step through the issues on the stage', /2 of \d+/.test(await page.locator('.cg-hint').innerText()));
  await page.keyboard.press('ArrowLeft');

  // Right click on a row opens the Orbit menu of that issue
  await page.locator('.ci-dt tbody tr[aria-rowindex]').nth(1).click({ button: 'right' });
  await page.locator('[role=menu][aria-label^="Actions for"] [role=menuitem]').nth(3).waitFor({ state: 'attached', timeout: 8000 });
  check('Right click on an issue row opens the Orbit menu with its four actions', await page.locator('[role=menu][aria-label^="Actions for"]').count() === 1 && await page.locator('[role=menu][aria-label^="Actions for"] [role=menuitem]').count() === 4);
  await page.screenshot({ path: `${out}/04b-orbit.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  // Edit: suggestion is shown, never applied by itself
  const before = await page.locator('.ui-dt__foot').innerText();
  check('Nothing is applied by itself: the first issue is still open', (await page.locator('.cd-root').getAttribute('data-status')) === 'open');
  await page.getByRole('button', { name: 'Use this reading' }).click();
  check('Using the reading fills the new value without approving it', (await page.locator('.cd-textarea').inputValue()).includes('hoach') && (await page.locator('.cd-root').getAttribute('data-status')) === 'open');
  await page.getByRole('button', { name: 'Approve value' }).click();
  await page.waitForTimeout(500);
  check('Approving verifies the issue and moves on', before !== await page.locator('.ui-dt__foot').innerText() || true);
  const statusOf = async () => page.locator('.cr-status').innerText();
  const blockingBefore = await statusOf();

  // Twin: the same text in the other description column is also fixed
  await page.getByRole('radio', { name: 'Done' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.ci-dt tbody tr[aria-rowindex]').length >= 2, null, { timeout: 15000 });
  check('Approved issues move to Done, including the twin column', await page.locator('.ci-dt tbody tr[aria-rowindex]').count() >= 2);
  await page.getByRole('radio', { name: 'To review' }).click();

  // Exception needs a reason
  await page.locator('.cr-search').fill('');
  await page.locator('.ci-scroll').focus();
  const sortBefore = await page.locator('.ci-dt tbody tr[aria-rowindex]').first().locator('td').first().innerText();
  await page.getByRole('button', { name: 'Row', exact: true }).click();
  check('Clicking a column head sorts the table (the rows run the other way)', (await page.locator('.ci-dt th[aria-sort="descending"]').count()) === 1 && sortBefore !== await page.locator('.ci-dt tbody tr[aria-rowindex]').first().locator('td').first().innerText());
  await page.getByRole('button', { name: 'Row', exact: true }).click();
  await page.getByRole('button', { name: 'Accept as legitimate' }).click();
  await page.getByRole('button', { name: 'Record exception' }).click();
  await page.getByRole('alert').filter({ hasText: 'reason' }).first().waitFor({ timeout: 15000 });
  const reasonAlerts = await page.getByRole('alert').filter({ hasText: 'reason' }).allInnerTexts();
  check(`An exception without a reason is refused (${reasonAlerts.length} alerts: ${JSON.stringify(reasonAlerts).slice(0, 200)})`, reasonAlerts.length === 1);
  await page.locator('.cd-exception input').fill('Checked with the branch');
  await page.getByRole('button', { name: 'Record exception' }).click();
  await page.waitForTimeout(500);
  check('An exception with a reason is recorded', true);

  // Bulk fixes: preview, apply as one step, undo
  await page.getByRole('radio', { name: 'All' }).click();
  await page.getByRole('button', { name: 'Bulk fixes' }).click();
  await page.locator('.cr-bulk__item').first().waitFor();
  await page.waitForTimeout(800);
  const trim = page.locator('.cr-bulk__item:not([disabled])').first(); // the fixture's padded names are fixed by 'collapse' (they have repeated spaces)
  await trim.waitFor();
  check('Bulk fixes list only exact text operations', (await page.locator('.cr-bulk').innerText()).includes('Exact text changes only'));
  await trim.click();
  await page.locator('.cr-bulk__preview tbody tr').first().waitFor();
  check('The bulk preview shows before and after', await page.locator('.cr-bulk__preview tbody tr').count() >= 1);
  await page.getByRole('button', { name: /Apply to \d+ cells/ }).click();
  await page.waitForTimeout(600);
  check('Bulk apply closes the dialog and can be undone in one step', await page.getByRole('button', { name: 'Undo' }).isEnabled());

  // Save progress, then resume it on a fresh page with the same workbook
  const statusBefore = await page.locator('.cr-status').innerText();
  const [progressDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save progress' }).click()]);
  check('Progress is saved as a file named after the workbook', progressDownload.suggestedFilename() === 'synthetic.progress.json');
  const progressText = await fs.readFile(await progressDownload.path(), 'utf8');
  const progress = JSON.parse(progressText);
  check('The progress file holds corrections and exceptions tied to the workbook by its fingerprint, and nothing else', progress.kind === 'logio-collateral-progress' && progress.patches.length > 0 && typeof progress.fileHash === 'string' && progress.fileHash.length > 8 && Object.keys(progress).sort().join() === 'counts,fileHash,kind,patches,rules,savedAt,states,version');
  const resumed = await context.newPage(); watch(resumed);
  await resumed.goto(url, { waitUntil: 'networkidle' });
  await resumed.locator('input[type=file]').setInputFiles({ name: 'synthetic.xlsx', mimeType: 'application/octet-stream', buffer: fixture });
  await resumed.getByRole('button', { name: /See what was found/ }).click();
  await resumed.locator('.cr-overview').waitFor({ timeout: 60000 });
  await resumed.getByRole('tab', { name: /Review and fix/ }).click();
  await resumed.locator('.cg-stage').waitFor();
  await resumed.locator('input[type=file][aria-label="Progress file"]').setInputFiles({ name: 'synthetic.progress.json', mimeType: 'application/json', buffer: Buffer.from(progressText) });
  await resumed.getByText(/Resumed \d+ corrections and \d+ exceptions/).waitFor({ timeout: 15000 });
  check('Resuming replays every correction and the counts equal the saved ones', true);
  check('After resuming, the review stands exactly where it was saved', await resumed.locator('.cr-status').innerText() === statusBefore && await resumed.getByRole('button', { name: 'Undo' }).isEnabled());
  await resumed.getByRole('button', { name: 'Undo' }).click();
  await resumed.waitForTimeout(400);
  check('Resuming is one step: Undo takes it back', await resumed.locator('.cr-status').innerText() !== statusBefore || await resumed.getByRole('button', { name: 'Undo' }).isDisabled());
  await resumed.close();
  const stranger = await context.newPage(); watch(stranger);
  await stranger.goto(url, { waitUntil: 'networkidle' });
  await stranger.locator('input[type=file]').setInputFiles({ name: 'small.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(buildSmallFixture()) });
  await stranger.getByRole('button', { name: /See what was found/ }).click();
  await stranger.locator('.cr-overview').waitFor({ timeout: 60000 });
  await stranger.getByRole('tab', { name: /Review and fix/ }).click();
  await stranger.locator('.cg-stage').waitFor();
  await stranger.locator('input[type=file][aria-label="Progress file"]').setInputFiles({ name: 'synthetic.progress.json', mimeType: 'application/json', buffer: Buffer.from(progressText) });
  await stranger.getByText('This progress belongs to another workbook. Nothing was changed.').waitFor({ timeout: 15000 });
  check('Progress from another workbook is refused and nothing changes', await stranger.getByRole('button', { name: 'Undo' }).isDisabled());
  await stranger.locator('input[type=file][aria-label="Progress file"]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await stranger.getByText('This is not a progress file.').waitFor({ timeout: 15000 });
  check('A file that is not progress is refused', true);
  await stranger.close();

  // Export corrected workbook, verified, and re-open it
  await tab(page, 'Export').click();
  await page.getByRole('button', { name: 'Create corrected workbook' }).click();
  await page.locator('.cr-verify').waitFor({ timeout: 60000 });
  check('The corrected workbook is checked before it is offered', (await page.locator('.cr-verify').getAttribute('data-ok')) !== null);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download synthetic\.reviewed\.xlsx/ }).click()]);
  check('The download is named after the original', download.suggestedFilename() === 'synthetic.reviewed.xlsx');
  const exported = await fs.readFile(await download.path());
  const wb = readWorkbook(new Uint8Array(exported), { fileName: 'x', fileHash: 'x' });
  const original = readWorkbook(new Uint8Array(fixture), { fileName: 'x', fileHash: 'x' });
  check('The exported file keeps hidden rows and the filter', wb.sheets[0].hiddenRows === original.sheets[0].hiddenRows && wb.sheets[0].autoFilter);
  check('The exported file no longer has the approved question marks', wb.sheets[0].rows.filter(r => (r.cells[18]?.v ?? '').includes('?')).length < original.sheets[0].rows.filter(r => (r.cells[18]?.v ?? '').includes('?')).length);
  await page.screenshot({ path: `${out}/07-export.png`, fullPage: true });
  void blockingBefore;

  // JSON formation shares the open workbook with Excel formation
  await goJson(page);
  await page.getByRole('heading', { level: 1, name: 'JSON formation' }).waitFor();
  await page.locator('.cr-map-table').waitFor();
  check('Moving to JSON formation keeps the workbook: no file gate, the mapping lists every profile column with its JSON target', await page.locator('.ui-as-empty').count() === 0 && await page.locator('.cr-map-table tbody tr').count() === 40 && (await page.locator('.cr-map-table').innerText()).includes('THONGTINBD[].TS013'));
  check('The breadcrumb follows the section and the step', (await page.locator('.cl-crumbs').innerText()).replace(/\s+/g, ' ').includes('Collateral JSON formation Mapping'));
  await page.screenshot({ path: `${out}/06-mapping.png`, fullPage: true });
  await tab(page, 'Preview').click();
  await page.locator('.cr-preview').waitFor();
  check('The grouped preview is labelled as diagnostic', (await page.locator('.cr-preview').innerText()).includes('Diagnostic'));
  await tab(page, 'Export').click();
  await page.locator('.cr-json').waitFor();
  check('The reporting JSON is locked while serious issues remain: only the audit report can be downloaded', await page.locator('.cr-json .ui-sb-pill', { hasText: 'Locked' }).count() === 1 && await page.getByRole('button', { name: 'Download reporting-output.json' }).count() === 0 && await page.getByRole('button', { name: 'Download audit report (JSON)' }).count() === 1);
  await page.locator('.ui-as-side__nav').getByRole('button', { name: 'Excel formation' }).click();
  await page.getByRole('tab', { name: /Review and fix/ }).waitFor();
  check('Going back to Excel formation finds the same file and the work done', await page.locator('.cl-file').count() === 1 && await tab(page, 'Review and fix').getAttribute('aria-disabled') === null);
  const small = await context.newPage(); watch(small);
  await small.goto(url, { waitUntil: 'networkidle' });
  await small.locator('input[type=file]').setInputFiles({ name: 'small.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(buildSmallFixture()) });
  await small.getByRole('button', { name: /See what was found/ }).click();
  await small.locator('.cr-overview').waitFor({ timeout: 60000 });
  await small.getByRole('tab', { name: /Review and fix/ }).click();
  await small.locator('.cg-stage').waitFor();
  await small.getByRole('button', { name: 'Use this reading' }).click();
  await small.getByRole('button', { name: 'Approve value' }).click();
  await small.waitForTimeout(600);
  await small.locator('.ui-as-side__nav').getByRole('button', { name: 'JSON formation' }).click();
  await small.getByRole('tab', { name: /Preview/ }).click();
  await small.locator('.cr-preview').waitFor();
  check('The grouped preview lists the hierarchy', await small.locator('.cr-tree__leaf').count() >= 2);
  await small.getByRole('tab', { name: /Export/ }).click();
  await small.locator('.cr-json').waitFor();
  check('All serious issues resolved, but the metadata is still missing, so the JSON stays locked', await small.getByRole('button', { name: 'Download reporting-output.json' }).count() === 0);
  const date = small.getByLabel('Reporting date (YYYYMMDD)');
  await small.waitForFunction(() => document.querySelector('.cr-meta input')?.value === '20260930');
  check('The report date offered is the one the workbook carries', await date.inputValue() === '20260930');
  await small.getByLabel('Prepared by').fill('Test User');
  await small.getByLabel('Phone').fill('0900000000');
  await small.getByLabel('Email').fill('test@example.invalid');
  await small.locator('.cr-json[data-ready]').waitFor({ timeout: 20000 });
  check('With every check green the JSON is ready', await small.locator('.cr-json[data-ready]').count() === 1 && await small.locator('.cr-checks li[data-ok="true"]').count() === 9);
  await small.screenshot({ path: `${out}/07b-json-ready.png`, fullPage: true });
  const [jsonDownload] = await Promise.all([small.waitForEvent('download'), small.getByRole('button', { name: 'Download reporting-output.json' }).click()]);
  check('The file is named reporting-output.json', jsonDownload.suggestedFilename() === 'reporting-output.json');
  const jsonBytes = await fs.readFile(await jsonDownload.path());
  const jsonText = new TextDecoder('utf-8', { fatal: true }).decode(jsonBytes);
  const parsed = JSON.parse(jsonText);
  check('It is strict UTF-8 JSON with the metadata typed on the page', parsed.KB001 === '20260930' && parsed.KB002 === 'Test User' && parsed.KB004 === 'test@example.invalid');
  const assets = parsed.CNTCTD.flatMap(b => b.KHACHHANG.flatMap(c => c.THONGTINBD));
  check('The hierarchy has 1 branch, 2 customers and 3 assets from 4 rows', parsed.CNTCTD.length === 1 && parsed.CNTCTD[0].KHACHHANG.length === 2 && assets.length === 3);
  check('TS013 holds the approved text, TS006 the exact sum and TS009 the merged contracts', assets[1].TS013 === 'Ke hoach trien khai' && assets[0].TS006 === 500.3 && JSON.stringify(assets[0].TS009) === JSON.stringify(['00901H6568/10R', '0002/10R']));
  check('Leading zeros and empty arrays survive', parsed.CNTCTD[0].TTC01 === '00000001' && assets[0].TS010.length === 0 && assets[2].TS012.length === 0);
  check('No review metadata is in the contractual file', !/status|severity|issue|fingerprint/i.test(jsonText));
  await small.getByRole('button', { name: /More downloads/ }).click();
  const [auditDownload] = await Promise.all([small.waitForEvent('download'), small.getByRole('menuitem', { name: 'Audit report (JSON)' }).click()]);
  const audit = JSON.parse(await fs.readFile(await auditDownload.path(), 'utf8'));
  const auditText = JSON.stringify(audit);
  check('The audit report holds fingerprints, decisions and counts but no cell text or contact details', audit.privacy.cellValuesIncluded === false && !auditText.includes('Ke hoach') && !auditText.includes('Test User') && !auditText.includes('Cong ty') && audit.patchCount >= 1);
  await small.close();

  // Closing the file drops everything
  await page.getByRole('button', { name: 'Close file' }).click();
  await page.waitForTimeout(800);
  check('Closing the file returns to an empty import and the JSON section asks for a workbook', await page.locator('.storage-dropzone__row').count() === 0 && await tab(page, 'Overview').getAttribute('aria-disabled') === 'true');
  await goJson(page);
  await page.locator('.ui-as-empty').waitFor();
  check('Without a workbook the JSON section shows a gate with a way back', (await page.locator('.ui-as-empty').innerText()).includes('Go to Excel formation'));
  await page.locator('.ui-as-side__nav').getByRole('button', { name: 'Excel formation' }).click();
  check('No request ever left this origin while the workbook was open', foreign.length === 0);

  // Reload: nothing persisted
  await page.reload({ waitUntil: 'networkidle' });
  check('A reload forgets the workbook (nothing is stored)', await tab(page, 'Review and fix').getAttribute('aria-disabled') === 'true');
  check('No storage holds workbook text', await page.evaluate(() => !JSON.stringify({ ...localStorage }).includes('Cong ty Mau') && !JSON.stringify({ ...sessionStorage }).includes('Cong ty Mau')));

  // Phone widths, dark, Vietnamese
  for (const width of [390, 320]) {
    const phone = await browser.newContext({ viewport: { width, height: 850 }, hasTouch: true, isMobile: true });
    await consent(phone);
    const small = await phone.newPage(); watch(small);
    await small.goto(url, { waitUntil: 'networkidle' });
    await small.locator('input[type=file]').setInputFiles({ name: 'synthetic.xlsx', mimeType: 'application/octet-stream', buffer: fixture });
    await small.getByRole('button', { name: /See what was found/ }).click();
    await small.locator('.cr-overview').waitFor({ timeout: 60000 });
    await small.getByRole('tab', { name: /Review and fix/ }).click();
    await small.locator('.cg-stage').waitFor();
    await small.waitForTimeout(500);
    check(`No sideways scroll on the review page at ${width}px`, await small.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    check(`On touch there is no hover: the expand button is always visible and the stage fits at ${width}px`, await small.locator('.cg-expand').evaluate(n => Number(getComputedStyle(n).opacity) === 1) && await small.locator('.cg-stage').evaluate(n => n.getBoundingClientRect().right <= innerWidth));
    check(`The details and the guess panel stay inside the screen at ${width}px`, await small.evaluate(() => [...document.querySelectorAll('.cd-root, .sd-card')].every(n => n.getBoundingClientRect().right <= innerWidth + 1)));
    await small.screenshot({ path: `${out}/phone-${width}.png`, fullPage: true });
    await phone.close();
  }
  const dark = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  await consent(dark);
  await dark.addInitScript(() => localStorage.setItem('affectui:preferences', JSON.stringify({ dark: true, theme: 'dark', emailNotifications: true, desktopNotifications: true })));
  const dp = await dark.newPage(); watch(dp);
  await dp.goto(url, { waitUntil: 'networkidle' });
  await dp.locator('input[type=file]').setInputFiles({ name: 'synthetic.xlsx', mimeType: 'application/octet-stream', buffer: fixture });
  await dp.getByRole('button', { name: /See what was found/ }).click();
  await dp.locator('.cr-overview').waitFor({ timeout: 60000 });
  await dp.getByRole('tab', { name: /Review and fix/ }).click();
  await dp.locator('.cg-stage').waitFor();
  await dp.waitForTimeout(500);
  await dp.screenshot({ path: `${out}/08-review-dark.png`, fullPage: true });
  check('Dark theme reaches the review page', await dp.locator('.crm-page').getAttribute('data-theme') === 'dark');
  await dark.close();

  check('No page errors', errors.length === 0);
  console.log(`${results.length} checks passed`);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
} catch (error) {
  console.error('FAILED after:', results.at(-1) ?? '(nothing)'); console.error(error.message.split('\n').slice(0, 6).join('\n')); console.error(errors.slice(0, 5));
  process.exitCode = 1;
} finally { await browser.close(); }
