import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Inspect only the public rendered preview; record the reverse morph as well as entrance.
const out = 'docs/research/card-to-article/return-source';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto('https://uiarc.dev/components/card-to-article', { waitUntil: 'networkidle' });
    const card = page.getByRole('button', { name: /glass house/ });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__returnFrames = [];
      const start = performance.now();
      const sample = () => {
        const dialog = document.querySelector('[role=dialog]');
        const card = [...document.querySelectorAll('button')].find(n => /glass house/i.test(n.textContent));
        const box = n => { if (!n) return null; const r = n.getBoundingClientRect(), s = getComputedStyle(n); return { x: r.x, y: r.y, w: r.width, h: r.height, opacity: s.opacity, visibility: s.visibility, transform: s.transform }; };
        window.__returnFrames.push({ ms: performance.now() - start, dialog: box(dialog), card: box(card) });
        if (performance.now() - start < 1600) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1700);
    const frames = await page.evaluate(() => window.__returnFrames);
    await fs.writeFile(`${out}/close-${width}.json`, JSON.stringify(frames, null, 2));
    await page.screenshot({ path: `${out}/returned-${width}.png` });
    console.log(JSON.stringify({ width, frames: frames.length, lastDialog: frames.findLast(f => f.dialog) }));
    await page.close();
  }
} finally { await browser.close(); }
