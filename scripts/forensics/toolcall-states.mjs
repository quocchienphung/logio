// The public Tool call preview's states: a row opened (Input and Output), the open/close height, the Retry flow frame by frame (running, success), the group
// header while it changes, the copy button, auto-collapse. Rendered page only. Usage: node scripts/forensics/toolcall-states.mjs
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
      const group = document.querySelector('[class*="tool-call_group__"]');
      if (group) {
        const calls = [...group.querySelectorAll('[class*="tool-call_call__"]')];
        const head = group.querySelector('[class*="tool-call_groupHead"]');
        window.__r.push({ t: +(performance.now() - t0).toFixed(1), gh: Math.round(group.getBoundingClientRect().height * 10) / 10, head: tx(head).slice(0, 60), headOpen: group.hasAttribute('data-open') ? 1 : 0,
          calls: calls.map(c => { const bc = c.querySelector('[class*="tool-call_bodyClip"]'); const title = c.querySelector('[class*="tool-call_title__"]'); const aside = c.querySelector('[class*="tool-call_aside"]'); const note = c.querySelector('[class*="tool-call_note"]'); const icons = [...c.querySelectorAll('[class*="tool-call_statusIcon"]')].map(i => `${i.dataset.status}:${(+getComputedStyle(i).opacity).toFixed(2)}`); return { s: c.dataset.status, open: c.hasAttribute('data-open') ? 1 : 0, bh: bc ? Math.round(bc.getBoundingClientRect().height * 10) / 10 : null, h: Math.round(c.getBoundingClientRect().height * 10) / 10, title: tx(title).slice(0, 50), aside: tx(aside).slice(0, 50), note: tx(note).slice(0, 60), icons: icons.join(','), ob: bc ? +(+getComputedStyle(bc).opacity).toFixed(2) : null }; }) });
      }
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
const calls = demo.locator('[class*="tool-call_call__"]');
console.log('calls', await calls.count(), 'group open', await demo.locator('[class*="tool-call_group__"]').getAttribute('data-open'));
await demo.screenshot({ path: `${directory}/demo-rest.png` });

// open the first row
await page.evaluate(() => window.__go()); await page.waitForTimeout(80);
await calls.nth(0).locator('button[class*="tool-call_toggle"]').click(); await page.waitForTimeout(1200);
await demo.screenshot({ path: `${directory}/row1-open.png` });
const html1 = await calls.nth(0).evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/(tool-call|copy-button|text-shimmer)_([A-Za-z0-9]+)__[A-Za-z0-9_-]{5}/g, '$2'));
await fs.writeFile(`${directory}/row1-open.html`, html1);
await calls.nth(0).locator('button[class*="tool-call_toggle"]').click(); await page.waitForTimeout(900);
const openClose = await page.evaluate(() => { window.__on = false; return window.__r; });
await fs.writeFile(`${directory}/frames-row-open-close.json`, JSON.stringify(openClose));

// open the second row (a different output type) to read its DOM
await calls.nth(1).locator('button[class*="tool-call_toggle"]').click(); await page.waitForTimeout(1000);
await demo.screenshot({ path: `${directory}/row2-open.png` });
await fs.writeFile(`${directory}/row2-open.html`, await calls.nth(1).evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/(tool-call|copy-button|text-shimmer)_([A-Za-z0-9]+)__[A-Za-z0-9_-]{5}/g, '$2')));
await calls.nth(1).locator('button[class*="tool-call_toggle"]').click(); await page.waitForTimeout(700);
// copy feedback
await calls.nth(0).locator('button[class*="tool-call_toggle"]').click(); await page.waitForTimeout(900);
const copy = calls.nth(0).locator('[class*="tool-call_copy"]').first();
await copy.click(); await page.waitForTimeout(250);
await calls.nth(0).screenshot({ path: `${directory}/copy-feedback.png` });
console.log('copy button after click:', await copy.evaluate(n => ({ label: n.getAttribute('aria-label'), html: n.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/_[A-Za-z0-9_-]{5}/g, '').slice(0, 200) })));
await calls.nth(0).locator('button[class*="tool-call_toggle"]').click(); await page.waitForTimeout(700);

// Retry flow on the third (failed) row
await page.evaluate(() => window.__go()); await page.waitForTimeout(80);
await demo.getByRole('button', { name: 'Retry' }).first().click();
await page.waitForTimeout(6000);
const retry = await page.evaluate(() => { window.__on = false; return window.__r; });
await fs.writeFile(`${directory}/frames-retry.json`, JSON.stringify(retry));
await demo.screenshot({ path: `${directory}/after-retry.png` });
// print the retry timeline compactly
let prev = '';
for (const f of retry) { const c = f.calls[2]; const key = JSON.stringify([c.s, c.title, c.aside, c.note, f.head]); if (key !== prev) { console.log(String(f.t.toFixed(0)).padStart(5), f.gh, '|', f.head, '|', JSON.stringify(c)); prev = key; } }
await browser.close();
