import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { buildFixture } from './lib/collateral-fixture.mjs';
import { buildXlsx } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';

const base = process.argv[2] || 'http://localhost:3003';
const out = 'docs/research/card-to-article/local';
await fs.mkdir(out, { recursive: true });
// Synthetic only. A second sheet with >120 characters and >600 rows catches truncation and cache eviction bugs.
const long = 'Nội dung thật của ô, xuống dòng\n'.repeat(65) + 'END-OF-CELL-EXACT';
const extraRows = [['TEXT', 'CODE'], ...Array.from({ length: 1200 }, (_, i) => [i === 0 ? long : `Source row ${i + 2}`, `00${String(i + 2).padStart(8, '0')}`]), [], []];
const extra = unzipSync(buildXlsx([{ name: 'Notes', rows: extraRows }], { shared: false }));
const files = unzipSync(buildFixture());
// Place the real damaged character well beyond a column's clipped width.
files['xl/sharedStrings.xml'] = strToU8(strFromU8(files['xl/sharedStrings.xml']).replace('Ke ho?ch trien khai du an', 'Evidence '.repeat(60) + 'Ke ho?ch trien khai du an'));
files['xl/worksheets/sheet2.xml'] = extra['xl/worksheets/sheet1.xml'];
files['xl/workbook.xml'] = strToU8(strFromU8(files['xl/workbook.xml']).replace('</sheets>', '<sheet name="Notes" sheetId="2" r:id="rIdExtra"/></sheets>'));
files['xl/_rels/workbook.xml.rels'] = strToU8(strFromU8(files['xl/_rels/workbook.xml.rels']).replace('</Relationships>', '<Relationship Id="rIdExtra" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>'));
const fixture = Buffer.from(zipSync(files));
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [], foreign = [];
const check = (name, ok) => { assert.ok(ok, name); results.push(name); console.log(`✓ ${name}`); };
async function go(root, ref, expected) {
  await root.getByRole('textbox', { name: 'Go to cell', exact: true }).fill(ref);
  await root.getByRole('textbox', { name: 'Go to cell', exact: true }).press('Enter');
  await root.locator('.sv-namebox').filter({ hasText: new RegExp(`^${ref}$`) }).waitFor();
  if (expected !== undefined) await root.locator('.sv-formula__text').filter({ hasText: expected }).waitFor();
}
try {
  for (const width of (process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [1440, 1024, 390, 320])) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 600, isMobile: width < 600, reducedMotion: width === 320 ? 'reduce' : 'no-preference', colorScheme: width === 1024 ? 'dark' : 'light' });
    await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(u.hostname)) foreign.push(u.hostname); });
    await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').setInputFiles({ name: 'synthetic-viewer.xlsx', mimeType: 'application/octet-stream', buffer: fixture });
    await page.getByRole('button', { name: /See what was found/ }).click();
    await page.locator('.cr-overview').waitFor({ timeout: 60000 });
    await page.getByRole('tab', { name: /Review and fix/ }).click();
    await page.locator('.cr-search').fill('ho?ch');
    const stage = page.locator('.cg-stage');
    await stage.locator('.sv-row[data-loaded] .sv-cell[data-target]').waitFor();
    await stage.scrollIntoViewIfNeeded();
    check(`${width}: real readable data replaces bars`, await stage.locator('.sv').getAttribute('data-mode') === 'readable' && await stage.locator('.sv-cell > i').count() === 0 && (await stage.locator('.sv-formula__text').innerText()).includes('ho?ch'));
    await page.waitForFunction(() => {
      const mark = document.querySelector('.cg-stage .sv-cell[data-target] .cg-mark');
      if (!mark) return false;
      const r = mark.getBoundingClientRect(), c = mark.closest('.sv-cell').getBoundingClientRect(), b = mark.closest('.sv-body').getBoundingClientRect();
      return r.left >= Math.max(c.left, b.left + 48) && r.right <= Math.min(c.right, b.right - 12);
    });
    check(`${width}: distant damaged character is brought into the visible cell`, true);
    const ref = await stage.locator('.sv-namebox').innerText();
    if (width === 1440) {
      const cell = stage.locator('.sv-cell[data-target]');
      const box = await cell.boundingBox(), body = await stage.locator('.sv-body').boundingBox();
      await page.mouse.move(Math.max(body.x + 60, box.x + 80), Math.max(body.y + 35, box.y + 15));
      await stage.locator('.sv-lens').waitFor();
      check('Lens renders source cells at actual 2× font size', await stage.locator('.sv-lcell').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize) === 24) && (await stage.locator('.sv-lens').innerText()).includes('ho?ch'));
      await stage.getByRole('button', { name: 'Zoom in magnifier' }).click();
      await page.mouse.move(Math.max(body.x + 60, box.x + 80), Math.max(body.y + 35, box.y + 15));
      await stage.locator('.sv-lens').waitFor();
      check('Zoom control increases the actual magnified font size', await stage.locator('.sv-lcell').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize) === 30));
      await page.keyboard.down('Alt'); await page.mouse.wheel(0, -80); await page.keyboard.up('Alt');
      await page.waitForTimeout(100);
      check('Alt + wheel adjusts magnifier zoom', await stage.locator('.sv-zoom > span').innerText() === '×3');
      const before = await stage.locator('.sv-lens').boundingBox();
      await page.mouse.move(body.x + body.width - 150, body.y + 80); await page.waitForTimeout(250);
      const after = await stage.locator('.sv-lens').boundingBox();
      check('Magnifier follows the pointer', Math.abs(before.x - after.x) > 10);
      await page.mouse.move(1, 1);
    }
    await stage.locator('.cg-sheet-host').evaluate(n => { n.dataset.identity = 'same-workbook-view'; });
    await page.locator('.cg-media').screenshot({ path: `${out}/inline-${width}.png` });
    await page.locator('.cd-textarea').fill('Draft survives file inspection');
    await page.locator('.cg-expand').click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor(); await page.waitForTimeout(width === 320 ? 100 : 1150);
    check(`${width}: popup preserves same workbook DOM and selected error`, await dialog.locator('.cg-sheet-host').getAttribute('data-identity') === 'same-workbook-view' && await dialog.locator('.sv-namebox').innerText() === ref);
    check(`${width}: selected issue is visible in both axes`, await dialog.locator('.sv-cell[data-target]').evaluate(n => { const r = n.getBoundingClientRect(), b = n.closest('.sv-body').getBoundingClientRect(); return r.bottom > b.top + 24 && r.top < b.bottom && r.right > b.left + 48 && r.left < b.right; }));
    await dialog.getByRole('combobox', { name: 'Worksheet' }).selectOption('Notes');
    await dialog.locator('.sv[data-sheet=Notes]').waitFor();
    await go(dialog, 'A2', 'END-OF-CELL-EXACT');
    check(`${width}: full long text comes from the second sheet without truncation`, await dialog.locator('.sv-formula__text').textContent() === long);
    await dialog.getByRole('button', { name: 'Show full cell value' }).click();
    check(`${width}: full-value reader expands`, await dialog.locator('.sv-value-toggle').getAttribute('aria-expanded') === 'true');
    await dialog.getByRole('button', { name: 'Show full cell value' }).click();
    await go(dialog, 'B1201', '0000001201');
    check(`${width}: distant rows preserve leading zeros`, await dialog.locator('.sv-formula__text').textContent() === '0000001201');
    if (width === 1440) {
      for (let r = 2; r <= 1200; r += 80) await go(dialog, `B${r}`, `00${String(r).padStart(8, '0')}`);
      await go(dialog, 'A2', 'END-OF-CELL-EXACT');
      check('Evicted chunks reload correctly on return', await dialog.locator('.sv-formula__text').textContent() === long);
    }
    await go(dialog, 'A1203', '');
    check(`${width}: trailing empty rows are reachable`, await dialog.locator('.sv-namebox').innerText() === 'A1203');
    await dialog.getByRole('textbox', { name: 'Go to cell', exact: true }).fill('XFD9999999');
    await dialog.getByRole('textbox', { name: 'Go to cell', exact: true }).press('Enter');
    check(`${width}: invalid address does not invent a cell`, await dialog.getByRole('textbox', { name: 'Go to cell', exact: true }).getAttribute('aria-invalid') === 'true' && await dialog.locator('.sv-namebox').innerText() === 'A1203');
    await dialog.locator('.sv-locate').click();
    await dialog.locator('.sv[data-sheet=MAU9_TEST]').waitFor();
    await dialog.locator('.sv-formula__text').filter({ hasText: 'Draft survives file inspection' }).waitFor();
    check(`${width}: unsaved preview is explicitly labelled`, await dialog.locator('.sv-preview-label').count() === 1);
    check(`${width}: return to issue restores actual source position`, await dialog.locator('.sv-namebox').innerText() === ref);
    check(`${width}: editor draft survives sheet browsing`, await page.locator('.cd-textarea').inputValue() === 'Draft survives file inspection');
    check(`${width}: popup contains the file only`, await dialog.locator('.cd-root, .cg-viewer__details, .cg-review-toggle').count() === 0);
    check(`${width}: underlying editor stays inert`, await page.locator('.cd-textarea').evaluate(n => !!n.closest('[inert]')));
    await page.screenshot({ path: `${out}/popup-${width}.png` });
    await dialog.getByRole('textbox', { name: 'Go to cell', exact: true }).focus();
    const counter = await dialog.locator('.cg-counter').innerText();
    await page.keyboard.press('ArrowLeft');
    check(`${width}: file input arrows keep the selected issue`, await dialog.locator('.cg-counter').innerText() === counter);
    await page.keyboard.press('Shift+Tab');
    check(`${width}: focus stays in popup`, await page.evaluate(() => document.querySelector('.cg-viewer').contains(document.activeElement)));
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    check(`${width}: close returns the same workbook host`, await stage.locator('.cg-sheet-host').getAttribute('data-identity') === 'same-workbook-view');
    check(`${width}: close preserves the editor draft`, await page.locator('.cd-textarea').inputValue() === 'Draft survives file inspection');
    check(`${width}: close restores keyboard focus`, await page.evaluate(() => document.activeElement?.classList.contains('cg-stage')));
    if (width === 1440) {
      await stage.locator('.sv-cell[data-target]').click();
      await dialog.waitFor(); await page.waitForTimeout(1100);
      check('Clicking a real cell opens the workbook', await dialog.locator('.cg-sheet-host').getAttribute('data-identity') === 'same-workbook-view');
      const handle = await dialog.locator('.cg-pull').boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down(); await page.mouse.move(handle.x + handle.width / 2, handle.y + 185, { steps: 12 }); await page.mouse.up();
      await dialog.waitFor({ state: 'detached' });
      check('Pull-down gesture closes back into its slot', await stage.locator('.sv').count() === 1);
    }
    await page.locator('.cr-search').fill('nothing-matches-this-query');
    await page.locator('.cg-empty').waitFor();
    check(`${width}: workbook still available without a matching issue`, await page.locator('.cg-stage .sv').count() === 1);
    check(`${width}: no document overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await context.close();
  }
  check('No browser errors', errors.length === 0);
  check('No file requests leave localhost', foreign.length === 0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors, foreign }, null, 2));
  console.log(`${results.length} checks passed`);
} finally { await browser.close(); }
