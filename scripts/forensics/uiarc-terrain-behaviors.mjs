import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// DOM-level behaviour of the public Activity terrain preview: hover panel, keyboard focus, live region, reset button, counters and the segmented thumb over time,
// and the data of every metric (read from the table the page itself renders for assistive tech).
const out = 'docs/research/uiarc-terrain/source';
await fs.mkdir(out, { recursive: true });
const URL = 'https://uiarc.dev/components/blocks/activity-terrain';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chrome' });
const result = {};
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  const plot = page.locator('[class*="activity-terrain_plot"]');
  const root = page.locator('[class*="activity-terrain_root"]');
  const snapshot = () => page.evaluate(() => {
    const panel = document.querySelector('[class*="activity-terrain_panel"]'), plotEl = document.querySelector('[class*="activity-terrain_plot"]');
    const reset = document.querySelector('[class*="activity-terrain_reset"]'), live = document.querySelector('p[aria-live="polite"][class*="srOnly"]');
    const b = panel.getBoundingClientRect(), p = plotEl.getBoundingClientRect(), s = getComputedStyle(panel);
    return { show: panel.hasAttribute('data-show'), opacity: s.opacity, transform: panel.style.transform || s.transform, left: panel.style.left, top: panel.style.top, rect: [b.x - p.x, b.y - p.y, b.width, b.height].map(v => Math.round(v * 10) / 10), html: panel.innerHTML.replace(/<span[^>]*><\/span>/g, '').slice(0, 1500), text: panel.innerText, over: plotEl.hasAttribute('data-over'), dragging: plotEl.hasAttribute('data-dragging'), resetHidden: reset.hasAttribute('data-hidden'), resetAria: reset.getAttribute('aria-hidden'), live: live?.innerText ?? '', cursor: s.cursor, plotCursor: getComputedStyle(plotEl).cursor, activeElement: document.activeElement?.className?.toString().slice(0, 50) };
  });
  const box = await plot.boundingBox();
  // 1) hover panel across a grid of points
  const hover = [];
  for (const fy of [0.3, 0.45, 0.6, 0.75]) for (const fx of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await sleep(260);
    hover.push({ fx, fy, ...(await snapshot()) });
  }
  await page.mouse.move(box.x - 30, box.y - 30); await sleep(400);
  hover.push({ fx: -1, fy: -1, ...(await snapshot()) });
  result.hover = hover;
  // 3) keyboard
  await plot.focus(); await sleep(300);
  const keyboard = [];
  keyboard.push({ step: 'focus', ...(await snapshot()) });
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'PageDown', 'Enter']) {
    await page.keyboard.press(key); await sleep(350);
    keyboard.push({ step: key, ...(await snapshot()) });
  }
  await page.keyboard.press('Escape'); await sleep(900);
  keyboard.push({ step: 'Escape 1', ...(await snapshot()) });
  await page.keyboard.press('Escape'); await sleep(500);
  keyboard.push({ step: 'Escape 2', ...(await snapshot()) });
  result.keyboard = keyboard;
  // 4) reset button visibility
  const reset = [];
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height * 0.45, { steps: 8 }); await page.mouse.up(); await sleep(1500);
  reset.push({ step: 'after orbit', ...(await snapshot()) });
  const button = page.locator('[class*="activity-terrain_reset"]');
  if (await button.isVisible()) { await button.click(); await sleep(2500); reset.push({ step: 'after reset click', ...(await snapshot()) }); }
  await page.getByRole('button', { name: 'Top view', exact: true }).click(); await sleep(2500);
  reset.push({ step: 'top view', ...(await snapshot()) });
  await page.getByRole('button', { name: 'Perspective', exact: true }).click(); await sleep(2500);
  reset.push({ step: 'perspective again', ...(await snapshot()) });
  result.reset = reset;
  // 5) data of every metric + summary numbers + peak buttons
  const metrics = {};
  for (const name of ['Sessions', 'Deploys', 'Errors']) {
    await page.getByRole('button', { name, exact: true }).click(); await sleep(2600);
    metrics[name] = await root.evaluate(el => {
      const table = [...el.querySelectorAll('table tbody tr')].map(tr => [...tr.children].map(c => c.textContent.trim()));
      const stats = [...el.querySelectorAll('aside [class*="activity-terrain_stat"]')].map(s => s.innerText.replace(/\s+/g, ' ').trim());
      const peaks = [...el.querySelectorAll('button[class*="activity-terrain_peak"]')].map(b => b.getAttribute('aria-label'));
      const canvas = el.querySelector('canvas');
      return { table, stats, peaks, canvasLabel: canvas.getAttribute('aria-label'), caption: el.querySelector('caption')?.textContent, rootMetric: el.getAttribute('data-metric'), plotLabel: el.querySelector('[role="group"][aria-label$="terrain"]')?.getAttribute('aria-label'), legend: el.querySelector('[class*="activity-terrain_legend"]').innerText, delta: el.querySelector('[class*="activity-terrain_delta"]')?.getAttribute('data-tone') };
    });
  }
  result.metrics = metrics;
  await fs.writeFile(path.join(out, 'behaviors.json'), JSON.stringify(result, null, 1));
  console.log('hover samples', hover.length, 'keyboard', keyboard.length);
  for (const k of keyboard) console.log(k.step.padEnd(12), 'show', k.show, 'live', JSON.stringify(k.live), 'panel', JSON.stringify(k.text.replace(/\s+/g, ' ')), 'rect', k.rect.join(','), 'reset hidden', k.resetHidden);
  for (const r of reset) console.log(r.step.padEnd(20), 'reset hidden', r.resetHidden, 'aria', r.resetAria, 'show', r.show);
  await context.close();
} finally { await browser.close(); }
