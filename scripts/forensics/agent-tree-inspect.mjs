// Observes the public Agent Tree preview (https://www.affectui.com/components/agent-tree): the demo's sequence, the
// rendered DOM, the windows behind "needs you" / "failed", folding, the narrow layout and the measured geometry.
// Only the visible preview is read; the gated Code tab, prompts, registry and CLI are never opened.
// Usage: node scripts/forensics/agent-tree-inspect.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'docs/research/agent-tree';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

const snapshot = page => page.evaluate(() => {
  const root = document.querySelector('.ui-agtc');
  if (!root) return null;
  const text = (el, selector) => el.querySelector(selector)?.textContent?.trim() ?? null;
  const nodes = [...root.querySelectorAll('.ui-agtc__node')].map(node => {
    const box = node.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    return {
      id: node.dataset.id ?? node.getAttribute('data-agent') ?? null, name: text(node, '.ui-agtc__name'), model: text(node, '.ui-agtc__model'),
      status: node.dataset.status, task: text(node, '.ui-agtc__task'), cost: text(node, '.ui-agtc__cost'), time: text(node, '.ui-agtc__time'),
      tools: node.querySelectorAll('.ui-agtc__tool').length, fold: node.querySelector('.ui-agtc__fold')?.getAttribute('aria-label') ?? null,
      expanded: node.querySelector('.ui-agtc__fold')?.getAttribute('aria-expanded') ?? null, role: node.getAttribute('role'), level: node.getAttribute('aria-level'),
      box: [box.left - rootBox.left, box.top - rootBox.top, box.width, box.height].map(value => Math.round(value * 10) / 10), leaving: node.hasAttribute('data-leaving'),
    };
  });
  return {
    wide: root.hasAttribute('data-wide'), size: [root.getBoundingClientRect().width, root.getBoundingClientRect().height],
    bar: { title: text(root, '.ui-agtc__title'), summary: [...root.querySelectorAll('.ui-agtc__sum > *')].map(el => el.textContent.trim()) },
    nodes, links: root.querySelectorAll('.ui-agtc__link').length, dots: root.querySelectorAll('.ui-agtc__dot').length,
  };
});

const results = { captured: new Date().toISOString(), desktop: [], narrow: null, windows: {}, fold: null };
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await page.goto('https://www.affectui.com/components/agent-tree', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Decline', exact: true }).click().catch(() => {});
await page.waitForSelector('.ui-agtc');
const root = page.locator('.ui-agtc').first();
await fs.writeFile(`${out}/source-preview.html`, await root.evaluate(el => el.outerHTML));
await fs.writeFile(`${out}/source-docs.txt`, await page.locator('main').innerText());

// The demo grows by itself; sample it so the order, costs and states are on record.
const started = Date.now();
let lastSignature = '';
const shots = new Set();
while (Date.now() - started < 75_000) {
  const shot = await snapshot(page);
  const at = Math.round((Date.now() - started) / 100) / 10;
  const signature = JSON.stringify(shot?.nodes.map(node => [node.name, node.status, node.fold, node.expanded]));
  if (shot && signature !== lastSignature) {
    lastSignature = signature;
    results.desktop.push({ at, ...shot });
    const label = `${String(shot.nodes.length).padStart(2, '0')}-agents-${shot.nodes.map(node => node.status[0]).join('')}`;
    if (!shots.has(label) && shots.size < 14) { shots.add(label); await root.screenshot({ path: `${out}/source-seq-${label}.png` }); }
  }
  await page.waitForTimeout(700);
}
await root.screenshot({ path: `${out}/source-desktop.png` });

// "needs you" and "failed" windows: the buttons only exist in some phases of the looping demo, so wait for each one.
for (const word of ['needs you', 'failed']) {
  const button = root.locator('.ui-agtc__bar button', { hasText: word }).first();
  try { await button.waitFor({ state: 'visible', timeout: 60_000 }); } catch { continue; }
  await button.click();
  await page.waitForTimeout(500);
  const dialog = root.locator('[role=dialog]').first();
  results.windows[word] = { text: await dialog.innerText().catch(() => null), actions: await dialog.locator('button').allInnerTexts().catch(() => []), focused: await page.evaluate(() => document.activeElement?.textContent) };
  await root.screenshot({ path: `${out}/source-window-${word.replace(' ', '-')}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  results.windows[word].closedByEscape = (await root.locator('[role=dialog]').count()) === 0;
}

// Folding the first branch that has one
const fold = page.locator('.ui-agtc__fold').first();
if (await fold.count()) {
  const before = await snapshot(page);
  await fold.click();
  await page.waitForTimeout(1200);
  results.fold = { before: before?.nodes.length, after: (await snapshot(page))?.nodes.length, label: await fold.getAttribute('aria-label') };
  await root.screenshot({ path: `${out}/source-folded.png` });
  await fold.click().catch(() => {});
}

// Geometry and computed values
results.measure = await page.evaluate(() => {
  const root = document.querySelector('.ui-agtc');
  const style = getComputedStyle(root);
  const first = root.querySelector('.ui-agtc__node');
  const css = name => getComputedStyle(first).getPropertyValue(name);
  return { cardWidthVar: style.getPropertyValue('--ui-agtc-card-w'), indentVar: style.getPropertyValue('--ui-agtc-indent'), font: style.fontFamily, node: { padding: css('padding'), radius: css('border-radius'), gap: css('gap') } };
});

// Narrow layout
const narrow = await (await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
await narrow.goto('https://www.affectui.com/components/agent-tree', { waitUntil: 'networkidle' });
await narrow.getByRole('button', { name: 'Decline', exact: true }).click().catch(() => {});
await narrow.waitForSelector('.ui-agtc');
await narrow.waitForTimeout(45_000);
results.narrow = await snapshot(narrow);
await narrow.locator('.ui-agtc').first().screenshot({ path: `${out}/source-mobile.png` });

await fs.writeFile(`${out}/sequence.json`, JSON.stringify(results, null, 1));
console.log(`samples ${results.desktop.length}, last agents ${results.desktop.at(-1)?.nodes.length}, windows ${Object.keys(results.windows)}, fold ${JSON.stringify(results.fold)}`);
await browser.close();
