import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Reads only the rendered public documentation pages (text, DOM, computed style, screenshots). No API, registry, CLI or Pro source.
const out = 'docs/research/uiarc-repo';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const route of ['metric-card', 'timeline', 'onboarding-checklist', 'sparkline', 'animated-counter']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const response = await page.goto(`https://uiarc.dev/components/${route}`, { waitUntil: 'networkidle' });
    console.log(route, response?.status());
    await fs.writeFile(`${out}/${route}-docs.txt`, await page.locator('main').innerText());
    const root = page.locator('figure').first();
    if (!(await root.count())) { await page.screenshot({ path: `${out}/${route}-desktop.png` }); await page.close(); continue; }
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/${route}-desktop.png` });
    await fs.writeFile(`${out}/${route}-dom.html`, await root.evaluate(el => el.outerHTML));
    await fs.writeFile(`${out}/${route}-styles.json`, JSON.stringify(await root.evaluate(el => [el, ...el.querySelectorAll('*')].slice(0, 160).map(e => {
      const s = getComputedStyle(e), b = e.getBoundingClientRect();
      return { tag: e.tagName, cls: String(e.className?.baseVal ?? e.className), text: e.childElementCount ? undefined : e.textContent?.slice(0, 80), rect: [b.x, b.y, b.width, b.height].map(Math.round), font: s.font, color: s.color, background: s.backgroundColor, border: s.border, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow, transition: s.transition };
    })), null, 2));
    await fs.writeFile(`${out}/${route}-motion.json`, JSON.stringify(await page.evaluate(() => document.getAnimations().map(a => ({ timing: a.effect?.getTiming(), keyframes: a.effect?.getKeyframes() }))), null, 2));
    await page.hover('figure >> nth=0');
    await page.screenshot({ path: `${out}/${route}-hover.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await root.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/${route}-mobile.png` });
    await page.close();
  }
} finally { await browser.close(); }
