// What a packet looks like mid-flight on the public preview (a clipped screenshot while a pulse runs) and the attributes of its path. Rendered page only.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 })).newPage();
await page.goto('https://uiarc.dev/components/blocks/agent-orchestrator', { waitUntil: 'networkidle' });
const root = page.locator('[class*="agent-orchestrator_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
const run = root.locator('header button[class*="run"]');
for (let i = 0; i < 60 && (await run.innerText()).trim() !== 'Run again'; i += 1) await page.waitForTimeout(500);
await page.evaluate(() => { window.__p = null; new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && /pulse/.test(n.getAttribute('class') ?? '') && !window.__p) window.__p = { attrs: Object.fromEntries([...n.attributes].map(a => [a.name, a.value])), tag: n.tagName, len: n.getTotalLength?.() }; }).observe(document.querySelector('svg[class*="wires"]'), { childList: true, subtree: true }); });
await run.click();
await page.waitForFunction(() => window.__p, null, { timeout: 8000 });
await page.waitForTimeout(150);
await root.screenshot({ path: 'docs/research/orchestrator/source/agent-orchestrator/pulse-mid.png' });
console.log(JSON.stringify(await page.evaluate(() => window.__p)));
console.log(await page.evaluate(() => { const p = document.querySelector('[class*="agent-orchestrator_pulse"]'); return p ? [getComputedStyle(p).strokeDasharray, getComputedStyle(p).strokeDashoffset, p.getAttribute('pathLength'), p.getAttribute('d')] : null; }));
await browser.close();
