// The connector geometry (SVG paths, ports) of the public Agent orchestrator preview at three card widths, with the lane rects they join, and the series colours in both themes.
// Rendered page only. Usage: node scripts/forensics/orchestrator-wires.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/agent-orchestrator';
const browser = await chromium.launch({ channel: 'chrome' });
const out = {};
for (const [name, width, fullscreen] of [['wide', 1440], ['medium', 900], ['narrow', 560], ['full', 1600, true]]) {
  const context = await browser.newContext({ viewport: { width, height: 1400 } });
  const page = await context.newPage();
  await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
  if (fullscreen) { await page.getByRole('button', { name: 'Fullscreen preview' }).click(); await page.waitForTimeout(1500); }
  const root = page.locator('[class*="agent-orchestrator_root"]').first();
  await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const run = root.locator('header button[class*="run"]');
  for (let i = 0; i < 60 && (await run.innerText()).trim() !== 'Run again'; i += 1) await page.waitForTimeout(500);
  await page.waitForTimeout(1200);
  out[name] = await root.evaluate(n => {
    const base = n.getBoundingClientRect(), t = e => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const rect = e => { const r = e.getBoundingClientRect(); return [r.left - base.left, r.top - base.top, r.width, r.height].map(v => +v.toFixed(2)); };
    const svg = n.querySelector('svg[class*="wires"]');
    return {
      card: [base.width, base.height], lanesAttr: n.dataset.lanes,
      svgAttrs: svg ? Object.fromEntries([...svg.attributes].map(a => [a.name, a.value])) : null,
      paths: svg ? [...svg.querySelectorAll('path, circle, line, rect')].map(p => ({ tag: p.tagName, cls: (p.getAttribute('class') ?? '').replace(/agent-orchestrator_|__[A-Za-z0-9_-]{5}/g, ''), d: p.getAttribute('d'), cx: p.getAttribute('cx'), cy: p.getAttribute('cy'), r: p.getAttribute('r'), on: p.hasAttribute('data-on'), style: p.getAttribute('style'), len: p.getTotalLength ? +p.getTotalLength().toFixed(1) : null })) : [],
      lanes: [...n.querySelectorAll('[class*="agent-orchestrator_lane__"]')].map(rect),
      lead: rect(n.querySelector('section[aria-label="Lead agent"]')), leadMark: rect(n.querySelector('section[aria-label="Lead agent"] [class*="nodeMark"]')),
      summary: rect(n.querySelector('section[aria-label="Summary"]')), summaryMark: rect(n.querySelector('section[aria-label="Summary"] [class*="nodeMark"]')),
      flow: rect(n.querySelector('[class*="agent-orchestrator_flow"]')),
    };
  });
  await root.screenshot({ path: `${directory}/wires-${name}.png` });
  if (name === 'wide') {
    out.series = {};
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.setAttribute('data-theme', theme); }, theme);
      await page.waitForTimeout(500);
      out.series[theme] = await root.evaluate(n => ['--series-1', '--series-2', '--series-3', '--series-4', '--accent', '--success', '--danger', '--text-muted'].map(k => { const p = document.createElement('i'); p.style.color = `var(${k})`; n.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return [k, c]; }));
    }
  }
  await context.close();
}
await fs.writeFile(`${directory}/wires.json`, JSON.stringify(out, null, 1));
for (const k of ['wide', 'medium', 'narrow', 'full']) console.log(k, out[k].card, 'lanes', out[k].lanesAttr, 'paths', out[k].paths.length, 'lane rects', JSON.stringify(out[k].lanes));
console.log(JSON.stringify(out.series));
console.log(out.wide.paths.slice(0, 14).map(p => `${p.cls} ${p.d ?? `${p.cx},${p.cy} r${p.r}`} len ${p.len}`).join('\n'));
await browser.close();
