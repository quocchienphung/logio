// Visual reference contact sheets; content is intentionally the real local Process, not UIArc's sample coding task.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const base = process.argv[2] || 'http://localhost:3001';
const out = 'docs/research/process-agent-run';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true, preferences: false, analytics: false, marketing: false }, version: '1', updatedAt: new Date().toISOString() })));
const page = await context.newPage();
await page.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
await page.locator('.prun-orb').click();
await page.locator('.prun').getByRole('button', { name: 'Start run', exact: true }).click();
await page.waitForSelector('.prun-step[data-state=waiting]');
await page.waitForTimeout(1000);
await page.locator('.prun').screenshot({ path: `${out}/local-card-desktop-waiting.png` });
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
await page.locator('.prun').screenshot({ path: `${out}/local-card-mobile-waiting.png` });
await browser.close();
for (const [name, source, local] of [
  ['desktop', 'source-waiting.png', 'local-card-desktop-waiting.png'],
  ['mobile', 'source-mobile-waiting.png', 'local-card-mobile-waiting.png'],
]) {
  const left = PNG.sync.read(await fs.readFile(`${out}/${source}`)), right = PNG.sync.read(await fs.readFile(`${out}/${local}`));
  const sheet = new PNG({ width: left.width + right.width + 24, height: Math.max(left.height, right.height) }); sheet.data.fill(245);
  for (const [img, x] of [[left, 0], [right, left.width + 24]]) PNG.bitblt(img, sheet, 0, 0, img.width, img.height, x, 0);
  await fs.writeFile(`${out}/comparison-${name}.png`, PNG.sync.write(sheet));
}
console.log('Saved desktop and mobile contact sheets (source left / Process right; no fabricated similarity score).');
