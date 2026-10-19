import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/affectui-settings/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const passed = [], errors = [], comparisons = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror', error => errors.push(error.message));
const dialog = () => page.locator('dialog[open]');
const check = async (name, work) => { await work(); passed.push(name); console.log(`PASS ${name}`); };
const tab = async name => { await page.getByRole('tab', { name, exact: true }).click(); await page.waitForTimeout(400); };
const load = async () => { await page.goto(`${base}/personalize?section=settings`, { waitUntil: 'networkidle' }); await page.locator('.ui-sb').waitFor(); await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); };
try {
  if (!process.argv.includes('--compare-only')) {
    await load(); await tab('General');
    await check('General edits, keyboard region selection and discard', async () => {
      const name = page.getByRole('textbox', { name: /Workspace name/ });
      await name.fill('Discard me');
      await page.getByRole('button', { name: 'Europe (Frankfurt)', exact: true }).focus();
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); await page.keyboard.press('Enter');
      assert.equal(await page.getByRole('button', { name: 'Asia Pacific (Singapore)', exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Discard', exact: true }).click();
      assert.equal(await name.inputValue(), 'Acme');
      assert.equal(await page.getByRole('button', { name: 'Save changes', exact: true }).isDisabled(), true);
    });
    await check('General name, logo upload and region persist and sidebar updates', async () => {
      await page.getByRole('textbox', { name: /Workspace name/ }).fill('Acme Studio');
      const image = new PNG({ width: 128, height: 128 }); image.data.fill(120);
      await page.getByLabel('Upload workspace logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG.sync.write(image) });
      await page.locator('.ui-sb-logo img').waitFor();
      await page.getByRole('button', { name: 'Europe (Frankfurt)', exact: true }).click();
      await page.getByRole('menuitemradio', { name: 'United States (Virginia)', exact: true }).click();
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.getByRole('textbox', { name: /Workspace name/ }).inputValue(), 'Acme Studio');
      assert.equal(await page.locator('.ui-sb-logo img').count(), 1);
      assert.equal(await page.getByRole('button', { name: 'United States (Virginia)', exact: true }).count(), 1);
      assert.match(await page.locator('.ui-as-side__workspace').innerText(), /Acme Studio/);
    });
    await tab('Members');
    await check('Member roles support keyboard and outside dismissal', async () => {
      const role = page.getByRole('button', { name: 'Role for Priya Shah', exact: true });
      await role.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); await page.keyboard.press('Enter');
      assert.match(await role.innerText(), /Viewer/);
      await role.click(); await page.keyboard.press('Escape');
      assert.equal(await role.getAttribute('aria-expanded'), 'false');
      assert.equal(await role.evaluate(element => element === document.activeElement), true);
      await role.click(); await page.getByRole('heading', { name: 'Members', exact: true }).click();
      assert.equal(await role.getAttribute('aria-expanded'), 'false');
    });
    await check('Local invitation validates duplicates and persists pending member', async () => {
      await page.getByRole('button', { name: 'Invite', exact: true }).click();
      await dialog().getByLabel('Email address').fill('priya@acme.com');
      await dialog().getByRole('button', { name: 'Save invitation', exact: true }).click();
      assert.match(await dialog().getByRole('alert').innerText(), /already/);
      await dialog().getByLabel('Email address').fill('new.person@acme.com');
      await dialog().getByRole('button', { name: 'Save invitation', exact: true }).click();
      await page.waitForTimeout(300);
      assert.match(await page.locator('.ui-sb-section__head').innerText(), /6 of 10/);
      assert.match(await page.locator('.ui-sb-row').filter({ hasText: 'new.person@acme.com' }).innerText(), /Pending/);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('.ui-sb-row').filter({ hasText: 'new.person@acme.com' }).count(), 1);
    });
    await check('Member removal requires confirmation and frees seat', async () => {
      await page.getByRole('button', { name: 'More for new person', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Cancel invitation', exact: true }).click();
      await dialog().getByRole('button', { name: 'Cancel invitation', exact: true }).click();
      await page.waitForTimeout(350);
      assert.equal(await page.locator('.ui-sb-row').count(), 5);
      assert.match(await page.locator('.ui-sb-section__head').innerText(), /5 of 10/);
    });
    await tab('API keys');
    await check('Seed copy gives clearly synthetic demo key and create uses crypto value', async () => {
      await page.getByRole('button', { name: 'Copy Production key', exact: true }).click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'sk-demo-local-production-8F2q');
      await page.getByRole('button', { name: 'Create key', exact: true }).click();
      const value = await dialog().getByRole('textbox').inputValue();
      assert.match(value, /^sk-demo-local-[0-9a-f]{40}$/);
      await dialog().getByRole('button', { name: 'Copy demo key', exact: true }).click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), value);
      await dialog().getByRole('button', { name: 'Done', exact: true }).click();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.ui-sb-row').count(), 4);
    });
    await check('Key rename and revocation persist', async () => {
      await page.getByRole('button', { name: 'New key 4', exact: true }).click();
      await dialog().getByLabel('Key name').fill('QA demo');
      await dialog().getByRole('button', { name: 'Save name', exact: true }).click();
      await page.getByRole('button', { name: 'Revoke QA demo key', exact: true }).click();
      await dialog().getByRole('button', { name: 'Keep key', exact: true }).click();
      await page.getByRole('button', { name: 'Revoke QA demo key', exact: true }).click();
      await dialog().getByRole('button', { name: 'Revoke key', exact: true }).click();
      await page.waitForTimeout(300); await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('.ui-sb-row').count(), 3);
      assert.equal(await page.getByRole('button', { name: 'Revoke QA demo key', exact: true }).count(), 0);
    });
    await check('New workspace state has no borrowed API keys', async () => {
      await page.evaluate(() => { localStorage.setItem('affectui:active-workspace', JSON.stringify('personal')); });
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('.ui-sb-row').count(), 0);
      assert.match(await page.locator('.workspace-empty').innerText(), /No API keys yet/);
    });
  }
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    for (const name of ['General', 'Members', 'API keys']) {
      const slug = name.toLowerCase().replaceAll(' ', '-');
      const shots = [];
      for (const [label, url] of [['source', 'https://www.affectui.com/screens/settings-billing/full'], ['local', `${base}/personalize?section=settings`]]) {
        const sample = await browser.newPage({ viewport });
        await sample.goto(url, { waitUntil: 'networkidle' });
        await sample.getByRole('tab', { name, exact: true }).click();
        await sample.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
        await sample.evaluate(() => document.fonts.ready); await sample.waitForTimeout(800);
        await sample.mouse.move(viewport.width - 2, viewport.height - 2);
        await sample.screenshot({ path: `${out}/${label}-${slug}-${viewport.width}.png` });
        const box = await sample.locator('.ui-as-main').boundingBox();
        const clip = { x: Math.ceil(box.x), y: Math.ceil(box.y), width: Math.floor(box.width), height: Math.min(Math.floor(box.height), viewport.height - Math.ceil(box.y)) };
        const png = PNG.sync.read(await sample.screenshot({ clip }));
        await fs.writeFile(`${out}/${label}-content-${slug}-${viewport.width}.png`, PNG.sync.write(png));
        shots.push({ png, overflow: await sample.evaluate(() => document.documentElement.scrollWidth > innerWidth), body: await sample.locator('.ui-sb__body').boundingBox() });
        await sample.close();
      }
      const [a, b] = shots.map(shot => shot.png); const diff = new PNG({ width: a.width, height: a.height });
      const difference = a.width === b.width && a.height === b.height ? pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: .15 }) / a.width / a.height * 100 : null;
      await fs.writeFile(`${out}/diff-${slug}-${viewport.width}.png`, PNG.sync.write(diff));
      comparisons.push({ viewport, tab: name, contentDiffPercent: difference === null ? null : Number(difference.toFixed(3)), sourceBody: shots[0].body, localBody: shots[1].body, overflow: shots[1].overflow });
      console.log(`COMPARE ${name} ${viewport.width}: ${difference?.toFixed(3)}%`);
      assert.equal(shots[1].overflow, false);
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/tabs-results.json`, JSON.stringify({ passed, errors, comparisons }, null, 2));
  await browser.close();
}
