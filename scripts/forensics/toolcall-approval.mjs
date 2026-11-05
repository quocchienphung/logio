// The Tool call preview's scripted turn after Retry: the approval row (Slack), Allow and Deny outcomes, the closing message, the group header and auto-collapse.
// Rendered page only. Usage: node scripts/forensics/toolcall-approval.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = 'docs/research/orchestrator/source/tool-call';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.addInitScript(() => {
  window.__r = []; window.__on = false;
  window.__go = () => {
    window.__r = []; window.__on = true; const t0 = performance.now();
    const tx = e => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const tick = () => {
      if (!window.__on) return;
      const turn = document.querySelector('[class*="tool-call_turn__"]'), group = turn?.querySelector('[class*="tool-call_group__"]');
      if (group) window.__r.push({ t: +(performance.now() - t0).toFixed(1), gh: Math.round(group.getBoundingClientRect().height * 10) / 10, head: tx(group.querySelector('[class*="tool-call_groupHead"]')).slice(0, 70), headOpen: group.hasAttribute('data-open') ? 1 : 0, prose: tx(turn.querySelector('[class*="tool-call_prose"]')).slice(0, 120), n: group.querySelectorAll('[class*="tool-call_call__"]').length,
        last: (c => c ? { s: c.dataset.status, h: Math.round(c.getBoundingClientRect().height * 10) / 10, title: tx(c.querySelector('[class*="tool-call_title__"]')).slice(0, 60), aside: tx(c.querySelector('[class*="tool-call_aside"]')).slice(0, 60), note: tx(c.querySelector('[class*="tool-call_note"]')).slice(0, 80) } : null)([...group.querySelectorAll('[class*="tool-call_call__"]')].at(-1)),
        slotH: Math.round(turn.querySelector('[class*="tool-call_slot"]')?.getBoundingClientRect().height ?? 0) });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
});
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/tool-call', { waitUntil: 'networkidle' });
const demo = page.locator('[class*="tool-call_demo"]').first();
await demo.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
await page.waitForTimeout(3500);
const report = (frames, from = 0) => { let prev = ''; for (const f of frames) { const key = JSON.stringify([f.head, f.prose, f.n, f.last]); if (key !== prev) { console.log(String(f.t.toFixed(0)).padStart(6), `gh ${f.gh} open ${f.headOpen} n ${f.n} |`, f.head, '|', f.prose, '|', JSON.stringify(f.last)); prev = key; } } };
for (const choice of ['Allow', 'Deny']) {
  console.log('\n====', choice);
  await page.evaluate(() => window.__go());
  await demo.getByRole('button', { name: 'Retry' }).first().click();
  await demo.getByRole('button', { name: new RegExp('^' + choice) }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(600);
  await demo.screenshot({ path: `${directory}/approval-${choice.toLowerCase()}-before.png` });
  await fs.writeFile(`${directory}/approval-row.html`, await demo.locator('[class*="tool-call_call__"]').last().evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/(tool-call|copy-button|text-shimmer)_([A-Za-z0-9]+)__[A-Za-z0-9_-]{5}/g, '$2')));
  await demo.getByRole('button', { name: new RegExp('^' + choice) }).click();
  await page.waitForTimeout(6500);
  await demo.screenshot({ path: `${directory}/approval-${choice.toLowerCase()}-after.png` });
  const frames = await page.evaluate(() => { window.__on = false; return window.__r; });
  await fs.writeFile(`${directory}/frames-${choice.toLowerCase()}.json`, JSON.stringify(frames));
  report(frames);
  console.log('buttons now:', await demo.evaluate(n => [...n.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 40)).filter(Boolean).join(' | ')));
  const again = demo.getByRole('button', { name: /again|replay|restart/i });
  if (await again.count()) { await again.first().click(); await page.waitForTimeout(4500); }
}
await browser.close();
