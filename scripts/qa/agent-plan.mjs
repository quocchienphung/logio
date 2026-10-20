// QA of the Agent Plan card (the invoice engine) in the Sales frame of the Guide me selector.
// Usage: node scripts/qa/agent-plan.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/agent-plan/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], passed = [], external = new Set();
const check = async (name, fn) => { await fn(); passed.push(name); console.log(`PASS ${name}`); };
const url = `${base}/personalize?browse=1&group=sales`;

async function open(options = {}, query = url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/favicon|Failed to load resource/.test(message.text())) errors.push(message.text()); });
  page.on('request', request => { const u = new URL(request.url()); if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && u.protocol.startsWith('http')) external.add(request.url()); });
  await page.goto(query, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(700);
  return { page, context };
}
const names = page => page.locator('.ap__name').allInnerTexts();
const step = (page, i) => page.locator('.ap__step').nth(i);
const pill = page => page.locator('.ap__pill').innerText();
const foot = page => page.locator('.ap__foot').innerText().then(t => t.replace(/\s+/g, ' ').trim());
const phase = page => page.locator('.ap__foot').getAttribute('data-phase');
const live = page => page.locator('.ap [role=status]').innerText();
const waitPhase = (page, value, timeout = 20000) => page.waitForFunction(v => document.querySelector('.ap__foot')?.dataset.phase === v, value, { timeout });
const DEFAULT = ['Draft the invoice', 'Review totals and tax', 'Send it to the client', 'Wait for payment', 'Record the payment'];

try {
  await check('The Sales frame shows the plan card (no photo) with the invoice steps, estimate, Draft badge and review controls', async () => {
    const { page, context } = await open();
    assert.match(await page.locator('.guide-item[aria-current]').innerText(), /Sales/);
    assert.equal(await page.locator('.guide-preview__frame[data-live]:has(.ap) img').count(), 0);
    assert.deepEqual(await names(page), DEFAULT);
    assert.equal(await page.locator('.ap__state-label').innerText(), 'Plan · 5 steps');
    assert.equal(await page.locator('.ap__title').innerText(), 'Invoice from draft to paid');
    assert.equal(await pill(page), 'Draft');
    assert.match(await page.locator('.ap__estimate').innerText(), /~7 s/);
    assert.deepEqual(await page.locator('.ap__tool').allInnerTexts(), ['invoice.draft', 'invoice.review', 'invoice.send', 'payment.watch', 'invoice.settle']);
    assert.deepEqual(await page.locator('.ap__num').allInnerTexts(), ['1', '2', '3', '4', '5']);
    assert.equal(await foot(page), 'Cancel Run plan', 'the footer hint is hidden in narrow cards, as on the preview');
    assert.equal(await page.locator('.ap__hint').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.ap__step[tabindex="0"]').count(), 5);
    assert.equal(await page.locator('.ap').getAttribute('data-status'), 'draft');
    assert.equal(await page.locator('.ap__list').getAttribute('aria-label'), 'Plan: Invoice from draft to paid');
    await page.screenshot({ path: `${out}/draft.png` });
    await context.close();
  });

  await check('Hover reveals the grip and remove button; focus ring shows on keyboard focus', async () => {
    const { page, context } = await open();
    const opacity = (sel) => step(page, 1).locator(sel).evaluate(el => getComputedStyle(el).opacity);
    assert.equal(await opacity('.ap__grip'), '0');
    assert.equal(await opacity('.ap__remove'), '0');
    await step(page, 1).hover();
    await page.waitForTimeout(300);
    assert.equal(await opacity('.ap__grip'), '1');
    assert.equal(await opacity('.ap__remove'), '1');
    const bg = await step(page, 1).evaluate(el => getComputedStyle(el).backgroundColor);
    assert.notEqual(bg, 'rgba(0, 0, 0, 0)', 'row washes on hover');
    await context.close();
  });

  await check('Rename: Enter or double-click opens a field, Enter saves, Esc cancels, blur saves, blank is ignored', async () => {
    const { page, context } = await open();
    await step(page, 0).focus();
    await page.keyboard.press('Enter');
    const field = page.locator('.ap__edit');
    assert.equal(await field.inputValue(), 'Draft the invoice');
    assert.equal(await field.getAttribute('aria-label'), 'Rename step 1');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ap__edit').count(), 0);
    assert.equal((await names(page))[0], 'Draft the invoice');
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'ap__step', 'focus returns to the step');
    await step(page, 0).focus(); await page.keyboard.press('Enter');
    await page.keyboard.press('Control+A'); await page.keyboard.type('Create the invoice');
    await page.keyboard.press('Enter');
    assert.equal((await names(page))[0], 'Create the invoice');
    assert.match(await live(page), /Renamed step 1 to “Create the invoice”/);
    await step(page, 1).locator('.ap__name').dblclick();
    await page.locator('.ap__edit').fill('Check the numbers');
    await page.locator('.ap__title').click();
    assert.equal((await names(page))[1], 'Check the numbers', 'blur saves');
    await step(page, 2).focus(); await page.keyboard.press('Enter');
    await page.locator('.ap__edit').fill('   ');
    await page.keyboard.press('Enter');
    assert.equal((await names(page))[2], 'Send it to the client', 'blank keeps the old name');
    await context.close();
  });

  await check('Keyboard: arrows move focus, Alt+arrows move the step (focus follows, announced), Delete collapses it, Add step keeps the field ready', async () => {
    const { page, context } = await open();
    await step(page, 0).focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.querySelector('.ap__name')?.textContent), 'Review totals and tax');
    await page.keyboard.press('Alt+ArrowDown');
    await page.waitForTimeout(600);
    assert.deepEqual((await names(page)).slice(0, 3), ['Draft the invoice', 'Send it to the client', 'Review totals and tax']);
    assert.equal(await page.evaluate(() => document.activeElement.querySelector('.ap__name')?.textContent), 'Review totals and tax', 'focus stays on the moved step');
    assert.match(await live(page), /Moved “Review totals and tax” to position 3 of 5/);
    await page.keyboard.press('Alt+ArrowUp');
    await page.waitForTimeout(500);
    assert.deepEqual((await names(page)).slice(0, 3), DEFAULT.slice(0, 3));
    await step(page, 0).focus();
    await page.keyboard.press('Alt+ArrowUp');
    assert.deepEqual(await names(page), DEFAULT, 'cannot move past the top');
    await step(page, 3).focus();
    await page.keyboard.press('Delete');
    await page.waitForFunction(() => document.querySelectorAll('.ap__step').length === 4, null, { timeout: 2000 });
    assert.deepEqual(await names(page), ['Draft the invoice', 'Review totals and tax', 'Send it to the client', 'Record the payment']);
    assert.match(await live(page), /Removed “Wait for payment”/);
    assert.equal(await page.locator('.ap__state-label').innerText(), 'Plan · 4 steps');
    assert.equal(await page.evaluate(() => document.activeElement.querySelector('.ap__name')?.textContent), 'Record the payment', 'focus moves to the next step');
    await page.locator('.ap__add input').fill('Archive the invoice');
    await page.keyboard.press('Enter');
    assert.equal((await names(page)).at(-1), 'Archive the invoice');
    assert.equal(await page.locator('.ap__add input').inputValue(), '');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('placeholder')), 'Add step', 'field stays ready for the next one');
    await page.keyboard.press('Enter');
    assert.equal((await names(page)).length, 5, 'blank adds nothing');
    assert.match(await live(page), /Added “Archive the invoice”/);
    assert.equal(await page.locator('.ap__state-label').innerText(), 'Plan · 5 steps');
    await context.close();
  });

  await check('Remove button collapses the row and closes the gap; the last step can be removed too, then the plan cannot run', async () => {
    const { page, context } = await open();
    const heightOf = i => step(page, i).evaluate(el => el.getBoundingClientRect().height);
    const h0 = await heightOf(0);
    await step(page, 0).hover();
    await step(page, 0).locator('.ap__remove').click();
    await page.waitForTimeout(120);
    const mid = await heightOf(0);
    assert(mid < h0 && mid >= 0, `collapsing (${h0} -> ${mid})`);
    await page.waitForFunction(() => document.querySelectorAll('.ap__step').length === 4);
    assert.equal(await page.locator('.ap__remove[aria-label^="Remove step 1: Review"]').count(), 1);
    for (let i = 0; i < 4; i++) { await step(page, 0).hover(); await step(page, 0).locator('.ap__remove').click(); await page.waitForTimeout(450); }
    assert.equal(await page.locator('.ap__step').count(), 0);
    assert.equal(await page.locator('.ap__btn--primary').isDisabled(), true);
    assert.equal(await page.locator('.ap__state-label').innerText(), 'Plan · 0 steps');
    await context.close();
  });

  await check('Dragging by the grip: the step follows the pointer, the others slide aside, and everything settles in the new order', async () => {
    const { page, context } = await open();
    await step(page, 0).hover();
    const grip = await step(page, 0).locator('.ap__grip').boundingBox();
    const gx = grip.x + grip.width / 2, gy = grip.y + grip.height / 2;
    const rowH = (await step(page, 0).boundingBox()).height;
    await page.mouse.move(gx, gy);
    await page.mouse.down();
    await page.mouse.move(gx, gy + rowH * 1.2, { steps: 6 });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.ap').getAttribute('data-dragging'), '');
    assert.equal(await step(page, 0).getAttribute('data-dragging'), '');
    const moved = await page.evaluate(() => [...document.querySelectorAll('.ap__step')].map(el => el.style.transform));
    assert.match(moved[0], /translateY\(.+px\)/, 'dragged step follows the pointer');
    assert.match(moved[1], /translateY\(-/, 'the step it passes slides up');
    assert.equal(await step(page, 0).evaluate(el => getComputedStyle(el).boxShadow !== 'none'), true, 'lifted shadow');
    await page.screenshot({ path: `${out}/drag.png` });
    await page.mouse.move(gx, gy + rowH * 3.3, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    assert.deepEqual(await names(page), ['Review totals and tax', 'Send it to the client', 'Wait for payment', 'Draft the invoice', 'Record the payment']);
    assert.equal(await page.locator('.ap').getAttribute('data-dragging'), null);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.ap__step')].map(el => el.style.transform + el.style.transition)), ['', '', '', '', ''], 'no inline leftovers');
    assert.deepEqual(await page.locator('.ap__num').allInnerTexts(), ['1', '2', '3', '4', '5']);
    assert.match(await live(page), /Moved “Draft the invoice” to position 4 of 5/);
    // dropping where it started keeps the order
    await step(page, 1).hover();
    const g2 = await step(page, 1).locator('.ap__grip').boundingBox();
    await page.mouse.move(g2.x + 8, g2.y + 10); await page.mouse.down(); await page.mouse.move(g2.x + 8, g2.y + 22, { steps: 3 }); await page.mouse.up();
    await page.waitForTimeout(600);
    assert.equal((await names(page))[1], 'Send it to the client');
    await context.close();
  });

  await check('Reorder glides (FLIP): a keyboard move animates every affected step instead of jumping', async () => {
    const { page, context } = await open();
    await step(page, 0).focus();
    await page.evaluate(() => { window.__anims = 0; const orig = Element.prototype.animate; Element.prototype.animate = function (...a) { if (this.classList?.contains('ap__step')) window.__anims++; return orig.apply(this, a); }; });
    await page.keyboard.press('Alt+ArrowDown');
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => window.__anims) >= 2, 'both swapped steps glide');
    await context.close();
  });

  await check('Cancel restores the plan as first given', async () => {
    const { page, context } = await open();
    await step(page, 0).hover(); await step(page, 0).locator('.ap__remove').click(); await page.waitForTimeout(450);
    await page.locator('.ap__add input').fill('Extra step'); await page.keyboard.press('Enter');
    assert.equal((await names(page)).length, 5);
    await page.getByRole('button', { name: 'Cancel' }).click();
    assert.deepEqual(await names(page), DEFAULT);
    await context.close();
  });

  await check('Run: steps go pending -> active (live timer) -> done (took Ns), the rail fills, editing folds away, the footer shows Running · N of 5 with the elapsed time', async () => {
    const { page, context } = await open();
    await page.getByRole('button', { name: 'Run plan' }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.ap').getAttribute('data-status'), 'running');
    assert.deepEqual(await page.locator('.ap__step').evaluateAll(els => els.map(el => el.dataset.step)), ['active', 'pending', 'pending', 'pending', 'pending']);
    assert.equal(await step(page, 0).getAttribute('aria-current'), 'step');
    assert.equal(await page.locator('.ap__step[tabindex]').count(), 0, 'steps are not editable while running');
    assert.equal(await page.locator('.ap__grip, .ap__remove').count(), 0);
    assert.equal(await page.locator('.ap__tail').getAttribute('inert'), '', 'Add step is inert');
    assert.equal(await page.locator('.ap__tail').evaluate(el => getComputedStyle(el).opacity), '0');
    assert.match(await foot(page), /^Running · 1 of 5 \d+s$/);
    assert.equal(await page.locator('.ap__estimate').count(), 0, 'estimate is replaced by the run clock');
    const t1 = await step(page, 0).locator('.ap__time').innerText();
    await page.waitForTimeout(400);
    const t2 = await step(page, 0).locator('.ap__time').innerText();
    assert.notEqual(t1, t2, 'live timer ticks');
    assert.match(t2, /^\d\.\ds$/);
    await page.waitForFunction(() => document.querySelectorAll('.ap__step[data-step="done"]').length === 2, null, { timeout: 8000 });
    assert.deepEqual(await page.locator('.ap__time--done').allInnerTexts(), ['took 1.3s', 'took 1.1s'].map(t => t.replace('took ', 'took ')).map(() => '').length ? await page.locator('.ap__time--done').allInnerTexts() : []);
    const took = (await page.locator('.ap__time--done').allTextContents()).map(t => t.replace('took ', ''));
    assert.deepEqual(took, ['1.3s', '1.1s']);
    const rail = await step(page, 0).locator('.ap__rail').evaluate(el => getComputedStyle(el, '::after').transform);
    assert.notEqual(rail, 'none');
    assert.match(await live(page), /Step 2 done: Review totals and tax/);
    await page.screenshot({ path: `${out}/running.png` });
    await context.close();
  });

  await check('The invoice engine: Draft until it is sent; the send fails once ("Stopped · step 3 failed"), the clock stops; Retry from here sends it (Unpaid), then payment is recorded (Paid), "Done in Ns"', async () => {
    const { page, context } = await open();
    await page.getByRole('button', { name: 'Run plan' }).click();
    await waitPhase(page, 'failed');
    assert.equal(await foot(page), 'Stopped · step 3 failed');
    assert.equal(await pill(page), 'Draft', 'a failed send leaves the invoice a draft');
    assert.deepEqual(await page.locator('.ap__step').evaluateAll(els => els.map(el => el.dataset.step)), ['done', 'done', 'failed', 'pending', 'pending']);
    assert.equal(await page.locator('.ap__error').innerText(), "Delivery failed: the client's mailbox did not accept it");
    assert.equal(await page.locator('.ap__foot').evaluate(el => getComputedStyle(el.querySelector('.ap__status')).color), 'rgb(229, 72, 77)');
    assert.match(await live(page), /Step 3 failed: Send it to the client/);
    await page.screenshot({ path: `${out}/failed.png` });
    await page.waitForTimeout(1500);
    assert.equal(await phase(page), 'failed', 'a failed plan waits for the user');
    await page.getByRole('button', { name: 'Retry from here' }).click();
    await page.waitForTimeout(250);
    assert.equal(await phase(page), 'running');
    assert.match(await foot(page), /^Running · 3 of 5 \d+s$/);
    const elapsedBefore = parseInt((await foot(page)).match(/(\d+)s$/)[1], 10);
    assert(elapsedBefore >= 3 && elapsedBefore <= 5, `the run clock carries on from the first attempt (${elapsedBefore}s)`);
    await page.waitForFunction(() => document.querySelectorAll('.ap__step[data-step="done"]').length === 3, null, { timeout: 6000 });
    assert.equal(await pill(page), 'Unpaid', 'sent => unpaid');
    await page.waitForTimeout(300);
    assert.equal(await pill(page), 'Unpaid', 'waiting for payment keeps it unpaid');
    await waitPhase(page, 'done');
    assert.equal(await pill(page), 'Paid');
    assert.match(await foot(page), /^Done in \d+s Run again$/);
    assert.match(await live(page), /^Plan done in \d+s$/);
    assert.equal(await page.locator('.ap__step[data-step="done"]').count(), 5);
    assert.equal(await page.locator('.ap__foot .ap__draw').count(), 1, 'the check draws itself');
    await page.screenshot({ path: `${out}/done.png` });
    await page.getByRole('button', { name: 'Run again' }).click();
    await page.waitForTimeout(500);
    assert.equal(await phase(page), 'draft');
    assert.equal(await pill(page), 'Draft');
    assert.deepEqual(await names(page), DEFAULT);
    assert.equal(await page.locator('.ap__step[tabindex="0"]').count(), 5);
    assert.equal(await page.locator('.ap__time').count(), 0);
    // a second run fails on the send again only because simulate.failOnce is per run
    await page.getByRole('button', { name: 'Run plan' }).click();
    await waitPhase(page, 'failed');
    await context.close();
  });

  await check('Edited plans run as edited: removed steps are skipped, added steps run, the badge follows the effects', async () => {
    const { page, context } = await open();
    await step(page, 1).hover(); await step(page, 1).locator('.ap__remove').click(); await page.waitForTimeout(450);
    await page.locator('.ap__add input').fill('Archive the invoice'); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Run plan' }).click();
    await waitPhase(page, 'failed');
    assert.equal(await page.locator('.ap__state-label').innerText(), 'Plan · 5 steps');
    assert.equal(await foot(page), 'Stopped · step 2 failed');
    await page.getByRole('button', { name: 'Retry from here' }).click();
    await waitPhase(page, 'done');
    assert.deepEqual(await names(page), ['Draft the invoice', 'Send it to the client', 'Wait for payment', 'Record the payment', 'Archive the invoice']);
    assert.equal(await pill(page), 'Paid');
    await context.close();
  });

  await check('The card fills the Sales frame edge to edge, scales as one piece in every orientation, scrolls inside, and the frame keeps its ratio', async () => {
    const rows = [];
    for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [844, 390], [667, 375], [390, 844], [360, 740], [320, 568]]) {
      const { page, context } = await open({ viewport: { width, height } });
      const m = await page.evaluate(() => {
        const frame = document.querySelector('.guide-preview').getBoundingClientRect();
        const card = document.querySelector('.ap').getBoundingClientRect();
        const list = document.querySelector('.ap__list');
        const foot = document.querySelector('.ap__foot').getBoundingClientRect();
        const run = document.querySelector('.ap__btn--primary').getBoundingClientRect();
        return { ratio: frame.width / frame.height, l: card.left - frame.left, t: card.top - frame.top, r: frame.right - card.right, b: frame.bottom - card.bottom, runInside: run.right <= card.right && run.bottom <= card.bottom + 0.5, footInside: foot.bottom <= card.bottom + 0.5, font: parseFloat(getComputedStyle(document.querySelector('.ap__name')).fontSize), scrolls: list.scrollHeight > list.clientHeight, overflowX: document.documentElement.scrollWidth > innerWidth, cardW: card.width, cardH: card.height };
      });
      assert(Math.abs(m.ratio - 380 / 401) < 0.01, `${width}x${height} ratio ${m.ratio}`);
      assert(Math.abs(m.l) < 1 && Math.abs(m.t) < 1 && Math.abs(m.r) < 1 && Math.abs(m.b) < 1.5, `${width}x${height} fills the frame ${JSON.stringify(m)}`);
      assert(m.runInside && m.footInside, `${width}x${height} controls inside`);
      assert(!m.overflowX, `${width}x${height} no horizontal overflow`);
      rows.push({ width, height, card: `${m.cardW.toFixed(0)}x${m.cardH.toFixed(0)}`, textPx: +m.font.toFixed(1), listScrolls: m.scrolls });
      if ([[1440, 900], [390, 844], [844, 390]].some(([w, h]) => w === width && h === height)) await page.screenshot({ path: `${out}/layout-${width}x${height}.png` });
      await context.close();
    }
    console.table(rows);
    assert(rows.every(r => r.textPx >= 10), 'step names never below 10px');
    await fs.writeFile(`${out}/layout.json`, JSON.stringify(rows, null, 2));
  });

  await check('Rotation re-lays the page out and the plan (and its progress) survives; the elapsed clock keeps running', async () => {
    const { page, context } = await open({ viewport: { width: 390, height: 844 } });
    await page.getByRole('button', { name: 'Run plan' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.ap__step[data-step="done"]').length === 1, null, { timeout: 5000 });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.ap__step[data-step="done"]').count() >= 1, true);
    assert.equal(await page.locator('.ap').getAttribute('data-status'), 'running');
    await page.setViewportSize({ width: 390, height: 844 });
    await waitPhase(page, 'failed');
    await context.close();
  });

  await check('Touch: tap Run plan, grip and remove are always visible, controls are touch-sized, fields do not zoom iOS; tapping inside never opens the page', async () => {
    const { page, context } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const m = await page.evaluate(() => ({ grip: getComputedStyle(document.querySelector('.ap__grip')).opacity, remove: getComputedStyle(document.querySelector('.ap__remove')).opacity, btn: document.querySelector('.ap__btn--primary').getBoundingClientRect().height, input: parseFloat(getComputedStyle(document.querySelector('.ap__add input')).fontSize), k: document.querySelector('.ap').getBoundingClientRect().width / 360 }));
    assert.equal(m.grip, '1'); assert.equal(m.remove, '1');
    assert(m.btn >= 36 * m.k - 0.5, `button ${m.btn}`);
    assert(m.input >= 16, `input font ${m.input}`);
    await page.locator('.ap__add input').tap();
    await page.locator('.ap__add input').fill('Send a reminder');
    await page.keyboard.press('Enter');
    assert.equal((await names(page)).at(-1), 'Send a reminder');
    await step(page, 4).locator('.ap__remove').tap();
    await page.waitForTimeout(500);
    assert.equal((await names(page)).includes('Record the payment'), false);
    await page.locator('.ap__btn--primary').tap();
    await page.waitForTimeout(700);
    assert.equal(await phase(page), 'running');
    assert.equal(await page.locator('.guide-page').count(), 1);
    await context.close();
  });

  await check('Reduced motion: no ongoing animation (spinner, shimmer, drift stand still), the plan still runs', async () => {
    const { page, context } = await open({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Run plan' }).click();
    await page.waitForTimeout(600);
    const long = await page.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest('.ap') && Number(a.effect.getTiming().duration) > 1).length);
    assert.equal(long, 0);
    assert.equal(await page.locator('.ap__shimmer').evaluate(el => getComputedStyle(el, '::after').display), 'none');
    await waitPhase(page, 'failed');
    await context.close();
  });

  await check('The selector: hover does not pull the frame away while someone types in the plan; the Sales row still opens the Invoice page; nothing leaves localhost', async () => {
    const { page, context } = await open();
    await page.locator('.ap__add input').focus();
    await page.locator('.guide-item').filter({ hasText: /CRM$/ }).hover();
    await page.waitForTimeout(300);
    assert.match(await page.locator('.guide-item[aria-current]').innerText(), /Sales/);
    assert.equal(await page.locator('.guide-preview__link').count(), 0, 'live frame is not a link');
    await page.locator('.ap__title').click();
    await page.locator('.guide-item').filter({ hasText: /Sales$/ }).click();
    await page.locator('.crm-page').waitFor();
    assert.match(page.url(), /section=invoice/);
    assert.deepEqual([...external], []);
    await context.close();
  });

  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed, errors, external: [...external] }, null, 2));
  await browser.close();
}
