import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview of UIArc's JSON viewer: the DOM of the card as a flat list of elements with their roles and attributes, the tokens
// it reads, and the buttons of the toolbar. Nothing but the rendered page is read.
const directory = 'docs/research/json-viewer/source';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto('https://uiarc.dev/components/json-viewer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const root = page.locator('[class*="json-viewer_root"]').first();
  await root.scrollIntoViewIfNeeded();
  const dump = await page.evaluate(() => {
    const root = document.querySelector('[class*="json-viewer_root"]');
    const short = c => String(c).replace(/json-viewer_([A-Za-z]+)__\S+/g, 'jv_$1').replace(/\s+/g, ' ').trim();
    const rows = [];
    const walk = (n, depth) => {
      if (n.nodeType !== 1) return;
      const attrs = {}; for (const a of n.attributes) if (a.name !== 'class' && a.name !== 'style') attrs[a.name] = a.value.slice(0, 80);
      const style = n.getAttribute('style');
      rows.push({ d: depth, tag: n.tagName.toLowerCase(), cls: short(n.className?.baseVal ?? n.className ?? ''), attrs, style: style ? style.slice(0, 160) : undefined, text: n.children.length ? undefined : n.textContent.trim().slice(0, 60) });
      for (const c of n.children) walk(c, depth + 1);
    };
    walk(root, 0);
    const cs = getComputedStyle(root);
    const tokens = Object.fromEntries(['--border', '--border-subtle', '--surface', '--surface-muted', '--foreground', '--text-secondary', '--text-muted', '--success', '--accent', '--warning', '--danger', '--radius-panel', '--duration-fast', '--duration-standard', '--duration-spring', '--ease-standard', '--ease-enter', '--ease-spring', '--text-xs', '--text-sm', '--font-body', '--tracking-body', '--space-3'].map(k => [k, cs.getPropertyValue(k).trim()]));
    return { count: rows.length, rows: rows.slice(0, 140), tokens, rootRect: JSON.stringify(root.getBoundingClientRect()), toolbar: [...root.querySelectorAll('[class*="jv"] button, button')].slice(0, 12).map(b => ({ label: b.getAttribute('aria-label'), title: b.getAttribute('title'), cls: short(b.className), disabled: b.disabled })) };
  });
  await fs.writeFile(`${directory}/dom-flat.json`, JSON.stringify(dump, null, 1));
  console.log('elements', dump.count); console.log(JSON.stringify(dump.tokens)); console.log(JSON.stringify(dump.toolbar));
  const lines = dump.rows.slice(0, 60).map(r => `${' '.repeat(r.d)}${r.tag}.${r.cls} ${JSON.stringify(r.attrs)}${r.style ? ' style=' + r.style : ''}${r.text ? ' "' + r.text + '"' : ''}`);
  console.log(lines.join('\n'));
} finally { await browser.close(); }
