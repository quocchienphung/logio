import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildXlsx } from '../../src/components/sites/collateral/excel-formation/engine/xlsx-builder.mjs';
import { HEADERS } from './lib/collateral-fixture.mjs';

const base = process.argv[2] || 'http://localhost:3002';
const out = 'docs/research/collateral/workbench-qa';
await fs.mkdir(out, { recursive: true });
const descriptions = [...Array(5).fill('Ke hoach trien khai'), ...Array(5).fill('Hang hoa'), ...Array(5).fill('Hung Yen'), 'Ke ho?ch H?ng zz?zz'];
const rows = descriptions.map((text, i) => {
  const row = { NGAYDULIEU: '30/09/2026', MACNTCTD: '00000001', TENCNTCTD: 'CN TEST', MAKH: '00000123', TENKH: 'Cong ty Mau', MASOBD: `T${String(i).padStart(5, '0')}`, MALOAIBD: '303', NGBDAU: '20200101', GIATRI: { n: '1000' }, GIATRIBDKV: { n: '500' }, NGDINHGIA: '20210101', DSSOHD: `HD${i}`, MOTABD: text, MOTABDS: text };
  return HEADERS.map(header => row[header] ?? null);
});
const buffer = Buffer.from(buildXlsx([{ name: 'REVIEW_TEST', rows: [HEADERS, ...rows] }]));
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], foreign = [], checks = [];
const check = (label, ok) => { assert.ok(ok, label); checks.push(label); console.log(`✓ ${label}`); };
try {
  for (const width of [1440, 1024, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: width === 1024 ? 'dark' : 'light', reducedMotion: width < 600 ? 'reduce' : 'no-preference', hasTouch: width < 600 });
    await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin && request.url().startsWith('http')) foreign.push(request.url()); });
    await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').setInputFiles({ name: 'workbench-test.xlsx', mimeType: 'application/octet-stream', buffer });
    await page.getByRole('button', { name: /See what was found/ }).click();
    await page.locator('.cr-overview').waitFor({ timeout: 60000 });
    await page.getByRole('tab', { name: /Review and fix/ }).click();
    await page.locator('.cr-search').fill('zz?zz');
    await page.locator('.sd-wordrow').nth(2).waitFor();
    check(`${width}: workbook and correction are stacked, equally wide, with readable rows`, await page.evaluate(() => {
      const a = document.querySelector('.cg-media').getBoundingClientRect(), b = document.querySelector('.cg-details').getBoundingClientRect(), s = document.querySelector('.cg-stage').getBoundingClientRect();
      return b.top > a.bottom && Math.abs(a.width - b.width) < 1 && s.height >= 280 && s.height <= 420 && document.documentElement.scrollWidth <= innerWidth;
    }));
    check(`${width}: three numbered steps identify location, correction and confirmation`, (await page.locator('.cr-step-number').allInnerTexts()).join(',') === '01,02,03');
    await page.locator('.cg-thumb[aria-selected=true]').focus();
    await page.keyboard.press('ArrowRight');
    check(`${width}: arrow navigation keeps focus on the selected issue`, await page.evaluate(() => document.activeElement?.matches('.cg-thumb[aria-selected="true"]')));
    await page.locator('.sd-wordrow').nth(2).waitFor();
    const uncertain = page.locator('.sd-wordrow').filter({ has: page.locator('.sd-wordrow__text', { hasText: 'H?ng' }) });
    const unknown = page.locator('.sd-wordrow').filter({ has: page.locator('.sd-wordrow__text', { hasText: 'zz?zz' }) });
    check(`${width}: ambiguous answers are not preselected`, await uncertain.locator('.sd-alt[aria-pressed=true]').count() === 0 && (await uncertain.innerText()).includes('Needs your review'));
    await page.getByRole('button', { name: 'Use this reading', exact: true }).click();
    check(`${width}: copying suggestions leaves uncertain and unknown words untouched`, await page.locator('.cd-textarea').inputValue() === 'Ke hoach H?ng zz?zz' && await page.locator('.cd-root').getAttribute('data-status') === 'open');
    const manual = unknown.getByRole('textbox');
    await manual.fill('custom');
    await uncertain.getByRole('button', { name: /Hung/ }).click();
    check(`${width}: choices do not overwrite an existing draft before Use is clicked`, await page.locator('.cd-textarea').inputValue() === 'Ke hoach H?ng zz?zz');
    await page.getByRole('button', { name: 'Use this reading', exact: true }).click();
    check(`${width}: explicit word choices and custom input compose a complete correction`, await page.locator('.cd-textarea').inputValue() === 'Ke hoach Hung custom');
    await page.locator('.cg-details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/correction-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Review later →', exact: true }).click();
    await page.getByRole('button', { name: 'Review later →', exact: true }).click();
    check(`${width}: Review later preserves the draft when returning to the same issue`, await page.locator('.cd-textarea').inputValue() === 'Ke hoach Hung custom' && await page.locator('.cd-root').getAttribute('data-status') === 'open');
    // Keyboard confirmation follows the same edit path as the button and fixes the matching twin.
    await page.locator('.cd-textarea').focus();
    await page.keyboard.press('Control+Enter');
    await page.locator('.cg-empty').waitFor();
    check(`${width}: approval removes both identical description issues from To review`, await page.locator('.cg-empty').count() === 1);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.locator('.cd-textarea').waitFor();
    check(`${width}: Undo restores the original value and unresolved issues`, await page.locator('.cd-textarea').inputValue() === 'Ke ho?ch H?ng zz?zz');
    await context.close();
  }
  check('No browser errors', errors.length === 0);
  check('No external requests while reviewing workbook contents', foreign.length === 0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ checks, errors, foreign }, null, 2));
} finally { await browser.close(); }
