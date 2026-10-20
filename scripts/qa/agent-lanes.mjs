import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/agent-lanes/qa';
await fs.mkdir(out, { recursive: true });
const passed = [], errors = [], external = new Set();
const check = async (name, fn) => { await fn(); passed.push(name); console.log(`PASS ${name}`); };
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { const url = new URL(request.url()); if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) external.add(url.origin); });
};
watch(page);
const open = async (p = page) => {
  await p.goto(`${base}/personalize?browse=1&group=crm`, { waitUntil: 'networkidle' });
  await p.locator('.agl__block').first().waitFor();
  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
};
const task = (id, p = page) => p.locator(`.agl__block[data-task-id="${id}"]`);
const selected = p => p.locator('.guide-item[aria-current] .guide-item__name').innerText();
const containedPopover = async p => {
  const [frame, pop] = await Promise.all([p.locator('.guide-preview').boundingBox(), p.locator('.agl__pop').boundingBox()]);
  assert(pop.x >= frame.x && pop.x + pop.width <= frame.x + frame.width + .5);
  assert(pop.y >= frame.y && pop.y + pop.height <= frame.y + frame.height + .5);
};
try {
  await check('CRM photo is replaced by four real lanes with all three provider logos', async () => {
    await open();
    assert.equal(await page.locator('.guide-preview img, .agl iframe, .agl canvas').count(), 0);
    assert.deepEqual(await page.locator('.agl__avatar').evaluateAll(els => els.map(el => el.getAttribute('aria-label'))), ['Claude', 'Claude', 'ChatGPT', 'Gemini']);
    assert.equal(await page.locator('.agl__avatar svg').count(), 4);
    assert.equal(await page.locator('.agl__avatar svg').first().evaluate(el => el.getBoundingClientRect().width), 18);
    assert.deepEqual(await page.locator('.agl__block').evaluateAll(els => els.map(el => el.dataset.status)), ['done', 'running', 'running', 'done', 'failed', 'waiting']);
    assert.equal(await page.locator('.agl__curves path').count(), 1);
    assert.equal(await page.locator('.agl__summary [data-kind="running"]').textContent(), '2 running');
    await page.screenshot({ path: `${out}/crm-desktop.png` });
  });
  await check('Task clicks show their observed summaries, never open the CRM workspace', async () => {
    const cases = [['r1', 'Checked 6 competitors'], ['r2', 'Read 14 interview notes'], ['w1', 'Wrote plan copy and FAQ'], ['v1', '214 tests passed'], ['o1', 'Stopped at the API rate limit']];
    for (const [id, summary] of cases) {
      await page.keyboard.press('Escape');
      await task(id).click();
      assert((await page.locator('.agl__tip').innerText()).includes(summary));
      assert.equal(await task(id).getAttribute('aria-expanded'), 'true');
      await containedPopover(page);
      assert.equal(await selected(page), 'CRM');
    }
  });
  await check('Decision focuses Approve; Escape closes it and returns focus to its block', async () => {
    await page.keyboard.press('Escape');
    await task('o2').click();
    await page.getByRole('dialog', { name: 'Decide: Rotate API keys' }).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Approve');
    await containedPopover(page);
    await page.screenshot({ path: `${out}/crm-approval.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.agl__pop').count(), 0);
    assert.equal(await task('o2').evaluate(el => el === document.activeElement), true);
  });
  await check('Reject freezes a failed block and removes its Needs you flag and count', async () => {
    await task('o2').click();
    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    assert.equal(await task('o2').getAttribute('data-status'), 'failed');
    assert.equal(await page.locator('.agl__flag, .agl__summary [data-kind="needs"]').count(), 0);
    assert.equal(await page.locator('.agl__pop').count(), 0);
  });
  await check('Approve resumes the same task; its local decision survives subsequent clock ticks', async () => {
    await open();
    await task('o2').click();
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    assert.equal(await task('o2').getAttribute('data-status'), 'running');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(1250);
    assert.equal(await task('o2').getAttribute('data-status'), 'running');
    assert.equal(await page.locator('.agl__flag').count(), 0);
    assert.equal(await selected(page), 'CRM');
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });
  await check('Roving group focus lets Tab enter CRM task controls and Enter opens details', async () => {
    await open();
    await page.locator('.guide-item[aria-current]').focus();
    await page.keyboard.press('Tab');
    assert.equal(await task('r1').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.locator('.agl__tip').waitFor();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    assert.equal(await task('r2').evaluate(el => el === document.activeElement), true);
  });
  await check('Reduced motion leaves the timeline still; active changes preserve approval state', async () => {
    await task('o2').click();
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    assert.equal(await page.locator('.agl').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    await page.locator('.guide-item').nth(0).focus();
    assert.equal(await selected(page), 'Sales');
    assert.equal(await page.locator('.agl__pop').count(), 0);
    await page.locator('.guide-item').nth(2).focus();
    assert.equal(await selected(page), 'CRM');
    assert.equal(await task('o2').getAttribute('data-status'), 'running');
  });
  await check('Desktop, tablet, portrait and landscape keep the preview, icons and decision within bounds', async () => {
    for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [844, 390], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await open();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await task('o2').click();
      await containedPopover(page);
      await page.screenshot({ path: `${out}/crm-${width}x${height}.png` });
    }
  });
  await check('The observed timed handoff completes Writer at 8 seconds and creates Reviewer work', async () => {
    const timed = await context.newPage(); watch(timed);
    await timed.emulateMedia({ reducedMotion: 'no-preference' });
    await timed.clock.install();
    await open(timed);
    const before = await task('r1', timed).evaluate(el => el.parentElement.style.left);
    await timed.clock.runFor(8500);
    assert.equal(await task('w1', timed).getAttribute('data-status'), 'done');
    await task('v2', timed).waitFor();
    assert.notEqual(await task('r1', timed).evaluate(el => el.parentElement.style.left), before);
    assert.equal(await timed.locator('.agl__curves path').count(), 2);
    await timed.close();
  });
  await check('Touch controls work in Chromium and WebKit without navigating the frame', async () => {
    for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
      const touchBrowser = await engine.launch(name === 'chromium' ? { channel: 'chrome' } : {});
      const touchContext = await touchBrowser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
      const touch = await touchContext.newPage(); watch(touch);
      await open(touch);
      await task('w1', touch).tap();
      await touch.locator('.agl__tip').waitFor();
      assert.equal(await selected(touch), 'CRM');
      await touch.keyboard.press('Escape');
      await task('o2', touch).tap();
      await containedPopover(touch);
      await touch.getByRole('button', { name: 'Approve', exact: true }).tap();
      assert.equal(await task('o2', touch).getAttribute('data-status'), 'running');
      await touch.locator('.guide-item').nth(0).tap();
      assert.equal(await selected(touch), 'Sales');
      await touch.locator('.guide-item').nth(2).tap();
      assert.equal(await selected(touch), 'CRM');
      assert.equal(await task('o2', touch).getAttribute('data-status'), 'running');
      await touch.screenshot({ path: `${out}/touch-${name}.png` });
      await touch.locator('.guide-item').nth(2).tap();
      await touch.locator('.crm-page').waitFor();
      await touchBrowser.close();
    }
  });
  assert.deepEqual(errors, []);
  assert.deepEqual([...external], []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed, errors, external: [...external] }, null, 2));
  await browser.close();
}
