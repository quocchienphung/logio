import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// The glyph loading effect (src/components/sites/ascii-reveal): shown while a lazily loaded page is awaited, dissolved when it arrives.
// Slow loads are simulated by holding back the JavaScript chunks of pages that have not been opened yet.
// Usage: node scripts/qa/ascii-reveal.mjs [base-url]
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/ascii-reveal/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
const check = (name, result) => { assert.ok(result, name); results.push(name); };
const origin = new URL(base).origin;

const open = async (options = {}) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  const foreign = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { const url = request.url(); if (!/^(data|blob|about):/.test(url) && new URL(url).origin !== origin) foreign.push(url); });
  await page.goto(`${base}/personalize?section=new-chat`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ui-as-main');
  await page.waitForTimeout(800);
  // Record every cover that ever appears.
  await page.evaluate(() => {
    window.__covers = [];
    new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1 && node.matches?.('[data-ascii-cover]')) window.__covers.push({ mode: node.dataset.asciiCover, preset: node.dataset.asciiPreset, at: performance.now() }); }).observe(document.body, { childList: true });
  });
  return { context, page, foreign };
};
const holdChunks = async (page, ms) => page.route(/\/_next\/static\/.*\.js(\?.*)?$/, async route => { await new Promise(resolve => setTimeout(resolve, ms)); await route.continue().catch(() => {}); });
const goTo = (page, section) => page.evaluate(section => { window.history.pushState({}, '', `/personalize?section=${section}`); window.dispatchEvent(new PopStateEvent('popstate')); }, section);
const covers = page => page.evaluate(() => [...document.querySelectorAll('[data-ascii-cover]')].map(node => ({ mode: node.dataset.asciiCover, preset: node.dataset.asciiPreset, pe: getComputedStyle(node).pointerEvents, hidden: node.getAttribute('aria-hidden'), box: node.getBoundingClientRect().toJSON() })));
const setPreset = (page, preset) => page.evaluate(value => { document.querySelector('.crm-page').dataset.asciiPreset = value; }, preset);

try {
  // 1. A slow page: the field appears, covers the panel, is inert, and dissolves when the page arrives.
  const { context, page, foreign } = await open();
  await holdChunks(page, 2600);
  await goTo(page, 'process');
  await page.waitForFunction(() => document.querySelector('[data-ascii-cover="loading"]'), null, { timeout: 5000 });
  const loading = (await covers(page)).filter(cover => cover.mode === 'loading');
  check('one loading field while the page is awaited', loading.length === 1);
  check('the field is hidden from assistive technology and takes no pointer events', loading[0].hidden === 'true' && loading[0].pe === 'none');
  const main = await page.locator('.ui-as-main').boundingBox();
  check('the field covers exactly the content panel', Math.abs(loading[0].box.x - main.x) < 2 && Math.abs(loading[0].box.width - main.width) < 2 && Math.abs(loading[0].box.height - main.height) < 2);
  check('the skeleton is still in the page for screen readers', await page.locator('[role="status"][aria-busy="true"]').count() >= 1);
  check('nothing is trapped: the element under the field is the page, not the canvas', await page.evaluate(() => !document.elementFromPoint(900, 400)?.hasAttribute('data-ascii-cover')));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/loading-decode.png` });
  const frames = await page.evaluate(() => new Promise(resolve => { const stamps = []; const tick = now => { stamps.push(now); if (stamps.length < 40) requestAnimationFrame(tick); else resolve(stamps); }; requestAnimationFrame(tick); }));
  const average = (frames.at(-1) - frames[0]) / (frames.length - 1);
  check(`the moving field keeps the page responsive (average frame ${average.toFixed(1)} ms)`, average < 60);
  await page.waitForFunction(() => document.querySelector('[data-ascii-cover="reveal"]'), null, { timeout: 8000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${out}/reveal-decode-mid.png` });
  check('when the page arrives the loading field gives way to the dissolve', (await covers(page)).every(cover => cover.mode === 'reveal'));
  await page.waitForFunction(() => !document.querySelector('[data-ascii-cover]'), null, { timeout: 4000 });
  const started = await page.evaluate(() => window.__covers.filter(cover => cover.mode === 'reveal')[0].at);
  check('the dissolve removes itself (nothing is left over the page)', await page.locator('[data-ascii-cover]').count() === 0);
  check('the page content is there and interactive afterwards', await page.locator('.ui-as-main').isVisible() && await page.evaluate(() => !document.elementFromPoint(900, 400)?.hasAttribute('data-ascii-cover')));
  check('the whole effect made no request to any other site', foreign.length === 0);

  // 2. A page that opens at once is not slowed down: no field, no dissolve.
  await page.unroute(/\/_next\/static\/.*\.js(\?.*)?$/);
  await page.evaluate(() => { window.__covers.length = 0; });
  await goTo(page, 'new-chat');
  await page.waitForTimeout(900);
  await goTo(page, 'process');
  await page.waitForTimeout(1200);
  check('a page that is already loaded appears with no effect', (await page.evaluate(() => window.__covers.length)) === 0);
  check('still no request to any other site', foreign.length === 0);
  void started;
  await context.close();

  // 3. Every look, shown while the wait lasts and as it dissolves.
  for (const [preset, section] of [['dither', 'tracing'], ['terminal', 'mapping'], ['blueprint', 'invoice']]) {
    const session = await open();
    await setPreset(session.page, preset);
    await holdChunks(session.page, 2400);
    await goTo(session.page, section);
    await session.page.waitForFunction(() => document.querySelector('[data-ascii-cover="loading"]'), null, { timeout: 6000 });
    check(`${preset}: the loading field uses the chosen look`, (await covers(session.page))[0].preset === preset);
    await session.page.waitForTimeout(400);
    await session.page.screenshot({ path: `${out}/loading-${preset}.png` });
    await session.page.waitForFunction(() => document.querySelector('[data-ascii-cover="reveal"]'), null, { timeout: 8000 });
    await session.page.waitForTimeout(300);
    await session.page.screenshot({ path: `${out}/reveal-${preset}-mid.png` });
    await session.page.waitForFunction(() => !document.querySelector('[data-ascii-cover]'), null, { timeout: 4000 });
    check(`${preset}: it clears, and nothing was requested from another site`, session.foreign.length === 0);
    await session.context.close();
  }

  // 4. Off, "interface motion" off and reduced motion each switch it off completely.
  for (const [label, prepare] of [['Loading effect set to Off', page => setPreset(page, 'off')], ['Interface motion off', page => page.evaluate(() => { document.querySelector('.crm-page').dataset.uiMotion = 'off'; })]]) {
    const session = await open();
    await prepare(session.page);
    await holdChunks(session.page, 1800);
    await goTo(session.page, 'files');
    await session.page.waitForTimeout(2800);
    check(`${label}: no field and no dissolve`, (await session.page.evaluate(() => window.__covers.length)) === 0);
    await session.context.close();
  }
  const reduced = await open({ reducedMotion: 'reduce' });
  await holdChunks(reduced.page, 1800);
  await goTo(reduced.page, 'files');
  await reduced.page.waitForTimeout(2800);
  check('reduced motion: no field and no dissolve', (await reduced.page.evaluate(() => window.__covers.length)) === 0);
  await reduced.context.close();

  // 5. A page that never arrives is never hidden for good: the field gives up (limit passed in through the clock).
  const stuck = await open();
  await stuck.page.route(/\/_next\/static\/.*\.js(\?.*)?$/, () => {});
  await goTo(stuck.page, 'repo');
  await stuck.page.waitForFunction(() => document.querySelector('[data-ascii-cover="loading"]'), null, { timeout: 6000 });
  check('a stuck load shows the field, and the skeleton stays underneath', await stuck.page.locator('[role="status"][aria-busy="true"]').count() >= 1);
  await stuck.context.close();

  check('no page errors', errors.length === 0);
  console.log(`${results.length} checks passed`);
} catch (error) {
  console.log('passed:', results.length);
  console.log('page errors:', errors);
  throw error;
} finally {
  await browser.close();
}
