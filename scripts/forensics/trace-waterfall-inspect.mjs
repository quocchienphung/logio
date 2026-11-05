// Observes the public Trace Waterfall preview (https://www.affectui.com/components/trace-waterfall): the demo's live
// sequence, the rendered DOM, the declared CSS rules and tokens, the details window, folding, hover, dark mode and the
// narrow layout. Only the visible preview and the public docs are read; the gated Code tab, prompts, registry and CLI
// are never opened. Usage: node scripts/forensics/trace-waterfall-inspect.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'docs/research/trace-waterfall';
await fs.mkdir(out, { recursive: true });
const url = 'https://www.affectui.com/components/trace-waterfall';
const browser = await chromium.launch({ channel: 'chrome' });
const open = async (options) => {
  const page = await (await browser.newContext(options)).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Decline', exact: true }).click().catch(() => {});
  await page.waitForSelector('.ui-twc');
  return page;
};

const snapshot = page => page.evaluate(() => {
  const root = document.querySelector('.ui-twc');
  if (!root) return null;
  const rootBox = root.getBoundingClientRect();
  const rel = el => { const b = el.getBoundingClientRect(); return [b.left - rootBox.left, b.top - rootBox.top, b.width, b.height].map(v => Math.round(v * 10) / 10); };
  return {
    size: [rootBox.width, rootBox.height],
    stats: [...root.querySelectorAll('[class*="ui-twc__stat"]')].map(el => el.textContent.trim().replace(/\s+/g, ' ')),
    ticks: [...root.querySelectorAll('[class*="ui-twc__tick"]')].map(el => el.textContent.trim()),
    rows: [...root.querySelectorAll('[class*="ui-twc__row"]')].map(row => ({
      cls: String(row.className), text: row.textContent.trim().replace(/\s+/g, ' ').slice(0, 120), box: rel(row), status: row.dataset.status ?? null, kind: row.dataset.kind ?? null,
      bar: (() => { const bar = row.querySelector('[class*="ui-twc__bar"]'); return bar ? { box: rel(bar), cls: String(bar.className) } : null; })(),
    })),
  };
});

const results = { captured: new Date().toISOString(), sequence: [], tokens: {}, measure: {} };
const page = await open({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const root = page.locator('.ui-twc').first();
await fs.writeFile(`${out}/source-preview.html`, await root.evaluate(el => el.outerHTML));
await fs.writeFile(`${out}/source-docs.txt`, await page.locator('main').innerText());

// Every declared rule of the component, and the custom properties it uses
await fs.writeFile(`${out}/observed-rules.css`, await page.evaluate(() => {
  const rules = [];
  const walk = (list, wrap = '') => {
    for (const rule of list) {
      if (rule.cssRules && rule.conditionText !== undefined) walk(rule.cssRules, `${rule.constructor.name === 'CSSMediaRule' ? '@media ' : '@container '}${rule.conditionText}`);
      else if (rule.cssText && /ui-twc|ui-ts\b/.test(rule.cssText)) rules.push(wrap ? `${wrap} { ${rule.cssText} }` : rule.cssText);
      else if (rule.cssText && /^@keyframes/.test(rule.cssText) && /twc/.test(rule.cssText)) rules.push(rule.cssText);
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
  return rules.join('\n');
}));
results.tokens = await root.evaluate(el => {
  const style = getComputedStyle(el);
  const names = new Set();
  for (const sheet of document.styleSheets) {
    try { for (const rule of sheet.cssRules) if (rule.style && rule.selectorText && /ui-twc/.test(rule.selectorText)) for (const name of rule.style) if (name.startsWith('--')) names.add(name); } catch { /* cross-origin */ }
  }
  return Object.fromEntries([...names].map(name => [name, style.getPropertyValue(name).trim()]));
});

// The demo runs by itself: sample it.
const started = Date.now();
let last = '';
let shots = 0;
while (Date.now() - started < 60_000) {
  const shot = await snapshot(page);
  const at = Math.round((Date.now() - started) / 100) / 10;
  const signature = JSON.stringify([shot?.stats, shot?.rows.map(row => [row.text, row.status])]);
  if (shot && signature !== last) {
    last = signature;
    results.sequence.push({ at, ...shot });
    if (shots < 12) { shots += 1; await root.screenshot({ path: `${out}/source-seq-${String(shots).padStart(2, '0')}.png` }); }
  }
  await page.waitForTimeout(600);
}
await root.screenshot({ path: `${out}/source-desktop.png` });

// Geometry and type
results.measure = await page.evaluate(() => {
  const root = document.querySelector('.ui-twc');
  const pick = (selector) => {
    const el = selector === ':scope' ? root : root.querySelector(selector);
    if (!el) return null;
    const s = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return { selector, size: [b.width, b.height], font: s.font, color: s.color, background: s.backgroundColor, padding: s.padding, radius: s.borderRadius, gap: s.gap, shadow: s.boxShadow, border: s.border };
  };
  const classes = new Set();
  root.querySelectorAll('*').forEach(el => String(el.className).split(/\s+/).forEach(c => c.startsWith('ui-twc') && classes.add(c)));
  return { classes: [...classes].sort(), root: pick(':scope'), samples: [...classes].sort().map(c => pick(`.${c}`)).filter(Boolean) };
});

// Hover, then the details window of a span (click a row), then Escape
const row = root.locator('[class*="ui-twc__row"]').nth(2);
await row.hover();
await page.waitForTimeout(400);
await root.screenshot({ path: `${out}/source-hover.png` });
results.hover = await root.evaluate(el => [...el.querySelectorAll('[class*="tip"], [role=tooltip]')].map(t => ({ cls: String(t.className), text: t.textContent.trim().slice(0, 200) })));
await row.click();
await page.waitForTimeout(600);
const dialog = page.locator('[role=dialog]').first();
results.window = { count: await page.locator('[role=dialog]').count(), text: await dialog.innerText().catch(() => null), focus: await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 160)) };
await page.screenshot({ path: `${out}/source-window.png` });
await fs.writeFile(`${out}/source-window.html`, await dialog.evaluate(el => el.outerHTML).catch(() => ''));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
results.window.closedByEscape = (await page.locator('[role=dialog]').count()) === 0;

// Folding
const fold = root.locator('[aria-expanded]').first();
if (await fold.count()) {
  const before = (await snapshot(page)).rows.length;
  await fold.click();
  await page.waitForTimeout(900);
  results.fold = { before, after: (await snapshot(page)).rows.length, label: await fold.getAttribute('aria-label') };
  await root.screenshot({ path: `${out}/source-folded.png` });
  await fold.click().catch(() => {});
}

// Keyboard
await root.locator('[class*="ui-twc__row"]').first().focus().catch(() => {});
results.keyboard = [];
for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'Home', 'End']) {
  await page.keyboard.press(key);
  results.keyboard.push({ key, focus: await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40)) });
}

// Dark mode
await page.getByRole('button', { name: /dark/i }).first().click().catch(() => {});
await page.waitForTimeout(500);
await root.screenshot({ path: `${out}/source-dark.png` });
await page.close();

// Narrow layouts
for (const width of [390, 560, 760]) {
  const narrow = await open({ viewport: { width, height: 900 }, deviceScaleFactor: 2, hasTouch: width < 500, isMobile: width < 500 });
  await narrow.waitForTimeout(9000);
  results[`w${width}`] = await snapshot(narrow);
  await narrow.locator('.ui-twc').first().screenshot({ path: `${out}/source-w${width}.png` });
  await narrow.close();
}

await fs.writeFile(`${out}/sequence.json`, JSON.stringify(results, null, 1));
console.log(`samples ${results.sequence.length}; window ${JSON.stringify(results.window?.count)}; fold ${JSON.stringify(results.fold)}; classes ${results.measure.classes?.length}`);
await browser.close();
