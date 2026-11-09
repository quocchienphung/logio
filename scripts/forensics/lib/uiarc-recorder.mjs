import fs from 'node:fs/promises';
import { chromium } from 'playwright';

/**
 * Records a public UIArc preview from its rendered page only: every DOM change and every animation inside a root, time-stamped from a reset,
 * plus per-frame samples taken by a function the caller supplies (heights, opacities, scroll...). Nothing but the rendered page is read.
 */
export async function record({ slug, prefix, directory, sampler = '() => ({})', scenarios, viewport = { width: 1440, height: 1100 }, setup }) {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`https://uiarc.dev/components/${slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const root = page.locator(`[class*="${prefix}_root"]`).first();
    await root.scrollIntoViewIfNeeded();
    await fs.mkdir(directory, { recursive: true });
    await page.evaluate(({ prefix, sampler }) => {
      const root = document.querySelector(`[class*="${prefix}_root"]`);
      const ev = window.__ev = []; let t0 = performance.now(); const seen = new WeakSet();
      window.__reset = () => { t0 = performance.now(); ev.length = 0; };
      const short = n => { const c = typeof n.className === 'string' ? n.className : (n.className?.baseVal ?? ''); const m = c.match(new RegExp(prefix + '_(\\w+?)__')); return m ? 'x_' + m[1] : n.tagName.toLowerCase(); };
      const push = o => ev.push({ t: +(performance.now() - t0).toFixed(1), ...o });
      new MutationObserver(list => { for (const m of list) {
        const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue;
        if (m.type === 'attributes') { if (m.attributeName === 'style' || m.attributeName === 'class') continue; push({ k: 'attr', el: short(el), a: m.attributeName, v: (el.getAttribute(m.attributeName) ?? '').slice(0, 80) }); }
        else if (m.type === 'childList') { const add = [...m.addedNodes].map(n => n.nodeType === 1 ? short(n) + (n.textContent ? `"${n.textContent.slice(0, 24)}"` : '') : '#text'); const del = [...m.removedNodes].map(n => n.nodeType === 1 ? short(n) : '#text'); if (add.length || del.length) push({ k: 'child', el: short(el), add: add.slice(0, 5), nAdd: add.length, del: del.slice(0, 5), nDel: del.length }); }
        else push({ k: 'text', el: short(el), v: (m.target.data ?? '').slice(0, 60) });
      } }).observe(document.body.contains(root) ? root : document.body, { subtree: true, attributes: true, childList: true, characterData: true });
      const measure = eval(sampler);
      const frame = () => { push({ k: 'frame', ...measure(root) }); requestAnimationFrame(frame); }; requestAnimationFrame(frame);
      const scan = () => { for (const a of document.getAnimations()) { if (seen.has(a)) continue; const t = a.effect?.target; if (!t || !document.body.contains(t)) continue; if (!root.contains(t) && !t.closest('[role=menu], [data-radix-popper-content-wrapper]')) continue; seen.add(a); const ti = a.effect.getTiming(); let frames = []; try { frames = a.effect.getKeyframes().map(f => Object.fromEntries(Object.entries(f).filter(([k]) => !['composite', 'computedOffset'].includes(k)))).slice(0, 3); } catch {} push({ k: 'anim', kind: a.constructor.name, el: short(t), prop: a.transitionProperty ?? a.animationName, dur: Math.round(ti.duration), delay: ti.delay, ease: String(ti.easing).slice(0, 80), frames }); } requestAnimationFrame(scan); };
      requestAnimationFrame(scan);
    }, { prefix, sampler });
    if (setup) await setup({ page, root });
    const run = async (name, action, span = 1500, keepFrames = (e) => true) => {
      await page.evaluate(() => window.__reset());
      await action();
      await page.waitForTimeout(span);
      const events = (await page.evaluate(() => window.__ev.slice())).filter(e => e.k !== 'frame' || keepFrames(e));
      await fs.writeFile(`${directory}/timeline-${name}.json`, JSON.stringify(events));
      console.log(name, events.length, 'events');
      return events;
    };
    await scenarios({ page, root, run });
  } finally { await browser.close(); }
}
