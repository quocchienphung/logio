import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:3000';
const out = 'docs/research/workspace-i18n/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], results = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/personalize?section=home&settings=general`, { waitUntil: 'load', timeout: 90000 });
  await page.locator('.sc-frame').waitFor({ timeout: 60000 });
  const reject = page.getByRole('button', { name: 'Reject all', exact: true });
  if (await reject.isVisible()) await reject.click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${out}/settings-en.png` });
  await page.locator('[data-setting="language"]').getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { name: 'Cài đặt', exact: true }).waitFor();
  await page.waitForTimeout(1400);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('affectui:interface-language'))), 'vi');
  await page.screenshot({ path: `${out}/settings-vi.png` });
  await page.getByRole('button', { name: 'Tìm cài đặt', exact: true }).click();
  await page.locator('.sc-palette input').fill('ngon ngu');
  await page.getByRole('option').filter({ hasText: 'Ngôn ngữ' }).waitFor();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Đóng cài đặt', exact: true }).click();
  for (const section of ['home', 'companies', 'contacts', 'deals', 'reports', 'new-chat', 'files', 'run', 'usage', 'mapping', 'process', 'tracing', 'invoice', 'repo', 'storage', 'new-business', 'renewals', 'partnerships']) {
    await page.goto(`${base}/personalize?section=${section}`, { waitUntil: 'load', timeout: 90000 });
    await page.locator('.crm-page').waitFor({ timeout: 60000 });
    await page.waitForTimeout(1800);
    const data = await page.evaluate(() => {
      const root = document.querySelector('.crm-page'), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const text = [];
      while (walker.nextNode()) {
        const node = walker.currentNode, parent = node.parentElement;
        if (!parent || parent.closest('script,style,pre,code,textarea') || !parent.getClientRects().length) continue;
        const value = node.textContent.trim();
        if (value) text.push(value);
      }
      return { text, overflow: document.documentElement.scrollWidth - innerWidth, font: getComputedStyle(root).fontFamily };
    });
    await page.screenshot({ path: `${out}/${section}-vi.png` });
    assert.ok(data.overflow <= 1, `${section}: page horizontal overflow ${data.overflow}`);
    results.push({ section, ...data });
    console.log(`PASS ${section}`);
  }
  await page.goto(`${base}/skilled`, { waitUntil: 'load', timeout: 90000 });
  await page.getByRole('region', { name: 'Không gian kỹ năng', exact: true }).waitFor({ timeout: 60000 });
  await page.screenshot({ path: `${out}/skilled-vi.png` });
  await page.keyboard.press('Tab');
  await page.locator('.cp-dialog[open]').waitFor();
  await page.locator('.cp-dialog input').fill('quy trinh');
  await page.locator('.cp-dialog').getByText('Quy trình', { exact: true }).waitFor();
  await page.screenshot({ path: `${out}/palette-vi.png` });
  await page.keyboard.press('Escape');
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/personalize?section=home&settings=general`, { waitUntil: 'load' });
    await page.locator('.sc-frame').waitFor();
    await page.waitForTimeout(1200);
    const overflow = await page.locator('.sc-scroller').evaluate(node => node.scrollWidth - node.clientWidth);
    assert.ok(overflow <= 1, `settings ${viewport.width}: overflow ${overflow}`);
    await page.screenshot({ path: `${out}/settings-${viewport.width}-vi.png` });
    await page.getByRole('button', { name: 'Phiên đăng nhập', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/sessions-${viewport.width}-vi.png` });
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log('PASS language save, persistence, settings search, navigation search, 19 sections and responsive settings');
} catch (error) {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors, failure: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
