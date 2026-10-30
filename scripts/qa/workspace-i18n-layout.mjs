import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:3001', out = 'docs/research/workspace-i18n/layout';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }), results = [], errors = [];
const sections = ['home', 'companies', 'contacts', 'deals', 'reports', 'new-chat', 'files', 'run', 'usage', 'mapping', 'process', 'tracing', 'orchestrator', 'invoice', 'repo', 'storage', 'new-business', 'renewals', 'partnerships'];
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('affectui:interface-language', '"vi"'));
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    for (const section of [...sections, 'skilled']) {
      await page.goto(`${base}/${section === 'skilled' ? 'skilled' : `personalize?section=${section}`}`, { waitUntil: 'load', timeout: 60000 });
      await page.locator('.crm-page[lang="vi"]').waitFor();
      const reject = page.getByRole('button', { name: 'Reject all', exact: true }); if (await reject.isVisible()) await reject.click();
      await page.waitForTimeout(800);
      await page.evaluate(() => document.fonts.ready);
      const measurement = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, font: getComputedStyle(document.querySelector('.crm-page')).fontFamily }));
      results.push({ viewport, section, ...measurement });
      assert.ok(measurement.overflow <= 1, `${section} at ${viewport.width}: overflow ${measurement.overflow}`);
      if (viewport.width === 390 && ['home', 'reports', 'process', 'invoice', 'storage', 'skilled'].includes(section)) await page.screenshot({ path: `${out}/${section}-390-vi.png` });
    }
    await page.goto(`${base}/personalize?browse=1`, { waitUntil: 'load' });
    await page.locator('.guide-page[lang="vi"]').waitFor(); await page.waitForTimeout(800);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${out}/guide-${viewport.width}-vi.png` });
    console.log(`PASS 20 sections and Guide selector at ${viewport.width}`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
