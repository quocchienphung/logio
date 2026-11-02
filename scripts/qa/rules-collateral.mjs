import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Rules is the sixth row of the Guide me selector; it holds the Collateral folder with Excel formation and JSON formation (details: scripts/qa/collateral.mjs).
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/collateral/rules';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
const check = (name, result) => { assert.ok(result, name); results.push(name); };
const newContext = async options => {
  const context = await browser.newContext(options);
  // The cookie bar would sit over the page; a saved choice keeps it away.
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  return context;
};
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().includes('/_next/')) errors.push(`${response.status()} ${response.url()}`); });
};
try {
  const context = await newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  watch(page);
  await page.goto(`${base}/personalize?browse=1&group=agent-chat`, { waitUntil: 'networkidle' });
  const rows = page.locator('.guide-item');
  await rows.first().waitFor();
  const names = await rows.locator('.guide-item__name, .guide-item__label').allInnerTexts().catch(() => []);
  const text = await page.locator('.guide-list, body').first().innerText();
  check('Rules is the sixth row of the selector, numbered (06)', await rows.count() === 6 && text.includes('Rules') && text.includes('(06)'));
  check('The existing five rows are still there', ['Sales', 'Agent Chat', 'CRM', 'Project Management', 'Skilled'].every(name => text.includes(name)));
  await page.screenshot({ path: `${out}/selector-agent-chat.png` });
  await rows.nth(5).hover();
  await page.waitForURL(/group=rules/);
  await page.waitForTimeout(500);
  check('Pointing at Rules moves the selector to its own group', page.url().includes('group=rules'));
  check('Its frame is the neutral one (no picture, nothing faked)', await page.locator('.guide-preview__frame[data-active][data-empty]').count() === 1);
  await page.screenshot({ path: `${out}/selector-rules.png` });
  await rows.nth(5).click();
  await page.waitForURL(/section=excel-formation/);
  await page.locator('.storage-dropzone').waitFor();
  check('Opening Rules opens Excel formation', await page.getByRole('heading', { level: 1, name: 'Excel formation' }).count() === 1);
  check('Excel formation opens with the stepper hidden until processing completes', await page.getByRole('tab').count() === 0 && await page.locator('.storage-dropzone').count() === 1);
  const items = await page.locator('.ui-as-side__nav .workspace-nav-label').allInnerTexts();
  check('The sidebar lists only the Rules pages, under the Collateral folder', items.join('|') === 'Collateral|Excel formation|JSON formation|Queue');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/excel-desktop.png` });

  // Direct link, reload, other groups, Explore pages
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.storage-dropzone').waitFor();
  check('The address works after a reload', await page.getByRole('heading', { level: 1, name: 'Excel formation' }).count() === 1);
  await page.getByRole('link', { name: /Explore pages/ }).click();
  await page.waitForURL(/browse=1/);
  check('Explore pages returns to the selector on the Rules row', page.url().includes('group=rules'));
  await page.goto(`${base}/personalize?section=usage`, { waitUntil: 'networkidle' });
  await page.locator('.ui-sb').waitFor();
  check('Usage still opens and its group does not list Collateral', !(await page.locator('.ui-as-side__nav .workspace-nav-label').allInnerTexts()).includes('Collateral'));

  // Search finds the page
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('textbox', { name: 'Search workspace', exact: true }).fill('json');
  check('Workspace search finds JSON formation', await page.locator('.crm-search__results button').filter({ hasText: /^JSON formation/ }).count() >= 1);
  await page.keyboard.press('Escape');

  // Dark, phone
  const dark = await newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  await dark.addInitScript(() => localStorage.setItem('affectui:preferences', JSON.stringify({ dark: true, theme: 'dark', emailNotifications: true, desktopNotifications: true })));
  const darkPage = await dark.newPage(); watch(darkPage);
  await darkPage.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
  await darkPage.locator('.storage-dropzone').waitFor();
  await darkPage.waitForTimeout(500);
  await darkPage.screenshot({ path: `${out}/excel-dark.png` });
  check('Dark theme reaches the page', await darkPage.locator('.crm-page').getAttribute('data-theme') === 'dark');
  for (const width of [390, 320]) {
    const phone = await newContext({ viewport: { width, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
    const small = await phone.newPage(); watch(small);
    await small.goto(`${base}/personalize?section=excel-formation`, { waitUntil: 'networkidle' });
    await small.locator('.storage-dropzone').waitFor();
    await small.waitForTimeout(400);
    check(`No sideways scroll at ${width}px`, await small.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await small.screenshot({ path: `${out}/excel-${width}.png` });
    const selector = await phone.newPage(); watch(selector);
    await selector.goto(`${base}/personalize?browse=1&group=rules`, { waitUntil: 'networkidle' });
    await selector.locator('.guide-item').first().waitFor();
    await selector.waitForTimeout(400);
    check(`The selector shows six rows without sideways scroll at ${width}px`, await selector.locator('.guide-item').count() === 6 && await selector.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await selector.screenshot({ path: `${out}/selector-${width}.png` });
    await phone.close();
  }
  check('No page errors or failed requests', errors.length === 0);
  console.log(`${results.length} checks passed`);
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
} catch (error) {
  console.error('FAILED after:', results.at(-1) ?? '(nothing)'); console.error(error.message); console.error(errors);
  process.exitCode = 1;
} finally { await browser.close(); }
