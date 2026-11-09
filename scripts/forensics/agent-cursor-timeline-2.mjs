import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Second pass over the public preview of UIArc's Agent cursor: Stop, Undo, the dropped connection and its Retry, Run again. Output: docs/research/agent-cursor/source/
const directory = 'docs/research/agent-cursor/source';
const sampler = `(root) => { const q = (s, all) => all ? [...root.querySelectorAll('[class*="agent-cursor_' + s + '"]')] : root.querySelector('[class*="agent-cursor_' + s + '"]'); const cur = q('cursor__', true).map(c => { const m = new DOMMatrix(getComputedStyle(c).transform); return [c.getAttribute('data-ready') === 'false' ? 0 : 1, +m.m41.toFixed(1), +m.m42.toFixed(1), +(+getComputedStyle(c).opacity).toFixed(2)]; }); const st = q('statusLabel'); const bar = q('bar__'); const blocks = q('block_', true).map(b => Math.round(b.getBoundingClientRect().height)); const act = q('action__'); return { cur, st: st ? st.textContent : '', bar: bar ? +getComputedStyle(bar).opacity : -1, barY: bar ? +new DOMMatrix(getComputedStyle(bar).transform).m42.toFixed(1) : null, blocks, act: act ? act.textContent : '', busy: (q('doc__') || {getAttribute(){return ''}}).getAttribute('aria-busy') }; }`;
const clean = h => h.replace(/agent-cursor_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'ac_$1').replace(/(avatar|button|segmented-control|text-shimmer|switch)_([A-Za-z0-9]+)__\S+?(?=[" ])/g, '$1_$2').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ');
const dump = async (page, name) => fs.writeFile(`${directory}/dom-${name}.html`, clean(await page.locator('[class*="agent-cursor_demo"]').first().evaluate(n => n.outerHTML)));
const waitStatus = async (page, re, timeout = 20000) => page.waitForFunction(r => { const el = document.querySelector('[class*="agent-cursor_statusLabel"]'); return el && new RegExp(r).test(el.textContent); }, re, { timeout });
await record({
  slug: 'agent-cursor', prefix: 'agent-cursor', directory, sampler,
  async scenarios({ page, root, run }) {
    await waitStatus(page, 'Accepted 3 edits|3 edits ready');
    await dump(page, 'demo-initial');
    // 1. Stop mid run
    await waitStatus(page, 'Reading the doc');
    await waitStatus(page, 'Tightening the goals');
    await page.waitForTimeout(500);
    await dump(page, 'running');
    await run('stop', async () => { await root.getByRole('button', { name: /^Stop/ }).click(); }, 2600);
    await dump(page, 'stopped');
    // 2. run again, then hover to hold review, then Undo
    await run('run-again-after-stop', async () => { await root.getByRole('button', { name: /Run again/ }).click(); }, 12000);
    await root.hover();
    await dump(page, 'review');
    await run('undo', async () => { await root.getByRole('button', { name: /Undo/ }).click(); }, 3200);
    await dump(page, 'reverted');
    await page.mouse.move(5, 5);
    // 3. dropped connection
    const drop = page.getByRole('button', { name: 'Connection drops', exact: true }).or(page.getByText('Connection drops', { exact: true })).first();
    await run('connection-drops', async () => { await drop.click(); await root.getByRole('button', { name: /Run again/ }).click().catch(() => {}); }, 9000);
    await dump(page, 'error');
    await page.screenshot({ path: `${directory}/page-error.png` });
    await run('retry', async () => { await page.getByText('Edits land', { exact: true }).first().click(); await root.getByRole('button', { name: /Retry/ }).click(); }, 6000);
    await dump(page, 'after-retry');
    // 4. accept by hand
    await waitStatus(page, '3 edits ready');
    await root.hover();
    await run('accept-by-hand', async () => { await root.getByRole('button', { name: /Accept changes/ }).click(); }, 3000);
    await dump(page, 'accepted');
  },
});
