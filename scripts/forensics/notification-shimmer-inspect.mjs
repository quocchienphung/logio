// Observes two public affectUI pages: the Notification Stack component (https://www.affectui.com/components/notification-stack) and the
// Shimmer Loader motion effect (https://www.affectui.com/motion/shimmer-loader). Only the visible previews and public docs are read; the
// gated Code tabs, prompts, registry and CLI are never opened. Usage: node scripts/forensics/notification-shimmer-inspect.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });

async function inspect(slug, url, rootPattern, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Decline', exact: true }).click().catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/source-page.png` });
  await fs.writeFile(`${outDir}/source-docs.txt`, await page.locator('main').innerText());
  const info = await page.evaluate(pattern => {
    const roots = new Map();
    document.querySelectorAll('[class]').forEach(el => String(el.className).split(/\s+/).forEach(c => { if (new RegExp(pattern).test(c)) roots.set(c.split('__')[0], (roots.get(c.split('__')[0]) || 0) + 1); }));
    return { title: document.title, roots: [...roots.entries()] };
  }, rootPattern);
  console.log(slug, JSON.stringify(info));
  // every declared rule that mentions the component's classes or its keyframes
  await fs.writeFile(`${outDir}/observed-rules.css`, await page.evaluate(pattern => {
    const rx = new RegExp(pattern), rules = [];
    const walk = (list, wrap = '') => {
      for (const rule of list) {
        if (rule.cssRules && rule.conditionText !== undefined) walk(rule.cssRules, `${rule.constructor.name === 'CSSMediaRule' ? '@media ' : '@container '}${rule.conditionText}`);
        else if (rule.cssText && rx.test(rule.cssText)) rules.push(wrap ? `${wrap} { ${rule.cssText} }` : rule.cssText);
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
    return rules.join('\n');
  }, rootPattern));
  return page;
}

// ---------- Notification Stack ----------
const stack = await inspect('notification-stack', 'https://www.affectui.com/components/notification-stack', 'ui-ns|ui-nst|ui-notif', 'docs/research/notification-stack');
await stack.screenshot({ path: 'docs/research/notification-stack/source-desktop.png' });
const sampled = [];
const started = Date.now();
let lastSignature = '';
let shots = 0;
while (Date.now() - started < 50_000) {
  const snap = await stack.evaluate(() => {
    const root = document.querySelector('[class*="ui-ns"]');
    if (!root) return null;
    const items = [...root.querySelectorAll('[class*="__item"], [class*="__card"], [role="status"], [role="alert"], li')].slice(0, 20).map(el => ({ cls: String(el.className), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 140), box: (() => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; })(), data: Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])) }));
    return { rootClass: String(root.className), text: root.textContent.trim().replace(/\s+/g, ' ').slice(0, 400), items };
  });
  const at = Math.round((Date.now() - started) / 100) / 10;
  const signature = JSON.stringify(snap?.items.map(item => [item.cls, item.text, item.data]));
  if (snap && signature !== lastSignature) {
    lastSignature = signature;
    sampled.push({ at, ...snap });
    if (shots < 14) { shots += 1; await stack.screenshot({ path: `docs/research/notification-stack/source-seq-${String(shots).padStart(2, '0')}.png` }); }
  }
  await stack.waitForTimeout(500);
}
await fs.writeFile('docs/research/notification-stack/sequence.json', JSON.stringify(sampled, null, 1));
const html = await stack.evaluate(() => document.querySelector('[class*="ui-ns"]')?.outerHTML ?? '');
await fs.writeFile('docs/research/notification-stack/source-preview.html', html);
console.log('stack samples', sampled.length);

// ---------- Shimmer Loader ----------
const shimmer = await inspect('shimmer-loader', 'https://www.affectui.com/motion/shimmer-loader', 'shimmer|ui-sh|ui-sk', 'docs/research/shimmer-loader');
await shimmer.waitForTimeout(1500);
await shimmer.screenshot({ path: 'docs/research/shimmer-loader/source-desktop.png' });
await fs.writeFile('docs/research/shimmer-loader/source-main.html', await shimmer.locator('main').evaluate(el => el.innerHTML));
await shimmer.setViewportSize({ width: 390, height: 900 });
await shimmer.waitForTimeout(800);
await shimmer.screenshot({ path: 'docs/research/shimmer-loader/source-mobile.png' });
await browser.close();
