import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. No API, registry, Code tab, bundle or prompt reads.
const directory = 'docs/research/split-button/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const save = (name, data) => fs.writeFile(`${directory}/${name}`, typeof data === 'string' ? data : JSON.stringify(data));

const SAMPLER = () => {
  window.__rec = { on: false, frames: [] };
  window.__go = () => {
    const rec = window.__rec; rec.frames = []; rec.on = true; const t0 = performance.now();
    const tick = () => {
      if (!rec.on) return;
      const group = document.querySelector('[class*="split-button_group"]');
      if (group) {
        const primary = group.querySelector('[class*="split-button_primary_"], [class*="split-button_primary"]');
        const slot = group.querySelector('[class*="split-button_primarySlot"]');
        const trigger = group.querySelector('[class*="split-button_trigger"]');
        const gr = group.getBoundingClientRect(), pr = primary?.getBoundingClientRect(), tr = trigger?.getBoundingClientRect(), sr = slot?.getBoundingClientRect();
        const letters = [...group.querySelectorAll('[class*="split-button_primaryContent"] span')].slice(0, 40).map(s => { const c = getComputedStyle(s); return [s.textContent, +(+c.opacity).toFixed(3), c.transform === 'none' ? 0 : +c.transform.match(/matrix\(([^)]+)\)/)?.[1].split(',')[5], c.filter === 'none' ? 0 : c.filter]; });
        rec.frames.push({ t: +(performance.now() - t0).toFixed(1), group: [gr.width, gr.height].map(v => +v.toFixed(2)), primary: pr && [pr.width, pr.height].map(v => +v.toFixed(2)), slot: sr && +sr.width.toFixed(2), trigger: tr && [tr.x - gr.x, tr.width].map(v => +v.toFixed(2)), pTf: primary ? getComputedStyle(primary).transform : null, letters: letters.length, sample: letters.slice(0, 12) });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.__end = () => { window.__rec.on = false; return window.__rec.frames; };
};

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(SAMPLER);
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/split-button', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const group = page.locator('[class*="split-button_group"]').first();
await group.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(1200);
const stage = group.locator('xpath=ancestor::*[contains(@class,"demo") or contains(@class,"stage")][1]');

await save('01-rest.html', await group.evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, m => m.length > 500 ? '<svg…/>' : m)));
await group.screenshot({ path: `${directory}/01-rest.png` });
const parts = await page.locator('[class*="split-button_group"], [class*="split-button_group"] *').evaluateAll(nodes => nodes.map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { tag: n.tagName, cls: String(n.className?.baseVal ?? n.className).slice(0, 80), text: (n.children.length ? '' : n.textContent).slice(0, 20), rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)), color: s.color, bg: s.backgroundColor, font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight}`, radius: s.borderRadius, border: s.border, shadow: s.boxShadow, pad: s.padding, gap: s.gap, transition: s.transition.slice(0, 160), minW: s.minWidth }; }));
await save('01-rest-styles.json', parts);
const css = await page.evaluate(() => { const out = []; const walk = (rules, prefix) => { for (const r of rules) { if (r.cssRules && !r.selectorText) walk([...r.cssRules], `@${r.conditionText ?? r.name ?? ''} `); else if (r.selectorText && /split-button/.test(r.selectorText)) out.push(prefix + r.cssText); } }; for (const sheet of document.styleSheets) { try { walk([...sheet.cssRules], ''); } catch {} } return out; });
await save('declared-styles.css', css.join('\n\n'));
console.log('rest label:', await group.innerText(), '| buttons:', await group.getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') || x.textContent.slice(0, 20))));

// hover on each half
const pressAt = async el => { const b = await el.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.up(); };
const [mainBtn, chevron] = [group.getByRole('button').first(), group.getByRole('button').last()];
await mainBtn.hover(); await page.waitForTimeout(400); await group.screenshot({ path: `${directory}/02-hover-main.png` });
const readBtn = el => el.evaluate(n => { const s = getComputedStyle(n); return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, transform: s.transform, scale: s.scale, filter: s.filter, transition: s.transition.slice(0, 220) }; });
const states = { main: { rest: null }, chevron: {} };
await page.mouse.move(5, 5); await page.waitForTimeout(300);
states.main.rest = await readBtn(mainBtn); states.chevron.rest = await readBtn(chevron);
await mainBtn.hover(); await page.waitForTimeout(400); states.main.hover = await readBtn(mainBtn);
await page.mouse.down(); await page.waitForTimeout(250); states.main.active = await readBtn(mainBtn); await group.screenshot({ path: `${directory}/03-press-main.png` });
await page.mouse.move(5, 5); await page.mouse.up(); await page.waitForTimeout(200);
await chevron.hover(); await page.waitForTimeout(400); states.chevron.hover = await readBtn(chevron); await group.screenshot({ path: `${directory}/02-hover-chevron.png` });
await page.mouse.down(); await page.waitForTimeout(250); states.chevron.active = await readBtn(chevron);
await page.mouse.move(5, 5); await page.mouse.up(); await page.waitForTimeout(200);
await save('button-states.json', states);

// the main action: what happens to the label?
await page.mouse.move(5, 5); await page.waitForTimeout(500);
await page.evaluate(() => window.__go());
await page.waitForTimeout(60);
await pressAt(mainBtn);
await page.waitForTimeout(250); await group.screenshot({ path: `${directory}/04-after-click-250.png` });
await page.waitForTimeout(2800);
const clickFrames = await page.evaluate(() => window.__end());
await save('motion-main-click.json', clickFrames);
console.log('after click label:', await group.innerText(), 'frames', clickFrames.length);
const widths = [...new Set(clickFrames.map(f => f.group[0]))];
console.log('group widths seen:', widths.slice(0, 20).join(', '));
await page.waitForTimeout(2500);
console.log('label later:', await group.innerText());

// the menu
await pressAt(chevron); await page.waitForTimeout(900);
await page.screenshot({ path: `${directory}/05-menu-open.png` });
const menu = page.getByRole('menu');
console.log('menu items:', await menu.getByRole('menuitem').allInnerTexts(), '| aria:', await chevron.getAttribute('aria-label'), await chevron.getAttribute('aria-expanded'));
await save('05-menu.html', await menu.evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>')).catch(() => ''));
await save('05-menu-styles.json', await page.locator('[role="menu"], [role="menu"] *').evaluateAll(nodes => nodes.map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { tag: n.tagName, cls: String(n.className?.baseVal ?? n.className).slice(0, 70), text: (n.children.length ? '' : n.textContent).slice(0, 24), rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)), color: s.color, bg: s.backgroundColor, font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight}`, radius: s.borderRadius, border: s.border, shadow: s.boxShadow, pad: s.padding, gap: s.gap, backdrop: s.backdropFilter }; })));
const items = menu.getByRole('menuitem');
await items.nth(1).hover(); await page.waitForTimeout(300); await page.screenshot({ path: `${directory}/06-menu-hover-item.png` });
await save('menu-item-hover.json', await items.nth(1).evaluate(n => { const s = getComputedStyle(n); return { bg: s.backgroundColor, color: s.color, transition: s.transition.slice(0, 160), outline: s.outline }; }));
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
console.log('focus after Escape:', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')));

// menu open and close, frame by frame
const menuRecord = async (name, action) => {
  await page.evaluate(() => {
    window.__m = []; window.__mon = true; const t0 = performance.now();
    const tick = () => { if (!window.__mon) return; const m = document.querySelector('[role="menu"]'); const wrap = m?.parentElement; if (m) { const r = m.getBoundingClientRect(), s = getComputedStyle(m), w = wrap ? getComputedStyle(wrap) : null; window.__m.push({ t: +(performance.now() - t0).toFixed(1), rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)), op: +s.opacity, tf: s.transform, wop: w && +w.opacity, wtf: w && w.transform, items: [...m.querySelectorAll('[role="menuitem"]')].map(i => { const c = getComputedStyle(i); return [+(+c.opacity).toFixed(3), c.transform === 'none' ? 0 : +c.transform.match(/matrix\(([^)]+)\)/)?.[1].split(',')[5]]; }) }); } else window.__m.push({ t: +(performance.now() - t0).toFixed(1), gone: true }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.waitForTimeout(40);
  await action();
  await page.waitForTimeout(900);
  const frames = await page.evaluate(() => { window.__mon = false; return window.__m; });
  await save(name, frames);
  return frames;
};
await menuRecord('motion-menu-open.json', () => pressAt(chevron));
await menuRecord('motion-menu-close.json', () => page.keyboard.press('Escape'));
// chevron rotation while open
await page.evaluate(() => { window.__c = []; window.__con = true; const t0 = performance.now(); const tick = () => { if (!window.__con) return; const g = document.querySelector('[class*="split-button_trigger"]'); const svg = g?.querySelector('svg'); window.__c.push({ t: +(performance.now() - t0).toFixed(1), tf: svg ? getComputedStyle(svg).transform : null, trig: g ? getComputedStyle(g).transform : null }); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
await page.waitForTimeout(40); await pressAt(chevron); await page.waitForTimeout(700);
await save('motion-chevron-open.json', await page.evaluate(() => { window.__con = false; return window.__c; }));
await page.keyboard.press('Escape'); await page.waitForTimeout(500);

// keyboard focus ring
await mainBtn.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
await group.screenshot({ path: `${directory}/07-focus-main.png` });
await save('focus.json', await mainBtn.evaluate(n => { const s = getComputedStyle(n); return { outline: s.outline, offset: s.outlineOffset, shadow: s.boxShadow }; }));
await chevron.focus(); await group.screenshot({ path: `${directory}/07-focus-chevron.png` });

// dark and the variants listed on the page
await page.getByRole('button', { name: 'Switch to dark mode' }).click().catch(() => {}); await page.waitForTimeout(600);
await group.screenshot({ path: `${directory}/08-dark.png` });
await pressAt(chevron); await page.waitForTimeout(700); await page.screenshot({ path: `${directory}/09-dark-menu.png` });
await save('dark-menu-styles.json', await page.locator('[role="menu"], [role="menuitem"]').first().evaluate(n => { const s = getComputedStyle(n); return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, border: s.border }; }));
await browser.close();
