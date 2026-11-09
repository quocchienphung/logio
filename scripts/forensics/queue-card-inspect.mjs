// Reads the rendered public UIArc Card preview only (DOM, computed styles, declared CSS, screenshots, text). No registry, bundle or API.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'docs/research/collateral-queue/source-card';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
    await page.goto('https://uiarc.dev/components/card', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    if (scheme === 'light') {
      await fs.writeFile(`${out}/card-body.txt`, await page.locator('body').innerText());
      const sheets = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => l.href));
      const css = [];
      for (const href of sheets) { try { css.push(await (await fetch(href)).text()); } catch { /* skip */ } }
      const rules = css.join(String.fromCharCode(10)).split('}').filter(rule => /card/i.test(rule)).map(rule => rule.trim() + '}');
      await fs.writeFile(`${out}/card-declared.css`, rules.join(String.fromCharCode(10)));
      await fs.writeFile(`${out}/card-nodes.json`, JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[class*="card_"], [class*="Card"]')).slice(0, 120).map(e => {
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        return { tag: e.tagName, class: e.className?.baseVal ?? e.className, text: (e.textContent || '').slice(0, 120), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, radius: s.borderRadius, padding: s.padding, gap: s.gap, bg: s.backgroundColor, border: s.border, shadow: s.boxShadow, font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.letterSpacing}`, color: s.color, transition: s.transition };
      })), null, 2));
      await fs.writeFile(`${out}/card-vars.json`, JSON.stringify(await page.evaluate(() => { const s = getComputedStyle(document.documentElement), out = {}; for (const n of Array.from(s)) if (n.startsWith('--')) out[n] = s.getPropertyValue(n).trim(); return out; }), null, 2));
    }
    await page.screenshot({ path: `${out}/card-${scheme}.png`, fullPage: false });
    await page.close();
  }
} finally { await browser.close(); }
