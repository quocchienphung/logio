import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildFixture } from './lib/collateral-fixture.mjs';

// Review usability regressions: file-only popup, retained editor, keyboard, close and phone layout.
const base = process.argv[2] || 'http://localhost:3002';
const out = 'docs/research/collateral/review-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], results = [];
const check = (name, ok) => { assert.ok(ok, name); results.push(name); console.log(`✓ ${name}`); };
try {
  for (const width of [1440, 1024, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 600, reducedMotion: width === 320 ? 'reduce' : 'no-preference', colorScheme: width === 1024 ? 'dark' : 'light' });
    await context.addInitScript(() => {
      localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() }));
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').setInputFiles({ name: 'review-test.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(buildFixture()) });
    await page.getByRole('button', { name: /See what was found/ }).click();
    await page.locator('.cr-overview').waitFor({ timeout: 60000 });
    await page.getByRole('tab', { name: /Review and fix/ }).click();
    await page.locator('.cg-details textarea').waitFor();
    await page.locator('.cr-search').fill('ho?ch');
    const stage = page.locator('.cg-stage');
    await stage.scrollIntoViewIfNeeded();
    check(`${width}: page fits without horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(`${width}: Open fullscreen is visible without hover`, await page.locator('.cg-expand').evaluate(node => getComputedStyle(node).opacity === '1' && node.getBoundingClientRect().height >= 36));
    check(`${width}: file has surrounding space and legible issue references`, await page.evaluate(() => {
      const stage = document.querySelector('.cg-stage').getBoundingClientRect();
      const card = document.querySelector('.cg-media').getBoundingClientRect();
      return stage.left - card.left >= 12 && card.right - stage.right >= 12 && parseFloat(getComputedStyle(document.querySelector('.cg-thumb__ref')).fontSize) >= 12;
    }));
    await page.screenshot({ path: `${out}/review-${width}.png`, fullPage: true });
    if (width === 1440) {
      const box = await page.locator('.cg-stage .sv-body').boundingBox();
      await page.mouse.move(box.x + box.width - 16, box.y + box.height - 8);
      await page.waitForTimeout(350);
      const lens = await page.locator('.cg-stage .sv-lens').boundingBox();
      const label = await page.locator('.cg-stage .sv-lens__label').boundingBox();
      check('Edge magnifier and its label stay inside the file', lens.x >= box.x && lens.y >= box.y && lens.x + lens.width <= box.x + box.width && label.y + label.height <= box.y + box.height);
      await page.mouse.move(2, 2);
    }
    const editor = page.locator('.cd-textarea');
    await editor.fill('Draft kept while inspecting');
    await editor.evaluate(node => { node.dataset.reviewIdentity = 'same-editor'; });
    await page.getByRole('button', { name: 'Accept as legitimate', exact: true }).click();
    await page.locator('.cd-exception input').fill('Reason kept while inspecting');
    await page.locator('.cg-expand').click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.waitForTimeout(1100);
    check(`${width}: file-only popup leaves the same editor and reason intact`, await dialog.locator('.cd-root, .cg-viewer__details').count() === 0 && await page.locator('.cd-textarea').getAttribute('data-review-identity') === 'same-editor' && await page.locator('.cd-textarea').inputValue() === 'Draft kept while inspecting' && await page.locator('.cd-exception input').inputValue() === 'Reason kept while inspecting');
    const count = await dialog.locator('.cg-counter').innerText();
    await dialog.getByRole('textbox', { name: 'Go to cell', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    check(`${width}: text arrow keys do not change the selected issue`, await dialog.locator('.cg-counter').innerText() === count);
    for (let i = 0; i < 20; i++) {
      // Bare Tab intentionally opens the workspace-wide page palette, even from dialogs.
      await page.keyboard.press('Shift+Tab');
      assert.ok(await page.evaluate(() => document.querySelector('.cg-viewer').contains(document.activeElement)), 'Focus escaped popup');
    }
    check(`${width}: Shift+Tab cycles inside popup`, true);
    if (width >= 1100) {
      const file = await dialog.locator('.cg-frame').boundingBox();
      check('Large popup uses the available width with surrounding margins', file.x >= 24 && file.x + file.width <= width - 24 && file.width > width * .85);
    }
    await page.screenshot({ path: `${out}/popup-${width}.png` });
    await dialog.getByRole('radio', { name: 'Readable', exact: true }).click();
    check(`${width}: readable view brings the selected column into view`, await dialog.locator('.sv-head .sv-letter[data-target]').evaluate(node => { const r = node.getBoundingClientRect(), frame = document.querySelector('.cg-frame').getBoundingClientRect(); return r.left >= frame.left && r.left < frame.right; }));
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    check(`${width}: closing returns focus and the original editor state`, await page.evaluate(() => document.activeElement?.classList.contains('cg-stage')) && await page.locator('.cg-details textarea').getAttribute('data-review-identity') === 'same-editor' && await page.locator('.cd-exception input').inputValue() === 'Reason kept while inspecting');
    await context.close();
  }
  if (errors.length) console.error('Browser errors:', errors);
  check('No browser errors', errors.length === 0);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(`${results.length} checks passed`);
} finally { await browser.close(); }
