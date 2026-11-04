import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Public rendered preview of UIArc's Ghost text (a Pro component: only the open preview is read). Output: docs/research/ghost-text/source/
const directory = 'docs/research/ghost-text/source';
const sampler = `(root) => { const f = root.querySelector('[class*="ghost-text_root"]') ?? root; const chip = f.querySelector('[class*="ghost-text_chip"]'); const vp = f.querySelector('[class*="ghost-text_viewport"]'); return { chip: chip?.getAttribute('data-state') ?? '', label: (chip?.textContent ?? '').slice(0, 40), ghost: f.querySelectorAll('[class*="ghost-text_ghost"]').length, out: f.querySelectorAll('[class*="ghost-text_ghostOut"]').length, merge: f.querySelectorAll('[class*="ghost-text_merge"]').length, h: vp ? +vp.getBoundingClientRect().height.toFixed(1) : 0, merging: f.hasAttribute('data-merging') || !!f.querySelector('[data-merging]'), w: chip ? +chip.getBoundingClientRect().width.toFixed(1) : 0 }; }`;
const clean = h => h.replace(/ghost-text_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'gt_$1').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '').replace(/\s+/g, ' ');
await record({
  slug: 'ghost-text', prefix: 'ghost-text', directory, sampler,
  async scenarios({ page, root, run }) {
    const field = root.locator('textarea').first();
    await page.waitForTimeout(500);
    await fs.writeFile(`${directory}/dom-idle.html`, clean(await root.evaluate(n => n.outerHTML)));
    await field.click(); // the first press takes the preview over from its autoplay
    await root.getByText('Simulated, nothing is sent').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    await field.press('Control+a'); await field.press('Delete'); await page.waitForTimeout(1500);
    await fs.writeFile(`${directory}/dom-empty.html`, clean(await root.evaluate(n => n.outerHTML)));
    await run('type-and-wait', async () => { await field.pressSequentially('Customers who upgraded mid-cycle were charged twice for the days left in their billing period. The credit for the old plan used the', { delay: 15 }); }, 3500);
    await fs.writeFile(`${directory}/dom-ready.html`, clean(await root.evaluate(n => n.outerHTML)));
    await run('accept-tab', () => field.press('Tab'), 1200);
    await fs.writeFile(`${directory}/dom-accepted.html`, clean(await root.evaluate(n => n.outerHTML)));
    await page.waitForTimeout(1800);
    await run('type-more-wait', async () => { await field.press('End'); await field.pressSequentially(' We now', { delay: 15 }); }, 3500);
    await run('accept-word', () => field.press('Control+ArrowRight'), 900);
    await run('accept-word-2', () => field.press('Control+ArrowRight'), 900);
    await run('dismiss', () => field.press('Escape'), 900);
    await run('type-through', async () => { await field.press('Control+a'); await field.press('Delete'); await field.pressSequentially('The proration fix keeps the invoice date and the', { delay: 15 }); await page.waitForTimeout(1800); }, 1500);
    await run('error', async () => { await field.press('Control+a'); await field.press('Delete'); await field.pressSequentially('This request will timeout when', { delay: 15 }); }, 3500);
    await fs.writeFile(`${directory}/dom-error.html`, clean(await root.evaluate(n => n.outerHTML)));
  },
});
