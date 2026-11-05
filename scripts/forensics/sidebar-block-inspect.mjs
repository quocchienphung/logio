import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only (https://uiarc.dev/components/blocks/sidebar): DOM, declared CSS, computed geometry, screenshots.
// No API, registry, Code tab, bundle or prompt reads.
const directory = 'docs/research/uiarc-sidebar-block/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/blocks/sidebar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await fs.writeFile(`${directory}/visible.txt`, await page.locator('body').innerText());
  await page.screenshot({ path: `${directory}/desktop-page.png`, fullPage: true });
  const classes = await page.evaluate(() => [...new Set([...document.querySelectorAll('[class]')].flatMap(n => (n.getAttribute('class') || '').split(/\s+/)).filter(c => /sidebar/i.test(c)))]);
  await fs.writeFile(`${directory}/classes.json`, JSON.stringify(classes, null, 2));
  console.log('classes', classes.length, classes.slice(0, 80).join(' '));
} finally { await browser.close(); }
