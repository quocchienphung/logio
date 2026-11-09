import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'docs/research/account-settings';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(8000);
async function save(root, name) {
  await page.waitForTimeout(500); await root.scrollIntoViewIfNeeded();
  await root.screenshot({ path: `${out}/${name}.png` });
  await fs.writeFile(`${out}/${name}.txt`, await root.innerText());
  await fs.writeFile(`${out}/${name}-styles.json`, JSON.stringify(await root.evaluate(el => [el, ...el.querySelectorAll('*')].filter(e => e.className && typeof e.className === 'string').map(e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { tag: e.tagName, cls: e.className, text: e.children.length ? null : e.textContent, rect: [r.x, r.y, r.width, r.height], font: s.font, color: s.color, bg: s.backgroundColor, radius: s.borderRadius, border: s.border, padding: s.padding, gap: s.gap, transition: s.transition };
  })), null, 2));
}
await page.goto('https://uiarc.dev/components/user-menu'); await page.waitForTimeout(1500);
const menu = page.locator('[class*="user-menu_panel"]').first();
console.log('menu', await menu.count());
if (await menu.count()) { await save(menu, 'user-menu-open'); await menu.getByRole('menuitemradio', { name: 'Dark', exact: true }).click(); await save(menu, 'user-menu-dark-choice'); }
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
console.log('menu phone', await page.locator('[class*="user-menu_"]').evaluateAll(es => es.slice(0,15).map(e => ({ tag: e.tagName, cls: e.className }))));
await page.screenshot({ path: `${out}/user-menu-mobile.png` });
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto('https://uiarc.dev/components/blocks/security-settings'); await page.waitForTimeout(1500);
const root = page.locator('[class*="security-settings_block"]').first();
await save(root, 'security-initial');
await root.getByRole('button', { name: 'Enable', exact: true }).click(); await save(root, 'security-scan');
console.log('scan:', await root.innerText());
console.log('buttons', await root.getByRole('button').allTextContents());
await root.getByRole('button', { name: /Continue|Next/i }).first().click(); await save(root, 'security-verify');
console.log('verify:', await root.innerText());
console.log('inputs', await root.locator('input').evaluateAll(es => es.map(e => ({ label: e.getAttribute('aria-label'), placeholder: e.placeholder, type: e.type, max: e.maxLength }))));
await root.locator('input').first().focus(); await page.keyboard.type('246810');
console.log('otp values', await root.locator('input').evaluateAll(es => es.map(e => e.value)));
const verify = root.getByRole('button', { name: 'Verify', exact: true });
if (await verify.count() && await verify.isEnabled()) await verify.click();
await page.waitForTimeout(1000); await save(root, 'security-codes');
console.log('codes:', await root.innerText());
await root.getByRole('button', { name: 'Download', exact: true }).click();
const checkbox = root.getByRole('checkbox'); if (await checkbox.count()) await checkbox.check();
console.log('codebuttons', await root.getByRole('button').allTextContents());
const finish = root.getByRole('button', { name: /Finish|Done|Enable/i }).last(); if (await finish.count()) { await finish.click(); await save(root, 'security-enabled'); }
await root.getByRole('button', { name: 'Change password', exact: true }).click(); await save(root, 'security-password');
console.log('password:', await root.innerText());
console.log('password inputs:', await root.locator('input').evaluateAll(es => es.map(e => ({ label: e.getAttribute('aria-label'), name: e.name, id: e.id, type: e.type, placeholder: e.placeholder }))));
await root.locator('button').filter({ hasText: /^Revoke$/ }).first().click(); await save(root, 'security-revoke');
console.log('revoke:', await root.innerText());
await browser.close();
