import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Third pass over the public preview of UIArc's TL;DR toggle: failure state + Try again, Regenerate, Copy. Output: docs/research/tldr-toggle/source/
const directory = 'docs/research/tldr-toggle/source';
const sampler = `(root) => { const q = s => root.querySelector('[class*="' + s + '"]'); const clip = q('tldr-toggle_clip'); const st = q('tldr-toggle_state__'); return { clip: clip ? +clip.getBoundingClientRect().height.toFixed(1) : 0, st: st ? st.textContent : '' }; }`;
const clean = h => h.replace(/tldr-toggle_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'tt_$1').replace(/(segmented-control|slider|avatar|button|copy-button|text-shimmer|switch|menu|tooltip|dropdown)_([A-Za-z0-9]+)__\S+?(?=[" ])/g, '$1_$2').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ');
const dump = async (root, name) => fs.writeFile(`${directory}/dom-${name}.html`, clean(await root.evaluate(n => n.outerHTML)));
await record({
  slug: 'tldr-toggle', prefix: 'tldr-toggle', directory, sampler,
  async scenarios({ page, root, run }) {
    await page.waitForTimeout(7000);
    const failure = page.getByRole('switch', { name: 'Simulate a failure' });
    await failure.click();
    await page.waitForTimeout(300);
    await run('failure-run', () => root.getByRole('button', { name: 'Key points', exact: true }).click(), 3500);
    await dump(root, 'error');
    await page.screenshot({ path: `${directory}/page-error.png` });
    await failure.click();
    await run('retry', () => root.getByRole('button', { name: /Try again/ }).first().click(), 4200);
    await dump(root, 'after-retry');
    await run('regenerate-hover', () => root.getByRole('button', { name: 'Regenerate' }).first().hover(), 900);
    await dump(root, 'regenerate-hover');
    await page.screenshot({ path: `${directory}/page-regenerate-hover.png` });
    await run('regenerate-click', () => root.getByRole('button', { name: 'Regenerate' }).first().click(), 4500);
    await dump(root, 'after-regenerate');
    await run('copy', () => root.getByRole('button', { name: /^Copy/ }).first().click(), 2200);
    await dump(root, 'after-copy');
  },
});
