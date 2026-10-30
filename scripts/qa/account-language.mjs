import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:3000', out = 'docs/research/workspace-i18n/account-menu';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }), errors = [], checks = [];
const menuSelector = '.ui-as-user-menu > .ui-as-menu';
async function openMenu(page) {
  if (!await page.locator('.ui-as-user').isVisible()) await page.locator('.ui-as-side-open').click();
  await page.locator('.ui-as-user').click(); await page.locator(menuSelector).waitFor();
  await page.waitForTimeout(650);
  return page.locator(menuSelector);
}
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: viewport.width === 1440 ? 'no-preference' : 'reduce' });
    await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true, preferences: false, analytics: false, marketing: false }, version: '1', updatedAt: new Date().toISOString() })));
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/personalize?section=home`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('.ui-as-user').waitFor({ state: 'attached' });
    const menu = await openMenu(page);
    const theme = menu.locator('.account-theme:not(.account-language)'), language = menu.locator('.account-language');
    const duration = await language.locator('.account-theme__thumb').evaluate(node => parseFloat(getComputedStyle(node).transitionDuration));
    assert.ok(viewport.width === 1440 ? duration === 0.58 : duration <= 0.001);
    if (viewport.width === 1440) await page.screenshot({ path: `${out}/menu-light.png` });
    const a = await theme.locator('.account-theme__segments').boundingBox(), b = await language.locator('.account-theme__segments').boundingBox();
    assert.equal(b.width, 80); assert.equal(a.height, b.height); assert.equal(a.x + a.width, b.x + b.width); assert.ok(b.y > a.y);
    await language.getByRole('menuitemradio', { name: 'Tiếng Việt', exact: true }).click();
    await page.locator('.crm-page[lang="vi"]').waitFor();
    assert.equal(await language.getByRole('menuitemradio', { name: 'Tiếng Việt', exact: true }).getAttribute('aria-checked'), 'true');
    assert.ok(await menu.isVisible());
    await language.getByRole('menuitemradio', { name: 'Tiếng Việt', exact: true }).press('ArrowLeft');
    assert.equal(await language.getByRole('menuitemradio', { name: 'English', exact: true }).getAttribute('aria-checked'), 'true');
    await language.getByRole('menuitemradio', { name: 'English', exact: true }).press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '/');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'English');
    await language.getByRole('menuitemradio', { name: 'English', exact: true }).press('End');
    await theme.getByRole('menuitemradio', { name: 'Tối', exact: true }).click();
    await page.waitForTimeout(650);
    const labelFits = await language.locator(':scope > span').evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      const text = range.getBoundingClientRect(), box = node.getBoundingClientRect();
      return text.width <= box.width + 1 && text.height <= parseFloat(getComputedStyle(node).lineHeight) + 1;
    });
    assert.ok(labelFits, 'Vietnamese language label stays on one line without overlap');
    const thumb = await language.locator('.account-theme__thumb').boundingBox(), selected = await language.locator('button[aria-checked="true"]').boundingBox();
    assert.equal(thumb.x, selected.x); assert.equal(thumb.width, selected.width);
    const geometry = await menu.evaluate(node => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, overflow: node.scrollWidth - node.clientWidth };
    });
    await page.screenshot({ path: `${out}/menu-${viewport.width}x${viewport.height}.png` });
    assert.ok(geometry.x >= -1 && geometry.y >= -1 && geometry.bottom <= viewport.height + 1 && geometry.overflow <= 1, `menu fits ${JSON.stringify({ viewport, geometry })}`);
    await page.reload({ waitUntil: 'networkidle' }); await page.locator('.crm-page[lang="vi"]').waitFor();
    await openMenu(page);
    assert.equal(await page.locator('[data-language-option][aria-checked="true"]').getAttribute('lang'), 'vi');
    assert.equal(await page.locator('.crm-page').getAttribute('data-theme'), 'dark');
    if (viewport.width === 1440) {
      await page.locator(menuSelector).getByRole('menuitem', { name: 'Cài đặt', exact: true }).click();
      await page.locator('.sc-frame').waitFor();
      assert.equal(await page.locator('[data-setting="language"]').getByRole('button', { name: 'Tiếng Việt', exact: true }).getAttribute('aria-pressed'), 'true');
    }
    checks.push({ viewport, geometry }); console.log(`PASS account Language ${viewport.width}x${viewport.height}`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await fs.writeFile(`${out}/results.json`, JSON.stringify({ checks, errors }, null, 2)); await browser.close(); }
