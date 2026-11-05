// Frame recording of the public Agent timeline's replay: the clock (--now), the header's counters, which spans are active/done, the links and ports as they draw,
// the playhead, then speed 2x, pause and scrub. Rendered page only. Usage: node scripts/forensics/timeline-replay.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/agent-timeline';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.addInitScript(() => {
  window.__f = []; window.__on = false;
  window.__go = () => {
    window.__f = []; window.__on = true; const t0 = performance.now();
    const tick = () => {
      if (!window.__on) return;
      const root = document.querySelector('section[class*="agent-timeline_root"]');
      if (root) {
        const body = root.querySelector('[class*="agent-timeline_body"]'), plot = root.querySelector('[class*="agent-timeline_plot"]');
        const t = e => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
        const layers = [...root.querySelectorAll('[class*="agent-timeline_layer"]')].map(l => [l.dataset.on ? 1 : 0, t(l).slice(0, 90)]);
        const spans = [...root.querySelectorAll('button[data-span-id]')].map(b => b.dataset.state[0] + (b.hasAttribute('data-failed') ? 'F' : '')).join('');
        const links = [...root.querySelectorAll('[class*="agent-timeline_link__"]')].map(l => (l.hasAttribute('data-draw') ? 1 : 0));
        const ports = [...root.querySelectorAll('[class*="agent-timeline_port__"]')].map(l => (l.hasAttribute('data-draw') ? 1 : 0));
        const head = root.querySelector('[class*="agent-timeline_status"]');
        const head0 = [...head.querySelectorAll('[class*="agent-timeline_countValue"]')].map(e => e.textContent);
        const word = [...head.querySelectorAll('[class*="agent-timeline_wordItem"]')].map(e => e.hasAttribute('data-on') ? 1 : 0).join('');
        const ph = root.querySelector('[class*="agent-timeline_playhead"]');
        const knob = root.querySelector('[class*="agent-timeline_knob"]');
        window.__f.push({ t: +(performance.now() - t0).toFixed(1), now: +body.style.getPropertyValue('--now'), plotNow: +plot.style.getPropertyValue('--now'), axis: +body.style.getPropertyValue('--axis'), counters: head0, word, layers, spans, links, ports, ph: ph ? [+(+getComputedStyle(ph).opacity).toFixed(2), ph.hasAttribute('data-settled') ? 1 : 0] : null, knob: knob ? Math.round(knob.getBoundingClientRect().left) : null, sr: t(root.querySelector('[role="status"]')).slice(0, 120), play: t(root.querySelector('[class*="agent-timeline_glyph"]')).length, playing: root.querySelector('[class*="agent-timeline_glyph"]')?.hasAttribute('data-playing') ? 1 : 0, plotLeft: Math.round(plot.getBoundingClientRect().left), plotW: Math.round(plot.getBoundingClientRect().width) });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
});
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/agent-timeline', { waitUntil: 'networkidle' });
const root = page.locator('section[class*="agent-timeline_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
// wait for the autoplay to end, then restart under the recorder
for (let i = 0; i < 120; i += 1) { if (await root.evaluate(n => [...n.querySelectorAll('[class*="agent-timeline_layer"]')].some(l => l.dataset.on && /Finished/.test(l.textContent)))) break; await page.waitForTimeout(500); }
await page.waitForTimeout(800);
console.log('controls:', await root.evaluate(n => [...n.querySelectorAll('footer button, [class*="agent-timeline_controls"] button')].map(b => `${b.getAttribute('aria-label') ?? b.textContent}|${b.getAttribute('aria-pressed')}`)));
await page.evaluate(() => window.__go());
await page.waitForTimeout(40);
await root.getByRole('button', { name: /restart|replay/i }).first().click();
await page.waitForTimeout(31000);
const frames = await page.evaluate(() => { window.__on = false; return window.__f; });
await fs.writeFile(`${directory}/replay-1x.json`, JSON.stringify(frames));
console.log('frames', frames.length, 'last', JSON.stringify(frames.at(-1)).slice(0, 400));
await browser.close();
