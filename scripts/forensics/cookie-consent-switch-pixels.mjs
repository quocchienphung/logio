import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
// Public rendered preview only: the colour the switch track and thumb actually show, read from screenshot pixels.
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await page.goto('https://uiarc.dev/components/cookie-consent', { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.locator('[class*="cookie-consent_stage"]').scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Customize', exact: true }).click(); await page.waitForTimeout(1200);
const out = {};
const sample = async (label) => {
  await page.mouse.move(2, 2); await page.waitForTimeout(600);
  for (const index of [0, 1]) {
    const box = await page.getByRole('switch').nth(index).locator('[class*="switch_track"]').boundingBox();
    const png = PNG.sync.read(await page.screenshot({ clip: box }));
    const px = (fx, fy) => { const x = Math.round(png.width * fx), y = Math.round(png.height * fy), i = (y * png.width + x) * 4; return `#${[0, 1, 2].map(k => png.data[i + k].toString(16).padStart(2, '0')).join('')}`; };
    out[`${label}-switch${index}`] = { trackLeftTop: px(.12, .5), trackRight: px(.9, .5), thumbCenter: px(.28, .5) , thumbCenterRight: px(.72, .5), state: await page.getByRole('switch').nth(index).getAttribute('aria-checked') };
  }
};
await sample('light-off');
await page.getByRole('switch').nth(0).click(); await sample('light-on');
await page.getByRole('button', { name: 'Switch to dark mode' }).click(); await page.waitForTimeout(800);
await sample('dark-on-first');
await page.getByRole('switch').nth(1).click(); await sample('dark-both');
await fs.writeFile('docs/research/cookie-consent/source/switch-pixels.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
