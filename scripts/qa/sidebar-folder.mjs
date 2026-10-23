import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Techniques folder (Process + Tracing) in the workspace sidebar: open/close motion, active row, keyboard, phone drawer.
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/uiarc-sidebar/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
const check = (name, result) => { assert.ok(result, name); results.push(name); };
const side = page => page.getByRole('navigation', { name: 'Main menu' });
const sample = (page, action) => page.evaluate(async () => {
  const body = () => document.querySelector('.workspace-folder__body');
  const frames = [];
  const start = performance.now();
  await new Promise(resolve => {
    const tick = now => {
      const node = body();
      frames.push({ at: Math.round(now - start), h: node ? +node.getBoundingClientRect().height.toFixed(1) : 0, o: node ? +(+getComputedStyle(node).opacity).toFixed(2) : 0 });
      if (now - start < 900) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
    (window).__action();
  });
  return frames;
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
  const nav = side(page);
  const head = nav.getByRole('button', { name: 'Techniques' });
  check('folder head present', await head.count() === 1);
  check('Process and Tracing no longer sit loose beside the folder', await nav.locator('.ui-as-side__group > .ui-as-side__item', { hasText: /^(Process|Tracing)$/ }).count() === 0);
  check('opens by itself on a child page', await head.getAttribute('aria-expanded') === 'true');
  const process = nav.getByRole('button', { name: 'Process', exact: true });
  const tracing = nav.getByRole('button', { name: 'Tracing', exact: true });
  check('children keep their icons', await process.locator('svg').count() === 1 && await tracing.locator('svg').count() === 1);
  check('Process is the current page', await process.getAttribute('aria-current') === 'page');
  await page.waitForTimeout(700);
  await nav.screenshot({ path: `${out}/open.png` });

  const run = async (label) => {
    await page.evaluate(() => { (window).__action = () => document.querySelector('.workspace-folder__head').click(); });
    const frames = await sample(page);
    await fs.writeFile(`${out}/${label}.json`, JSON.stringify(frames, null, 1));
    return frames;
  };
  const closing = await run('close-frames');
  check('close animates through intermediate heights', closing.some(frame => frame.h > 5 && frame.h < closing[0].h - 5));
  check('close ends at zero height', closing.at(-1).h === 0);
  check('close never overshoots', Math.max(...closing.map(frame => frame.h)) <= closing[0].h + 0.5);
  check('aria-expanded false when closed', await head.getAttribute('aria-expanded') === 'false');
  await page.waitForFunction(() => !document.querySelector('.workspace-folder__body'), null, { timeout: 3000 });
  check('children unmounted when closed', await nav.getByRole('button', { name: 'Tracing', exact: true }).count() === 0);
  await nav.screenshot({ path: `${out}/closed.png` });
  const opening = await run('open-frames');
  check('open animates through intermediate heights', opening.some(frame => frame.h > 5 && frame.h < opening.at(-1).h - 5));
  check('open never overshoots', Math.max(...opening.map(frame => frame.h)) <= opening.at(-1).h + 0.5);
  check('opacity trails height on open', opening.find(frame => frame.h > 30)?.o < 1);

  await head.focus();
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(800);
  check('ArrowLeft closes', await head.getAttribute('aria-expanded') === 'false');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800);
  check('ArrowRight opens', await head.getAttribute('aria-expanded') === 'true');

  await tracing.click();
  await page.waitForURL(/section=tracing/);
  await page.waitForTimeout(800);
  check('Tracing becomes current and folder stays open', await tracing.getAttribute('aria-current') === 'page' && await head.getAttribute('aria-expanded') === 'true');
  await head.click(); await page.waitForTimeout(800);
  await nav.screenshot({ path: `${out}/closed-active-child.png` });
  check('collapsed folder reads as lit while a child is current', await head.getAttribute('data-lit') !== null);

  await page.goto(`${base}/personalize?section=mapping`, { waitUntil: 'networkidle' });
  check('folder is closed on a sibling page', await side(page).getByRole('button', { name: 'Techniques' }).getAttribute('aria-expanded') === 'false');
  await side(page).getByRole('button', { name: 'Techniques' }).click();
  await page.waitForTimeout(800);
  await side(page).getByRole('button', { name: 'Process', exact: true }).click();
  await page.waitForURL(/section=process/);
  check('Process reachable from the folder', true);
  await context.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const mobile = await phone.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
  await mobile.getByRole('button', { name: 'Open sidebar' }).tap();
  await mobile.waitForTimeout(900);
  const rows = await mobile.locator('.workspace-folder__children > .ui-as-side__item').evaluateAll(list => list.map(node => node.getBoundingClientRect().height));
  check('phone rows are at least 38px', rows.length === 2 && rows.every(height => height >= 38));
  await mobile.screenshot({ path: `${out}/phone-drawer.png` });
  await phone.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const still = await reduced.newPage();
  await still.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
  await still.waitForTimeout(500);
  await still.evaluate(() => { (window).__action = () => document.querySelector('.workspace-folder__head').click(); });
  const instant = await sample(still);
  check('reduced motion closes without intermediate frames', instant.every(frame => frame.h === 0 || frame.h > 60));
  await reduced.close();

  check('no page errors', errors.length === 0);
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 1));
} finally { await browser.close(); }
