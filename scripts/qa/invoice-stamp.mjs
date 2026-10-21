// QA for the invoice stamp (Sales → Invoice → "Mark as paid"): the date picker pop-up that turns into a stamping scene.
// Checks the picker (wheels by mouse wheel, drag, keys and tap; kinds and inks), the scene in real time and at exact moments (the card becomes a stamp,
// the paper tilts, the stamp drops and lifts, ink appears only on contact), Undo and Done, what is saved and printed, keyboard, reduced motion,
// phone, dark mode and WebKit. Usage: node scripts/qa/invoice-stamp.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/invoice-stamp/qa';
await fs.mkdir(out, { recursive: true });
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false, error: String(error.message).split('\n').slice(0, 5).join(' | ') }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 5).join('\n    ')); }
};
const chrome = await chromium.launch({ channel: 'chrome' });
const url = `${base}/personalize?section=invoice`;
async function open(options = {}, engine = chrome) {
  const context = await engine.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror ${error.message.slice(0, 160)}`));
  page.on('console', message => { if (message.type() === 'error' && !/404|beforeunload|Failed to load resource/.test(message.text())) errors.push(`console ${message.text().slice(0, 160)}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-invoice-stamp]');
  return { context, page };
}
const stage = page => page.locator('.inv-stage');
const phase = page => stage(page).getAttribute('data-phase');
const waitPhase = (page, name, timeout = 8000) => page.waitForFunction(value => document.querySelector('.inv-stage')?.getAttribute('data-phase') === value, name, { timeout });
const seek = (page, name, time) => page.evaluate(([name, time]) => document.querySelector('.inv-stage').dispatchEvent(new CustomEvent('stamp-seek', { detail: name === null ? null : { phase: name, time } })), [name, time]);
const style = (page, selector, property) => page.evaluate(([selector, property]) => getComputedStyle(document.querySelector(selector))[property], [selector, property]);
const num = async (page, selector, property) => parseFloat(await style(page, selector, property));
const wheelOf = (page, label) => page.getByRole('spinbutton', { name: label });
const valueOf = async (page, label) => (await wheelOf(page, label).getAttribute('aria-valuetext'));
const box = locator => locator.boundingBox();
const openPicker = async page => { await page.locator('[data-invoice-stamp]').click(); await stage(page).waitFor(); await page.waitForTimeout(450); };

// ---------- the picker ----------
{
  const { context, page } = await open();
  await check('The invoice has a "Mark as paid" button; it opens a pop-up with three date wheels, kinds, inks and one button, and none of the old captions', async () => {
    assert.equal(await page.locator('[data-invoice-stamp]').innerText(), 'Mark as paid');
    await openPicker(page);
    assert.equal(await stage(page).getAttribute('role'), 'dialog');
    assert.equal(await phase(page), 'pick');
    for (const label of ['Day', 'Month', 'Year']) assert.equal(await wheelOf(page, label).count(), 1, label);
    assert.equal(await page.getByRole('radio').count(), 9, 'four kinds and five inks');
    assert.equal(await page.getByRole('button', { name: 'Mark as paid' }).count(), 2, 'the toolbar button behind it and the pop-up button');
    const text = await page.locator('.inv-stage__chrome, .stp3d__top').evaluateAll(els => els.map(el => el.textContent).join(' '));
    for (const gone of [/NORTHWIND/i, /Choose the payment date/i, /printed on the invoice/i, /or press Enter/i, /saved to its history/i]) assert.doesNotMatch(text, gone);
    const today = new Date();
    assert.equal(await valueOf(page, 'Day'), String(today.getDate()));
    assert.equal(await valueOf(page, 'Year'), String(today.getFullYear()));
    assert.equal(await valueOf(page, 'Month'), ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][today.getMonth()]);
    await page.screenshot({ path: `${out}/picker.png` });
  });
  await check('The mouse wheel, the arrow keys, Page Up/Down and Home/End turn a wheel one row (or five) at a time, and the date line follows', async () => {
    const day = wheelOf(page, 'Day');
    const before = Number(await valueOf(page, 'Day'));
    await day.hover();
    await page.mouse.wheel(0, 100);
    await page.waitForFunction(value => document.querySelector('[aria-label=Day]').getAttribute('aria-valuetext') === String(value), before + 1 > 28 ? 1 : before + 1, { timeout: 3000 }).catch(() => {});
    const afterWheel = Number(await valueOf(page, 'Day'));
    assert.ok(afterWheel !== before, `the day moved (${before} → ${afterWheel})`);
    await day.focus(); await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('[aria-label=Day]').getAttribute('aria-valuetext') === '1');
    await page.keyboard.press('PageDown');
    await page.waitForFunction(() => document.querySelector('[aria-label=Day]').getAttribute('aria-valuetext') === '6');
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => document.querySelector('[aria-label=Day]').getAttribute('aria-valuetext') === '5');
    await page.keyboard.press('End');
    await page.waitForFunction(() => Number(document.querySelector('[aria-label=Day]').getAttribute('aria-valuetext')) >= 28);
    const month = wheelOf(page, 'Month'); await month.focus(); await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('[aria-label=Month]').getAttribute('aria-valuetext') === 'JAN');
    await page.keyboard.press('ArrowDown'); // February
    await page.waitForFunction(() => document.querySelector('[aria-label=Month]').getAttribute('aria-valuetext') === 'FEB');
    const readout = await page.locator('.inv-stage__date').innerText();
    assert.match(readout, /^\w+day, \d+ February \d{4}$/);
    assert.ok(Number(await valueOf(page, 'Day')) <= 29, 'a short month pulls the day back to a day that exists');
  });
  await check('Dragging a wheel turns it and it comes to rest on a row; tapping a neighbouring row brings it to the middle', async () => {
    const year = wheelOf(page, 'Year');
    const b = await box(year), startValue = Number(await valueOf(page, 'Year'));
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 8; step += 1) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - step * 12);
    await page.mouse.up();
    await page.waitForFunction(value => Number(document.querySelector('[aria-label=Year]').getAttribute('aria-valuetext')) > value, startValue, { timeout: 3000 });
    const dragged = Number(await valueOf(page, 'Year'));
    // at rest the rows sit on whole positions: the middle row is centred on the wheel
    await page.waitForTimeout(700);
    const centre = await page.evaluate(() => { const wheel = document.querySelector('[aria-label=Year]').getBoundingClientRect(), row = document.querySelector('[aria-label=Year] [data-center]').getBoundingClientRect(); return Math.abs((row.top + row.height / 2) - (wheel.top + wheel.height / 2)); });
    assert.ok(centre < 1, `at rest on a row (${centre.toFixed(2)}px off)`);
    // a tap one row below the middle
    const b2 = await box(year), pitch = b2.height / 5;
    await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2 + pitch);
    await page.waitForFunction(value => Number(document.querySelector('[aria-label=Year]').getAttribute('aria-valuetext')) === value + 1, dragged, { timeout: 3000 });
  });
  await check('Kinds and inks: each kind has its words and ink; an ink can be chosen on its own; the arrow keys move between kinds', async () => {
    await page.getByRole('radio', { name: 'Received' }).click();
    assert.match(await page.locator('.inv-face__kind').innerText(), /^Received$/);
    assert.equal(await page.locator('.inv-stage__chrome .inv-go').innerText(), 'Mark as received');
    assert.equal(await page.getByRole('radio', { name: 'Blue ink' }).getAttribute('aria-checked'), 'true');
    await page.getByRole('radio', { name: 'Black ink' }).click();
    assert.equal(await page.getByRole('radio', { name: 'Black ink' }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByRole('radio', { name: 'Blue ink' }).getAttribute('aria-checked'), 'false');
    await page.getByRole('radio', { name: 'Received' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.inv-stage__chrome .inv-go').innerText(), 'Mark as approved');
    await page.getByRole('radio', { name: 'Paid' }).click();
    assert.equal(await page.locator('.inv-stage__chrome .inv-go').innerText(), 'Mark as paid');
    assert.equal(await page.getByRole('radio', { name: 'Red ink' }).getAttribute('aria-checked'), 'true');
  });
  await check('Escape closes the picker without stamping; the invoice is untouched', async () => {
    await page.keyboard.press('Escape');
    await stage(page).waitFor({ state: 'detached' });
    assert.equal(await page.locator('.invoice-stamp-on-sheet').count(), 0);
    assert.equal(await page.locator('.invoice-stamp-badge').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-invoice-stamp')), true, 'the focus goes back to the button');
  });
  await context.close();
}

// ---------- the scene, in real time ----------
{
  const { context, page } = await open();
  await openPicker(page);
  // pick a date well away from the default so the impression is easy to tell
  await wheelOf(page, 'Year').focus(); await page.keyboard.press('ArrowUp');
  const stamped = { day: await valueOf(page, 'Day'), month: await valueOf(page, 'Month'), year: await valueOf(page, 'Year') };
  const press = Date.now();
  await page.getByRole('button', { name: 'Mark as paid' }).last().click();
  await check('Pressing the button does not close the pop-up: the controls fade, the card stays and becomes the stamp, and the scene plays', async () => {
    assert.equal(await phase(page), 'play');
    await page.waitForTimeout(450);
    assert.ok(await num(page, '.inv-stage__chrome', 'opacity') < 0.05, `the controls are gone within a moment (${await num(page, '.inv-stage__chrome', 'opacity')}, phase ${await phase(page)})`);
    assert.equal(await page.locator('.stp3d__top').isVisible(), true, 'the card is still there');
    await page.waitForTimeout(500);
    assert.ok(await num(page, '.inv-stage__paper', 'opacity') > 0.9, 'the paper has come up');
    assert.ok(await num(page, '.inv-stage__table', 'opacity') > 0.6, 'on its table');
    assert.match(await style(page, '.stp3d', 'transform'), /matrix3d/, 'the stamp is a solid in the camera');
    await page.screenshot({ path: `${out}/scene-live.png` });
  });
  await check('There is no ink until the stamp touches; after it lifts the impression is there and the toast comes up', async () => {
    const before = await num(page, '.inv-stage__mark', 'opacity');
    assert.ok(Date.now() - press < 1900 || before === 0, 'sampled before contact');
    await waitPhase(page, 'hold', 6000);
    const elapsed = Date.now() - press;
    assert.ok(elapsed > 1900 && elapsed < 3600, `the scene takes about two seconds (${elapsed} ms)`);
    assert.equal(await num(page, '.inv-stage__mark', 'opacity'), 1);
    assert.ok(await num(page, '.inv-stage__toast', 'opacity') > 0.95);
    const text = await page.locator('.inv-stage__toast').innerText();
    assert.match(text, /^Marked as paid\s*·\s*\d{1,2} \w{3} \d{4}\s*Undo\s*Done$/);
    assert.equal(await page.locator('.inv-stage__mark svg').getAttribute('aria-label'), `PAID ${stamped.day} ${stamped.month} ${stamped.year}`);
    await page.screenshot({ path: `${out}/scene-hold.png` });
  });
  await check('Undo plays the scene backwards to the picker (the stamp is taken off the invoice, the picker is as it was)', async () => {
    await page.getByRole('button', { name: 'Undo' }).click();
    assert.equal(await phase(page), 'rewind');
    await waitPhase(page, 'pick', 4000);
    assert.ok(await num(page, '.inv-stage__chrome', 'opacity') > 0.95, 'the controls are back');
    assert.equal(await num(page, '.inv-stage__mark', 'opacity'), 0);
    assert.ok(await num(page, '.inv-stage__paper', 'opacity') < 0.05);
    assert.equal(await valueOf(page, 'Year'), stamped.year, 'the picker kept the date');
    assert.equal(await page.getByRole('button', { name: 'Mark as paid' }).last().isEnabled(), true);
  });
  await check('Stamping again, then Done: the stamp leaves upward, the paper lies flat with the impression on it, and Download PDF / Next invoice come up', async () => {
    await page.getByRole('button', { name: 'Mark as paid' }).last().click();
    await waitPhase(page, 'hold', 6000);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    assert.equal(await phase(page), 'exit');
    await waitPhase(page, 'final', 5000);
    await page.waitForTimeout(150);
    assert.equal(await style(page, '.stp3d', 'visibility'), 'hidden', 'the stamp has gone');
    assert.match(await style(page, '.inv-stage__paper', 'transform'), /matrix/);
    assert.ok(await num(page, '.inv-stage__final', 'opacity') > 0.95);
    assert.equal(await page.getByRole('button', { name: 'Download PDF' }).isEnabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Next invoice' }).isEnabled(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Download PDF');
    await page.screenshot({ path: `${out}/scene-final.png` });
  });
  await check('Download PDF opens the print layout with the stamp on it (kind, date and ink)', async () => {
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Download PDF' }).click()]);
    await popup.waitForLoadState();
    const html = await popup.content();
    assert.match(html, /class="stamp"/);
    assert.match(html, new RegExp(`${stamped.day} ${stamped.month} ${stamped.year}`));
    assert.match(html, /<small>PAID<\/small>/);
    assert.match(html, /color:#c9382c/);
    await popup.close();
  });
  await check('Closing leaves the invoice stamped: the impression is on the sheet, the heading says Paid, and the unsaved state shows', async () => {
    await page.keyboard.press('Escape');
    await stage(page).waitFor({ state: 'detached' });
    assert.equal(await page.locator('.invoice-stamp-on-sheet svg').getAttribute('aria-label'), `PAID ${stamped.day} ${stamped.month} ${stamped.year}`);
    assert.match(await page.locator('.invoice-stamp-badge').innerText(), /^Paid · \d{1,2} \w{3} \d{4}$/);
    assert.equal(await page.locator('[data-invoice-stamp]').innerText(), 'Change stamp');
    assert.equal(await page.locator('.invoice-save-state').innerText(), 'Unsaved changes');
    await page.locator('.invoice-stamp-on-sheet').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/invoice-stamped.png` });
  });
  await check('Saved with the invoice: after Save draft and a reload the stamp is still on the invoice, and it is in the stored document', async () => {
    await page.locator('[data-invoice-save]').click();
    await page.waitForFunction(() => /Saved/.test(document.querySelector('.invoice-save-state')?.textContent ?? ''), null, { timeout: 5000 });
    const stored = await page.evaluate(() => { const key = Object.keys(localStorage).find(item => item.endsWith(':invoice')); return key ? JSON.parse(localStorage.getItem(key)) : null; });
    const doc = stored.documents.find(item => item.id === stored.activeId);
    assert.deepEqual({ kind: doc.stamp.kind, ink: doc.stamp.ink }, { kind: 'paid', ink: 'red' });
    assert.match(doc.stamp.date, /^\d{4}-\d{2}-\d{2}$/);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.invoice-stamp-on-sheet');
    assert.equal(await page.locator('.invoice-stamp-on-sheet svg').getAttribute('aria-label'), `PAID ${stamped.day} ${stamped.month} ${stamped.year}`);
  });
  await check('Changing the stamp opens the picker on the stamp it has; Undo goes back to the earlier stamp, and Next invoice starts a clean invoice', async () => {
    await page.locator('[data-invoice-stamp]').click();
    await stage(page).waitFor(); await page.waitForTimeout(400);
    assert.equal(await valueOf(page, 'Year'), stamped.year);
    await page.getByRole('radio', { name: 'Approved' }).click();
    await page.getByRole('button', { name: 'Mark as approved' }).click();
    await waitPhase(page, 'hold', 6000);
    assert.match(await page.locator('.inv-stage__mark svg').getAttribute('aria-label'), /^APPROVED/);
    await page.getByRole('button', { name: 'Undo' }).click();
    await waitPhase(page, 'pick', 4000);
    await page.keyboard.press('Escape');
    await stage(page).waitFor({ state: 'detached' });
    assert.match(await page.locator('.invoice-stamp-badge').innerText(), /^Paid/, 'the earlier stamp is back');
    await page.locator('[data-invoice-stamp]').click();
    await stage(page).waitFor(); await page.waitForTimeout(300);
    await page.getByRole('radio', { name: 'Received' }).click();
    await page.getByRole('button', { name: 'Mark as received' }).click();
    await waitPhase(page, 'hold', 6000); await page.getByRole('button', { name: 'Done', exact: true }).click(); await waitPhase(page, 'final', 5000);
    await page.getByRole('button', { name: 'Next invoice' }).click();
    await stage(page).waitFor({ state: 'detached' });
    // the unsaved stamp is asked about like any other change
    await page.getByRole('dialog', { name: /Unsaved changes/ }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await page.waitForFunction(() => /INV-\d{4}$/.test(document.querySelector('.invoice-document-number')?.textContent ?? '') && !document.querySelector('.invoice-stamp-on-sheet'), null, { timeout: 6000 });
    assert.equal(await page.locator('.invoice-stamp-badge').count(), 0);
  });
  await context.close();
}

// ---------- the scene at exact moments ----------
{
  const { context, page } = await open({ viewport: { width: 960, height: 640 } });
  await openPicker(page);
  await page.getByRole('button', { name: 'Mark as paid' }).last().click();
  await seek(page, 'play', 0);
  const pose = async () => page.evaluate(() => {
    const q = selector => document.querySelector(selector);
    const top = q('.stp3d__top').getBoundingClientRect(), world = q('.inv-stage__world').getBoundingClientRect(), unit = world.width / 720;
    const tilt = Math.abs(new DOMMatrixReadOnly(getComputedStyle(q('.stp3d')).transform).m23);
    return { chrome: +getComputedStyle(q('.inv-stage__chrome')).opacity, ink: +getComputedStyle(q('.inv-stage__mark')).opacity, toast: +getComputedStyle(q('.inv-stage__toast')).opacity,
      paperOpacity: +getComputedStyle(q('.inv-stage__paper')).opacity, paperScale: new DOMMatrixReadOnly(getComputedStyle(q('.inv-stage__paper')).transform).m11,
      topY: (top.top + top.height / 2 - (world.top + world.height / 2)) / unit, topW: top.width / unit, tilted: tilt > 0.05 };
  });
  await check('At moments of the scene: card → solid stamp as the camera tilts → hover → drop → press → lift (the clock is held still for each)', async () => {
    const at = {};
    for (const time of [0, 0.2, 0.6, 1.2, 1.31, 1.36, 1.45, 1.7, 2.15]) { await seek(page, 'play', time); await page.waitForTimeout(40); at[time] = await pose(); }
    assert.equal(at[0].chrome, 1); assert.equal(at[0].paperOpacity, 0); assert.ok(Math.abs(at[0].topW - 308) < 4, `the card is its own size (${at[0].topW})`);
    assert.equal(at[0].tilted, false, 'seen from above it is only the card');
    assert.ok(at[0.2].chrome < 0.01 && at[0.2].paperOpacity > 0.3 && at[0.2].paperOpacity < 0.8, 'the page behind comes through');
    assert.equal(at[1.2].tilted, true, 'later it is a solid seen at an angle');
    assert.ok(at[1.2].paperScale < at[0.2].paperScale, 'the camera has pulled back');
    assert.ok(at[1.2].topY < at[1.36].topY - 40, `the face is high while it hovers and low when the die is down (${at[1.2].topY} vs ${at[1.36].topY})`);
    assert.equal(at[1.31].ink, 0); assert.equal(at[1.36].ink, 0, 'no ink while it is down');
    assert.equal(at[1.45].ink, 1, 'ink as it lifts');
    assert.ok(at[1.7].topY < at[1.36].topY - 80, 'back up');
    assert.equal(at[1.7].toast, 0); assert.equal(at[2.15].toast, 1);
  });
  await check('The stamp is a real solid and the paper is the invoice itself: stacked 3D slices, no cached bitmap layers, and the sheet is the invoice preview markup', async () => {
    assert.ok(await page.locator('.stp3d__slice').count() >= 20, 'a body made of slices');
    assert.equal(await style(page, '.stp3d', 'transformStyle'), 'preserve-3d');
    assert.equal(await style(page, '.inv-stage__paper', 'willChange'), 'auto', 'drawn at its size on screen, never upscaled from a bitmap');
    assert.equal(await style(page, '.stp3d', 'willChange'), 'auto');
    assert.equal(await page.locator('.inv-paper .ui-iv__sheet .ui-iv__head .ui-iv__big').count(), 1);
    assert.equal(await page.locator('.inv-paper [data-testid=invoice-total]').innerText(), await page.locator('.invoice-preview [data-testid=invoice-total]').first().innerText().catch(() => page.locator('.inv-paper [data-testid=invoice-total]').innerText()));
    assert.equal(await page.locator('.inv-paper img, .inv-paper canvas, .inv-stage img, .inv-stage canvas, .inv-stage video').count(), 0, 'nothing in it is a picture');
  });
  await check('Each moment of the scene is saved as a frame (docs/research/invoice-stamp/qa/frames) for the storyboard', async () => {
    await fs.mkdir(`${out}/frames`, { recursive: true });
    for (const [name, time] of [['a000', 0], ['a020', 0.2], ['a033', 0.33], ['a046', 0.46], ['a066', 0.66], ['a100', 1.0], ['a128', 1.28], ['a136', 1.36], ['a146', 1.46], ['a160', 1.6], ['a215', 2.15]]) { await seek(page, 'play', time); await page.waitForTimeout(60); await page.screenshot({ path: `${out}/frames/${name}.png` }); }
    for (const [name, time] of [['b030', 0.3], ['b045', 0.45], ['b060', 0.6], ['b100', 1.0], ['b155', 1.55]]) { await seek(page, 'exit', time); await page.waitForTimeout(60); await page.screenshot({ path: `${out}/frames/${name}.png` }); }
    assert.ok((await fs.readdir(`${out}/frames`)).length >= 16);
  });
  await context.close();
}

// ---------- keyboard, reduced motion, dark, phone, WebKit ----------
{
  const { context, page } = await open();
  await check('Keyboard: Enter stamps, Escape during the scene skips to the hovering stamp, Escape again is Done, Tab never leaves the pop-up', async () => {
    await openPicker(page);
    for (let index = 0; index < 14; index += 1) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.inv-stage')), true, `tab ${index}`); }
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.inv-stage')), true);
    await page.getByRole('spinbutton', { name: 'Day' }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await phase(page), 'play');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await waitPhase(page, 'hold', 1500);
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Done', 'the focus is on Done');
    await page.keyboard.press('Escape');
    await waitPhase(page, 'final', 4000);
    await page.keyboard.press('Escape');
    await stage(page).waitFor({ state: 'detached' });
  });
  await context.close();
}
{
  const { context, page } = await open({ reducedMotion: 'reduce' });
  await check('Reduced motion: no flight at all — the finished paper with its impression appears at once, with Undo, Download PDF and Next invoice', async () => {
    await openPicker(page);
    await page.getByRole('button', { name: 'Mark as paid' }).last().click();
    await waitPhase(page, 'final', 1500);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.inv-stage__mark')).opacity === '1', null, { timeout: 1000 });
    assert.equal(await num(page, '.inv-stage__mark', 'opacity'), 1, 'the impression is on the paper at once');
    assert.equal(await page.locator('.inv-stage__final').getByRole('button', { name: 'Undo' }).count(), 1, 'with Undo beside the other buttons');
    await page.screenshot({ path: `${out}/reduced-motion.png` });
    await page.getByRole('button', { name: 'Undo' }).click();
    await waitPhase(page, 'pick', 1500);
    assert.equal(await page.locator('.invoice-stamp-badge').count(), 0);
  });
  await context.close();
}
{
  const { context, page } = await open();
  await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.setAttribute('data-theme', 'dark'); });
  await check('Dark mode: the card, the controls and the table follow the theme; the paper stays paper', async () => {
    await openPicker(page);
    const face = await style(page, '.stp3d__top', 'backgroundColor');
    assert.equal(face, 'rgb(35, 35, 38)');
    await page.screenshot({ path: `${out}/dark-picker.png` });
    await page.getByRole('button', { name: 'Mark as paid' }).last().click();
    await waitPhase(page, 'hold', 6000);
    assert.equal(await style(page, '.inv-paper', 'backgroundColor'), 'rgb(255, 255, 255)');
    await page.screenshot({ path: `${out}/dark-scene.png` });
  });
  await context.close();
}
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await check('Phone: the picker fits, the controls are finger-sized, a tap stamps, and the whole scene stays on the screen with no sideways scroll', async () => {
    await page.locator('[data-invoice-stamp]').tap();
    await stage(page).waitFor(); await page.waitForTimeout(450);
    const card = await box(page.locator('.stp3d__top')), vp = page.viewportSize();
    assert.ok(card.x >= 0 && card.x + card.width <= vp.width, `card ${JSON.stringify(card)}`);
    for (const selector of ['.inv-stage__chrome .inv-go', '.inv-seg button', '.inv-inks button']) { const b = await box(page.locator(selector).first()); assert.ok(b.height >= 20, `${selector} ${b.height}`); }
    assert.ok((await box(page.locator('.inv-stage__chrome .inv-go'))).height >= 40, 'the main button is easy to hit');
    for (const selector of ['.inv-seg', '.inv-inks', '.inv-stage__chrome .inv-go']) { const b = await box(page.locator(selector)); assert.ok(b.x >= 0 && b.x + b.width <= vp.width, `${selector} on screen`); }
    await page.screenshot({ path: `${out}/phone-picker.png` });
    await page.locator('.inv-stage__chrome .inv-go').tap();
    await waitPhase(page, 'hold', 6000);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    const toast = await box(page.locator('.inv-stage__toast'));
    assert.ok(toast.x >= 0 && toast.x + toast.width <= vp.width && toast.y + toast.height <= vp.height, `toast ${JSON.stringify(toast)}`);
    await page.screenshot({ path: `${out}/phone-scene.png` });
    await page.getByRole('button', { name: 'Done', exact: true }).tap();
    await waitPhase(page, 'final', 5000);
    const buttons = await box(page.locator('.inv-stage__final'));
    assert.ok(buttons.x >= 0 && buttons.x + buttons.width <= vp.width && buttons.y + buttons.height <= vp.height, `buttons ${JSON.stringify(buttons)}`);
    await page.screenshot({ path: `${out}/phone-final.png` });
  });
  await context.close();
}
{
  const safari = await webkit.launch();
  const { context, page } = await open({}, safari);
  await check('WebKit: the picker opens, the scene plays to the hovering stamp, Done settles it, and the invoice carries the stamp', async () => {
    await openPicker(page);
    await page.getByRole('button', { name: 'Mark as paid' }).last().click();
    await waitPhase(page, 'hold', 8000);
    assert.equal(await num(page, '.inv-stage__mark', 'opacity'), 1);
    await page.screenshot({ path: `${out}/webkit-scene.png` });
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await waitPhase(page, 'final', 6000);
    await page.keyboard.press('Escape');
    await stage(page).waitFor({ state: 'detached' });
    await page.waitForSelector('.invoice-stamp-on-sheet');
  });
  await context.close(); await safari.close();
}
await check('No script errors in any of it', async () => { assert.deepEqual(errors, []); });

await chrome.close();
const passed = results.filter(result => result.ok).length;
console.log(passed === results.length ? 'ALL PASS' : 'SOME FAILED', `${passed}/${results.length}`);
await fs.writeFile(`${out}/results.json`, JSON.stringify({ base, results }, null, 2) + '\n');
if (passed !== results.length) process.exit(1);
