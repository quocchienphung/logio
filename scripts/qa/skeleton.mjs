// QA for the loading skeletons: a reload of any workspace page shows that page's skeleton (never the Companies page of the default
// workspace), the skeleton appears only if the wait lasts, all blocks share one sweep, dark mode, reduced motion, phone, and the page
// that arrives replaces it with no errors. Usage: node scripts/qa/skeleton.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/shimmer-loader/qa';
await fs.mkdir(out, { recursive: true });
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false, error: String(error.message).split('\n').slice(0, 4).join(' | ') }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 4).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });
const sections = { process: 'canvas', tracing: 'trace', mapping: 'canvas', files: 'files', home: 'home', reports: 'reports', invoice: 'invoice', usage: 'settings', 'new-chat': 'chat', run: 'run', contacts: 'table', companies: 'table' };

await check('The server draws the skeleton of the page the address names, and never the Companies page (a reload used to flash it first)', async () => {
  for (const [section, kind] of Object.entries(sections)) {
    const html = await (await fetch(`${base}/personalize?section=${section}`)).text();
    assert.ok(html.includes(`shm-page--${kind}`), `${section}: skeleton ${kind}`);
    assert.equal(html.includes('ui-as-crm__table'), false, `${section}: no Companies table in the first HTML`);
    // The page streams: its loading placeholder and the page itself are both in the HTML, and the placeholder is the same kind of skeleton
    const kinds = new Set([...html.matchAll(/shm-page shm-page--([a-z]+)/g)].map(match => match[1]));
    assert.deepEqual([...kinds], [kind], `${section}: only the skeleton of this page`);
  }
  const plain = await (await fetch(`${base}/personalize`)).text();
  assert.ok(plain.includes('shm-page--table'), 'the default page is Companies, so its skeleton is the list');
});

await check('Without any script the first paint is the skeleton: shimmering blocks, no content', async () => {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await page.goto(`${base}/personalize?section=process`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  assert.ok(await page.locator('.shm').count() > 20);
  assert.equal(await page.locator('.pmap, .ui-as-crm__table').count(), 0);
  assert.equal(await page.locator('.shm-page').first().getAttribute('aria-busy'), 'true');
  await page.screenshot({ path: `${out}/skeleton-process.png` });
  for (const section of ['companies', 'tracing', 'files', 'home', 'settings']) { await page.goto(`${base}/personalize?section=${section}`, { waitUntil: 'load' }); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/skeleton-${section}.png` }); }
  await page.context().close();
});

await check('A slow reload never shows another page: every frame is the skeleton, then the page that was asked for', async () => {
  for (const [section, content] of [['process', '.pmap__block'], ['tracing', '.trc'], ['files', '.files-page'], ['mapping', '.mapping-page .mapping-roll, .mapping-root .mapping-wheel, .mapping-strip']]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${section}: ${error.message.slice(0, 160)}`));
    page.on('console', message => { if (message.type() === 'error' && !/404|beforeunload/.test(message.text())) errors.push(`${section}: ${message.text().slice(0, 160)}`); });
    // every script arrives late, so the page is in its loading state for a good while
    await page.route('**/*.js*', async route => { await new Promise(resolve => setTimeout(resolve, 350)); await route.continue().catch(() => {}); });
    await page.goto(`${base}/personalize?section=${section}`, { waitUntil: 'commit' });
    const frames = [];
    for (let index = 0; index < 120; index += 1) {
      frames.push(await page.evaluate(selector => ({
        companies: !!document.querySelector('.ui-as-crm__table, .ui-as-crm__tabs'), skeleton: document.querySelectorAll('.shm-page').length, content: !!document.querySelector(selector),
        kinds: [...document.querySelectorAll('.shm-page')].map(el => el.getAttribute('data-kind')),
      }), content).catch(() => null));
      if (frames.at(-1)?.content) break;
      await page.waitForTimeout(60);
    }
    const seen = frames.filter(Boolean);
    assert.equal(seen.some(frame => frame.companies), false, `${section}: the Companies page showed`);
    assert.ok(seen.some(frame => frame.skeleton === 1), `${section}: a skeleton was shown`);
    assert.ok(seen.every(frame => frame.skeleton <= 1), `${section}: never two skeletons at once`);
    assert.equal(seen.at(-1).content, true, `${section}: the page arrived`);
    assert.equal(seen.at(-1).skeleton, 0, `${section}: and the skeleton left`);
    await context.close();
  }
});

await check('Every skeleton block shares one sweep (pinned to the viewport), in the colors of the theme', async () => {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.route('**/*.js*', async route => { await new Promise(resolve => setTimeout(resolve, 900)); await route.continue().catch(() => {}); });
  await page.goto(`${base}/personalize?section=companies`, { waitUntil: 'commit' });
  await page.waitForSelector('.shm');
  const info = await page.evaluate(() => [...document.querySelectorAll('.shm')].slice(0, 40).map(el => { const s = getComputedStyle(el); return [s.backgroundAttachment, s.animationName, s.animationDuration, s.backgroundSize.split(' ')[0], s.backgroundColor]; }));
  assert.ok(info.length >= 30);
  assert.equal(new Set(info.map(item => item.join('|'))).size, 1, 'all blocks are alike');
  assert.deepEqual(info[0].slice(0, 4), ['fixed', 'shm-sweep', '2.2s', `${1440 * 1.5}px`]);
  assert.equal(info[0][4], 'rgb(236, 236, 236)');
  // the light band moves: the same block at two moments has a different background position
  const positions = [];
  for (let index = 0; index < 3; index += 1) { positions.push(await page.evaluate(() => getComputedStyle(document.querySelector('.shm')).backgroundPositionX)); await page.waitForTimeout(250); }
  assert.ok(new Set(positions).size > 1, positions.join(','));
  await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.setAttribute('data-theme', 'dark'); });
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.shm')).backgroundColor), 'rgb(47, 47, 51)');
  await page.context().close();
});

await check('Reduced motion shows static placeholders; the text variant stays readable', async () => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })).newPage();
  await page.route('**/*.js*', async route => { await new Promise(resolve => setTimeout(resolve, 900)); await route.continue().catch(() => {}); });
  await page.goto(`${base}/personalize?section=process`, { waitUntil: 'commit' });
  await page.waitForSelector('.shm');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.shm')).animationName), 'none');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.shm')).backgroundImage), 'none');
  const text = page.locator('.shm-text').first();
  if (await text.count()) assert.equal(await text.evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.context().close();
});

await check('The skeleton shows after a short delay, so a fast load never flashes it; the label is announced politely', async () => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.route('**/*.js*', async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.continue().catch(() => {}); });
  await page.goto(`${base}/personalize?section=tracing`, { waitUntil: 'commit' });
  await page.waitForSelector('.shm-page');
  const first = await page.evaluate(() => { const el = document.querySelector('.shm-page'); const s = getComputedStyle(el); return { opacity: Number(s.opacity), delay: s.animationDelay, duration: s.animationDuration }; });
  assert.equal(first.delay, '0.14s');
  assert.ok(first.opacity < 0.5, `just drawn, still hidden (${first.opacity})`);
  await page.waitForTimeout(500);
  assert.equal(Number(await page.evaluate(() => getComputedStyle(document.querySelector('.shm-page')).opacity)), 1);
  assert.equal(await page.locator('.shm-page').getAttribute('role'), 'status');
  assert.equal(await page.locator('.shm-page .shm-sr').innerText(), 'Loading tracing…');
  assert.equal(await page.locator('.shm-page .shm').first().getAttribute('aria-hidden'), 'true');
  await page.context().close();
});

await check('Phone: the skeletons fit the screen without horizontal scroll', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, javaScriptEnabled: false });
  const page = await context.newPage();
  for (const section of ['process', 'companies', 'tracing', 'files', 'settings']) {
    await page.goto(`${base}/personalize?section=${section}`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, section);
    if (section === 'process' || section === 'tracing') await page.screenshot({ path: `${out}/skeleton-phone-${section}.png` });
  }
  await context.close();
});

await check('The page that arrives replaces the skeleton for real: every section loads without errors after a normal reload', async () => {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', error => errors.push(`pageerror ${error.message.slice(0, 160)}`));
  page.on('console', message => { if (message.type() === 'error' && !/404|beforeunload/.test(message.text())) errors.push(`console ${message.text().slice(0, 160)}`); });
  for (const section of Object.keys(sections)) {
    await page.goto(`${base}/personalize?section=${section}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.querySelector('.shm-page'), null, { timeout: 15000 });
    assert.equal(await page.locator('.ui-as-side__item[aria-current=page]').count(), 1, section);
  }
  await page.close();
  assert.deepEqual(errors, []);
});

await browser.close();
const passed = results.filter(result => result.ok).length;
console.log(passed === results.length ? 'ALL PASS' : 'SOME FAILED', `${passed}/${results.length}`);
await fs.writeFile(`${out}/results.json`, JSON.stringify({ base, results }, null, 2) + '\n');
if (passed !== results.length) process.exit(1);
