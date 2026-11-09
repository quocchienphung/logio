import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only (https://uiarc.dev/components/product-gallery): DOM, declared CSS, computed styles, screenshots.
// No API, registry, Code tab, bundle, or prompt reads.
const directory = 'docs/research/product-gallery/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/product-gallery', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await fs.writeFile(`${directory}/visible.txt`, await page.locator('body').innerText());
  await page.screenshot({ path: `${directory}/desktop-page.png`, fullPage: true });
  const classes = await page.evaluate(() => [...new Set([...document.querySelectorAll('[class]')].flatMap(n => (n.getAttribute('class') || '').split(/\s+/)).filter(c => /gallery/i.test(c)))]);
  await fs.writeFile(`${directory}/gallery-classes.json`, JSON.stringify(classes, null, 2));
  console.log('gallery classes:', classes.slice(0, 60));
} finally { await browser.close(); }
