import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/logio-branding/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], passed = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const check = async (name, action) => { await action(); passed.push(name); console.log(`PASS ${name}`); };
const noAcme = async () => {
  const copy = await page.locator('body').innerText();
  const fields = await page.locator('input:not([type="hidden"]),textarea').evaluateAll(items => items.map(item => item.value).join('\n'));
  assert.doesNotMatch(`${copy}\n${fields}`, /acme/i);
};
async function open(section = '') {
  await page.goto(`${base}/personalize${section ? `?section=${section}` : ''}`, { waitUntil: 'networkidle' });
  await page.locator('.workspace-surface').waitFor();
}
try {
  await check('Every Guide me section has only Explore pages in its sidebar header and no Acme copy', async () => {
    for (const section of ['', 'home', 'contacts', 'deals', 'reports', 'new-business', 'renewals', 'partnerships', 'new-chat', 'run', 'mapping', 'invoice', 'settings']) {
      await open(section);
      assert.equal(await page.locator('.workspace-sidebar-header').innerText(), 'Explore pages');
      assert.equal(await page.locator('.workspace-sidebar-header button').count(), 0);
      await noAcme();
    }
    await page.screenshot({ path: `${out}/desktop.png` });
    await page.locator('.ui-as-side').screenshot({ path: `${out}/sidebar.png` });
  });
  await check('All Settings tabs, account profile, Contacts and CRM views use Logio', async () => {
    for (const tab of ['General', 'Members', 'Billing', 'API keys']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await page.waitForTimeout(250);
      await noAcme();
    }
    await page.locator('.ui-as-user').click();
    assert.match(await page.getByRole('menuitemradio', { checked: true }).innerText(), /Logio/);
    assert.doesNotMatch(await page.locator('.ui-as-user-menu').innerText(), /Pro · 8 members/);
    await page.getByRole('menuitem', { name: 'Profile', exact: true }).click();
    assert.equal(await page.locator('dialog[open] input[type="email"]').inputValue(), 'alex@logio.com');
    await page.keyboard.press('Escape');
    await open('contacts');
    assert.match(await page.locator('.workspace-surface').innerText(), /@logio.com/);
    await open();
    for (const view of ['Company CRM', 'Team strategy', 'Pixel integration', 'Sales docs']) {
      await page.getByRole('button', { name: view, exact: true }).click();
      await page.waitForTimeout(250);
      await noAcme();
    }
  });
  await check('Legacy saved workspace, profile, contacts, members and billing display Logio without changing IDs', async () => {
    await page.evaluate(() => {
      localStorage.setItem('affectui:workspaces', JSON.stringify([{ id: 'acme', name: 'Acme Studio' }, { id: 'personal', name: 'Personal' }]));
      localStorage.setItem('affectui:active-workspace', JSON.stringify('acme'));
      localStorage.setItem('affectui:profile', JSON.stringify({ name: 'Alex Morgan', email: 'alex@acme.com', role: 'Head of Sales' }));
      localStorage.setItem('affectui:acme:contacts', JSON.stringify([{ id: 'legacy-contact', name: 'Mara Klein', email: 'mara@acme.com', role: 'Account manager' }]));
      localStorage.setItem('affectui:acme:settings-members', JSON.stringify([{ id: 'alex', name: 'Alex Morgan', email: 'alex@acme.com', role: 'Owner' }]));
      localStorage.setItem('affectui:acme:settings-billing', JSON.stringify({ plan: 'Pro', cycle: 'Monthly', canceled: false, email: 'billing@acme.com', last4: '4242', expiry: '2028-08' }));
    });
    await open('settings');
    await noAcme();
    assert.match(await page.locator('.ui-sb-pay').innerText(), /billing@logio.com/);
    await page.getByRole('tab', { name: 'General', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: /Workspace name/ }).inputValue(), 'Logio Studio');
    await page.getByRole('tab', { name: 'Members', exact: true }).click();
    await noAcme();
    await page.locator('.ui-as-user').click();
    assert.match(await page.getByRole('menuitemradio', { checked: true }).innerText(), /Logio Studio/);
    await page.getByRole('menuitem', { name: 'Profile', exact: true }).click();
    assert.equal(await page.locator('dialog[open] input[type="email"]').inputValue(), 'alex@logio.com');
    await page.keyboard.press('Escape');
    await open('contacts');
    await noAcme();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('affectui:active-workspace'))), 'acme');
  });
  await check('Workspace switching, search, collapse and Explore pages still work', async () => {
    await page.locator('.ui-as-user').click();
    await page.getByRole('menuitemradio', { name: /Personal/ }).click();
    await page.locator('.ui-as-user').click();
    assert.equal(await page.getByRole('menuitemradio', { name: /Personal/ }).getAttribute('aria-checked'), 'true');
    await page.getByRole('menuitemradio', { name: /Logio/ }).click();
    await page.locator('.ui-as-user').click();
    await page.getByRole('menuitem', { name: 'Search', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search workspace', exact: true }).fill('Reports');
    await page.locator('.crm-search__results button').filter({ hasText: /^Reports/ }).click();
    await page.locator('.ui-as-user').click();
    await page.getByRole('menuitem', { name: 'Collapse sidebar', exact: true }).click();
    await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
    await page.getByRole('link', { name: 'Explore pages', exact: true }).click();
    await page.locator('.guide-page').waitFor();
    assert.match(await page.locator('.guide-item[aria-current]').innerText(), /CRM/);
  });
  await check('Mobile drawer and Explore pages stay usable without horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open();
    await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
    await page.locator('.workspace-explore').waitFor({ state: 'visible' });
    await noAcme();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${out}/mobile.png` });
    await page.getByRole('link', { name: 'Explore pages', exact: true }).click();
    await page.locator('.guide-page').waitFor();
  });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed, errors }, null, 2));
  await browser.close();
}
