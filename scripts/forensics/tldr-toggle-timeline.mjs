import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Public rendered preview of UIArc's TL;DR toggle (a Pro component: only the open preview is read). Output: docs/research/tldr-toggle/source/
const directory = 'docs/research/tldr-toggle/source';
const sampler = `(root) => { const q = s => root.querySelector('[class*="' + s + '"]'); const clip = q('tldr-toggle_clip'); const body = q('tldr-toggle_body'); const thumb = root.querySelector('[class*="slider_thumb__"]'); const bubble = root.querySelector('[class*="slider_bubble__"]'); const st = q('tldr-toggle_state__'); const gen = q('tldr-toggle_gen__'); const think = q('tldr-toggle_thinking'); return { clip: clip ? +clip.getBoundingClientRect().height.toFixed(1) : 0, body: body ? +body.getBoundingClientRect().height.toFixed(1) : 0, chunks: root.querySelectorAll('[class*="tldr-toggle_chunk"]').length, chars: (gen ? gen.textContent : '').length, thumb: thumb ? +thumb.getBoundingClientRect().left.toFixed(1) : 0, bubble: bubble ? +getComputedStyle(bubble).opacity : -1, st: st ? st.textContent : '', think: think ? 1 : 0, y: Math.round(scrollY) }; }`;
const clean = h => h.replace(/tldr-toggle_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'tt_$1').replace(/(segmented-control|slider|avatar|button)_([A-Za-z0-9]+)__\S+?(?=[" ])/g, '$1_$2').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+|class="[^"]*"/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ');
const dump = async (root, name) => fs.writeFile(`${directory}/dom-${name}.html`, clean(await root.evaluate(n => n.outerHTML)));
await record({
  slug: 'tldr-toggle', prefix: 'tldr-toggle', directory, sampler,
  async scenarios({ page, root, run }) {
    await run('autoplay', async () => { await dump(root, 'initial'); }, 9000);
    await dump(root, 'after-autoplay');
    const mode = name => root.getByRole('button', { name, exact: true }).first();
    await run('to-full', () => mode('Full').click(), 1400);
    await dump(root, 'full');
    await run('to-summary', () => mode('Summary').click(), 5000);
    await dump(root, 'summary');
    await run('to-points', () => mode('Key points').click(), 6000);
    await dump(root, 'points');
    await run('jump', async () => { await root.getByRole('button', { name: /^Jump to paragraph/ }).first().click(); }, 3000);
    await dump(root, 'after-jump');
    await run('cached-summary', () => mode('Summary').click(), 1200);
    // slider by keyboard: one step makes one request
    const slider = root.getByRole('slider').first();
    await slider.focus();
    await run('slider-key', () => page.keyboard.press('ArrowRight'), 5000);
    await dump(root, 'slider-key');
    // slider by pointer: drag the thumb
    const box = await slider.boundingBox();
    await run('slider-drag', async () => { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + 8, box.y + box.height / 2, { steps: 12 }); await dump(root, 'slider-dragging'); await page.mouse.up(); }, 5000);
    // stop mid stream
    await run('stop', async () => { await slider.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1300); await dump(root, 'streaming'); await page.keyboard.press('Escape'); }, 2000);
    await dump(root, 'stopped');
    // failure
    const fail = root.getByRole('button', { name: /Simulate a failure/ }).first().or(page.getByRole('button', { name: /Simulate a failure/ }).first());
    await run('failure', async () => { await fail.click(); await mode('Summary').click().catch(() => {}); }, 3500);
    await dump(root, 'error');
    await page.screenshot({ path: `${directory}/page-error.png` });
    await run('retry', async () => { await root.getByRole('button', { name: /Try again/ }).first().click(); }, 4500);
    await dump(root, 'after-retry');
  },
});
