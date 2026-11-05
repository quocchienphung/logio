import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only (https://uiarc.dev/components/speculative-decoding): visible text, DOM, declared CSS, geometry, screenshots over time.
// No API, registry, Code tab, bundle or prompt reads.
const directory = 'docs/research/speculative-decoding/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/speculative-decoding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await fs.writeFile(`${directory}/visible.txt`, await page.locator('body').innerText());
  await page.screenshot({ path: `${directory}/desktop-page.png`, fullPage: true });
  const classes = await page.evaluate(() => [...new Set([...document.querySelectorAll('[class]')].flatMap(n => (n.getAttribute('class') || '').split(/\s+/)).filter(c => /specul|decod/i.test(c)))]);
  await fs.writeFile(`${directory}/classes.json`, JSON.stringify(classes, null, 2));
  console.log('classes', classes.length, classes.slice(0, 90).join(' '));
} finally { await browser.close(); }
