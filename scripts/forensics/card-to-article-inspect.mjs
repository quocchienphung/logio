import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. No gated code, registry, bundles or source-site API.
const out = 'docs/research/card-to-article/source';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto('https://uiarc.dev/components/card-to-article', { waitUntil: 'networkidle' });
    const card = page.getByRole('button', { name: /glass house/ });
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/closed-${width}.png` });
    await page.evaluate(() => {
      window.__article = { samples: [], animations: [] };
      const original = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        if (String(this.className).includes('card-to-article')) window.__article.animations.push({ class: this.className, frames, options });
        return original.call(this, frames, options);
      };
      window.__record = () => {
        const start = performance.now();
        const frame = () => {
          const sheet = document.querySelector('[role=dialog]');
          if (sheet) {
            const r = sheet.getBoundingClientRect(), s = getComputedStyle(sheet);
            window.__article.samples.push({ ms: performance.now() - start, x: r.x, y: r.y, width: r.width, height: r.height, radius: s.borderRadius, transform: s.transform });
          }
          if (performance.now() - start < 1800) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      };
    });
    const source = await card.boundingBox();
    await page.evaluate(() => window.__record());
    await card.click();
    await page.waitForTimeout(1900);
    await page.screenshot({ path: `${out}/open-${width}.png` });
    const opened = await page.getByRole('dialog').boundingBox();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    const capture = await page.evaluate(() => window.__article);
    await fs.writeFile(`${out}/motion-${width}.json`, JSON.stringify({ source, opened, ...capture }, null, 2));
    console.log(JSON.stringify({ width, source, opened, samples: capture.samples.length, animations: capture.animations.length }));
    await page.close();
  }
} finally { await browser.close(); }
