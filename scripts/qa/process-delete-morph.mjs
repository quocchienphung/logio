// QA for the inline delete of a process (Confirm morph) in the split button's menu and in the saved-processes sheet: the item unfolds into a question,
// no pop-up, Cancel/Escape, Undo, keyboard, the colours of the bar in both themes, a phone. Usage: node scripts/qa/process-delete-morph.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/split-button/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?section=process`;
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 5).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });
async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource|hydrat/i.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pmap__block');
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(900);
  return { context, page };
}
const chevron = page => page.locator('.sb-trigger');
const menu = page => page.locator('.sb-menu');
const settle = page => page.waitForTimeout(900);

{
  const { context, page } = await open();
  const savedCount = async () => { await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(450); const text = await menu(page).getByRole('menuitem').first().innerText(); return +text.match(/\((\d+)\)/)[1]; };
  const row = () => menu(page).locator('.sb-item[data-confirm]');
  await check('With one process Delete is disabled; Duplicate this process makes a second one', async () => {
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(450);
    assert.equal(await menu(page).getByRole('menuitem', { name: /Delete/ }).getAttribute('aria-disabled'), 'true');
    await menu(page).getByRole('menuitem', { name: /Duplicate this process/ }).click();
    await menu(page).waitFor({ state: 'detached' }); await settle(page);
  });
  await check('Delete this process is a Confirm morph in the menu: it unfolds into "Delete? Cancel Delete" in place, no dialog; Cancel and Escape put it back', async () => {
    assert.equal(await savedCount(), 2);
    await row().click();
    await row().locator('.cm[data-state="confirming"]').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0, 'no pop-up');
    assert.equal(await menu(page).count(), 1, 'the menu stays open');
    await page.waitForTimeout(700);
    assert.match(await row().innerText(), /Delete\?\s+Cancel\s+Delete/);
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'cm__confirm', 'the confirm answer has the focus');
    const box = await menu(page).boundingBox(), rowBox = await row().locator('.cm__surface').boundingBox();
    assert.ok(rowBox.x >= box.x && rowBox.x + rowBox.width <= box.x + box.width + 0.5, `the question fits in the menu (${rowBox.width} in ${box.width})`);
    await page.screenshot({ path: `${out}/delete-confirming.png`, clip: { x: 0, y: 0, width: 1000, height: 420 } });
    await row().getByRole('button', { name: 'Cancel' }).click();
    await row().locator('.cm[data-state="idle"]').waitFor();
    await row().click(); await row().locator('.cm[data-state="confirming"]').waitFor(); await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await row().locator('.cm[data-state="idle"]').waitFor();
    assert.equal(await menu(page).count(), 1, 'Escape cancels the question first, the menu stays');
    await page.keyboard.press('Escape'); await menu(page).waitFor({ state: 'detached' });
    assert.equal(await savedCount(), 2, 'nothing was deleted');
    await page.keyboard.press('Escape'); await menu(page).waitFor({ state: 'detached' });
  });
  await check('Confirming deletes at once: the item says "Deleted" with Undo, the label says "Deleted", Undo restores it, and the menu leaves after the result', async () => {
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(450);
    await row().click(); await row().locator('.cm[data-state="confirming"]').waitFor();
    await page.waitForTimeout(400);
    await row().getByRole('button', { name: 'Delete', exact: true }).click();
    await row().locator('.cm[data-state="done"]').waitFor();
    await page.waitForFunction(() => document.querySelector('.sb-primary .sb-sr')?.textContent === 'Deleted');
    assert.match(await row().innerText(), /Deleted\s+Undo/);
    assert.match(await menu(page).getByRole('menuitem').first().innerText(), /\(1\)/, 'one process left');
    await page.screenshot({ path: `${out}/delete-done.png`, clip: { x: 0, y: 0, width: 1000, height: 420 } });
    await row().getByRole('button', { name: 'Undo' }).click();
    // Undo brings the process back and the menu goes (the question is over)
    await menu(page).waitFor({ state: 'detached', timeout: 4000 });
    assert.equal(await savedCount(), 2, 'Undo restored the process');
    // delete again and leave it: the result stays 4 s, then the menu closes and the label returns
    await row().click(); await row().locator('.cm[data-state="confirming"]').waitFor(); await page.waitForTimeout(400);
    await row().getByRole('button', { name: 'Delete', exact: true }).click();
    await row().locator('.cm[data-state="done"]').waitFor();
    await page.mouse.move(120, 640); // a pointer resting on the result keeps it (hover pauses the timer)
    await menu(page).waitFor({ state: 'detached', timeout: 7000 });
    assert.equal(await page.evaluate(() => document.activeElement?.className + '/' + document.activeElement?.tagName), 'sb-trigger/BUTTON', 'the focus is back on the chevron');
    await page.waitForFunction(() => document.querySelector('.sb-primary .sb-sr')?.textContent === 'New process', null, { timeout: 6000 });
  });
  await check('Keyboard: Enter on the highlighted Delete asks (the confirm answer takes the focus), arrows leave the question alone, Escape cancels', async () => {
    // Delete is disabled with one process: duplicate first so that it is enabled
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(450);
    await menu(page).getByRole('menuitem', { name: /Duplicate this process/ }).click();
    await menu(page).waitFor({ state: 'detached' });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'More process actions' }).focus();
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => document.activeElement?.textContent?.includes('Delete this process'));
    await page.keyboard.press('Enter');
    await row().locator('.cm[data-state="confirming"]').waitFor();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'cm__confirm');
    await page.keyboard.press('ArrowDown');
    assert.equal(await menu(page).count(), 1, 'the arrows leave the question alone');
    await page.keyboard.press('Escape');
    await row().locator('.cm[data-state="idle"]').waitFor();
    await page.keyboard.press('Escape'); await menu(page).waitFor({ state: 'detached' });
  });
  await check('Colours: in the light and the dark theme the New process button and its menu have the colour of the bar', async () => {
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.querySelector('.crm-page')?.setAttribute('data-theme', value), theme);
      await page.waitForTimeout(300);
      await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(700);
      const colours = await page.evaluate(() => {
        const bg = selector => getComputedStyle(document.querySelector(selector)).backgroundColor;
        return { pill: bg('.proc-pill--name'), group: bg('.sb-group'), primary: bg('.sb-primary'), menu: bg('.sb-menu') };
      });
      assert.equal(colours.group, colours.pill, `${theme}: the button has the bar's colour ${JSON.stringify(colours)}`);
      assert.equal(colours.primary, colours.pill);
      assert.equal(colours.menu, colours.pill, `${theme}: and so does its menu`);
      await page.screenshot({ path: `${out}/menu-${theme}-bar.png`, clip: { x: 220, y: 0, width: 1000, height: 360 } });
      await page.keyboard.press('Escape'); await menu(page).waitFor({ state: 'detached' });
    }
  });
  await check('Saved processes: the delete of a row unfolds in place (no dialog), takes room from the title, and deleting keeps the sheet open; toolbar Undo brings it back', async () => {
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(450);
    await menu(page).getByRole('menuitem', { name: /Saved processes/ }).click();
    await page.getByRole('dialog', { name: 'Saved processes' }).waitFor(); await page.waitForTimeout(900);
    const rows = page.locator('.proc-library li');
    const count = await rows.count();
    assert.ok(count >= 2);
    const last = rows.last();
    const titleBefore = (await last.locator('.proc-library__open').boundingBox()).width;
    await last.locator('.psheet-delete .cm__trigger').click();
    await last.locator('.cm[data-state="confirming"]').waitFor(); await page.waitForTimeout(800);
    assert.equal(await page.getByRole('dialog', { name: 'Delete process' }).count(), 0);
    assert.match(await last.locator('.psheet-delete').innerText(), /Delete\?\s+Cancel\s+Delete/);
    const titleAfter = (await last.locator('.proc-library__open').boundingBox()).width;
    assert.ok(titleAfter < titleBefore - 100, `the title gave room (${titleBefore} to ${titleAfter})`);
    await page.screenshot({ path: `${out}/library-confirming.png` });
    await last.getByRole('button', { name: 'Cancel' }).click();
    await last.locator('.cm[data-state="idle"]').waitFor(); await page.waitForTimeout(700);
    assert.ok(Math.abs((await last.locator('.proc-library__open').boundingBox()).width - titleBefore) < 2, 'and gave it back');
    await last.locator('.psheet-delete .cm__trigger').click();
    await last.locator('.cm[data-state="confirming"]').waitFor(); await page.waitForTimeout(400);
    await last.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(count => document.querySelectorAll('.proc-library li').length === count - 1, count);
    assert.equal(await page.getByRole('dialog', { name: 'Saved processes' }).count(), 1, 'the sheet stays open');
    await page.keyboard.press('Escape'); await page.locator('.bs-sheet').waitFor({ state: 'detached', timeout: 4000 });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(450);
    assert.match(await menu(page).getByRole('menuitem').first().innerText(), new RegExp(`\(${count}\)`));
    await page.keyboard.press('Escape'); await menu(page).waitFor({ state: 'detached' });
  });
  await check('No page errors', async () => { assert.deepEqual(errors, []); });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  await check('Phone: the question of the menu fits the screen and the question of a sheet row fits its row', async () => {
    await chevron(page).tap(); await menu(page).waitFor(); await page.waitForTimeout(500);
    await menu(page).getByRole('menuitem', { name: /Duplicate this process/ }).tap();
    await menu(page).waitFor({ state: 'detached' }); await page.waitForTimeout(700);
    await chevron(page).tap(); await menu(page).waitFor(); await page.waitForTimeout(500);
    const row = menu(page).locator('.sb-item[data-confirm]');
    await row.tap(); await row.locator('.cm[data-state="confirming"]').waitFor(); await page.waitForTimeout(800);
    const box = await menu(page).boundingBox(), surface = await row.locator('.cm__surface').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390, `menu inside the screen ${JSON.stringify(box)}`);
    assert.ok(surface.x + surface.width <= box.x + box.width + 0.5, 'question inside the menu');
    await page.screenshot({ path: `${out}/phone-confirming.png` });
    await row.getByRole('button', { name: 'Cancel' }).tap();
    await row.locator('.cm[data-state="idle"]').waitFor();
    await page.keyboard.press('Escape'); await menu(page).waitFor({ state: 'detached' });
    await chevron(page).tap(); await menu(page).waitFor(); await page.waitForTimeout(500);
    await menu(page).getByRole('menuitem', { name: /Saved processes/ }).tap();
    await page.getByRole('dialog', { name: 'Saved processes' }).waitFor(); await page.waitForTimeout(900);
    const last = page.locator('.proc-library li').last();
    await last.locator('.psheet-delete .cm__trigger').tap();
    await last.locator('.cm[data-state="confirming"]').waitFor(); await page.waitForTimeout(800);
    const li = await last.boundingBox(), face = await last.locator('.psheet-delete .cm__surface').boundingBox();
    assert.ok(face.x >= li.x && face.x + face.width <= li.x + li.width + 0.5, `the question stays in its row ${JSON.stringify({ li, face })}`);
    await page.screenshot({ path: `${out}/phone-library-confirming.png` });
  });
  await check('Phone: no page errors', async () => { assert.deepEqual(errors, []); });
  await context.close();
}
await browser.close();
const failed = results.filter(result => !result.ok);
console.log(`
${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
