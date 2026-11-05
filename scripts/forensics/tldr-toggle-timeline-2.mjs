import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Second pass over the public preview of UIArc's TL;DR toggle: slider drag across the track, failure + retry, regenerate, copy. Output: docs/research/tldr-toggle/source/
const directory = 'docs/research/tldr-toggle/source';
const sampler = `(root) => { const q = s => root.querySelector('[class*="' + s + '"]'); const clip = q('tldr-toggle_clip'); const thumb = root.querySelector('[class*="slider_thumb__"]'); const bubble = root.querySelector('[class*="slider_bubble__"]'); const fill = root.querySelector('[class*="slider_fill__"]'); const read = q('slider_readout'); return { clip: clip ? +clip.getBoundingClientRect().height.toFixed(1) : 0, thumb: thumb ? +thumb.getBoundingClientRect().left.toFixed(1) : 0, bubble: bubble ? +getComputedStyle(bubble).opacity : -1, bt: bubble ? getComputedStyle(bubble).transform : '', bubbleText: bubble ? bubble.textContent : '', fill: fill ? fill.style.clipPath : '', read: read ? read.textContent.replace(/\\s+/g,'').slice(-12) : '' }; }`;
const clean = h => h.replace(/tldr-toggle_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'tt_$1').replace(/(segmented-control|slider|avatar|button|copy-button|text-shimmer)_([A-Za-z0-9]+)__\S+?(?=[" ])/g, '$1_$2').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ');
const dump = async (root, name) => fs.writeFile(`${directory}/dom-${name}.html`, clean(await root.evaluate(n => n.outerHTML)));
await record({
  slug: 'tldr-toggle', prefix: 'tldr-toggle', directory, sampler,
  async scenarios({ page, root, run }) {
    await page.waitForTimeout(7000);
    const control = root.locator('[class*="slider_control__"]').first();
    const box = await control.boundingBox();
    const y = box.y + box.height / 2;
    await dump(root, 'options-row');
    await fs.writeFile(`${directory}/dom-options.html`, clean(await page.locator('[class*="tldr-toggle_options"]').first().evaluate(n => n.outerHTML)));
    await run('drag-track', async () => {
      await page.mouse.move(box.x + box.width * 0.5, y); await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.9, y, { steps: 14 }); await page.waitForTimeout(250);
      await dump(root, 'dragging');
      await page.mouse.move(box.x + box.width * 0.05, y, { steps: 18 }); await page.waitForTimeout(200);
      await page.mouse.up();
    }, 5200);
    await run('click-track', async () => { await page.mouse.click(box.x + box.width * 0.75, y); }, 5200);
    await run('click-mark', async () => { const m = root.locator('[class*="slider_markLabel"]').first(); await m.click().catch(() => {}); }, 3000);
    const failure = page.getByText('Simulate a failure', { exact: true }).first();
    await dump(root, 'before-failure');
    await run('toggle-failure', () => failure.click(), 800);
    await fs.writeFile(`${directory}/dom-options-after.html`, clean(await page.locator('[class*="tldr-toggle_options"]').first().evaluate(n => n.outerHTML)));
    await run('failure-run', async () => { await root.locator('[class*="slider_control__"]').first().focus().catch(() => {}); await page.keyboard.press('ArrowLeft'); }, 3500);
    await dump(root, 'error');
    await page.screenshot({ path: `${directory}/page-error.png` });
    await run('retry', async () => { await failure.click(); await root.getByRole('button', { name: /Try again/ }).first().click(); }, 4500);
    await dump(root, 'after-retry');
    await run('regenerate', async () => { await root.getByRole('button', { name: 'Regenerate' }).first().hover(); await page.waitForTimeout(700); await dump(root, 'regenerate-hover'); await root.getByRole('button', { name: 'Regenerate' }).first().click(); }, 4500);
    await dump(root, 'regenerate-open');
    await run('copy', async () => { await root.getByRole('button', { name: /Copy/ }).first().click(); }, 2200);
    await dump(root, 'after-copy');
  },
});
