import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = process.argv[3] || '/tmp/logio-collateral-simulation-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const checks = [], errors = [], requests = [], downloads = [], workers = [];
const check = (name, ok) => { assert.ok(ok, name); checks.push(name); console.log(`✓ ${name}`); };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
await ctx.addInitScript(() => {
  localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() }));
  window.__collateralReads = 0;
  for (const method of ['arrayBuffer', 'text', 'stream']) Object.defineProperty(File.prototype, method, { configurable: true, value() { window.__collateralReads++; throw new Error('The simulation must not read a File'); } });
});
const page = await ctx.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (request.url().includes('/collateral-queue')) requests.push(request.url()); });
page.on('download', download => downloads.push(download.suggestedFilename()));
page.on('worker', worker => workers.push(worker.url()));
const ready = async () => {
  await page.locator('.collateral').waitFor({ timeout: 60000 });
  await page.locator('[data-ascii-cover]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
};
const nav = async name => { await page.locator('.ui-as-side__nav').getByRole('button', { name, exact: true }).click(); await ready(); };
try {
  await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' }); await ready();
  check('Excel identifies itself as a UI simulation', /UI simulation/.test(await page.locator('.cl-simulation').innerText()));
  await page.locator('input[type=file]').setInputFiles({ name: 'Not-a-real-workbook.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('No workbook bytes, by design') });
  await page.getByText('Sample preview ready', { exact: true }).waitFor();
  check('File selection keeps its label while previewing the fixed sample', await page.locator('.import-unfurl__body h2').innerText() === 'Not-a-real-workbook.xlsx' && (await page.locator('.import-unfurl__grid').innerText()).includes('NGAYDULIEU'));
  await page.getByRole('button', { name: 'See what was found', exact: true }).click();
  await page.locator('.cr-overview').waitFor();
  check('Overview uses the six-row sample', /6 rows/.test(await page.locator('.cr-overview').innerText()));
  await page.getByRole('tab', { name: /Review and fix/ }).click();
  await page.locator('.sv-row').first().waitFor();
  await page.locator('.cd-textarea').fill('My sample correction');
  await page.getByRole('button', { name: 'Approve value', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Chỉ dòng đang chọn', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.waitForTimeout(650);
  await page.getByRole('radio', { name: 'Done', exact: true }).click();
  check('Review can approve an editable sample', await page.getByRole('button', { name: 'Undo', exact: true }).isEnabled() && (await page.locator('.cd-textarea').inputValue()) === 'My sample correction');
  await page.getByRole('tab', { name: /Export/ }).click();
  await page.getByRole('button', { name: 'Create corrected workbook', exact: true }).click();
  await page.getByRole('button', { name: /Download collateral-sample/ }).waitFor();
  await page.getByRole('button', { name: /Download collateral-sample/ }).click();
  check('Export shows a simulated result', /Simulation/.test(await page.locator('.cr-verify').innerText()));
  await nav('JSON formation');
  await page.getByRole('tab', { name: /Preview/ }).click();
  await page.locator('.jv-row').first().waitFor();
  check('JSON keeps the expandable sample tree', await page.locator('.jv-row').count() > 5);
  await page.getByRole('tab', { name: /Export/ }).click();
  await page.getByRole('button', { name: 'Download collateral-sample.json', exact: true }).waitFor();
  await page.locator('.cr-meta input').first().fill('anything');
  await page.getByRole('button', { name: 'Download collateral-sample.json', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Download collateral-sample.json', exact: true }).click();
  check('JSON plays scripted checks without validating real data', await page.locator('.cr-json .cr-checks').count() > 0);
  await nav('Queue');
  await page.locator('.queue-row').first().waitFor();
  check('Queue starts with three sample states', await page.locator('.queue-row').count() === 3);
  await page.getByRole('searchbox', { name: 'Search sample files' }).fill('Branch');
  await page.waitForTimeout(450);
  check('Search filters the sample list', await page.locator('.queue-row').count() === 1);
  await page.getByRole('searchbox', { name: 'Search sample files' }).fill('');
  await page.waitForTimeout(350);
  await page.locator('.queue-row__button').first().click();
  await page.locator('.queue-pop__main').waitFor();
  await page.waitForTimeout(900);
  await page.locator('.queue-pop__secondary').getByRole('button', { name: 'Download', exact: true }).click();
  await page.locator('.queue-pop__delete').getByRole('button', { name: 'Delete original', exact: true }).click();
  const hold = page.locator('.queue-pop__delete').getByRole('button', { name: 'Delete', exact: true });
  await hold.waitFor();
  await page.waitForTimeout(500);
  await hold.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1350); await page.keyboard.up('Space');
  await page.locator('.queue-pop__delete').getByRole('button', { name: 'Undo', exact: true }).waitFor();
  check('Holding Delete removes only a sample row', await page.locator('.queue-row').count() === 2);
  await page.locator('.queue-pop__delete').getByRole('button', { name: 'Undo', exact: true }).click();
  await page.waitForTimeout(500);
  check('Undo restores the sample row', await page.locator('.queue-row').count() === 3);
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/queue-desktop.png` });
  check('The three sections made no Queue API requests', requests.length === 0);
  check('No file content was read', await page.evaluate(() => window.__collateralReads) === 0);
  check('The demo created neither downloads nor workbook workers', downloads.length === 0 && workers.length === 0);
  for (const section of ['excel-formation', 'json-formation', 'queue']) {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${base}/personalize?section=${section}`, { waitUntil: 'networkidle' }); await ready();
    if (section !== 'queue') { await page.getByRole('button', { name: 'Run simulation', exact: true }).click(); await page.waitForTimeout(1200); }
    check(`${section} fits a reduced-motion phone viewport`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${out}/${section}-mobile.png` });
  }
  check('Reload resets Queue to the sample fixtures', await page.locator('.queue-row').count() === 3);
  for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
    const response = await ctx.request.fetch(`${base}/api/workspace/workspaces/preview/collateral-queue`, { method });
    check(`The retired Queue API rejects ${method}`, [404, 405].includes(response.status()));
  }
  check('No uncaught browser errors', errors.length === 0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ checks, errors, requests, downloads, workers }, null, 2));
  console.log(`${checks.length} checks passed`);
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  console.error('Failed after', checks.at(-1), error, errors); process.exitCode = 1;
} finally { await browser.close(); }
