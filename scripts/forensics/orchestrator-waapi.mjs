// Logs every Web Animations API call (target, keyframes, timing) the public Agent orchestrator preview makes during a run: pulse duration and easing, swaps, collapses.
// Rendered page only. Usage: node scripts/forensics/orchestrator-waapi.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/agent-orchestrator';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
await context.addInitScript(() => {
  window.__anims = []; const t0 = performance.now();
  const original = Element.prototype.animate;
  Element.prototype.animate = function (keyframes, options) {
    const cls = (this.getAttribute?.('class') ?? '').replace(/_[A-Za-z0-9_-]{5}(?=\s|$)/g, '');
    try { window.__anims.push({ t: Math.round(performance.now() - t0), tag: this.tagName.toLowerCase(), cls: cls.slice(0, 80), keyframes: JSON.parse(JSON.stringify(keyframes)), options: typeof options === 'number' ? { duration: options } : JSON.parse(JSON.stringify(options ?? {})) }); } catch { /* ignore */ }
    return original.call(this, keyframes, options);
  };
});
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
const root = page.locator('[class*="agent-orchestrator_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
const run = root.locator('header button[class*="run"]');
for (let i = 0; i < 60 && (await run.innerText()).trim() !== 'Run again'; i += 1) await page.waitForTimeout(500);
await page.evaluate(() => { window.__anims.length = 0; });
await run.click();
for (let i = 0; i < 60 && (await run.innerText()).trim() !== 'Run again'; i += 1) {
  await page.waitForTimeout(500);
  if (i === 6) await root.locator('[class*="agent-orchestrator_lane__"]').first().locator('button[class*="laneButton"]').click();
}
await page.waitForTimeout(800);
// a lane opened and closed again after the run
await root.locator('[class*="agent-orchestrator_lane__"]').nth(1).locator('button[class*="laneButton"]').click(); await page.waitForTimeout(800);
await root.locator('[class*="agent-orchestrator_lane__"]').nth(1).locator('button[class*="laneButton"]').click(); await page.waitForTimeout(800);
const anims = await page.evaluate(() => window.__anims);
await fs.writeFile(`${directory}/waapi.json`, JSON.stringify(anims, null, 1));
const groups = new Map();
for (const a of anims) { const key = `${a.tag}.${a.cls} ${JSON.stringify(a.options)} ${JSON.stringify(a.keyframes).slice(0, 220)}`; groups.set(key, (groups.get(key) ?? 0) + 1); }
for (const [key, n] of groups) console.log(n, key.slice(0, 420));
await browser.close();
