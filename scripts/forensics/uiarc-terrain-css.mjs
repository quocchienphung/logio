import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Declared CSS (the stylesheet rules the browser applied) of the public Activity terrain preview: terrain, segmented control, counter.
const out = 'docs/research/uiarc-terrain/source';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/blocks/activity-terrain', { waitUntil: 'networkidle' });
  const css = await page.evaluate(() => {
    const keep = /activity-terrain_|segmented-control_|animated-counter_/;
    const lines = [];
    const walk = (rules, indent) => {
      for (const rule of rules) {
        if (rule.cssRules && rule.conditionText !== undefined && !rule.selectorText) {
          const before = lines.length;
          lines.push(`${indent}@media ${rule.conditionText} {`);
          walk(rule.cssRules, indent + '  ');
          if (lines.length === before + 1) lines.pop(); else lines.push(`${indent}}`);
        } else if (rule.type === 7) {
          lines.push(`${indent}${rule.cssText}`);
        } else if (rule.selectorText && keep.test(rule.selectorText)) {
          lines.push(`${indent}${rule.cssText}`);
        } else if (rule.type === 4 || rule.constructor.name === 'CSSContainerRule') {
          const before = lines.length;
          lines.push(`${indent}@container ${rule.conditionText ?? ''} {`);
          walk(rule.cssRules, indent + '  ');
          if (lines.length === before + 1) lines.pop(); else lines.push(`${indent}}`);
        }
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, ''); } catch { /* cross-origin */ } }
    return lines.join('\n');
  });
  await fs.writeFile(`${out}/declared-css.css`, css);
  console.log('bytes', css.length, 'lines', css.split('\n').length);
} finally { await browser.close(); }
