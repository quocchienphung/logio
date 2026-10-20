import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { goToSection } from './lib/nav.mjs';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/guide-navigation/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 716, height: 574 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [], passed = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && /hydration|unique.*key|Cannot update|Invalid DOM/i.test(message.text())) errors.push(message.text()); });
const check = async (name, fn) => { await fn(); passed.push(name); console.log(`PASS ${name}`); };
const item = name => page.locator('.guide-item').filter({ hasText: new RegExp(`${name}$`) });
const selected = async () => page.locator('.guide-item[aria-current]').innerText();
const stripY = () => page.evaluate(() => document.querySelector('.guide-preview__strip').getBoundingClientRect().top);
const open = async (group, p = page) => {
  await p.goto(`${base}/personalize?browse=1${group ? `&group=${group}` : ''}`, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.mouse.move(700, 560);
  await p.waitForTimeout(900);
};
try {
  await check('Guide me entries open the selector with the second item active, as in the first video frame', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const entries = page.locator('a[href="/personalize?browse=1"]');
    assert.equal(await entries.count(), 2);
    await entries.first().click();
    await page.locator('.guide-page').waitFor();
    assert.equal(await page.locator('.guide-item').count(), 4);
    assert.match(await selected(), /Agent Chat/);
    assert.deepEqual(await page.locator('.guide-item__name').allInnerTexts(), ['Sales', 'Agent Chat', 'CRM', 'Project Management']);
    assert.equal(await page.locator('.guide-page p:not(.wra *):not(.ap *), .guide-page header:not(.wra *):not(.ap *), .guide-page footer').count(), 0);
    await page.setViewportSize({ width: 716, height: 574 });
  });
  await check('Hover slides the strip up for later items and down for earlier ones, then settles', async () => {
    await open();
    const start = await stripY();
    const frameHeight = await page.locator('.guide-preview').evaluate(el => el.getBoundingClientRect().height);
    await item('CRM').hover();
    await page.waitForTimeout(120);
    const mid = await stripY();
    assert(mid < start && mid > start - frameHeight, 'strip moves up mid-flight');
    await page.waitForTimeout(1000);
    const crm = await stripY();
    assert(Math.abs(crm - (start - frameHeight)) < 1.5, 'one frame height up');
    await item('Agent Chat').hover();
    await page.waitForTimeout(120);
    assert(await stripY() > crm, 'strip moves back down');
    await page.waitForTimeout(1000);
    assert(Math.abs(await stripY() - start) < 1.5);
    assert.equal(await page.locator('.guide-preview__frame').count(), 4);
    await page.screenshot({ path: `${out}/selector-716.png` });
  });
  await check('Rapid hover settles on the last item, with no queued animations or extra layers', async () => {
    for (const name of ['Sales', 'Project Management', 'CRM', 'Sales', 'Project Management', 'Agent Chat', 'Sales']) await item(name).hover();
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => !animation.effect?.target?.closest('.wra, .gf, .ap') && Number(animation.effect.getTiming().duration) > 1).length), 0);
    assert.match(await selected(), /Sales/);
    assert.equal(await page.locator('.guide-preview img').count(), 1, 'one photo (CRM), two live frames (Sales, Agent Chat) and a neutral frame');
    const frame = await page.locator('.guide-preview').evaluate(el => el.getBoundingClientRect().top);
    assert(Math.abs(await stripY() - frame) < 1.5, 'Sales frame fills the preview');
  });
  await check('Keyboard arrows select, wrap, Home/End work and Enter opens the group', async () => {
    await item('Sales').focus();
    await page.keyboard.press('ArrowDown');
    assert.match(await selected(), /Agent Chat/);
    await page.keyboard.press('End');
    assert.match(await selected(), /Project Management/);
    await page.keyboard.press('ArrowDown');
    assert.match(await selected(), /Sales/);
    await page.keyboard.press('ArrowUp');
    assert.match(await selected(), /Project Management/);
    await page.keyboard.press('Home');
    assert.match(await selected(), /Sales/);
    await page.keyboard.press('Enter');
    await page.locator('.ui-as-side__item[aria-current="page"]').filter({ hasText: 'Invoice' }).waitFor({ state: 'attached' });
  });
  await check('Each group opens its workspace entry and Explore pages returns to that group', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const entry = { Sales: ['Invoice', ['Invoice']], 'Agent Chat': ['New chat', ['New chat', 'Files', 'Run', 'Settings']], CRM: ['Home', ['Home', 'Companies', 'Contacts', 'Deals', 'Reports', 'New business', 'Renewals', 'Partnerships']], 'Project Management': ['Mapping', ['Mapping']] };
    for (const [name, [label, pages]] of Object.entries(entry)) {
      await open();
      await item(name).click();
      await page.locator('.crm-page').waitFor();
      assert(!await page.locator('.guide-page').count());
      await page.locator('.ui-as-side__item[aria-current="page"]').filter({ hasText: label }).waitFor({ state: 'attached' });
      assert.deepEqual(await page.locator('.ui-as-side__nav .workspace-nav-label').allInnerTexts(), pages, `${name} sidebar`);
      await page.getByRole('link', { name: 'Explore pages' }).click();
      await page.locator('.guide-page').waitFor();
      assert.match(await selected(), new RegExp(name));
    }
  });
  await check('Preview click opens the active group; pages of other groups follow their group and its sidebar', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open('crm');
    await page.locator('.guide-preview').click();
    await page.locator('.crm-page').waitFor();
    assert.deepEqual(await page.locator('.ui-as-side__nav .workspace-nav-label').allInnerTexts(), ['Home', 'Companies', 'Contacts', 'Deals', 'Reports', 'New business', 'Renewals', 'Partnerships']);
    for (const [label, pages, pipelines] of [['Deals', ['Home', 'Companies', 'Contacts', 'Deals', 'Reports', 'New business', 'Renewals', 'Partnerships'], true], ['Run', ['New chat', 'Files', 'Run', 'Settings'], false], ['Mapping', ['Mapping'], false], ['Settings', ['New chat', 'Files', 'Run', 'Settings'], false], ['Renewals', ['Home', 'Companies', 'Contacts', 'Deals', 'Reports', 'New business', 'Renewals', 'Partnerships'], true]]) {
      await goToSection(page, label);
      await page.locator('.ui-as-side__item[aria-current="page"]').filter({ hasText: new RegExp(`^${label}$`) }).waitFor();
      assert.deepEqual(await page.locator('.ui-as-side__nav .workspace-nav-label').allInnerTexts(), pages, `${label} sidebar`);
      assert.equal(await page.locator('.ui-as-side__label', { hasText: 'Pipelines' }).count(), pipelines ? 1 : 0);
      await page.getByRole('link', { name: 'Explore pages' }).hover();
    }
  });
  await check('Back/Forward and refresh keep the selection; hover adds no history entries', async () => {
    await open('crm');
    const length = await page.evaluate(() => history.length);
    await item('Sales').hover(); await item('CRM').hover();
    assert.equal(await page.evaluate(() => history.length), length);
    await item('Agent Chat').click();
    await page.locator('.crm-page').waitFor();
    await page.goBack(); await page.locator('.guide-page').waitFor();
    assert.match(await selected(), /Agent Chat/);
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await selected(), /Agent Chat/);
    await page.goForward(); await page.locator('.crm-page').waitFor();
  });
  await check('Legacy CRM route and URL-addressable tabs keep working', async () => {
    await page.goto(`${base}/personalize`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Company CRM', exact: true }).click();
    await page.locator('tbody tr').first().waitFor();
    await page.getByRole('button', { name: 'Team strategy', exact: true }).click();
    await page.locator('.ui-as-board').waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.ui-as-board').waitFor();
    await page.goBack();
    await page.locator('tbody tr').first().waitFor();
    for (const href of ['section=run', 'section=run&panel=chat', 'section=settings&settings-tab=billing', 'crm-view=Sales+docs', 'section=invoice', 'section=mapping']) {
      await page.goto(`${base}/personalize?${href}`, { waitUntil: 'networkidle' });
      await page.locator('.crm-page').waitFor();
    }
  });
  await check('Small, tablet and wide viewports have no horizontal overflow', async () => {
    for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1920, 1080]]) {
      await page.setViewportSize({ width, height }); await open();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px overflow`);
      await page.screenshot({ path: `${out}/selector-${width}.png` });
    }
  });
  await check('Touch: first tap selects, second tap opens', async () => {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const touch = await mobile.newPage();
    touch.on('pageerror', error => errors.push(error.message));
    await open(undefined, touch);
    const crm = touch.locator('.guide-item').filter({ hasText: /CRM$/ });
    await crm.tap();
    assert.match(await touch.locator('.guide-item[aria-current]').innerText(), /CRM/);
    assert.equal(await touch.locator('.guide-page').count(), 1);
    await crm.tap();
    await touch.locator('.crm-page').waitFor();
    await mobile.close();
  });
  await check('Reduced motion settles immediately and keeps navigation usable', async () => {
    await page.setViewportSize({ width: 716, height: 574 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open();
    await item('CRM').hover();
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => !animation.effect?.target?.closest('.wra, .gf, .ap') && Number(animation.effect.getTiming().duration) > 1).length), 0);
    assert.match(await selected(), /CRM/);
    await item('CRM').click();
    await page.locator('.crm-page').waitFor();
  });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed, errors }, null, 2));
  await browser.close();
}
