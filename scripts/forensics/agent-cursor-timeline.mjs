import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Public rendered preview of UIArc's Agent cursor (a Pro component: only the open preview is read). Output: docs/research/agent-cursor/source/
const directory = 'docs/research/agent-cursor/source';
const sampler = `(root) => { const q = (s, all) => all ? [...root.querySelectorAll('[class*="agent-cursor_' + s + '"]')] : root.querySelector('[class*="agent-cursor_' + s + '"]'); const cur = q('cursor__', true).map(c => { const m = new DOMMatrix(getComputedStyle(c).transform); return [c.getAttribute('data-ready') === 'false' ? 0 : 1, +m.m41.toFixed(1), +m.m42.toFixed(1), +(+getComputedStyle(c).opacity).toFixed(2), (c.textContent || '').trim().slice(0, 8)]; }); const sels = q('selection__', true).map(s => { const r = s.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }); const st = q('statusLabel'); const bar = q('bar__'); const blocks = q('block_', true).map(b => Math.round(b.getBoundingClientRect().height)); const doc = q('doc__'); const caret = q('caret__'); return { cur, sels, st: st ? st.textContent : '', bar: bar ? +getComputedStyle(bar).opacity : -1, barY: bar ? +new DOMMatrix(getComputedStyle(bar).transform).m42.toFixed(1) : null, blocks, fade: doc && doc.getAttribute('data-fading') === 'true' ? 1 : 0, caret: caret ? 1 : 0, rootH: Math.round(root.getBoundingClientRect().height) }; }`;
const clean = h => h.replace(/agent-cursor_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'ac_$1').replace(/(avatar|button|segmented-control|text-shimmer)_([A-Za-z0-9]+)__\S+?(?=[" ])/g, '$1_$2').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ');
const dump = async (root, name) => fs.writeFile(`${directory}/dom-${name}.html`, clean(await root.evaluate(n => n.outerHTML)));
await record({
  slug: 'agent-cursor', prefix: 'agent-cursor', directory, sampler,
  async scenarios({ page, root, run }) {
    await run('autoplay', async () => { await dump(root, 'initial'); }, 36000);
    await dump(root, 'end-of-loop');
  },
});
