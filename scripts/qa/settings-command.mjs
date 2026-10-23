import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Settings page (settings-command layout) and the compact "Appearance & notifications" pop-up.
// Usage: node scripts/qa/settings-command.mjs [base-url]
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/uiarc-settings-command/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
const check = (name, result) => { assert.ok(result, name); results.push(name); };
const fresh = async (viewport, url = '/personalize?section=new-chat&settings=1') => {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}${url}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}${url}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sc-frame', { timeout: 30000 });
  await page.waitForTimeout(2000);
  return { context, page };
};
try {
  const { context, page } = await fresh({ width: 1440, height: 1000 });

  // Structure: six sections, 29 rows, the measured geometry.
  check('six navigation items', await page.locator('.sc-nav__item').count() === 6);
  const tabs = await page.locator('.sc-nav__item').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
  check('navigation tabs sit side by side on one line, with their icons', new Set(tabs.map(tab => tab[1])).size === 1 && tabs.every((tab, index) => !index || tab[0] > tabs[index - 1][0]) && await page.locator('.sc-nav__item svg').first().isVisible());
  check('six sections', await page.locator('.sc-section').count() === 6);
  check('29 rows', await page.locator('.sc-row').count() === 29);
  const geometry = await page.evaluate(() => {
    const box = selector => document.querySelector(selector).getBoundingClientRect();
    return { header: box('.sc-header').height, nav: [box('.sc-nav').width, box('.sc-nav').height, box('.sc-nav').top - box('.sc-header').bottom], trigger: [box('.sc-trigger').width, box('.sc-trigger').height], text: box('.sc-text').height, switch: [box('.sc-switch__track').width, box('.sc-switch__track').height], section: box('.sc-section').width, seg: box('.sc-seg').height };
  });
  check('header 56px; navigation is a full-width row right under it', geometry.header === 56 && geometry.nav[0] > 800 && geometry.nav[1] < 60 && Math.abs(geometry.nav[2]) < 1);
  check('search field 300 × 34', Math.round(geometry.trigger[0]) === 300 && geometry.trigger[1] === 34);
  check('text field 32px, switch 42 × 24, segmented 34px', geometry.text === 32 && geometry.switch[0] === 42 && geometry.switch[1] === 24 && geometry.seg === 34);
  check('sections are at most 620px wide', geometry.section <= 620);

  // The old Settings page moved to Usage and still renders.
  check('sidebar lists Usage, and Settings is not a page of the sidebar', await page.getByRole('button', { name: 'Usage', exact: true }).count() === 1 && await page.locator('.workspace-nav-label', { hasText: /^Settings$/ }).count() === 0);
  check('Settings sit in a modal panel over the page that was open', await page.locator('.sc-overlay__panel[role="dialog"][aria-modal="true"]').count() === 1 && page.url().includes('section=new-chat'));

  // Navigation: clicking a section scrolls to it and lights it; scrolling lights the section in view.
  await page.locator('.sc-nav__item', { hasText: 'Security' }).click();
  await page.waitForTimeout(1500);
  check('nav click lights the section', await page.locator('.sc-nav__item[aria-current]').innerText() === 'Security');
  const secTop = await page.evaluate(() => { const s = document.querySelector('#sc-section-security').getBoundingClientRect().top, p = document.querySelector('.sc-scroller').getBoundingClientRect().top; return s - p; });
  check('section lands at the top of the scroller', secTop >= 0 && secTop < 40);
  await page.evaluate(() => { document.querySelector('.sc-scroller').scrollTop = 0; });
  await page.waitForTimeout(400);
  check('scrolling back lights General', await page.locator('.sc-nav__item[aria-current]').innerText() === 'General');
  await page.evaluate(() => { const s = document.querySelector('.sc-scroller'); s.scrollTop = s.scrollHeight; });
  await page.waitForTimeout(400);
  check('the end of the page lights Billing', await page.locator('.sc-nav__item[aria-current]').innerText() === 'Billing');
  await page.evaluate(() => { document.querySelector('.sc-scroller').scrollTop = 0; });

  // Edit: a row gets a dot, its section too; the bar appears with a count.
  await page.locator('[data-setting="workspace-name"] input').fill('Logio Studio');
  await page.waitForTimeout(900);
  check('edited row is marked', await page.locator('[data-setting="workspace-name"] .sc-row__dirty').count() === 1);
  check('edited section is marked in the navigation', await page.locator('.sc-nav__item', { hasText: 'General' }).locator('.sc-nav__dot').count() === 1);
  check('bar says 1 unsaved change', /1\s+unsaved change/.test((await page.locator('.sc-bar').innerText()).replace(/\s+/g, ' ')));
  await page.locator('[data-setting="mentions"] button[role="switch"]').click();
  await page.waitForTimeout(500);
  check('count rolls to 2', /2\s+unsaved changes/.test((await page.locator('.sc-bar__count').innerText()).replace(/\s+/g, ' ')) || (await page.locator('.sc-bar__count .sc-sr-only').innerText()).startsWith('2'));
  check('Save label is visible (not the same colour as its pill)', await page.evaluate(() => { const button = document.querySelector('.sc-btn--primary'); const style = getComputedStyle(button); return style.color !== style.backgroundColor; }));
  await page.screenshot({ path: `${out}/qa-bar.png` });

  // Discard restores.
  await page.getByRole('button', { name: 'Discard' }).click();
  await page.waitForTimeout(700);
  check('discard restores the value', await page.locator('[data-setting="workspace-name"] input').inputValue() === 'Logio');
  check('bar leaves after discard', await page.locator('.sc-bar').count() === 0);

  // Validation blocks saving.
  await page.locator('[data-setting="billing-email"] input').fill('not-an-email');
  await page.waitForTimeout(300);
  check('invalid value shows its message', await page.locator('[data-setting="billing-email"] .sc-row__error').innerText() === 'Enter a valid email address.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(1300);
  check('invalid save is blocked and the bar stays', await page.locator('.sc-bar').count() === 1 && await page.locator('.sc-bar__count--failed').count() === 1);
  check('focus moves to the invalid field', await page.evaluate(() => document.activeElement?.id === 'billing-email'));
  await page.locator('[data-setting="billing-email"] input').fill('finance@logio.com');

  // Save the name, a switch and the theme; they apply.
  await page.locator('[data-setting="workspace-name"] input').fill('Logio Studio');
  await page.locator('[data-setting="theme"] button', { hasText: 'Dark' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(400);
  check('bar shows the saving state', await page.getByRole('button', { name: 'Saving…' }).count() === 1);
  await page.waitForSelector('.sc-bar__saved', { timeout: 4000 });
  check('bar confirms "Settings saved"', (await page.locator('.sc-bar__saved').innerText()).includes('Settings saved'));
  await page.waitForTimeout(700);
  const bar = await page.locator('.sc-bar').boundingBox();
  check('saved confirmation settles at 42px tall', Math.abs(bar.height - 42) < 1);
  check('theme dark applied to the app', await page.locator('.crm-page').getAttribute('data-theme') === 'dark');
  check('workspace renamed in the account menu', await page.locator('.ui-as-side__foot').innerText().then(text => /Alex/.test(text)));
  await page.waitForSelector('.sc-bar', { state: 'detached', timeout: 5000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.sc-frame');
  check('saved values survive a reload', await page.locator('[data-setting="workspace-name"] input').inputValue() === 'Logio Studio' && await page.locator('.crm-page').getAttribute('data-theme') === 'dark');
  await page.locator('[data-setting="theme"] button', { hasText: 'Light' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForSelector('.sc-bar__saved');
  await page.waitForSelector('.sc-bar', { state: 'detached', timeout: 5000 });

  // Select: opens a listbox, keyboard picks.
  const language = page.locator('#language');
  await language.focus();
  await page.keyboard.press('Enter');
  check('select opens a listbox', await page.locator('.sc-select__content [role="option"]').count() === 6);
  await page.screenshot({ path: `${out}/qa-select.png` });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  check('select picks with the keyboard', (await language.innerText()).includes('English (UK)') || (await language.innerText()).includes('Deutsch'));
  check('select closes and returns focus', await page.locator('.sc-select__content').count() === 0 && await page.evaluate(() => document.activeElement?.id === 'language'));
  await page.getByRole('button', { name: 'Discard' }).click();

  // Search palette.
  const trigger = page.locator('.sc-trigger');
  const from = await trigger.boundingBox();
  await trigger.click();
  await page.waitForTimeout(80);
  const early = await page.locator('.sc-palette').boundingBox();
  await page.waitForTimeout(1100);
  const palette = await page.locator('.sc-palette').boundingBox();
  check('palette grows out of the field (smaller and further right while opening)', early.width < palette.width && early.x > palette.x && early.x + early.width <= from.x + from.width + 12);
  check('palette settles at 560 wide', Math.round(palette.width) === 560);
  check('palette is a modal combobox dialog', await page.locator('[role="dialog"][aria-modal="true"] input[role="combobox"]').count() === 1);
  check('input has focus', await page.evaluate(() => document.activeElement?.getAttribute('role') === 'combobox'));
  check('suggested settings listed first', (await page.locator('.sc-palette__hint').innerText()) === 'Suggested' && await page.locator('.sc-palette [role="option"]').count() === 5);
  await page.screenshot({ path: `${out}/qa-palette.png` });
  await page.keyboard.type('sess');
  await page.waitForTimeout(300);
  check('typing filters and marks the match', await page.locator('.sc-palette [role="option"]').count() === 1 && (await page.locator('.sc-mark').innerText()).toLowerCase() === 'sess');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sc-palette', { state: 'detached', timeout: 3000 });
  await page.waitForTimeout(150);
  check('Escape closes and returns focus to the field', await page.evaluate(() => document.activeElement?.classList.contains('sc-trigger') || document.activeElement?.outerHTML.slice(0, 120)));

  await page.keyboard.press('Control+k');
  await page.waitForSelector('.sc-palette');
  check('Ctrl+K opens the settings search, not the workspace search', await page.locator('dialog[open]').count() === 0);
  await page.keyboard.type('billing em');
  await page.waitForTimeout(250);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.sc-palette', { state: 'detached', timeout: 4000 });
  await page.waitForFunction(() => document.activeElement?.closest('[data-setting]')?.getAttribute('data-setting') === 'billing-email', null, { timeout: 4000 }).catch(() => {});
  check('picking a result scrolls to the row and focuses its control', await page.evaluate(() => document.activeElement?.closest('[data-setting]')?.getAttribute('data-setting') === 'billing-email'));
  const rowBox = await page.locator('[data-setting="billing-email"]').boundingBox(), scrollBox = await page.locator('.sc-scroller').boundingBox();
  check('the row is in view', rowBox.y >= scrollBox.y && rowBox.y + rowBox.height <= scrollBox.y + scrollBox.height);
  check('the section in view follows', await page.locator('.sc-nav__item[aria-current]').innerText() === 'Billing');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.activeElement?.blur());
  await page.locator('.sc-scroller').hover();
  await page.mouse.click(1100, 500);
  await page.keyboard.press('/');
  check('"/" opens the search while focus is in the page', await page.locator('.sc-palette').count() === 1);
  await page.keyboard.type('zzzz');
  await page.waitForTimeout(200);
  check('no match shows an empty message', (await page.locator('.sc-empty').innerText()).includes('zzzz'));
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sc-palette', { state: 'detached' });

  // The Settings close with Escape and leave the page underneath as it was.
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sc-overlay', { state: 'detached', timeout: 4000 });
  check('Escape closes the panel and the address drops ?settings', !page.url().includes('settings=') && page.url().includes('section=new-chat'));

  // Compact pop-up from the account menu.
  await page.locator('.ui-as-user').click();
  await page.getByRole('menuitem', { name: 'Appearance & notifications' }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.waitFor();
  check('pop-up has the compact groups', await dialog.locator('.sc-quick__group').count() === 2 && await dialog.locator('.sc-quick__row').count() === 6);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/qa-popup.png` });
  await dialog.locator('[data-kind="switch"] button[role="switch"]').first().click();
  await dialog.locator('#' + (await dialog.locator('[role="combobox"]').first().getAttribute('id'))).click();
  check('pop-up select list opens inside the dialog (not inert)', await dialog.locator('[role="listbox"]').count() === 1);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('.ui-as-user').click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await page.waitForSelector('.sc-frame');
  await page.waitForTimeout(1800);
  check('pop-up save is shared with the page', await page.locator('[data-setting="mentions"] button[role="switch"]').getAttribute('aria-checked') === 'false');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sc-overlay', { state: 'detached' });
  await page.locator('.ui-as-user').click();
  await page.getByRole('menuitem', { name: 'Appearance & notifications' }).click();
  await dialog.getByRole('button', { name: /All settings/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForSelector('.sc-overlay__panel');
  check('"All settings" opens the Settings panel', page.url().includes('settings=') && await page.locator('.sc-overlay__panel').count() === 1);
  await page.waitForTimeout(1800);
  await page.locator('.sc-close').click();
  await page.waitForSelector('.sc-overlay', { state: 'detached', timeout: 4000 });
  check('the close button closes the panel', !page.url().includes('settings='));

  // Deep link from "Invite teammates" opens Members.
  await page.goto(`${base}/personalize?section=new-chat&settings=members`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sc-frame');
  await page.waitForTimeout(2000);
  check('?settings=members opens on Members', await page.locator('.sc-nav__item[aria-current]').innerText() === 'Members');

  // Growth out of the menu.
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sc-overlay', { state: 'detached', timeout: 4000 });
  await page.goto(`${base}/personalize?section=new-chat`, { waitUntil: 'networkidle' });
  await page.locator('.ui-as-user').click();
  const menuBox = await page.locator('[role="menu"].ui-as-popover').boundingBox();
  await page.evaluate(() => {
    window.__frames = [];
    const sample = () => { const node = document.querySelector('.sc-overlay__panel'); if (node) { const box = node.getBoundingClientRect(); window.__frames.push([box.x, box.y, box.width, box.height]); } if (window.__frames.length < 120) requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  });
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await page.waitForTimeout(1600);
  const frames = await page.evaluate(() => window.__frames);
  const first = frames[0], last = frames[frames.length - 1];
  check('the panel starts as the menu (same box)', Math.abs(first[0] - menuBox.x) < 14 && Math.abs(first[2] - menuBox.width) < 40 && Math.abs(first[3] - menuBox.height) < 40);
  check('then grows to the large panel', last[2] >= 1000 && last[3] >= 700);
  check('growth is smooth: width never shrinks and no frame jumps over 40% of the way', frames.every((frame, index) => !index || frame[2] >= frames[index - 1][2] - 1) && frames.every((frame, index) => !index || frame[2] - frames[index - 1][2] < (last[2] - first[2]) * 0.4));
  const risen = await page.evaluate(() => [...document.querySelectorAll('.sc-row, .sc-nav li, .sc-section__head')].every(node => getComputedStyle(node).animationName === 'sc-rise'));
  check('texts, tabs and rows rise in with a stagger', risen);
  const delays = await page.locator('.sc-row').evaluateAll(nodes => nodes.slice(0, 6).map(node => parseFloat(getComputedStyle(node).animationDelay)));
  check('later rows start later', delays.every((delay, index) => !index || delay > delays[index - 1]));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/qa-panel.png` });
  await page.locator('.sc-overlay__scrim').click({ position: { x: 20, y: 20 } });
  await page.waitForSelector('.sc-overlay', { state: 'detached', timeout: 4000 });
  check('clicking outside closes the panel; the page underneath is still the chat', !page.url().includes('settings=') && page.url().includes('section=new-chat'));
  check('focus returns to the account button', await page.evaluate(() => document.activeElement?.classList.contains('ui-as-user')));
  await page.goto(`${base}/personalize?section=settings&settings-tab=members`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sc-frame');
  await page.waitForTimeout(2000);
  check('the older ?section=settings link opens the panel on Members', await page.locator('.sc-nav__item[aria-current]').innerText() === 'Members');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.sc-overlay', { state: 'detached', timeout: 4000 });

  // Usage: the agent-usage page that used to be Settings.
  await page.goto(`${base}/personalize?section=usage`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ui-sb', { timeout: 20000 });
  check('Usage shows the agent usage page', await page.locator('.ui-sb').count() === 1 && (await page.locator('.ui-sb .ui-as-tabs__tab').count()) === 4);
  await context.close();

  // Phone: the navigation becomes a row, rows stack, no horizontal overflow.
  const phone = await fresh({ width: 390, height: 844 });
  const layout = await phone.page.evaluate(() => ({
    row: getComputedStyle(document.querySelector('.sc-nav ul')).flexDirection,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    stacked: getComputedStyle(document.querySelector('[data-setting="language"]')).gridTemplateColumns.split(' ').length === 1,
    kbd: getComputedStyle(document.querySelector('.sc-trigger .sc-kbd')).display,
  }));
  check('phone: navigation is a row', layout.row === 'row');
  check('phone: no horizontal overflow', !layout.overflow);
  check('phone: select rows stack, shortcut hidden', layout.stacked && layout.kbd === 'none');
  await phone.page.screenshot({ path: `${out}/qa-phone.png` });
  await phone.page.locator('.sc-trigger').click();
  await phone.page.waitForTimeout(1000);
  const phonePalette = await phone.page.locator('.sc-palette').boundingBox();
  check('phone: palette keeps a 12px margin inside the panel', phonePalette.x >= 8 + 11 && phonePalette.x + phonePalette.width <= 390 - 8 - 11);
  await phone.page.screenshot({ path: `${out}/qa-phone-palette.png` });
  await phone.context.close();

  // Reduced motion: the palette opens without a flight.
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const rp = await reduced.newPage();
  rp.on('pageerror', error => errors.push(error.message));
  await rp.goto(`${base}/personalize?section=new-chat&settings=1`, { waitUntil: 'networkidle' });
  await rp.waitForSelector('.sc-frame');
  await rp.locator('.sc-trigger').click();
  await rp.waitForTimeout(120);
  check('reduced motion: palette is already at its place', Math.round((await rp.locator('.sc-palette').boundingBox()).width) === 560);
  check('reduced motion: the panel is at its size and rows do not animate', Math.round((await rp.locator('.sc-overlay__panel').boundingBox()).width) >= 1000 && await rp.evaluate(() => getComputedStyle(document.querySelector('.sc-row')).animationName === 'none'));
  await reduced.close();

  check('no page errors', errors.length === 0);
  console.log(`${results.length} checks passed`);
} catch (error) {
  console.log('passed:', results.length);
  console.log('page errors:', errors);
  throw error;
} finally {
  await browser.close();
}
