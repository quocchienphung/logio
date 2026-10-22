import { chromium } from 'playwright';

// Quick look at the terrain section of /skilled: screenshot after the intro, console errors, basic sizes.
const base = process.argv[2] || 'http://localhost:3000';
const out = process.argv[3] || 'docs/research/uiarc-terrain/qa';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  await page.goto(`${base}/skilled`, { waitUntil: 'networkidle' });
  const root = page.locator('.sk-terrain .at');
  await root.waitFor({ timeout: 30000 });
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(5000);
  await root.screenshot({ path: `${out}/peek-desktop.png` });
  const info = await page.evaluate(() => { const c = document.querySelector('.at__canvas'); const p = document.querySelector('.at__plot'); return { canvas: [c.width, c.height], plot: [p.clientWidth, p.clientHeight], label: c.getAttribute('aria-label') }; });
  console.log(JSON.stringify(info), 'errors', JSON.stringify(errors));
} finally { await browser.close(); }
