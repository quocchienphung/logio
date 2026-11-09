// The @keyframes the three previews declare (spin, chunk fade, shine, link draw, port pop, shimmer), read from the rendered pages' style sheets.
// Usage: node scripts/forensics/orchestrator-keyframes.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const pages = ['https://uiarc.dev/components/blocks/agent-orchestrator', 'https://uiarc.dev/components/tool-call', 'https://uiarc.dev/components/agent-timeline'];
const browser = await chromium.launch({ channel: 'chrome' });
const all = new Map();
for (const url of pages) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const found = await page.evaluate(() => {
    const out = [];
    const walk = rules => { for (const r of rules) { if (r.constructor.name === 'CSSKeyframesRule' && /^(agent-orchestrator|tool-call|agent-timeline|text-shimmer)_/.test(r.name)) out.push(r.cssText); else if (r.cssRules) walk([...r.cssRules]); } };
    for (const sheet of document.styleSheets) { try { walk([...sheet.cssRules]); } catch { /* cross-origin */ } }
    return out;
  });
  for (const k of found) all.set(k.replace(/__[A-Za-z0-9_-]{5}/g, ''), 1);
  await page.close();
}
const text = [...all.keys()].join('\n\n');
await fs.writeFile('docs/research/orchestrator/source/keyframes.css', text);
console.log(text);
await browser.close();
