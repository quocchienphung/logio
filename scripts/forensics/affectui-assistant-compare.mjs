import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/affectui-assistant/comparison';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const metrics = [];
try {
  for (const [width, height] of [[1440, 1000], [390, 844], [768, 1024], [1920, 1080]]) {
    const captures = [];
    for (const [label, url] of [['source', 'https://www.affectui.com/screens/assistant-home/full'], ['local', `${base}/personalize?section=new-chat`]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.locator('.ui-as-start__title').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await page.waitForTimeout(500);
      await page.mouse.move(width - 2, height - 2);
      await page.screenshot({ path: `${out}/${label}-${width}.png` });
      const png = PNG.sync.read(await page.locator('.ui-as-start').screenshot({ path: `${out}/${label}-content-${width}.png` }));
      const geometry = await page.locator('.ui-as-start').evaluate(root => {
        const rect = root.getBoundingClientRect();
        const fields = {};
        for (const selector of ['.ui-as-start__title', '.ui-as-composer', '.ui-as-composer__field', '.ui-as-chips', '.ui-as-chip']) {
          const node = root.querySelector(selector), box = node.getBoundingClientRect(), style = getComputedStyle(node);
          fields[selector] = { x: box.x - rect.x, y: box.y - rect.y, width: box.width, height: box.height, font: style.font, letterSpacing: style.letterSpacing };
        }
        return { content: { width: rect.width, height: rect.height }, fields, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      captures.push({ png, geometry });
      await page.close();
    }
    const [a, b] = captures;
    const sameSize = a.png.width === b.png.width && a.png.height === b.png.height;
    let diffPercent = null;
    if (sameSize) {
      const diff = new PNG({ width: a.png.width, height: a.png.height });
      diffPercent = pixelmatch(a.png.data, b.png.data, diff.data, a.png.width, a.png.height, { threshold: 0.15 }) / a.png.width / a.png.height * 100;
      await fs.writeFile(`${out}/diff-${width}.png`, PNG.sync.write(diff));
    }
    metrics.push({ viewport: { width, height }, contentDiffPercent: diffPercent, source: a.geometry, local: b.geometry });
    console.log(`${width}×${height}: ${diffPercent?.toFixed(4) ?? 'different content sizes'}% content difference; overflow=${b.geometry.overflow}`);
  }
} finally {
  await fs.writeFile(`${out}/metrics.json`, JSON.stringify(metrics, null, 2));
  await browser.close();
}
