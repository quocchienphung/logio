import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Reads only the rendered public documentation page (text, DOM, computed style, motion, screenshots). No API, registry, CLI or Pro source.
const out = 'docs/research/uiarc-split-bar';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const response = await page.goto('https://uiarc.dev/components/split-bar', { waitUntil: 'networkidle' });
  console.log('status', response?.status());
  await fs.writeFile(`${out}/docs.txt`, await page.locator('main').innerText());
  await page.screenshot({ path: `${out}/page-desktop.png`, fullPage: false });
  const figures = await page.locator('figure').count();
  console.log('figures', figures);
  for (let i = 0; i < Math.min(figures, 4); i++) {
    const root = page.locator('figure').nth(i);
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1800);
    await root.screenshot({ path: `${out}/figure-${i}.png` });
    await fs.writeFile(`${out}/figure-${i}-dom.html`, await root.evaluate(el => el.outerHTML));
    await fs.writeFile(`${out}/figure-${i}-styles.json`, JSON.stringify(await root.evaluate(el => [el, ...el.querySelectorAll('*')].slice(0, 200).map(e => {
      const s = getComputedStyle(e), b = e.getBoundingClientRect();
      return { tag: e.tagName, cls: String(e.className?.baseVal ?? e.className), role: e.getAttribute('role'), aria: e.getAttribute('aria-label'), text: e.childElementCount ? undefined : e.textContent?.slice(0, 80), rect: [b.x, b.y, b.width, b.height].map(v => Math.round(v * 10) / 10), font: s.font, color: s.color, background: s.backgroundColor, border: s.border, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow, transition: s.transition, cursor: s.cursor };
    })), null, 2));
    await fs.writeFile(`${out}/figure-${i}-motion.json`, JSON.stringify(await page.evaluate(() => document.getAnimations().map(a => ({ timing: a.effect?.getTiming(), keyframes: a.effect?.getKeyframes() }))), null, 2));
  }
  await page.close();
} finally { await browser.close(); }
