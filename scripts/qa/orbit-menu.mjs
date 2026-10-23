// QA for the block shortcut menu on /personalize?section=process: right click (or the Menu key, or a long press on a phone) on a
// block opens an orbit of actions around the pointer; click, hover, hotkey, Escape, edge fitting, locked states, Tree view.
// Usage: node scripts/qa/orbit-menu.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/orbit-menu/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?section=process`;
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 4).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });

async function open(options = {}, target = url, engine = browser) {
  const context = await engine.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource/.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pmap__block, .agt__node');
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(600);
  return { context, page };
}
const block = (page, name) => page.locator('.pmap__block').filter({ has: page.locator('.agt__name', { hasText: new RegExp(`^${name}$`) }) });
const count = page => page.locator('.pmap__block').count();
const items = page => page.locator('.orbit-menu-item');
const menu = page => page.getByRole('menu');
const pill = page => page.locator('.orbit-menu-pill');
const trigger = page => page.locator('.orbit-menu[data-anchored] .orbit-menu-trigger');
const center = async locator => { const b = await locator.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const rightClick = async (page, name, offset = { x: 40, y: 24 }) => {
  await page.getByRole('button', { name: 'Fit the whole map' }).click();
  await page.waitForTimeout(150);
  const b = await block(page, name).boundingBox();
  const at = { x: b.x + offset.x, y: b.y + offset.y };
  await page.mouse.click(at.x, at.y, { button: 'right' });
  await menu(page).waitFor({ state: 'attached' });
  await page.waitForTimeout(700);
  return at;
};
const labels = page => items(page).evaluateAll(els => els.map(el => el.getAttribute('aria-label')));
const closed = async page => { await page.waitForFunction(() => !document.querySelector('[role=menu]')); await page.waitForTimeout(450); };

{
  const { context, page } = await open();
  await check('A right click on a block opens the orbit at the pointer, with the close button in the middle', async () => {
    let prevented = false;
    await page.exposeFunction('markPrevented', () => { prevented = true; });
    await page.evaluate(() => document.addEventListener('contextmenu', event => { if (event.defaultPrevented) window.markPrevented(); }));
    const at = await rightClick(page, 'Writer');
    assert.ok(prevented, 'the browser context menu is suppressed');
    assert.equal(await items(page).count(), 6);
    const middle = await center(trigger(page));
    assert.ok(Math.hypot(middle.x - at.x, middle.y - at.y) < 1.5, `trigger at ${middle.x},${middle.y} for click ${at.x},${at.y}`);
    assert.equal(await trigger(page).getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.orbit-menu-pill').innerText(), 'Writer shortcuts');
    for (const item of await items(page).all()) {
      const b = await item.boundingBox();
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1440 && b.y + b.height <= 1000, 'every action is on screen');
      assert.ok(Math.abs(b.width - 46) < 2, 'actions are 46px');
    }
    await page.screenshot({ path: `${out}/menu-open.png` });
  });
  await check('The block is selected, the actions are the real block operations, and a hotkey hint shows on hover', async () => {
    assert.equal(await block(page, 'Writer').getAttribute('data-selected'), '');
    assert.deepEqual((await labels(page)).map(label => label.replace(/^(Require|Remove) approval$/, 'Approval')), ['Run from here', 'Block settings', 'Add sub-block', 'Duplicate branch', 'Approval', 'Delete block']);
    await items(page).nth(2).hover();
    await page.waitForTimeout(350);
    assert.match(await pill(page).innerText(), /^Add sub-block\s*A$/);
    assert.equal(await page.locator('.orbit-menu-lens').count(), 1);
    await items(page).nth(5).hover();
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.orbit-menu-lens[data-danger]').count(), 1, 'delete has the danger tone');
    await page.screenshot({ path: `${out}/menu-hover-delete.png` });
  });
  await check('Escape folds the menu away', async () => {
    await page.keyboard.press('Escape');
    await closed(page);
    assert.equal(await trigger(page).evaluate(el => getComputedStyle(el.closest('.orbit-menu')).visibility), 'hidden');
  });
  await check('Add sub-block adds a connected block, closes the menu and confirms with a check', async () => {
    const before = await count(page);
    await rightClick(page, 'Writer');
    await items(page).nth(2).click();
    await page.waitForTimeout(250);
    assert.match(await pill(page).innerText(), /Add sub-block/);
    assert.equal(await count(page), before + 1);
    await page.screenshot({ path: `${out}/menu-added.png` });
    await closed(page);
  });
  await check('Hotkeys act while the menu is open; unavailable ones explain themselves', async () => {
    const before = await count(page);
    await rightClick(page, 'Writer');
    await page.keyboard.press('d');
    await page.waitForTimeout(300);
    assert.ok(await count(page) > before, 'D duplicated the branch');
    await closed(page);
    await rightClick(page, 'Coordinator');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    assert.match(await pill(page).innerText(), /cannot be deleted/i);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    await page.screenshot({ path: `${out}/menu-root-protected.png` });
    await page.keyboard.press('Escape');
    await closed(page);
  });
  await check('Delete opens the confirmation instead of deleting at once', async () => {
    const before = await count(page);
    await rightClick(page, 'Scraper');
    await page.keyboard.press('Delete');
    await page.locator('dialog[open]').waitFor();
    assert.equal(await count(page), before);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
  await check('Right click on another block moves the menu there; clicking elsewhere dismisses it', async () => {
    const first = await rightClick(page, 'Writer');
    const second = await rightClick(page, 'Analyst', { x: 60, y: 30 });
    const middle = await center(trigger(page));
    assert.ok(Math.hypot(middle.x - second.x, middle.y - second.y) < 1.5 && Math.hypot(middle.x - first.x, middle.y - first.y) > 20);
    assert.equal(await menu(page).count(), 1);
    assert.equal(await block(page, 'Analyst').getAttribute('data-selected'), '');
    await page.mouse.click(40, 560);
    await closed(page);
  });
  await check('Run from here runs the block, then the structure actions are locked and settings stays available', async () => {
    await rightClick(page, 'Planner');
    await page.keyboard.press('r');
    await page.waitForFunction(() => document.querySelector('.agt__node[data-status="running"], .agt__node[data-status="done"]'), null, { timeout: 8000 });
    await closed(page);
    await rightClick(page, 'Writer');
    const states = await items(page).evaluateAll(els => els.map(el => `${el.getAttribute('aria-label')}:${el.getAttribute('aria-disabled') ?? 'false'}`));
    assert.ok(states.includes('Block settings:false'));
    for (const name of ['Add sub-block', 'Duplicate branch', 'Delete block']) assert.ok(states.includes(`${name}:true`), states.join(', '));
    await page.keyboard.press('Escape');
    await closed(page);
  });
  await context.close();
}

{
  const { context, page } = await open();
  await check('The Menu key (or Shift+F10) on a focused block opens it at the block, and Escape returns the focus to the block', async () => {
    await block(page, 'Tester').focus();
    await page.keyboard.press('Shift+F10');
    await menu(page).waitFor({ state: 'attached' });
    await page.waitForTimeout(600);
    const b = await block(page, 'Tester').boundingBox(), middle = await center(trigger(page));
    assert.ok(Math.abs(middle.x - (b.x + b.width / 2)) < 2 && Math.abs(middle.y - (b.y + b.height / 2)) < 2);
    assert.equal(await trigger(page).evaluate(el => el === document.activeElement), true, 'the middle button holds the focus');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'menuitem');
    await page.keyboard.press('Escape');
    await closed(page);
    await page.waitForFunction(() => document.activeElement?.classList.contains('pmap__block'));
  });
  await check('Near the corner of the map the fan turns away from the edge and every action stays on screen', async () => {
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    const b = await block(page, 'Planner').boundingBox();
    await page.mouse.click(Math.max(b.x + 6, 14), b.y + 6, { button: 'right' });
    await menu(page).waitFor({ state: 'attached' });
    await page.waitForTimeout(700);
    for (const item of await items(page).all()) {
      const r = await item.boundingBox();
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= 1440 && r.y + r.height <= 1000, `action at ${r.x},${r.y}`);
    }
    await page.screenshot({ path: `${out}/menu-edge.png` });
    await page.keyboard.press('Escape');
    await closed(page);
  });
  await check('With the settings panel open the fan stays out from under it', async () => {
    await block(page, 'Writer').locator('.agt__name').click();
    await page.locator('.proc-side').waitFor();
    const panel = await page.locator('.proc-side').boundingBox();
    const b = await block(page, 'Coder').boundingBox();
    await page.mouse.click(Math.min(b.x + b.width - 10, panel.x - 20), b.y + 20, { button: 'right' });
    await menu(page).waitFor({ state: 'attached' });
    await page.waitForTimeout(700);
    for (const item of await items(page).all()) {
      const r = await item.boundingBox();
      assert.ok(r.x + r.width <= panel.x + 2, `action right edge ${r.x + r.width} over the panel at ${panel.x}`);
    }
    await page.keyboard.press('Escape');
    await closed(page);
  });
  await check('Settings opens the existing settings panel for that block', async () => {
    await rightClick(page, 'Coder');
    await page.keyboard.press('s');
    await page.locator('.proc-side').waitFor();
    assert.match(await page.locator('.proc-side').innerText(), /Coder/);
    await closed(page);
  });
  await check('Right click in the Tree view works on a task card too', async () => {
    await page.getByRole('button', { name: /^Tree$/ }).first().click().catch(async () => { await page.getByText('Tree', { exact: true }).first().click(); });
    await page.locator('.proc-treewrap .agt__node').first().waitFor();
    await page.locator('.proc-treewrap .agt__node').nth(1).click({ button: 'right', position: { x: 60, y: 20 } });
    await menu(page).waitFor({ state: 'attached' });
    assert.equal(await items(page).count(), 6);
    await page.screenshot({ path: `${out}/menu-tree.png` });
    await page.keyboard.press('Escape');
    await closed(page);
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await check('Phone: a long press opens the menu (and lifting the finger keeps it open), the middle button closes it, tapping an action runs it', async () => {
    const cdp = await context.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const b = await block(page, 'Writer').boundingBox();
    const x = b.x + 40, y = b.y + 24;
    await touch('touchStart', x, y);
    await page.waitForTimeout(900);
    await touch('touchEnd', x, y);
    await menu(page).waitFor({ state: 'attached' });
    await page.waitForTimeout(700);
    for (const item of await items(page).all()) {
      const r = await item.boundingBox();
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= 390 && r.y + r.height <= 844, `action at ${r.x},${r.y}`);
      assert.ok(r.width >= 44, 'touch targets are at least 44px');
    }
    assert.equal(await page.locator('.proc-side, dialog[open]').count(), 0, 'releasing the finger does not also open settings');
    assert.equal(await trigger(page).getAttribute('aria-expanded'), 'true', 'lifting the finger does not close it');
    await page.screenshot({ path: `${out}/menu-phone.png` });
    const middle = await center(trigger(page));
    await page.touchscreen.tap(middle.x, middle.y);
    await closed(page);
    // a second long press, then a tap on the action
    await touch('touchStart', x, y); await page.waitForTimeout(800); await touch('touchEnd', x, y);
    await menu(page).waitFor({ state: 'attached' }); await page.waitForTimeout(700);
    const before = await count(page);
    const add = await center(items(page).nth(2));
    await page.touchscreen.tap(add.x, add.y);
    await page.waitForTimeout(400);
    assert.equal(await count(page), before + 1, 'tapping Add sub-block added a block');
    await closed(page);
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1440, height: 1000 } }, url, webkit ? await webkit.launch().catch(() => browser) : browser);
  await check('WebKit: the right click menu opens and its actions work', async () => {
    await rightClick(page, 'Writer');
    assert.equal(await items(page).count(), 6);
    await page.keyboard.press('a');
    await page.waitForTimeout(400);
    await context.close();
  });
}

await check('No page or console errors during the whole run', async () => assert.deepEqual(errors, []));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
