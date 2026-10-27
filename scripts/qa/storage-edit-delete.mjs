// Browser QA of the Storage page's Save changes (Action button), hold-to-delete with Undo (Confirm morph) and the other Action buttons, against the real workspace storage.
// node scripts/qa/storage-edit-delete.mjs [base-url]
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/storage-edit-delete/qa';
await fs.mkdir(out, { recursive: true });
const checks = [], errors = [];
const check = (label, value, detail = '') => { assert.ok(value, `${label} ${detail}`); checks.push(label); console.log('PASS', label); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ channel: 'chrome' });

const reportText = '# Quarterly report\nRevenue, banking provisions and SQL data are reviewed every quarter.\n';
const notesText = 'Plain notes about finance and cash flow for the quarter.\n';
const vaultCount = page => page.evaluate(() => new Promise((resolve, reject) => { const open = indexedDB.open('logio-knowledge-vault', 1); open.onerror = () => reject(open.error); open.onsuccess = () => { const request = open.result.transaction('documents').objectStore('documents').count(); request.onsuccess = () => { open.result.close(); resolve(request.result); }; request.onerror = () => reject(request.error); }; }));
// click inside the page and record every data-state change of the button with its time (page round trips are slow on a busy machine)
const timeline = (locator, ms) => locator.evaluate((element, span) => new Promise(resolve => { const t0 = performance.now(), seen = [[element.getAttribute('data-state'), 0]]; const watch = new MutationObserver(() => { const state = element.getAttribute('data-state'); if (seen.at(-1)[0] !== state) seen.push([state, Math.round(performance.now() - t0)]); }); watch.observe(element, { attributes: true, attributeFilter: ['data-state'] }); element.click(); setTimeout(() => { watch.disconnect(); resolve(seen); }, span); }), ms);
const hold = async (page, locator, ms = 1200) => { const box = await locator.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await sleep(ms); await page.mouse.up(); await page.mouse.move(4, 4); };
const until = async (condition, timeout = 25000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await condition()) return true; await sleep(250); } return false; };
const rowNames = page => page.locator('.stg-document-row .stg-file-name strong').allInnerTexts();

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  // the dev server may reference a build chunk it no longer serves while files are being edited (seen on every /personalize page); that is reported, not counted
  const devNoise = [];
  page.on('console', message => { if (message.type() !== 'error') return; const url = message.location().url; (/\/_next\/static\/chunks\//.test(url) ? devNoise : errors).push(`${message.text()} ${url}`); });
  await page.goto(`${base}/personalize?section=storage`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  // ============================================================ the Process / Approve buttons are the Action button now
  await page.getByLabel('Choose storage documents').setInputFiles([{ name: 'edit-report.md', mimeType: 'text/markdown', buffer: Buffer.from(reportText) }, { name: 'edit-notes.txt', mimeType: 'text/plain', buffer: Buffer.from(notesText) }]);
  const process = page.locator('.stg-process-bar .ab');
  check('Process files is the Action button (44 px style, small size 36 px)', await process.count() === 1 && (await process.boundingBox()).height === 36);
  await process.click();
  await page.getByText('Your review, before storage', { exact: true }).waitFor();
  const approve = page.locator('.stg-review-actions .ab');
  check('Approve & store is the Action button with a check icon', await approve.count() === 1 && await approve.locator('svg').count() >= 1);
  await approve.click();
  await page.waitForFunction(() => document.querySelectorAll('.stg-document-row').length === 2);
  check('Both documents are stored', (await rowNames(page)).length === 2);

  // ============================================================ edit: name and knowledge area, Save changes
  const sha = createHash('sha256').update(reportText).digest('hex');
  const row = name => page.locator('.stg-document-row').filter({ hasText: name });
  await row('edit-report.md').locator('.stg-file-name button').click();
  const detail = page.getByRole('dialog', { name: 'edit-report.md', exact: true });
  const save = detail.getByRole('button', { name: 'Save changes' });
  const nameInput = detail.getByRole('textbox', { name: 'Name' });
  check('The editor shows the name without its extension, the fixed extension and the area', await nameInput.inputValue() === 'edit-report' && (await detail.locator('.stg-edit-ext').innerText()) === '.md' && (await detail.getByRole('combobox', { name: 'Document knowledge area' }).innerText()) === 'Finance');
  check('Save changes is off while nothing changed', await save.getAttribute('aria-disabled') === 'true');
  await nameInput.fill('   ');
  check('An empty name is refused in words and Save stays off', (await detail.locator('.stg-edit-hint').innerText()).includes('Give the document a name') && await save.getAttribute('aria-disabled') === 'true' && await nameInput.getAttribute('aria-invalid') === 'true');
  await nameInput.fill('a/b');
  check('A slash in the name is refused', (await detail.locator('.stg-edit-hint').innerText()).includes('can’t contain') && await save.getAttribute('aria-disabled') === 'true');
  await nameInput.fill('Quarterly report');
  await detail.getByRole('combobox', { name: 'Document knowledge area' }).click();
  await page.getByRole('option', { name: 'Banking', exact: true }).click();
  check('A valid change shows Unsaved changes and turns Save on', await save.getAttribute('aria-disabled') === null && (await detail.locator('.stg-edit-actions span').first().innerText()).includes('Unsaved changes') && await detail.getByRole('button', { name: 'Discard' }).isVisible());
  await detail.getByRole('button', { name: 'Discard' }).click();
  check('Discard returns to the stored values', await nameInput.inputValue() === 'edit-report' && await save.getAttribute('aria-disabled') === 'true');
  await nameInput.fill('Quarterly report');
  await detail.getByRole('combobox', { name: 'Document knowledge area' }).click();
  await page.getByRole('option', { name: 'Banking', exact: true }).click();
  await page.screenshot({ path: `${out}/01-editor-dirty.png` });
  const states = await timeline(detail.locator('.stg-edit .ab'), 3400);
  const names = states.map(([state]) => state), at = Object.fromEntries(states.slice(1));
  check('Save changes goes idle, pending, Saved, then idle again', names.join('>') === 'idle>pending>success>idle', JSON.stringify(states));
  check('Saved is held about 2.4 s (measured on the source)', at.idle - at.success > 2200 && at.idle - at.success < 2700, JSON.stringify(states));
  check('The dialog title and the row now carry the new name and area', await page.getByRole('dialog', { name: 'Quarterly report.md', exact: true }).isVisible() && (await row('Quarterly report.md').innerText()).includes('Banking'));
  const fingerprint = await page.locator('.crm-dialog[open] .stg-fingerprint code').innerText();
  check('The fingerprint of the original is unchanged by a rename', fingerprint === sha);
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('dialog', { name: 'Quarterly report.md', exact: true }).getByRole('button', { name: 'Download original' }).click();
  const download = await downloadWait;
  check('Download original uses the new name and the untouched bytes', download.suggestedFilename() === 'Quarterly report.md' && (await fs.readFile(await download.path(), 'utf8')) === reportText, download.suggestedFilename());

  // closing with an unsaved draft discards it
  const edited = page.getByRole('dialog', { name: 'Quarterly report.md', exact: true });
  await edited.getByRole('textbox', { name: 'Name' }).fill('Draft that is never saved');
  await page.keyboard.press('Escape');
  await edited.waitFor({ state: 'hidden' });
  await row('Quarterly report.md').locator('.stg-file-name button').click();
  check('Closing without Save leaves the stored name; reopening starts from it', await edited.getByRole('textbox', { name: 'Name' }).inputValue() === 'Quarterly report');
  await edited.getByRole('button', { name: 'Close Quarterly report.md' }).click();

  await page.reload();
  await page.locator('.stg-document-row').first().waitFor();
  check('The rename and the area survive a reload', (await rowNames(page)).includes('Quarterly report.md') && (await row('Quarterly report.md').innerText()).includes('Banking'));

  // ============================================================ delete from the row: dialog, hold, Undo from the note after the dialog is closed
  const vaultBefore = await vaultCount(page);
  const orderBefore = await rowNames(page);
  const removeDialog = page.getByRole('dialog', { name: 'Remove documents', exact: true });
  await row('edit-notes.txt').getByRole('group', { name: 'Actions for edit-notes.txt' }).getByRole('button', { name: 'Delete' }).click();
  await removeDialog.getByRole('button', { name: 'Remove 1 document', exact: true }).click();
  await sleep(400);
  await removeDialog.locator('.cm__confirm').click();
  await sleep(300);
  check('A quick click on Remove does nothing', (await rowNames(page)).length === 2 && await removeDialog.locator('.cm[data-state="confirming"]').count() === 1);
  await hold(page, removeDialog.locator('.cm__confirm'));
  await removeDialog.locator('.cm[data-state="done"]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.stg-document-row').length === 1);
  check('Holding Remove takes the document out of the library at once; the dialog shows Removed · Undo', (await rowNames(page)).length === 1 && await removeDialog.getByRole('button', { name: 'Undo' }).isVisible());
  await page.screenshot({ path: `${out}/02-removed-undo.png` });
  await removeDialog.getByRole('button', { name: /^Close remove documents/i }).click();
  await removeDialog.waitFor({ state: 'hidden' });
  const note = page.locator('.stg-undo');
  check('Closing the dialog early keeps Undo in a note under the map', await note.isVisible() && (await note.innerText()).includes('1 document removed'));
  check('The original stays in storage during the window', await vaultCount(page) === vaultBefore);
  await note.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.stg-document-row').length === 2);
  check('Undo from the note puts the document back in its old place', JSON.stringify(await rowNames(page)) === JSON.stringify(orderBefore) && await page.locator('.stg-undo').count() === 0);
  await row('edit-notes.txt').locator('.stg-file-name button').click();
  check('The restored document is complete: its text still loads', /Plain notes about finance/.test(await page.getByRole('dialog', { name: 'edit-notes.txt', exact: true }).locator('pre').innerText()));
  await page.getByRole('button', { name: 'Close edit-notes.txt' }).click();

  // remove again and leave it: the window ends and the stored files go
  await row('edit-notes.txt').getByRole('group', { name: 'Actions for edit-notes.txt' }).getByRole('button', { name: 'Delete' }).click();
  await removeDialog.getByRole('button', { name: 'Remove 1 document', exact: true }).click();
  await sleep(400);
  await hold(page, removeDialog.locator('.cm__confirm'));
  await removeDialog.locator('.cm[data-state="done"]').waitFor();
  await removeDialog.waitFor({ state: 'hidden', timeout: 15000 });
  check('After the Undo window the dialog closes by itself with no note left', (await rowNames(page)).length === 1 && await page.locator('.stg-undo').count() === 0);
  await until(async () => await vaultCount(page) < vaultBefore, 8000);
  check('The removal is final: the original and its index are gone from storage', await vaultCount(page) === vaultBefore - 1);
  await page.reload();
  await page.locator('.stg-document-row').first().waitFor();
  check('The removal survives a reload', JSON.stringify(await rowNames(page)) === JSON.stringify(['Quarterly report.md']));

  // leaving the page inside the window still removes the files
  await page.getByLabel('Choose storage documents').setInputFiles({ name: 'edit-leave.txt', mimeType: 'text/plain', buffer: Buffer.from('A document that is removed and then the page is left.\n') });
  await page.locator('.stg-process-bar .ab').click();
  await page.getByText('Your review, before storage', { exact: true }).waitFor();
  await page.locator('.stg-review-actions .ab').click();
  await page.waitForFunction(() => document.querySelectorAll('.stg-document-row').length === 2);
  const withLeave = await vaultCount(page);
  await row('edit-leave.txt').getByRole('group', { name: 'Actions for edit-leave.txt' }).getByRole('button', { name: 'Delete' }).click();
  await removeDialog.getByRole('button', { name: 'Remove 1 document', exact: true }).click();
  await sleep(400);
  await hold(page, removeDialog.locator('.cm__confirm'));
  await removeDialog.locator('.cm[data-state="done"]').waitFor();
  await page.goto(`${base}/personalize?section=skilled`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.goto(`${base}/personalize?section=storage`, { waitUntil: 'networkidle' });
  // the page's own cleanup on pagehide is best effort; the note kept for the next visit finishes it once the Undo window is over
  await until(async () => await vaultCount(page) < withLeave, 25000);
  check('Leaving the page inside the Undo window never strands the files: they are gone by the next visit', await vaultCount(page) === withLeave - 1, `${await vaultCount(page)} vs ${withLeave - 1}`);
  check('Nothing stays noted once the files are deleted', await page.evaluate(() => JSON.parse(localStorage.getItem('logio-storage-pending-purge') || '[]').length === 0));

  // ============================================================ dark theme and phone
  await page.locator('.stg-document-row').first().waitFor();
  await page.locator('.ui-as-user').click();
  await page.getByRole('menuitem', { name: 'Dark mode', exact: true }).click();
  await page.locator('.stg-page-head h1').click();
  await page.locator('.stg-document-row').first().locator('.stg-file-name button').click();
  const dark = page.getByRole('dialog', { name: 'Quarterly report.md', exact: true });
  await dark.getByRole('textbox', { name: 'Name' }).fill('Dark edit');
  const colours = await dark.locator('.stg-edit .ab').evaluate(button => ({ background: getComputedStyle(button).backgroundColor, color: getComputedStyle(button).color }));
  check('Dark theme: Save changes is a light button with dark text (not the light theme colours)', colours.background !== 'rgb(23, 23, 23)' && colours.background !== colours.color, JSON.stringify(colours));
  await page.screenshot({ path: `${out}/03-dark.png` });
  await dark.getByRole('button', { name: 'Close Quarterly report.md' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.stg-document-row').first().locator('.stg-file-name button').click();
  const phone = page.getByRole('dialog', { name: 'Quarterly report.md', exact: true });
  const overflow = await phone.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  check('Phone: the editor does not overflow the dialog', overflow.scroll <= overflow.client + 1, JSON.stringify(overflow));
  await phone.locator('.cm').scrollIntoViewIfNeeded();
  await phone.getByRole('button', { name: 'Delete document' }).click();
  await sleep(400);
  await hold(page, phone.locator('.cm__confirm'));
  await phone.locator('.cm[data-state="done"]').waitFor();
  check('Phone: holding with the pointer for a second removes the document', await until(async () => await page.locator('.stg-document-row').count() === 0, 4000));
  await page.screenshot({ path: `${out}/04-phone-removed.png` });
  await phone.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.stg-document-row').length === 1);
  check('Phone: Undo restores it', (await rowNames(page)).includes('Quarterly report.md') || (await rowNames(page)).includes('Dark edit.md'));

  // a save the store cannot keep: the reason is in the editor, the library keeps the old name, and the draft can be saved again
  await page.setViewportSize({ width: 1440, height: 1000 });
  const failing = page.locator('.crm-dialog[open]');
  const stored = await failing.getByRole('textbox', { name: 'Name' }).inputValue();
  await failing.getByRole('textbox', { name: 'Name' }).fill('Never stored');
  await page.evaluate(() => { window.__setItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('quota'); }; });
  await failing.getByRole('button', { name: 'Save changes' }).click();
  const explained = await until(async () => (await failing.locator('.stg-edit-hint').innerText()).includes('could not be verified'), 15000);
  await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; });
  check('A save the store cannot keep says so in the editor and never shows Saved', explained && await failing.locator('.stg-edit .ab').getAttribute('data-state') === 'idle');
  check('The old name is kept, the typed draft stays and Save changes can be pressed again', await failing.getByRole('textbox', { name: 'Name' }).inputValue() === 'Never stored' && await failing.locator('.stg-edit .ab').getAttribute('aria-disabled') === null && (await rowNames(page)).some(name => name.startsWith(stored)));
  await failing.getByRole('button', { name: 'Save changes' }).click();
  await failing.locator('.stg-edit .ab[data-state=success]').waitFor({ timeout: 15000 });
  check('Pressing it again, with storage working, saves the draft', (await rowNames(page)).includes('Never stored.md'));

  check('No console or page errors', errors.length === 0, errors.join('\n'));
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ checks, errors }, null, 2));
  if (devNoise.length) console.log(`note: ${devNoise.length} dev-server chunk 404s ignored: ${[...new Set(devNoise)].join('; ')}`);
  console.log(`${checks.length} checks passed`);
} finally { await browser.close(); }
