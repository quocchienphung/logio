import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. No API, registry, Code tab, bundle or prompt reads.
// Sheet DOM/CSS/computed styles, and frame-by-frame recordings of it opening, dragging, rubber-banding, settling on a detent,
// being flicked, dismissed and moved by the keyboard.
const directory = 'docs/research/bottom-sheet/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const save = (name, data) => fs.writeFile(`${directory}/${name}`, typeof data === 'string' ? data : JSON.stringify(data));

const SAMPLER = () => {
  window.__on = false; window.__f = [];
  window.__go = () => {
    window.__f = []; window.__on = true; const t0 = performance.now();
    const tick = () => {
      if (!window.__on) return;
      const dialog = document.querySelector('[role="dialog"]');
      const overlay = document.querySelector('[class*="bottom-sheet_overlay"], [class*="bottom-sheet_backdrop"]');
      if (dialog) {
        const r = dialog.getBoundingClientRect(), s = getComputedStyle(dialog), o = overlay ? getComputedStyle(overlay) : null;
        const content = dialog.querySelector('[class*="bottom-sheet_body"], [class*="bottom-sheet_content"]');
        window.__f.push({ t: +(performance.now() - t0).toFixed(1), top: +r.top.toFixed(2), h: +r.height.toFixed(2), w: +r.width.toFixed(2), tf: s.transform, op: +s.opacity, ov: o && +(+o.opacity).toFixed(4), ovBg: o && o.backgroundColor, radius: s.borderRadius, scroll: content ? content.scrollTop : null });
      } else window.__f.push({ t: +(performance.now() - t0).toFixed(1), gone: true });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.__stop = () => { window.__on = false; return window.__f; };
};

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(SAMPLER);
const page = await context.newPage();
await page.goto('https://uiarc.dev/components/bottom-sheet', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const trigger = page.getByRole('button', { name: 'View trip details' });
await trigger.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(800);
const pressAt = async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); };
const tb = await trigger.boundingBox();
await page.screenshot({ path: `${directory}/00-closed.png` });

// opening
await page.evaluate(() => window.__go());
await page.waitForTimeout(60);
await pressAt(tb.x + tb.width / 2, tb.y + tb.height / 2);
await page.waitForTimeout(1500);
const opening = await page.evaluate(() => window.__stop());
await save('motion-open.json', opening);
await page.screenshot({ path: `${directory}/01-open-initial.png` });
const dialog = page.getByRole('dialog');
await save('01-sheet.html', await dialog.evaluate(n => n.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>')));
await save('01-dom-tree.json', await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const chain = []; let n = d; while (n && n !== document.body) { chain.push(`${n.tagName}.${String(n.className).slice(0, 70)}[${[...n.attributes].filter(a => a.name.startsWith('data-') || a.name === 'role' || a.name.startsWith('aria-')).map(a => `${a.name}=${a.value}`.slice(0, 50)).join(' ')}] style=${(n.getAttribute('style') || '').slice(0, 160)}`); n = n.parentElement; } return chain; }));
const all = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const els = [d, ...d.querySelectorAll('*'), d.parentElement, ...(d.parentElement.parentElement ? [d.parentElement.parentElement] : [])]; return els.map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { tag: n.tagName, cls: String(n.className?.baseVal ?? n.className).slice(0, 80), text: (n.children.length ? '' : n.textContent).slice(0, 30), rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)), color: s.color, bg: s.backgroundColor, font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight}`, radius: s.borderRadius, border: s.border, shadow: s.boxShadow, pad: s.padding, gap: s.gap, touch: s.touchAction, pos: s.position, overflow: s.overflow, backdrop: s.backdropFilter, z: s.zIndex }; }); });
await save('01-styles.json', all);
const css = await page.evaluate(() => { const out = []; const walk = (rules, prefix) => { for (const r of rules) { if (r.cssRules && !r.selectorText) walk([...r.cssRules], `@${r.conditionText ?? r.name ?? ''} `); else if (r.selectorText && /bottom-sheet/.test(r.selectorText)) out.push(prefix + r.cssText); } }; for (const sheet of document.styleSheets) { try { walk([...sheet.cssRules], ''); } catch {} } return out; });
await save('declared-styles.css', css.join('\n\n'));
const box0 = await dialog.boundingBox();
console.log('initial sheet', JSON.stringify(box0), 'vh 1000 -> fraction', ((1000 - box0.y) / 1000).toFixed(3));
console.log('focus:', await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
console.log('grabber:', await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].map(b => `${b.getAttribute('aria-label')}|${b.getAttribute('aria-expanded')}|${String(b.className).slice(0, 40)}`)));

// find the grabber and the header
const grabber = dialog.getByRole('button', { name: /expand sheet|collapse sheet/i }).first();
const gb = await grabber.boundingBox();
console.log('grabber box', JSON.stringify(gb));

// keyboard: ArrowUp on the grabber, then End / Home / Enter
const keyRecord = async (name, key) => {
  await page.evaluate(() => window.__go()); await page.waitForTimeout(40);
  await grabber.focus(); await page.keyboard.press(key); await page.waitForTimeout(1100);
  const frames = await page.evaluate(() => window.__stop()); await save(name, frames);
  console.log(name, 'label:', await grabber.getAttribute('aria-label'), 'expanded:', await grabber.getAttribute('aria-expanded'), 'top', (await dialog.boundingBox()).y);
};
await keyRecord('motion-key-up.json', 'ArrowUp');
await page.screenshot({ path: `${directory}/02-open-tall.png` });
await keyRecord('motion-key-down.json', 'ArrowDown');
await keyRecord('motion-key-end.json', 'End');
await keyRecord('motion-key-home.json', 'Home');
await keyRecord('motion-key-enter.json', 'Enter');
await keyRecord('motion-key-enter2.json', 'Enter');
await page.screenshot({ path: `${directory}/03-after-toggle.png` });

// pointer drag from the header: follow 1:1?
const dragRecord = async (name, { from, to, steps = 12, stepMs = 16, hold = 0 }) => {
  const b = await dialog.boundingBox();
  const sx = b.x + b.width / 2, sy = from ?? b.y + 24;
  await page.evaluate(() => window.__go()); await page.waitForTimeout(40);
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(sx, sy + (to - sy) * i / steps); await page.waitForTimeout(stepMs); }
  if (hold) await page.waitForTimeout(hold);
  await page.mouse.up();
  await page.waitForTimeout(1300);
  const frames = await page.evaluate(() => window.__stop()); await save(name, frames);
  const after = await dialog.boundingBox().catch(() => null);
  console.log(name, 'sheet top after:', after && after.y, after ? `fraction ${(1 - after.y / 1000).toFixed(3)}` : 'gone');
  return frames;
};
// make sure it is at the smallest detent first
await grabber.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(900);
const b1 = await dialog.boundingBox();
await dragRecord('motion-drag-slow-up-to-mid.json', { to: b1.y + 24 - 160, steps: 20, stepMs: 24, hold: 500 });     // slow drag partway, held then released
await grabber.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(900);
await dragRecord('motion-drag-slow-up-far.json', { to: 40, steps: 24, stepMs: 24, hold: 500 });                        // beyond the tallest detent (rubber band)
await dragRecord('motion-drag-down-small.json', { to: 24 + 140 + 60, from: 24 + 60, steps: 10, stepMs: 20, hold: 400 }).catch(() => {});
await grabber.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(900);
await dragRecord('motion-flick-up.json', { to: (await dialog.boundingBox()).y - 140, steps: 4, stepMs: 8 });           // fast short flick up
await grabber.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(900);
await dragRecord('motion-flick-down-dismiss.json', { to: 1000, steps: 4, stepMs: 8 });                               // fast flick down
console.log('after flick down: dialogs', await page.getByRole('dialog').count());
await page.waitForTimeout(500);
// reopen, slow drag far down to dismiss
await pressAt(tb.x + tb.width / 2, tb.y + tb.height / 2); await page.waitForTimeout(1000);
await dragRecord('motion-drag-slow-down-dismiss.json', { to: 980, steps: 30, stepMs: 24, hold: 300 });
console.log('after slow drag down: dialogs', await page.getByRole('dialog').count());
await page.waitForTimeout(400);

// escape, overlay click
await pressAt(tb.x + tb.width / 2, tb.y + tb.height / 2); await page.waitForTimeout(1000);
await page.evaluate(() => window.__go()); await page.waitForTimeout(40); await page.keyboard.press('Escape'); await page.waitForTimeout(900);
await save('motion-escape-close.json', await page.evaluate(() => window.__stop()));
console.log('focus after escape:', await page.evaluate(() => document.activeElement?.textContent?.slice(0, 30)));
await pressAt(tb.x + tb.width / 2, tb.y + tb.height / 2); await page.waitForTimeout(1000);
await page.evaluate(() => window.__go()); await page.waitForTimeout(40); await pressAt(60, 200); await page.waitForTimeout(900);
await save('motion-outside-click-close.json', await page.evaluate(() => window.__stop()));
console.log('dialogs after outside click:', await page.getByRole('dialog').count());

// phone
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await phone.addInitScript(SAMPLER);
const pp = await phone.newPage();
await pp.goto('https://uiarc.dev/components/bottom-sheet', { waitUntil: 'networkidle' }); await pp.waitForTimeout(1500);
const ptrigger = pp.getByRole('button', { name: 'View trip details' });
await ptrigger.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await pp.waitForTimeout(600);
await ptrigger.tap(); await pp.waitForTimeout(1200);
await pp.screenshot({ path: `${directory}/10-phone-open.png` });
await save('10-phone-box.json', await pp.getByRole('dialog').boundingBox());
// dark
const dk = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
const dp = await dk.newPage();
await dp.goto('https://uiarc.dev/components/bottom-sheet', { waitUntil: 'networkidle' }); await dp.waitForTimeout(1200);
await dp.getByRole('button', { name: 'Switch to dark mode' }).click().catch(() => {}); await dp.waitForTimeout(500);
await dp.getByRole('button', { name: 'View trip details' }).evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
await dp.getByRole('button', { name: 'View trip details' }).evaluate(n => n.click()); await dp.waitForTimeout(1200);
await dp.screenshot({ path: `${directory}/11-dark-open.png` });
await browser.close();
