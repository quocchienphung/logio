// Reads the rendered public UIArc Motion guide and a few overlay component pages (text only) for their spring / duration vocabulary.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'docs/research/collateral-queue/source-card';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, url] of [['motion-guide', 'https://uiarc.dev/docs/motion'], ['expandable-card', 'https://uiarc.dev/components/expandable-card'], ['drawer', 'https://uiarc.dev/components/drawer'], ['popover', 'https://uiarc.dev/components/popover'], ['hover-card', 'https://uiarc.dev/components/hover-card']]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2500);
      const text = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
      await fs.writeFile(`${out}/arc-${name}.txt`, text);
      console.log(name, text.length);
    } catch (e) { console.log(name, 'failed', String(e).slice(0, 80)); }
    await page.close();
  }
} finally { await browser.close(); }
