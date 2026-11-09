// How the public Agent orchestrator streams a line of output and the plan: the CSS animation (delay, duration) of every text chunk. Rendered page only.
// Usage: node scripts/forensics/orchestrator-chunks.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1400 } })).newPage();
await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
const root = page.locator('[class*="agent-orchestrator_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
const run = root.locator('header button[class*="run"]');
for (let i = 0; i < 60 && (await run.innerText()).trim() !== 'Run again'; i += 1) await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__ch = new Map(); window.__on = true; const t0 = performance.now();
  const tick = () => {
    if (!window.__on) return;
    for (const a of document.getAnimations()) {
      if (!(a instanceof CSSAnimation) || !/ao-chunk/.test(a.animationName)) continue;
      const el = a.effect?.target; const key = el; if (!window.__ch.has(key)) { const t = a.effect.getTiming(); const lane = el.closest('[class*="agent-orchestrator_lane__"]'); const li = el.closest('li'); window.__ch.set(key, { t: +(performance.now() - t0).toFixed(0), text: el.textContent, delay: t.delay, duration: t.duration, easing: t.easing, where: lane ? 'lane' + ([...document.querySelectorAll('[class*="agent-orchestrator_lane__"]')].indexOf(lane) + 1) : li ? 'plan' : 'summary', first: el.previousElementSibling ? 0 : 1 }); }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await run.click();
for (let i = 0; i < 60 && (await run.innerText()).trim() !== 'Run again'; i += 1) await page.waitForTimeout(500);
await page.waitForTimeout(600);
const data = await page.evaluate(() => [...window.__ch.values()]);
await fs.writeFile('docs/research/orchestrator/source/agent-orchestrator/chunks.json', JSON.stringify(data));
const by = {};
for (const c of data) (by[c.where] ??= []).push(c);
for (const [where, list] of Object.entries(by)) { console.log('==', where, list.length); console.log(list.slice(0, 18).map(c => `${c.t}ms d${c.delay} ${c.duration}ms ${c.first ? '*' : ''}"${c.text.slice(0, 26)}"`).join('\n')); }
await browser.close();
