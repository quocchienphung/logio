// The Agent timeline's span card (hover) and pinned handoff path, frame by frame: the card's position/size while it glides from span to span (spring fit),
// its content, the dimming of other spans when a span is pinned, and the keyboard. Rendered page only. Usage: node scripts/forensics/timeline-card.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/agent-timeline';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.addInitScript(() => {
  window.__c = []; window.__on = false;
  window.__go = () => {
    window.__c = []; window.__on = true; const t0 = performance.now();
    const tick = () => {
      if (!window.__on) return;
      const root = document.querySelector('section[class*="agent-timeline_root"]');
      const layer = root?.querySelector('[class*="agent-timeline_cardLayer"]');
      const card = root?.querySelector('[class*="agent-timeline_card__"]');
      const base = root?.getBoundingClientRect();
      if (card) { const r = card.getBoundingClientRect(), cs = getComputedStyle(card), ls = getComputedStyle(layer); window.__c.push({ t: +(performance.now() - t0).toFixed(1), x: +(r.left - base.left).toFixed(2), y: +(r.top - base.top).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), op: +(+cs.opacity).toFixed(3), lop: +(+ls.opacity).toFixed(3), lt: ls.transform, text: (card.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 100) }); }
      else window.__c.push({ t: +(performance.now() - t0).toFixed(1), none: 1 });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
});
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/agent-timeline', { waitUntil: 'networkidle' });
const root = page.locator('section[class*="agent-timeline_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
for (let i = 0; i < 120; i += 1) { if (await root.evaluate(n => [...n.querySelectorAll('[class*="agent-timeline_layer"]')].some(l => l.dataset.on && /Finished/.test(l.textContent)))) break; await page.waitForTimeout(500); }
await page.waitForTimeout(900);
const spans = root.locator('button[data-span-id]');
const box = async id => root.locator(`button[data-span-id="${id}"]`).boundingBox();
const hover = async id => { const b = await box(id); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); };
await page.mouse.move(5, 5); await page.waitForTimeout(500);
await page.evaluate(() => window.__go());
await page.waitForTimeout(150);
await hover('checker-7'); await page.waitForTimeout(900);                 // enter
await root.screenshot({ path: `${directory}/card-checker-7.png` });
await hover('analyst-19'); await page.waitForTimeout(900);                // glide to the failed span
await root.screenshot({ path: `${directory}/card-analyst-19.png` });
await hover('researcher-14'); await page.waitForTimeout(900);             // glide again (different row, tool span)
await page.mouse.move(5, 5); await page.waitForTimeout(700);             // leave
const frames = await page.evaluate(() => { window.__on = false; return window.__c; });
await fs.writeFile(`${directory}/card-frames.json`, JSON.stringify(frames));
const cardDom = await (async () => { await hover('analyst-19'); await page.waitForTimeout(700); return root.evaluate(n => n.querySelector('[class*="agent-timeline_cardLayer"]')?.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/agent-timeline_([A-Za-z0-9]+)__[A-Za-z0-9_-]{5}/g, '$1')); })();
await fs.writeFile(`${directory}/card.html`, cardDom ?? '');
// pin a span: click, read dimming and hot links
await spans.nth(0).evaluate(() => {});
await root.locator('button[data-span-id="analyst-21"]').click(); await page.waitForTimeout(900);
const pinned = await root.evaluate(n => ({ plot: n.querySelector('[class*="agent-timeline_plot"]').hasAttribute('data-path'), dim: [...n.querySelectorAll('button[data-span-id]')].filter(b => b.hasAttribute('data-dim')).map(b => b.dataset.spanId), pressed: [...n.querySelectorAll('button[aria-pressed="true"]')].map(b => b.dataset.spanId), hotLinks: [...n.querySelectorAll('[class*="agent-timeline_link__"]')].map(l => (l.hasAttribute('data-hot') ? 1 : 0)).join(''), hotPorts: [...n.querySelectorAll('[class*="agent-timeline_port__"]')].map(l => (l.hasAttribute('data-hot') ? 1 : 0)).join('') }));
await root.screenshot({ path: `${directory}/pinned-analyst-21.png` });
console.log('pinned', JSON.stringify(pinned));
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
console.log('after escape pressed:', await root.evaluate(n => [...n.querySelectorAll('button[aria-pressed="true"]')].length));
// keyboard: focus a span, arrows
await root.locator('button[data-span-id="checker-7"]').focus();
const seq = [];
for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'End', 'Home']) { await page.keyboard.press(key); await page.waitForTimeout(120); seq.push([key, await page.evaluate(() => document.activeElement?.dataset?.spanId)]); }
console.log('keyboard', JSON.stringify(seq));
const cs = frames.filter(f => !f.none);
console.log('card frames', cs.length, 'first', JSON.stringify(cs[0]), 'text sample', cs.find(f => f.text)?.text);
await browser.close();
