import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { chromium } from 'playwright';
import { buildFixture } from './lib/collateral-fixture.mjs';

const base = process.argv[2] || 'http://localhost:3004';
const out = 'docs/research/card-to-article/sync-local';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], recordings = [], errors = [];
const files = unzipSync(buildFixture());
files['xl/sharedStrings.xml'] = strToU8(strFromU8(files['xl/sharedStrings.xml']).replace('Ke ho?ch trien khai du an', 'Evidence '.repeat(60) + 'Ke ho?ch trien khai du an'));
const fixture = Buffer.from(zipSync(files));
const check = (name, ok) => { assert.ok(ok, name); results.push(name); console.log(`✓ ${name}`); };
async function record(page) {
  await page.evaluate(() => {
    const run = window.__morphRun = (window.__morphRun ?? 0) + 1;
    window.__morphFrames = [];
    const start = performance.now();
    const sample = () => {
      if (window.__morphRun !== run) return;
      const host = document.querySelector('.cg-sheet-host'), frame = document.querySelector('.cg-frame');
      const sheet = host?.querySelector('.sv'), body = host?.querySelector('.sv-scroll');
      const cell = host?.querySelector('.sv-cell[data-target]');
      const rect = n => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      window.__morphFrames.push({ ms: performance.now() - start, popup: !!frame, frame: rect(frame), content: rect(document.querySelector('.cg-morph-content')), host: rect(host), sheet: rect(sheet), cell: rect(cell), text: rect(cell?.querySelector('.sv-target-text')), mark: rect(cell?.querySelector('.cg-mark')), scroll: body && [body.scrollLeft, body.scrollTop], loaded: !!cell?.closest('[data-loaded]') });
      if (performance.now() - start < 1450) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}
async function inspectClose(page, label, action, reduced = false) {
  await record(page);
  await action();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.waitForTimeout(300);
  const frames = await page.evaluate(() => window.__morphFrames);
  recordings.push({ label, frames });
  const closing = frames.filter(f => f.popup);
  const last = closing.at(-1), returned = frames.find(f => !f.popup);
  if (!reduced) {
    check(`${label}: live layout matches the frame throughout close`, closing.length > 12 && closing.every(f => Math.abs(f.frame.w - f.content.w) < 1 && Math.abs(f.frame.h - f.content.h) < 1));
    check(`${label}: exact sheet size at handoff`, last && returned && Math.abs(last.host.w - returned.host.w) < 1 && Math.abs(last.host.h - returned.host.h) < 1);
    check(`${label}: cell position stays continuous at handoff`, last?.cell && returned?.cell && Math.abs(last.cell.x - returned.cell.x) < 2 && Math.abs(last.cell.y - returned.cell.y) < 2);
    check(`${label}: marked text stays continuous at handoff`, last?.mark && returned?.mark && Math.abs(last.mark.x - returned.mark.x) < 2 && Math.abs(last.mark.y - returned.mark.y) < 2);
    check(`${label}: scroll stays continuous at handoff`, last && returned && last.scroll.every((v, i) => Math.abs(v - returned.scroll[i]) <= 1));
  }
  check(`${label}: same sheet DOM returns with readable cells`, await page.locator('.cg-stage .cg-sheet-host').getAttribute('data-morph-identity') === 'same-live-sheet' && await page.locator('.cg-stage .sv-row[data-loaded] .sv-cell[data-target]').count() === 1);
  check(`${label}: returned selection is visible`, await page.locator('.cg-stage .sv-cell[data-target]').evaluate(n => { const a = n.getBoundingClientRect(), b = n.closest('.sv-body').getBoundingClientRect(); return a.bottom > b.top + 24 && a.top < b.bottom && a.right > b.left + 48 && a.left < b.right; }));
  check(`${label}: focus and scrolling restored`, await page.evaluate(() => document.activeElement?.classList.contains('cg-stage') && !document.querySelector('.crm-page').inert && document.body.style.overflow !== 'hidden'));
}
try {
  for (const width of [1440, 390, 320]) {
    const reduced = width === 320;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: width === 390 ? 'dark' : 'light', hasTouch: width < 600 });
    await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
    if (width === 1440) {
      await page.locator('.ui-as-user').click();
      await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
      await page.keyboard.press('Escape');
      check('Desktop exercises the actual dark workspace theme', await page.locator('.crm-page').getAttribute('data-theme') === 'dark');
    }
    await page.locator('input[type=file]').setInputFiles({ name: 'morph-synthetic.xlsx', mimeType: 'application/octet-stream', buffer: fixture });
    await page.getByRole('button', { name: /See what was found/ }).click();
    await page.locator('.cr-overview').waitFor({ timeout: 60000 });
    await page.getByRole('tab', { name: /Review and fix/ }).click();
    await page.locator('.cr-search').fill('ho?ch');
    await page.locator('.cg-stage .sv-cell[data-target]').waitFor();
    await page.locator('.cd-textarea').fill('Retained draft');
    await page.locator('.cd-picker [data-variant=original]').click();
    await page.locator('.cg-stage').scrollIntoViewIfNeeded();
    await page.locator('.cg-sheet-host').evaluate(n => { n.dataset.morphIdentity = 'same-live-sheet'; });
    await record(page);
    await page.locator('.cg-expand').click();
    await page.waitForTimeout(reduced ? 100 : 1150);
    const opening = await page.evaluate(() => window.__morphFrames.filter(f => f.popup));
    check(`${width}: popup inherits workspace theme`, await page.locator('.cg-viewer').getAttribute('data-theme') === await page.locator('.crm-page').getAttribute('data-theme'));
    check(`${width}: popup only contains file content`, await page.locator('.cg-viewer .cd-root, .cg-viewer__details, .cg-review-toggle').count() === 0);
    if (!reduced) check(`${width}: live layout matches the frame throughout opening`, opening.length > 12 && opening.every(f => Math.abs(f.frame.w - f.content.w) < 1 && Math.abs(f.frame.h - f.content.h) < 1));
    await page.screenshot({ path: `${out}/open-${width}.png` });
    await inspectClose(page, `${width} outside click`, () => page.mouse.click(3, 500), reduced);
    check(`${width}: editor draft retained`, await page.locator('.cd-textarea').inputValue() === 'Retained draft');
    await page.screenshot({ path: `${out}/returned-${width}.png` });
    if (width === 1440) {
      await page.locator('.cg-expand').click();
      await page.waitForTimeout(150);
      await inspectClose(page, 'Interrupted entrance', () => page.keyboard.press('Escape'));
      await page.locator('.cg-expand').click();
      await page.waitForTimeout(1100);
      await page.setViewportSize({ width: 1100, height: 860 });
      await page.waitForTimeout(1100);
      await inspectClose(page, 'Resized popup', () => page.keyboard.press('Escape'));
    }
    await context.close();
  }
  check('No browser errors', errors.length === 0);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await fs.writeFile(`${out}/frames.json`, JSON.stringify(recordings, null, 2));
  await browser.close();
}
console.log(`${results.length} checks passed`);
