import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Public rendered preview of UIArc's Generation stats (a Pro component: only the open preview is read). Output: docs/research/generation-stats/source/
const directory = 'docs/research/generation-stats/source';
const sampler = `(root) => { const v = [...root.querySelectorAll('[class*="generation-stats_value"]')].map(n => n.textContent.replace(/\\s+/g, ' ').trim()); const clip = root.querySelector('[class*="panelClip"]'); const sp = root.querySelector('[class*="sparkLine"]'); const st = root.querySelector('[class*="statusLabel"]'); return { v, ph: clip ? +clip.getBoundingClientRect().height.toFixed(1) : 0, sp: sp ? (sp.getAttribute('d') ?? '').length : 0, st: st ? st.textContent : '' }; }`;
const clean = h => h.replace(/generation-stats_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'gs_$1').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+|class="[^"]*gs_[a-zA-Z]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ');
await record({
  slug: 'generation-stats', prefix: 'generation-stats', directory, sampler,
  async scenarios({ page, root, run }) {
    // the autoplay: one whole run from where it is
    await run('autoplay', async () => { await fs.writeFile(`${directory}/dom-initial.html`, clean(await root.evaluate(n => n.outerHTML))); }, 9000, e => true);
    await root.click({ position: { x: 4, y: 4 } }).catch(() => {});
    const details = root.getByRole('button', { name: /Details|Show details|Hide details/ }).first();
    await page.waitForTimeout(500);
    await run('open-details', () => details.click(), 1500);
    await fs.writeFile(`${directory}/dom-open.html`, clean(await root.evaluate(n => n.outerHTML)));
    await run('close-details', () => details.click(), 1200);
  },
});
