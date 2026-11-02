import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openSession } from '../../src/components/sites/collateral/excel-formation/engine/session.ts';
import { workbookGridMeta } from '../../src/components/sites/collateral/excel-formation/engine/workbook-grid.ts';
import { columnLetters } from '../../src/components/sites/collateral/excel-formation/engine/text.ts';

// Real-file integration check. Never record source text, screenshots, hashes, row addresses or file names in output.
const base = process.argv[2] || 'http://localhost:3003';
const path = process.argv[3] || 'docs/MAU9_20260930 ok.xlsx';
assert.ok(fs.existsSync(path), 'Reference workbook must be present for this check');
const session = await openSession(new Uint8Array(fs.readFileSync(path)), 'reference.xlsx');
const primary = session.wprofile.primary;
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], foreign = [];
let tested = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  page.on('pageerror', e => errors.push(e.name));
  page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(u.hostname)) foreign.push(u.hostname); });
  await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles(path);
  await page.getByRole('button', { name: /See what was found/ }).click();
  await page.locator('.cr-overview').waitFor({ timeout: 120000 });
  await page.getByRole('tab', { name: /Review and fix/ }).click();
  await page.locator('.cg-expand').click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor(); await page.waitForTimeout(1100);
  for (const sheet of session.workbook.sheets) {
    if (sheet.name !== primary || session.workbook.sheets.length > 1) await dialog.getByRole('combobox', { name: 'Worksheet' }).selectOption(sheet.name);
    await page.waitForFunction(name => document.querySelector('.cg-frame .sv')?.getAttribute('data-sheet') === name, sheet.name);
    const meta = workbookGridMeta(session.workbook, session.wprofile, sheet.name);
    assert.equal(Number(await dialog.getByRole('grid').getAttribute('aria-rowcount')), meta.lastRow, 'Real sheet row bound');
    assert.equal(Number(await dialog.getByRole('grid').getAttribute('aria-colcount')), meta.columns.length, 'Real sheet column bound');
    const positions = [0, .1, .5, .9, 1].map(f => Math.floor((sheet.rows.length - 1) * f));
    for (const i of positions) {
      const row = sheet.rows[i]; if (!row) continue;
      const col = row.cells.findIndex(cell => cell && cell.v && !/[\u0000-\u001f\u007f]/.test(cell.v));
      if (col < 0) continue;
      const ref = `${columnLetters(col)}${row.r}`;
      await dialog.getByRole('textbox', { name: 'Go to cell', exact: true }).fill(ref);
      await dialog.getByRole('textbox', { name: 'Go to cell', exact: true }).press('Enter');
      // A boolean comparison keeps cell content out of assertion reports and traces.
      await page.waitForFunction(expected => document.querySelector('.cg-frame .sv-formula__text')?.textContent === expected, row.cells[col].v);
      tested++;
    }
    assert.ok(await dialog.locator('.sv-row').count() < 40, 'Row virtualization stays bounded');
  }
  assert.equal(errors.length, 0, 'No browser errors'); assert.equal(foreign.length, 0, 'No external file requests');
  console.log(JSON.stringify({ sheetsChecked: session.workbook.sheets.length, exactCellComparisons: tested, boundedDOM: true, pageErrors: errors.length, externalRequests: foreign.length }));
} finally { await browser.close(); }
