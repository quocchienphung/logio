import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. No API, registry, Code tab, bundle, or prompt reads.
// Records, frame by frame, how the page column and the assistant panel move when the panel is closed and opened again.
const directory = 'docs/research/ai-side-panel/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://uiarc.dev/components/blocks/ai-side-panel', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.locator('[class*="ai-side-panel_root"]').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

// Structure of the panel and the rules declared for its classes (rendered page only)
const panelInfo = await page.evaluate(() => {
  const root = document.querySelector('[class*="ai-side-panel_root"]');
  const reopen = root.querySelector('[class*="ai-side-panel_reopen"]');
  const panel = document.getElementById(reopen.getAttribute('aria-controls')) ?? root.querySelector('aside');
  const names = new Set();
  const add = el => String(el.className?.baseVal ?? el.className).split(' ').filter(Boolean).forEach(c => names.add(c));
  add(root); root.querySelectorAll('*').forEach(add);
  const rules = [];
  for (const sheet of document.styleSheets) {
    let list; try { list = [...sheet.cssRules]; } catch { continue; }
    const walk = (rs, prefix) => { for (const r of rs) { if (r.cssRules && !r.selectorText) walk([...r.cssRules], `@${r.conditionText ?? r.name ?? ''} `); else if (r.selectorText && /ai-side-panel/.test(r.selectorText)) rules.push(prefix + r.cssText); } };
    walk(list, '');
  }
  return { rootClass: root.className, panelTag: panel?.tagName, panelClass: panel?.className, panelHtml: panel?.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').slice(0, 6000), rules, rootStyle: root.getAttribute('style'), panelStyle: panel?.getAttribute('style') };
});
await fs.writeFile(`${directory}/panel-structure.json`, JSON.stringify({ ...panelInfo, rules: undefined }, null, 2));
await fs.writeFile(`${directory}/declared-styles-all.css`, panelInfo.rules.join('\n\n'));

const record = async (name, action, duration = 1400) => {
  await page.evaluate(() => {
    const root = document.querySelector('[class*="ai-side-panel_root"]');
    const reopen = root.querySelector('[class*="ai-side-panel_reopen"]');
    const panel = document.getElementById(reopen.getAttribute('aria-controls')) ?? root.querySelector('aside');
    const col = root.querySelector('[class*="ai-side-panel_pageCol"]');
    const doc = root.querySelector('[class*="ai-side-panel_doc_"]');
    const frames = []; window.__frames = frames; window.__recording = true;
    const t0 = performance.now();
    const rect = el => { const r = el.getBoundingClientRect(); return [+r.x.toFixed(2), +r.width.toFixed(2)]; };
    const tick = () => {
      const p = getComputedStyle(panel), r = getComputedStyle(reopen);
      frames.push({ t: +(performance.now() - t0).toFixed(1), panel: rect(panel), panelTransform: p.transform, panelOpacity: p.opacity, panelWidth: p.width, panelVisibility: p.visibility, col: rect(col), doc: rect(doc), reopenOpacity: r.opacity, reopenTransform: r.transform, children: [...panel.children].slice(0, 3).map(c => getComputedStyle(c).opacity) });
      if (window.__recording) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.waitForTimeout(60);
  await action();
  await page.waitForTimeout(duration);
  const frames = await page.evaluate(() => { window.__recording = false; return window.__frames; });
  await fs.writeFile(`${directory}/motion-${name}.json`, JSON.stringify(frames));
  console.log(name, 'frames', frames.length, 'first', JSON.stringify(frames[0].panel), 'last', JSON.stringify(frames.at(-1).panel));
};

const closeButton = page.locator('[class*="ai-side-panel_root"] button[aria-label*="lose"], [class*="ai-side-panel_root"] button[aria-label*="ollapse"], [class*="ai-side-panel_root"] button[aria-label*="ide"]').first();
console.log('close button', await closeButton.getAttribute('aria-label'));
await record('close', () => closeButton.click());
await page.screenshot({ path: `${directory}/closed.png` });
const reopen = page.locator('[class*="ai-side-panel_reopen"]');
await record('open', () => reopen.click());
await page.screenshot({ path: `${directory}/reopened.png` });
await record('close2', () => closeButton.click());
await browser.close();
