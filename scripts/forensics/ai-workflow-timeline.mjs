import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview of UIArc's AI workflow (a Pro component: the preview is open, the source is not read). One test run, time-stamped from
// the click on Run again: attributes, status text, dots, fills, animations. Output: docs/research/ai-workflow/source/timeline-run.json
const directory = 'docs/research/ai-workflow/source';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto('https://uiarc.dev/components/ai-workflow', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const root = page.locator('[class*="ai-workflow_root"]').first();
  await root.scrollIntoViewIfNeeded();
  // let autoplay finish once, then press the button ourselves (a press also stops autoplay for good)
  await root.getByRole('button', { name: /run|stop/i }).first().waitFor();
  const simp = h => h.replace(/ai-workflow_([A-Za-z0-9]+)__\S+?(?=[" ])/g, 'aw_$1').replace(/<svg[\s\S]*?<\/svg>/g, m => `<svg ${(m.match(/lucide-[a-z0-9-]+/) ?? [''])[0]}/>`).replace(/ xmlns="[^"]*"/g, '');
  await fs.writeFile(`${directory}/dom-initial.html`, simp(await root.evaluate(n => n.outerHTML)));
  await page.evaluate(() => {
    const root = document.querySelector('[class*="ai-workflow_root"]');
    const ev = window.__ev = []; let t0 = performance.now(); const seen = new WeakSet();
    window.__reset = () => { t0 = performance.now(); ev.length = 0; };
    const short = n => { const c = typeof n.className === 'string' ? n.className : (n.className?.baseVal ?? ''); const m = c.match(/ai-workflow_(\w+?)__/); return m ? 'aw_' + m[1] : n.tagName.toLowerCase(); };
    const push = o => ev.push({ t: +(performance.now() - t0).toFixed(0), ...o });
    new MutationObserver(list => { for (const m of list) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue;
      const label = el.closest('li, [role=listitem]')?.querySelector('[class*="stepTitle"]')?.textContent?.slice(0, 22);
      if (m.type === 'attributes') { if (m.attributeName === 'style' || m.attributeName === 'class') continue; push({ k: 'attr', el: short(el), step: label, a: m.attributeName, v: (el.getAttribute(m.attributeName) ?? '').slice(0, 70) }); }
      else if (m.type === 'childList') { const add = [...m.addedNodes].filter(n => n.nodeType === 1).map(short); const del = [...m.removedNodes].filter(n => n.nodeType === 1).map(short); if (add.length || del.length) push({ k: 'child', el: short(el), step: label, add: add.join(','), del: del.join(',') }); }
      else if (m.type === 'characterData') push({ k: 'text', el: short(el), step: label, v: (m.target.data ?? '').slice(0, 60) });
    } }).observe(root, { subtree: true, attributes: true, childList: true, characterData: true });
    const scan = () => { for (const a of document.getAnimations()) { if (seen.has(a)) continue; const t = a.effect?.target; if (!t || !root.contains(t)) continue; seen.add(a); const ti = a.effect.getTiming(); push({ k: 'anim', kind: a.constructor.name, el: short(t), prop: a.transitionProperty ?? a.animationName, dur: Math.round(ti.duration), delay: ti.delay, ease: String(ti.easing).slice(0, 50) }); } requestAnimationFrame(scan); }; requestAnimationFrame(scan);
  });
  await page.evaluate(() => window.__reset());
  await root.getByRole('button', { name: /run/i }).first().click();
  await page.waitForTimeout(5500);
  const ev = await page.evaluate(() => window.__ev.slice());
  await fs.writeFile(`${directory}/timeline-run.json`, JSON.stringify(ev));
  console.log('events', ev.length);
} finally { await browser.close(); }
