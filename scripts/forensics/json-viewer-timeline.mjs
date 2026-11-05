import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Frame-by-frame record of the public JSON viewer preview: DOM changes, animations, and per-frame samples of the rows, the highlight, the tree
// scroll and the chevrons. Read from the rendered page only. Output: docs/research/json-viewer/source/timeline-<scenario>.json
const directory = 'docs/research/json-viewer/source';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://uiarc.dev' });
  const page = await context.newPage();
  await page.goto('https://uiarc.dev/components/json-viewer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const root = page.locator('[class*="json-viewer_root"]').first();
  await root.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const root = document.querySelector('[class*="json-viewer_root"]'), tree = root.querySelector('[role=tree]');
    const ev = window.__ev = []; let t0 = performance.now(); const seen = new WeakSet();
    window.__reset = () => { t0 = performance.now(); ev.length = 0; };
    const short = n => { const c = typeof n.className === 'string' ? n.className : (n.className?.baseVal ?? ''); const m = c.match(/json-viewer_(\w+?)__/); return m ? 'jv_' + m[1] : n.tagName.toLowerCase(); };
    const push = o => ev.push({ t: +(performance.now() - t0).toFixed(1), ...o });
    new MutationObserver(list => { for (const m of list) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue;
      if (m.type === 'attributes') { if (m.attributeName === 'style') continue; push({ k: 'attr', el: short(el), row: el.closest('[role=treeitem]')?.getAttribute('aria-label') ?? undefined, a: m.attributeName, v: (el.getAttribute(m.attributeName) ?? '').slice(0, 60) }); }
      else if (m.type === 'childList') { const add = [...m.addedNodes].filter(n => n.nodeType === 1).map(n => n.getAttribute?.('aria-label') ?? short(n)); const del = [...m.removedNodes].filter(n => n.nodeType === 1).map(n => n.getAttribute?.('aria-label') ?? short(n)); if (add.length || del.length) push({ k: 'child', el: short(el), add: add.slice(0, 6), nAdd: add.length, del: del.slice(0, 6), nDel: del.length }); }
      else if (m.type === 'characterData') push({ k: 'text', el: short(el), v: (m.target.data ?? '').slice(0, 50) });
    } }).observe(root, { subtree: true, attributes: true, childList: true, characterData: true });
    // per-frame samples
    const frame = () => {
      const rows = [...tree.querySelectorAll('[role=treeitem]')];
      const sample = rows.filter(r => { const h = parseFloat(r.style.height); return r.style.height && (h < 29.9 || parseFloat(r.style.opacity) < 0.99); }).slice(0, 4).map(r => ({ l: (r.getAttribute('aria-label') ?? '').slice(0, 24), h: +parseFloat(r.style.height).toFixed(2), o: +parseFloat(r.style.opacity).toFixed(3) }));
      const hl = tree.querySelector('[class*="json-viewer_highlight"]'); const hr = hl?.getBoundingClientRect(), tr = tree.getBoundingClientRect();
      const chev = [...tree.querySelectorAll('[class*="json-viewer_chevron"][data-branch]')].slice(0, 3).map(c => +(Math.atan2(new DOMMatrix(getComputedStyle(c).transform).b, new DOMMatrix(getComputedStyle(c).transform).a) * 180 / Math.PI).toFixed(1));
      push({ k: 'frame', rows: rows.length, scroll: Math.round(tree.scrollTop * 10) / 10, sample, hl: hr ? { y: +(hr.top - tr.top).toFixed(1), h: +hr.height.toFixed(1), tf: hl.style.transform.slice(0, 80), o: hl.style.opacity } : null, chev });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // animations
    const scan = () => { for (const a of document.getAnimations()) { if (seen.has(a)) continue; const t = a.effect?.target; if (!t || !root.contains(t)) continue; seen.add(a); const timing = a.effect.getTiming(); let frames = []; try { frames = a.effect.getKeyframes().map(f => Object.fromEntries(Object.entries(f).filter(([k]) => !['composite', 'computedOffset'].includes(k)))).slice(0, 3); } catch {} push({ k: 'anim', kind: a.constructor.name, el: short(t), prop: a.transitionProperty ?? a.animationName, dur: timing.duration, delay: timing.delay, ease: String(timing.easing).slice(0, 110), frames }); } requestAnimationFrame(scan); };
    requestAnimationFrame(scan);
  });
  const run = async (name, action, span = 1400) => {
    await page.evaluate(() => window.__reset());
    await action();
    await page.waitForTimeout(span);
    const events = (await page.evaluate(() => window.__ev.slice())).filter(e => e.k !== 'frame' || e.sample.length || e.hl || e.chev.some(c => c !== 0 && c !== 90));
    await fs.writeFile(`${directory}/timeline-${name}.json`, JSON.stringify(events));
    console.log(name, events.length, 'events');
  };
  const item = text => root.getByRole('treeitem').filter({ hasText: text }).first();
  await run('expand-customer', () => item(/^customer/).click());
  await run('collapse-customer', () => item(/^customer/).click());
  await run('expand-events', () => item(/^events/).click(), 1600);
  await run('show-more', () => root.locator('[data-kind="more"]').first().click(), 1600);
  await run('collapse-events', () => item(/^events/).click(), 1600);
  await run('search-type', async () => { await root.locator('input[type=search]').click(); await page.keyboard.type('refund', { delay: 110 }); }, 2200);
  await run('search-next', () => page.keyboard.press('Enter'), 1200);
  await run('clear-search', () => page.keyboard.press('Escape'), 1400);
  await run('expand-all', () => root.getByRole('button', { name: 'Expand all' }).click(), 2000);
  await run('collapse-all', () => root.getByRole('button', { name: 'Collapse all' }).click(), 1600);
  await item(/^order/).click(); await page.waitForTimeout(500);
  if (await item(/^order/).getAttribute('aria-expanded') !== 'true') { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500); }
  await run('arrow-down', () => page.keyboard.press('ArrowDown'), 900);
  await run('arrow-down-2', () => page.keyboard.press('ArrowDown'), 900);
  await run('copy-value', async () => { await item(/^id/).hover(); await item(/^id/).getByRole('button', { name: 'Copy value' }).click(); }, 2600);
  await run('copy-path', () => item(/^id/).getByRole('button', { name: 'Copy path' }).click(), 2600);
  await run('end-key', () => page.keyboard.press('End'), 900);
} finally { await browser.close(); }
