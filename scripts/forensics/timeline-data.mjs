// The sample run of the public Agent timeline preview as data (agents, spans, handoff links), read from the finished chart's DOM and each span's hover card.
// Rendered page only. Usage: node scripts/forensics/timeline-data.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/agent-timeline';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/agent-timeline', { waitUntil: 'networkidle' });
const root = page.locator('section[class*="agent-timeline_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
// wait for the replay to finish: the finished layer of the status shows
for (let i = 0; i < 120; i += 1) {
  const finished = await root.evaluate(n => [...n.querySelectorAll('[class*="agent-timeline_layer"]')].some(l => l.dataset.on === 'true' && /Finished/.test(l.textContent)));
  if (finished) break;
  await page.waitForTimeout(500);
}
await page.waitForTimeout(900);
await root.screenshot({ path: `${directory}/finished.png` });
const data = await root.evaluate(n => {
  const t = e => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const body = n.querySelector('[class*="agent-timeline_body"]');
  const vars = Object.fromEntries(['--now', '--axis', '--rows-h', '--row', '--bar', '--pad', '--axis-h'].map(k => [k, body.style.getPropertyValue(k)]));
  const labels = [...n.querySelectorAll('[class*="agent-timeline_label__"]')].map(l => ({ name: t(l.querySelector('[class*="agent-timeline_name"]')), model: t(l.querySelector('[class*="agent-timeline_modelName"]')), c: l.getAttribute('style') }));
  const rows = [...n.querySelectorAll('[class*="agent-timeline_row__"]')].map(r => ({ top: r.style.top, c: r.getAttribute('style'), spans: [...r.querySelectorAll('button')].map(b => ({ id: b.dataset.spanId, kind: b.dataset.kind, state: b.dataset.state, s: b.style.getPropertyValue('--s'), d: b.style.getPropertyValue('--d'), label: b.getAttribute('aria-label'), failed: b.hasAttribute('data-failed') || b.dataset.status || undefined, extra: [...b.attributes].map(a => a.name).filter(a => !['type', 'class', 'style', 'aria-label', 'aria-pressed', 'tabindex', 'data-span-id', 'data-kind', 'data-state'].includes(a)) })) }));
  const links = [...n.querySelectorAll('[class*="agent-timeline_link__"]')].map(l => ({ shape: l.dataset.shape, dir: l.dataset.dir, draw: l.dataset.draw, style: l.getAttribute('style') }));
  const ports = [...n.querySelectorAll('[class*="agent-timeline_port"]')].map(l => ({ cls: l.className, style: l.getAttribute('style') }));
  const axis = [...n.querySelectorAll('[class*="agent-timeline_tick"]')].map(l => ({ text: t(l), style: l.getAttribute('style') }));
  const classes = [...new Set([...n.querySelectorAll('*')].flatMap(e => [...e.classList]).map(c => c.replace(/_[A-Za-z0-9_-]{5}$/, '')))];
  return { vars, labels, rows, links, ports, axis, classes, legend: t(n.querySelector('[class*="agent-timeline_legend"]')), controls: t(n.querySelector('[class*="agent-timeline_controls"]')), statusDone: t([...n.querySelectorAll('[class*="agent-timeline_layer"]')].find(l => /Finished/.test(l.textContent))) };
});
await fs.writeFile(`${directory}/sample-run.json`, JSON.stringify(data, null, 1));
console.log(data.vars, data.labels.map(l => `${l.name}/${l.model}`).join(' | '));
for (const row of data.rows) for (const s of row.spans) console.log(s.id.padEnd(14), s.kind.padEnd(9), String(s.s).padStart(6), String(s.d).padStart(7), s.extra.join(','), '|', s.label);
console.log(data.links.length, 'links'); data.links.forEach(l => console.log(' ', l.shape, l.dir, l.style));
console.log('classes:', data.classes.join(' '));
console.log('legend:', data.legend, '| controls:', data.controls, '| done:', data.statusDone);
await browser.close();
