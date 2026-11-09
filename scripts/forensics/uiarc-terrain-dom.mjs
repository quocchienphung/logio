import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Rendered DOM, declared styles and resolved transitions of the public Activity terrain preview, light and dark, three widths.
const out = 'docs/research/uiarc-terrain/source';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const rootOf = page => page.getByRole('heading', { name: 'The shape of your week' }).locator('xpath=ancestor::*[self::section or self::article or self::div][.//canvas][1]');
try {
  for (const [name, width, height, scheme] of [['1440', 1440, 1000, 'light'], ['1440-dark', 1440, 1000, 'dark'], ['820', 820, 1100, 'light'], ['390', 390, 844, 'light']]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
    await page.goto('https://uiarc.dev/components/blocks/activity-terrain', { waitUntil: 'networkidle' });
    if (scheme === 'dark') { await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; }); }
    await page.waitForTimeout(2500);
    const root = rootOf(page);
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await root.screenshot({ path: `${out}/block-${name}.png` });
    await fs.writeFile(`${out}/block-${name}.html`, await root.evaluate(el => el.outerHTML));
    const styles = await root.evaluate(el => [el, ...el.querySelectorAll('*')].slice(0, 400).map(e => {
      const s = getComputedStyle(e), b = e.getBoundingClientRect();
      return { tag: e.tagName, cls: String(e.className?.baseVal ?? e.className).slice(0, 160), role: e.getAttribute('role'), aria: e.getAttribute('aria-label'), pressed: e.getAttribute('aria-pressed'), text: e.childElementCount ? undefined : (e.textContent || '').slice(0, 60),
        rect: [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10],
        font: s.font, color: s.color, bg: s.backgroundColor, border: s.border, radius: s.borderRadius, padding: s.padding, margin: s.margin, gap: s.gap, display: s.display, shadow: s.boxShadow,
        transition: s.transition, touchAction: s.touchAction, letterSpacing: s.letterSpacing, fontVariantNumeric: s.fontVariantNumeric };
    }));
    await fs.writeFile(`${out}/styles-${name}.json`, JSON.stringify(styles, null, 1));
    const vars = await root.evaluate(el => {
      const found = {};
      for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; } for (const r of rules) { if (r.style) for (const p of r.style) if (p.startsWith('--') && /terrain|heat|ramp|accent|surface|muted|border|foreground|background/.test(p)) found[p] = r.style.getPropertyValue(p).trim(); } }
      const s = getComputedStyle(el); const mine = {};
      for (const p of ['--background', '--foreground', '--muted-foreground', '--border', '--card', '--accent', '--primary']) mine[p] = s.getPropertyValue(p).trim();
      return { mine, count: Object.keys(found).length, sample: Object.fromEntries(Object.entries(found).slice(0, 60)) };
    });
    await fs.writeFile(`${out}/vars-${name}.json`, JSON.stringify(vars, null, 1));
    console.log(name, 'done', styles.length, 'elements');
    await page.close();
  }
} finally { await browser.close(); }
