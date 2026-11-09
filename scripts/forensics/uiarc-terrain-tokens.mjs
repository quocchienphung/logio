import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Resolved design tokens (custom properties) seen by the Activity terrain block in light and dark, plus the swatch colours of its legend ramp.
const out = 'docs/research/uiarc-terrain/source';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const result = {};
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
    await page.goto('https://uiarc.dev/components/blocks/activity-terrain', { waitUntil: 'networkidle' });
    if (scheme === 'dark') await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
    await page.waitForTimeout(1500);
    result[scheme] = await page.evaluate(() => {
      const root = document.querySelector('[class*="activity-terrain_root"]');
      const names = new Set();
      for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; } const walk = list => { for (const r of list) { if (r.style) for (const p of r.style) if (p.startsWith('--')) names.add(p); if (r.cssRules) walk(r.cssRules); } }; walk(rules); }
      const style = getComputedStyle(root), tokens = {};
      for (const n of names) { const v = style.getPropertyValue(n).trim(); if (v) tokens[n] = v; }
      const probe = document.createElement('div'); root.appendChild(probe);
      const resolve = expr => { probe.style.color = expr; return getComputedStyle(probe).color; };
      const swatches = [...root.querySelectorAll('[class*="activity-terrain_ramp"] > span')].map(s => getComputedStyle(s).backgroundColor);
      const resolved = { tone: resolve('var(--tone)'), low: resolve('var(--low)'), accent: resolve('var(--accent)'), danger: resolve('var(--danger)'), surface: resolve('var(--surface)'), surfaceMuted: resolve('var(--surface-muted)'), borderStrong: resolve('var(--border-strong)'), textMuted: resolve('var(--text-muted)'), textSecondary: resolve('var(--text-secondary)'), foreground: resolve('var(--foreground)'), border: resolve('var(--border)'), success: resolve('var(--success)') };
      probe.remove();
      return { tokens, swatches, resolved, rootBackground: style.backgroundColor };
    });
    await page.close();
  }
  await fs.writeFile(`${out}/tokens.json`, JSON.stringify(result, null, 1));
  for (const scheme of ['light', 'dark']) console.log(scheme, JSON.stringify(result[scheme].resolved), JSON.stringify(result[scheme].swatches));
} finally { await browser.close(); }
