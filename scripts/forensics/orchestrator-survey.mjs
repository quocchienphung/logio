// First look at the three public UIArc previews the Orchestrator section is built from: visible text, the notes printed on the page, the class names of the
// preview, a screenshot. Public rendered pages only: no API, registry, Code tab, bundle or prompt reads.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const pages = {
  'agent-orchestrator': 'https://uiarc.dev/components/blocks/agent-orchestrator',
  'tool-call': 'https://uiarc.dev/components/tool-call',
  'agent-timeline': 'https://uiarc.dev/components/agent-timeline',
};
const root = 'docs/research/orchestrator/source';
const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, url] of Object.entries(pages)) {
  const directory = `${root}/${name}`;
  await fs.mkdir(directory, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => document.body.innerText);
  await fs.writeFile(`${directory}/page-text.txt`, text);
  const classes = await page.evaluate(() => {
    const counts = {};
    for (const el of document.querySelectorAll('main *')) for (const c of el.classList) { const m = c.match(/^([a-z-]+)_[A-Za-z0-9]+_/); const key = m ? m[1] : c.replace(/_[a-z0-9]{4,}$/i, ''); counts[key] = (counts[key] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 60);
  });
  await fs.writeFile(`${directory}/class-families.json`, JSON.stringify(classes, null, 1));
  await page.screenshot({ path: `${directory}/top.png` });
  await page.screenshot({ path: `${directory}/full.png`, fullPage: true });
  console.log(`\n===== ${name} (${text.length} chars) =====`);
  console.log(text.slice(0, 3500));
  console.log('class families:', classes.slice(0, 25).map(([c, n]) => `${c}:${n}`).join(' '));
  await context.close();
}
await browser.close();
