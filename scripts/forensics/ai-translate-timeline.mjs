import fs from 'node:fs/promises';
import { record } from './lib/uiarc-recorder.mjs';

// Public rendered preview of UIArc's AI translate (a Pro component: only the open preview is read). Output: docs/research/ai-translate/source/
const directory = 'docs/research/ai-translate/source';
const sampler = `(root) => { const clip = root.querySelector('[class*="textClip"]'); const text = root.querySelectorAll('[class*="ai-translate_text"]'); const chunks = root.querySelectorAll('[class*="chunk"]').length; const pend = root.querySelectorAll('[class*="pending"]').length; return { h: clip ? +clip.getBoundingClientRect().height.toFixed(2) : 0, hs: clip?.style.height ?? '', chunks, pend, tx: text.length }; }`;
await record({
  slug: 'ai-translate', prefix: 'ai-translate', directory, sampler,
  async setup({ page, root }) {
    // the preview autoplays; the first press or key inside the card stops it for good
    await root.getByRole('button').first().waitFor();
    await fs.writeFile(`${directory}/dom-initial.html`, (await root.evaluate(n => n.outerHTML)).replace(/ai-translate_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'at_$1').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, ''));
    await root.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(600);
  },
  async scenarios({ page, root, run }) {
    const trigger = root.getByRole('button', { name: /Translate|Original|English|Deutsch|Français|Español|日本語|Português/ }).first();
    const info = { trigger: await trigger.innerText(), buttons: await root.getByRole('button').evaluateAll(b => b.map(x => `${x.getAttribute('aria-label') ?? ''}|${x.textContent.trim()}|${x.getAttribute('aria-haspopup') ?? ''}|${x.getAttribute('aria-pressed') ?? ''}`)) };
    await fs.writeFile(`${directory}/controls.json`, JSON.stringify(info, null, 1));
    console.log(JSON.stringify(info).slice(0, 600));
    await run('open-menu', () => trigger.click(), 700);
    await fs.writeFile(`${directory}/dom-menu.html`, (await page.locator('[role=menu]').evaluate(n => n.outerHTML).catch(() => '')).replace(/ai-translate_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'at_$1').replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>'));
    await run('pick-es', () => page.getByRole('menuitemradio', { name: /Español/ }).click(), 6000);
    await run('toggle-original', () => root.getByRole('button', { name: /Show original/ }).click(), 1200);
    await run('toggle-translation', () => root.getByRole('button', { name: /Show translation/ }).click(), 1200);
    await run('pick-ja', async () => { await trigger.click(); await page.waitForTimeout(300); await page.getByRole('menuitemradio', { name: /日本語/ }).click(); }, 6000);
    await run('back-es-cached', async () => { await trigger.click(); await page.waitForTimeout(300); await page.getByRole('menuitemradio', { name: /Español/ }).click(); }, 1500);
    const fail = page.getByRole('button', { name: /Fail the next translation/ });
    if (await fail.count()) { await fail.click(); await run('pick-pt-fails', async () => { await trigger.click(); await page.waitForTimeout(300); await page.getByRole('menuitemradio', { name: /Português/ }).click(); }, 3500); await run('retry', () => root.getByRole('button', { name: /Retry/ }).click(), 6000); }
  },
});
