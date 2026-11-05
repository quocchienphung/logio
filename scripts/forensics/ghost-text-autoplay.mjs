import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// The preview's own autoplay goes through every state of the chip. Recorded from page load for 30 s. Output: docs/research/ghost-text/source/autoplay-*.json
const directory = 'docs/research/ghost-text/source';
const sampler = `(root) => { const chip = root.querySelector('[class*="ghost-text_chip"]'); const vp = root.querySelector('[class*="ghost-text_viewport"]'); const ta = root.querySelector('textarea'); const g = root.querySelectorAll('[class*="ghost-text_ghost"]'); return { chip: chip?.getAttribute('data-state') ?? '', w: chip ? +chip.getBoundingClientRect().width.toFixed(1) : 0, h: vp ? +vp.getBoundingClientRect().height.toFixed(1) : 0, len: ta?.value.length ?? 0, ghost: g.length, ghostText: [...g].map(n => n.textContent).join('').slice(0, 60), html: chip ? chip.innerHTML.slice(0, 900) : '' }; }`;
await record({
  slug: 'ghost-text', prefix: 'ghost-text', directory, sampler,
  async scenarios({ run }) {
    const events = await run('autoplay', async () => {}, 32000, e => true);
    const fr = events.filter(e => e.k === 'frame');
    let prev = null; const seq = [];
    for (const e of fr) if (e.chip !== prev) { seq.push([e.t, e.chip, e.w]); prev = e.chip; }
    console.log(JSON.stringify(seq.slice(0, 24)));
    const firstOf = {}; for (const e of fr) if (!firstOf[e.chip] && e.html) firstOf[e.chip] = e.html;
    await fs.writeFile(`${directory}/chip-states.json`, JSON.stringify(firstOf, null, 1));
  },
});
