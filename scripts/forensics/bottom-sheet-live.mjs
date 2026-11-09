import { chromium } from 'playwright';
// Public rendered preview only: the text of the polite live region after a detent change.
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('https://uiarc.dev/components/bottom-sheet', { waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'View trip details' }).evaluate(n => { n.scrollIntoView({ block: 'center', behavior: 'instant' }); n.click(); }); await page.waitForTimeout(1200);
const live = () => page.evaluate(() => [...document.querySelectorAll('[aria-live]')].map(n => `${n.tagName}.${String(n.className).slice(0, 30)} live=${n.getAttribute('aria-live')} role=${n.getAttribute('role')} text="${n.textContent}"`));
console.log('open', await live());
const g = page.getByRole('dialog').getByRole('button', { name: /expand sheet|collapse sheet/i }).first();
await g.focus(); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(900); console.log('after up', await live());
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(900); console.log('after down', await live());
console.log('body overflow while open:', await page.evaluate(() => [getComputedStyle(document.body).overflow, getComputedStyle(document.documentElement).overflow, document.body.getAttribute('style'), document.body.getAttribute('data-scroll-locked')]));
console.log('siblings aria-hidden/inert:', await page.evaluate(() => [...document.body.children].map(c => `${c.tagName}${c.id ? '#' + c.id : ''} aria-hidden=${c.getAttribute('aria-hidden')} inert=${c.hasAttribute('inert')}`)));
// tab into content below fold
await page.keyboard.press('Home'); await page.waitForTimeout(900); await page.keyboard.press('End'); await page.waitForTimeout(900);
const tops = []; for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(250); tops.push(await page.evaluate(() => [document.activeElement?.textContent?.slice(0, 18), Math.round(document.querySelector('[role=dialog]').getBoundingClientRect().top)].join('@'))); }
console.log('tab sequence (focus@sheetTop):', tops.join(' | '));
// space on sheet body
await page.getByRole('dialog').focus(); await page.keyboard.press('End').catch(() => {});
await browser.close();
