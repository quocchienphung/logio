// The declared CSS of each preview's class family, the resolved design tokens it uses (light and dark), the root's DOM and computed styles of every element.
// Public rendered pages only. Usage: node scripts/forensics/orchestrator-css.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const targets = {
  'agent-orchestrator': { url: 'https://uiarc.dev/components/blocks/agent-orchestrator', family: 'agent-orchestrator_', rootSel: '[class*="agent-orchestrator_root"]' },
  'tool-call': { url: 'https://uiarc.dev/components/tool-call', family: 'tool-call_', rootSel: '[class*="tool-call_demo"]' },
  'agent-timeline': { url: 'https://uiarc.dev/components/agent-timeline', family: 'agent-timeline_', rootSel: '[class*="agent-timeline_root"]' },
};
const root = 'docs/research/orchestrator/source';
const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, { url, family, rootSel }] of Object.entries(targets)) {
  const directory = `${root}/${name}`;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const el = page.locator(rootSel).first();
  await el.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(600);

  await fs.writeFile(`${directory}/root.html`, await el.evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, m => m.length > 700 ? '<svg…/>' : m)));

  const declared = await page.evaluate(family => {
    const out = [];
    const walk = (rules, prefix) => {
      for (const r of rules) {
        if (r.cssRules && !r.selectorText) walk([...r.cssRules], `${prefix}@${r.conditionText ?? r.name ?? ''} `);
        else if (r.selectorText && (r.selectorText.includes(family) || /keyframes/i.test(r.constructor.name))) out.push(`${prefix}${r.cssText}`);
        else if (r.name && r.cssRules && r.name.includes(family.replace('_', ''))) out.push(`${prefix}${r.cssText}`);
      }
    };
    for (const sheet of document.styleSheets) { try { walk([...sheet.cssRules], ''); } catch { /* cross-origin */ } }
    return out.filter(rule => rule.includes(family) || /@keyframes (agent|tool|orchestr)/i.test(rule));
  }, family);
  await fs.writeFile(`${directory}/declared.css`, declared.join('\n\n'));

  // every custom property the declared CSS reads, resolved on the component's root (light) …
  const names = [...new Set(declared.join('\n').match(/var\(--[a-z0-9-]+/gi)?.map(v => v.slice(4)) ?? [])];
  const resolve = () => el.evaluate((n, names) => Object.fromEntries(names.map(k => [k, getComputedStyle(n).getPropertyValue(k).trim()])), names);
  const light = await resolve();
  await fs.writeFile(`${directory}/tokens-light.json`, JSON.stringify(light, null, 1));
  await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.setAttribute('data-theme', 'dark'); document.documentElement.style.colorScheme = 'dark'; });
  await page.waitForTimeout(700);
  const dark = await resolve();
  await fs.writeFile(`${directory}/tokens-dark.json`, JSON.stringify(dark, null, 1));
  await el.screenshot({ path: `${directory}/root-dark.png` });
  await page.evaluate(() => { document.documentElement.classList.remove('dark'); document.documentElement.setAttribute('data-theme', 'light'); document.documentElement.style.colorScheme = 'light'; });
  await page.waitForTimeout(600);
  await el.screenshot({ path: `${directory}/root-light.png` });

  // computed styles of every element of the root, with its rect relative to the root
  const computed = await el.evaluate(n => {
    const base = n.getBoundingClientRect();
    const keys = ['display', 'position', 'flexDirection', 'alignItems', 'justifyContent', 'gap', 'rowGap', 'columnGap', 'gridTemplateColumns', 'padding', 'margin', 'width', 'height', 'minWidth', 'maxWidth', 'overflow', 'boxSizing',
      'color', 'backgroundColor', 'backgroundImage', 'border', 'borderRadius', 'boxShadow', 'opacity', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontVariantNumeric', 'textOverflow', 'whiteSpace',
      'transform', 'transition', 'animation', 'filter', 'cursor', 'outline', 'strokeDasharray', 'strokeDashoffset'];
    return [n, ...n.querySelectorAll('*')].slice(0, 600).map((e, i) => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      const style = {};
      for (const k of keys) { const v = s[k]; if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)' && v !== 'visible' && v !== 'static') style[k] = v; }
      return { i, tag: e.tagName.toLowerCase(), cls: [...e.classList].map(c => c.replace(/_[A-Za-z0-9_-]{5}$/, '')).join(' '), text: e.childElementCount === 0 ? (e.textContent || '').trim().slice(0, 60) : undefined, role: e.getAttribute('role') || undefined, aria: e.getAttribute('aria-label') || undefined,
        rect: [r.left - base.left, r.top - base.top, r.width, r.height].map(v => +v.toFixed(2)), style };
    });
  });
  await fs.writeFile(`${directory}/computed.json`, JSON.stringify(computed));
  console.log(name, 'declared rules', declared.length, 'tokens', names.length, 'elements', computed.length);
  await context.close();
}
await browser.close();
