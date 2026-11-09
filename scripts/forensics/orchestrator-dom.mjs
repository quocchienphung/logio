// DOM, declared CSS and computed styles of the public Agent orchestrator / Tool call / Agent timeline previews (rendered pages only).
// Usage: node scripts/forensics/orchestrator-dom.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const targets = {
  'agent-orchestrator': { url: 'https://uiarc.dev/components/blocks/agent-orchestrator', anchor: 'Concurrency' },
  'tool-call': { url: 'https://uiarc.dev/components/tool-call', anchor: 'Used 3 tools' },
  'agent-timeline': { url: 'https://uiarc.dev/components/agent-timeline', anchor: 'Orchestrator' },
};
const root = 'docs/research/orchestrator/source';
const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, { url, anchor }] of Object.entries(targets)) {
  const directory = `${root}/${name}`;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // the preview card: the largest ancestor of the anchor text that is still inside the preview frame
  const handle = await page.evaluateHandle(anchor => {
    const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) if (node.textContent.trim() === anchor && node.parentElement.getBoundingClientRect().width > 0) {
      let el = node.parentElement;
      // climb to the element that carries the component's class family
      while (el.parentElement && !/^(agent-|tool-call|orchestr)/.test([...el.classList].join(' ').replace(/^[^ ]*?(agent|tool)/, '$1')) && el.parentElement !== document.body) el = el.parentElement;
      return el;
    }
    return null;
  }, anchor);
  const info = await page.evaluate(el => {
    if (!el) return null;
    const chain = [];
    for (let p = el; p && p !== document.body; p = p.parentElement) chain.push(`${p.tagName.toLowerCase()}.${[...p.classList].join('.')} ${Math.round(p.getBoundingClientRect().width)}x${Math.round(p.getBoundingClientRect().height)}`);
    return chain.slice(0, 10);
  }, handle);
  console.log(`\n== ${name}`, info);
  await fs.writeFile(`${directory}/ancestors.json`, JSON.stringify(info, null, 1));
  await context.close();
}
await browser.close();
