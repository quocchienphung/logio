import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/account-settings/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [], external = new Set();
let lastPage;
async function check(name, fn) { await fn(); results.push({ name, ok: true }); console.log('PASS', name); }
async function open(viewport = { width: 1440, height: 1000 }, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true, preferences: false, analytics: false, marketing: false }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await context.newPage(); lastPage = page; page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { const url = new URL(request.url()); if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) external.add(url.origin); });
  await page.goto(`${base}/personalize?section=process`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ui-as-user', { state: 'attached' });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  return { page, context };
}
async function menu(page) {
  if (!await page.locator('.ui-as-user').isVisible()) await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
  await page.locator('.ui-as-user').click(); await page.waitForSelector('.ui-as-user-menu>.ui-as-menu');
  return page.locator('.ui-as-user-menu>.ui-as-menu');
}
async function settings(page) { const panel = await menu(page); await panel.getByRole('menuitem', { name: 'Settings', exact: true }).click(); await page.waitForSelector('.sc-overlay__panel'); await page.waitForTimeout(700); }
async function account(page) { await page.locator('.sc-nav__item', { hasText: 'Where you log' }).click(); await page.waitForTimeout(900); }
const capture = async (page, name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}.png` }); };
try {
  const { page, context } = await open();
  await check('Account menu removes Profile, Help and the compact preferences popup; keeps Theme and Settings', async () => {
    const panel = await menu(page);
    for (const name of ['Profile', 'Help & feedback', 'Appearance & notifications']) assert.equal(await panel.getByRole('menuitem', { name, exact: true }).count(), 0);
    assert.equal(await panel.getByRole('group', { name: 'Theme' }).count(), 1);
    await capture(page, 'menu');
  });
  await check('Theme changes immediately, stays open, supports keyboard and persists across reload', async () => {
    await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
    assert.equal(await page.locator('.crm-page').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('.ui-as-user-menu>.ui-as-menu').count(), 1);
    await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).press('ArrowRight');
    assert.equal(await page.getByRole('menuitemradio', { name: 'System', exact: true }).getAttribute('aria-checked'), 'true');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.querySelector('.crm-page')?.dataset.theme === 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.querySelector('.crm-page')?.dataset.theme === 'light');
    await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
    await page.waitForTimeout(500); await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.crm-page').getAttribute('data-theme'), 'dark');
    const panel = await menu(page); await panel.getByRole('menuitemradio', { name: 'Light', exact: true }).click();
    await panel.getByRole('menuitem', { name: 'Settings', exact: true }).click(); await page.waitForTimeout(800);
  });
  await check('Where you log lives inside the existing Settings, and search jumps to it', async () => {
    assert.equal(await page.locator('.sc-nav__item', { hasText: 'Where you log' }).count(), 1);
    await page.getByRole('button', { name: 'Search settings', exact: true }).click();
    const input = page.locator('.sc-palette input'); await input.fill('sessions'); await page.waitForTimeout(300);
    await page.getByRole('option', { name: /Where you log/ }).click();
    await page.waitForSelector('.sc-palette', { state: 'detached' }); await page.waitForTimeout(900);
    assert.equal(await page.locator('.sc-nav__item[aria-current]').innerText(), 'Where you log');
    assert.match(await page.locator('.sec-settings').innerText(), /Sample sessions and simulated security actions/);
    assert.equal(await page.locator('.workspace-profile').count(), 0);
    await capture(page, 'settings-where-you-log');
  });
  await check('Two-factor preview supports scan, OTP error, paste, code download and acknowledged completion', async () => {
    const root = page.locator('.sec-settings');
    await root.getByRole('button', { name: 'Enable', exact: true }).click();
    assert.equal(await root.locator('.sec-qr').count(), 1);
    await capture(page, '2fa-scan');
    await root.getByRole('button', { name: 'Continue', exact: true }).click();
    await root.locator('.sec-otp input').first().focus(); await page.keyboard.type('111111');
    await root.getByRole('alert').filter({ hasText: 'That code is not correct' }).waitFor();
    await root.locator('.sec-otp input').first().evaluate(el => {
      const data = new DataTransfer(); data.setData('text/plain', '246810'); el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
    });
    await root.getByRole('heading', { name: 'Save your backup codes' }).waitFor();
    assert.equal(await root.getByRole('button', { name: 'Finish setup' }).isDisabled(), true);
    const downloadEvent = page.waitForEvent('download'); await root.getByRole('button', { name: 'Download', exact: true }).click(); const download = await downloadEvent;
    const file = `${out}/backup-codes-preview.txt`; await download.saveAs(file); assert.match(await fs.readFile(file, 'utf8'), /NOT REAL RECOVERY CODES/);
    await root.getByRole('checkbox', { name: 'I saved my backup codes' }).check();
    await root.getByRole('button', { name: 'Finish setup' }).click();
    await root.getByRole('heading', { name: 'Two-factor authentication is on' }).waitFor();
    await capture(page, '2fa-enabled');
  });
  await check('Password preview validates, shows visibility/strength and never persists entered passwords', async () => {
    const root = page.locator('.sec-settings'); await root.getByRole('button', { name: 'Change password', exact: true }).click();
    await root.getByLabel('Current password', { exact: true }).fill('old-demo-value');
    await root.getByLabel('New password', { exact: true }).fill('short'); await root.getByRole('button', { name: 'Update password', exact: true }).click();
    await root.getByRole('alert').filter({ hasText: 'at least 12' }).waitFor();
    await root.getByLabel('New password', { exact: true }).fill('LongDemoPassword!42');
    await root.getByRole('button', { name: 'Show new password' }).click(); assert.equal(await root.getByLabel('New password', { exact: true }).getAttribute('type'), 'text');
    await capture(page, 'password');
    await root.getByRole('button', { name: 'Update password', exact: true }).click(); await root.getByRole('button', { name: 'Change password', exact: true }).waitFor();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage })); assert.ok(!stored.includes('old-demo-value') && !stored.includes('LongDemoPassword!42'));
  });
  await check('Revoke removes one sample session; hold-to-sign-out cancels early and completes after 1.2s', async () => {
    const root = page.locator('.sec-settings');
    await root.getByRole('button', { name: 'Revoke iPhone 15 Pro', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.sec-session').length === 4);
    const hold = root.getByRole('button', { name: 'Sign out of other sessions', exact: true }); await hold.scrollIntoViewIfNeeded();
    const box = await hold.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(250); await page.mouse.up();
    assert.equal(await root.locator('.sec-session').count(), 4);
    await hold.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(1350); await page.keyboard.up('Space');
    await page.waitForFunction(() => document.querySelectorAll('.sec-session').length === 1);
    assert.match(await root.locator('.sec-session').innerText(), /This device/);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.sc-overlay__panel'); await account(page);
    assert.equal(await page.locator('.sec-session').count(), 1);
    await page.locator('.sec-settings').getByRole('heading', { name: 'Two-factor authentication is on' }).waitFor();
  });
  await context.close();
  for (const width of [390, 320]) {
    const { page, context } = await open({ width, height: 844 }, { isMobile: true, hasTouch: true });
    await check(`Mobile ${width}: Settings and Where you log fit; security sections expand without horizontal overflow`, async () => {
      await settings(page); await account(page); await capture(page, `mobile-${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const rect = await page.locator('.sc-overlay__panel').boundingBox(); assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
      await page.locator('.sec-settings').getByRole('button', { name: 'Enable', exact: true }).click(); await page.locator('.sec-settings').getByRole('button', { name: 'Continue', exact: true }).click();
      assert.equal(await page.locator('.sec-settings').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await capture(page, `mobile-${width}-otp`);
      await page.getByRole('button', { name: 'Close settings', exact: true }).click(); await page.waitForSelector('.sc-overlay', { state: 'detached' });
    }); await context.close();
  }
  const reduced = await open({ width: 1440, height: 1000 }, { reducedMotion: 'reduce' });
  await check('Reduced motion disables section travel and the theme thumb transition', async () => {
    await settings(reduced.page); await account(reduced.page);
    assert.equal(await reduced.page.locator('.sec-settings').getAttribute('data-motion-off'), 'true');
    await reduced.page.locator('.sec-settings').getByRole('button', { name: 'Enable', exact: true }).click(); await reduced.page.waitForTimeout(100);
    assert.equal(await reduced.page.locator('.sec-settings').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  }); await reduced.context.close();
  assert.deepEqual(errors, []); assert.deepEqual([...external], []); results.push({ name: 'No page errors or external requests', ok: true });
} catch (error) { if (lastPage && !lastPage.isClosed()) await capture(lastPage, 'failure'); results.push({ name: 'Failure', ok: false, error: String(error.stack) }); throw error; }
finally { await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, errors, external: [...external] }, null, 2)); await browser.close(); }
