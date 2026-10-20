// Chromium uses native touch input, including browser gesture arbitration. WebKit uses native taps
// and DOM pointer trajectories for drags (Playwright exposes no native WebKit touch-move API).
// Usage: node scripts/qa/guide-touch.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/guide-navigation/qa';
await fs.mkdir(out, { recursive: true });
const passed = [], errors = [];

for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch(name === 'chromium' ? { channel: 'chrome' } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  const cdp = name === 'chromium' ? await context.newCDPSession(page) : null;
  const row = index => page.locator('.guide-item').nth(index);
  const active = () => page.locator('.guide-item[aria-current] .guide-item__name').innerText();
  const expectActive = async expected => {
    await page.waitForFunction(expected => document.querySelector('.guide-item[aria-current] .guide-item__name')?.textContent === expected, expected);
    assert.equal(await active(), expected);
  };
  const open = async (group = 'sales') => {
    await page.goto(`${base}/personalize?browse=1&group=${group}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await page.evaluate(() => {
      window.guideEvents = [];
      window.addEventListener('popstate', () => window.guideEvents.push({ type: 'popstate', url: location.search }));
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click']) document.querySelector('.guide-page').addEventListener(type, event => {
        window.guideEvents.push({ type, pointerType: event.pointerType, target: event.target.className, selected: document.querySelector('.guide-item[aria-current]')?.textContent });
      }, true);
    });
  };
  const check = async (label, fn) => {
    await fn();
    passed.push(`${name}: ${label}`);
    console.log(`PASS ${name}: ${label}`);
  };
  const point = async locator => {
    const box = await locator.boundingBox();
    assert(box);
    return { x: box.x + box.width * .6, y: box.y + box.height / 2 };
  };
  // Keep the original target for DOM events, matching touch's implicit pointer capture.
  async function pointer(type, position, start) {
    if (cdp) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: { pointerdown: 'touchStart', pointermove: 'touchMove', pointerup: 'touchEnd', pointercancel: 'touchCancel' }[type],
        touchPoints: type === 'pointerup' || type === 'pointercancel' ? [] : [position],
      });
    } else {
      await page.evaluate(({ type, position, start }) => {
        if (type === 'pointerdown') window.guideTouchTarget = document.elementFromPoint(start.x, start.y);
        window.guideTouchTarget.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
          button: 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
          clientX: position.x, clientY: position.y,
        }));
      }, { type, position, start });
    }
  }
  async function drag(start, end, { hold = 0, cancel = false } = {}) {
    await pointer('pointerdown', start, start);
    for (let step = 1; step <= 16; step++) {
      await pointer('pointermove', { x: start.x + (end.x - start.x) * step / 16, y: start.y + (end.y - start.y) * step / 16 }, start);
    }
    if (hold) await page.waitForTimeout(hold);
    await pointer(cancel ? 'pointercancel' : 'pointerup', end, start);
  }
  try {
    await check('Every inactive row selects on first tap; rapid taps keep the last choice', async () => {
      await open();
      for (const index of [2, 1, 3, 0, 2, 0, 3]) {
        await row(index).tap();
        await expectActive(['Sales', 'Agent Chat', 'CRM', 'Project Management'][index]);
        assert.equal(await page.locator('.guide-page').count(), 1);
      }
      await page.waitForFunction(() => location.search.includes('group=project-management'));
      await page.reload({ waitUntil: 'networkidle' });
      await expectActive('Project Management');
    });
    await check('List drag selects rows in both directions without scrolling or navigating', async () => {
      await open();
      assert.equal(await page.locator('.guide-list').evaluate(el => getComputedStyle(el).touchAction), 'pinch-zoom');
      const first = await point(row(0)), last = await point(row(3));
      const scroll = await page.evaluate(() => scrollY);
      await drag(first, last, { hold: 700 });
      await expectActive('Project Management');
      assert.equal(await page.evaluate(() => scrollY), scroll);
      await drag(last, first);
      await expectActive('Sales');
      await page.waitForFunction(() => location.search.includes('group=sales') && document.querySelector('.guide-preview[data-settled]'));
      await expectActive('Sales');
      assert.equal(await page.locator('.guide-page').count(), 1);
      await page.screenshot({ path: `${out}/touch-${name}.png` });
    });
    await check('Long horizontal drag steps once, suppresses its click and permits an immediate fresh tap', async () => {
      await open();
      const start = await point(row(0));
      await drag(start, { x: start.x - 100, y: start.y }, { hold: 700 });
      await expectActive('Agent Chat');
      // Also exercise a delayed compatibility click, which must not be subject to a 400ms timeout.
      await row(0).dispatchEvent('click', { bubbles: true, cancelable: true, detail: 1, button: 0 });
      await expectActive('Agent Chat');
      assert.equal(await page.locator('.guide-page').count(), 1);
      await row(2).tap();
      await expectActive('CRM');
      await row(2).tap();
      await page.locator('.crm-page').waitFor();
    });
    await check('Horizontal swipes work over preview; bounds stay clamped', async () => {
      await open('crm');
      const box = await page.locator('.guide-preview').boundingBox();
      const start = { x: box.x + box.width * .6, y: box.y + 12 };
      await drag(start, { x: start.x - 100, y: start.y });
      await expectActive('Project Management');
      await drag(start, { x: start.x - 100, y: start.y });
      await expectActive('Project Management');
      await drag(start, { x: start.x + 100, y: start.y });
      await expectActive('CRM');
    });
    await check('Canceled touch does not open a workspace; the next tap still works', async () => {
      await open();
      const start = await point(row(0));
      await pointer('pointerdown', start, start);
      await pointer('pointercancel', start, start);
      await row(0).dispatchEvent('click', { bubbles: true, cancelable: true, detail: 1, button: 0 });
      assert.equal(await page.locator('.guide-page').count(), 1);
      await row(2).tap();
      await expectActive('CRM');
    });
    await check('Live text remains editable; switching previews preserves its draft', async () => {
      await open('agent-chat');
      const field = page.locator('.guide-preview .wra textarea');
      await field.fill('Keep my mobile draft');
      await row(2).tap();
      await expectActive('CRM');
      await row(1).tap();
      await expectActive('Agent Chat');
      assert.equal(await field.inputValue(), 'Keep my mobile draft');
    });
    await check('Keyboard and mouse navigation work immediately after a touch drag', async () => {
      await open();
      const start = await point(row(0));
      await drag(start, { x: start.x - 100, y: start.y });
      await row(0).focus();
      await page.keyboard.press('End');
      await expectActive('Project Management');
      await page.keyboard.press('Enter');
      await page.locator('.crm-page').waitFor();
      await open();
      await drag(await point(row(0)), await point(row(3)));
      await row(2).click();
      await page.locator('.crm-page').waitFor();
    });
    if (cdp) await check('Vertical swipes outside the list retain native page scrolling', async () => {
      await page.setViewportSize({ width: 390, height: 580 });
      await open('crm');
      await drag({ x: 6, y: 490 }, { x: 6, y: 130 });
      assert(await page.evaluate(() => scrollY > 0));
      await expectActive('CRM');
    });
  } catch (error) {
    console.log(await page.evaluate(() => ({ url: location.href, events: window.guideEvents, body: document.body.innerText.slice(0, 1000) })), errors);
    throw error;
  } finally {
    await browser.close();
  }
}
assert.deepEqual(errors, []);
await fs.writeFile(`${out}/touch-results.json`, JSON.stringify({ passed, errors, webkitDrags: 'DOM pointer events; native taps' }, null, 2));
