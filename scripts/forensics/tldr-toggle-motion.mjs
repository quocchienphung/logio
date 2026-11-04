import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Per-frame samples of the public TL;DR toggle preview's moving parts: the segmented pill, the slider thumb/fill/readout digits. Output: docs/research/tldr-toggle/source/
const directory = 'docs/research/tldr-toggle/source';
const sampler = `(root) => { const sel = root.querySelector('[class*="segmented-control_selection"]'); const sr = sel ? sel.getBoundingClientRect() : null; const thumb = root.querySelector('[class*="slider_thumb__"]'); const fill = root.querySelector('[class*="slider_fill__"]'); const layer = root.querySelector('[class*="slider_thumbLayer"]'); const cols = [...root.querySelectorAll('[class*="slider_column"]')].map(c => [...c.querySelectorAll('[class*="slider_glyph"]')].filter(g => getComputedStyle(g).visibility !== 'hidden').map(g => g.textContent + ':' + (new DOMMatrix(getComputedStyle(g).transform).m42 / parseFloat(getComputedStyle(g).fontSize)).toFixed(2) + ':' + (+getComputedStyle(g).opacity).toFixed(2) + ':' + getComputedStyle(g).filter.replace('blur(','b').replace(')','')).join('|') + '@' + c.getBoundingClientRect().width.toFixed(1)); return { pill: sr ? [+sr.left.toFixed(1), +sr.width.toFixed(1)] : null, thumb: thumb ? +thumb.getBoundingClientRect().left.toFixed(2) : 0, layer: layer ? layer.style.transform : '', fill: fill ? fill.style.clipPath : '', cols }; }`;
await record({
  slug: 'tldr-toggle', prefix: 'tldr-toggle', directory, sampler,
  async scenarios({ page, root, run }) {
    await page.waitForTimeout(7000);
    const mode = name => root.getByRole('button', { name, exact: true }).first();
    await run('motion-pill-points', () => mode('Key points').click(), 900);
    await run('motion-pill-full', () => mode('Full').click(), 900);
    await run('motion-pill-summary', () => mode('Summary').click(), 900);
    await page.waitForTimeout(3000);
    const thumb = root.getByRole('slider').first();
    await thumb.focus();
    await run('motion-key-right', () => page.keyboard.press('ArrowRight'), 900);
    await run('motion-key-right-2', () => page.keyboard.press('ArrowRight'), 900);
    await run('motion-key-left-3', async () => { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(80); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(80); await page.keyboard.press('ArrowLeft'); }, 1200);
    await run('motion-key-home', () => page.keyboard.press('Home'), 900);
    await run('motion-key-end', () => page.keyboard.press('End'), 900);
  },
});
