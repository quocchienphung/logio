import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'docs/research/account-settings';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
for (const [slug, key] of [['user-menu', 'user-menu'], ['blocks/security-settings', 'security-settings']]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`https://uiarc.dev/components/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await fs.writeFile(`${out}/${key}-page.txt`, await page.locator('body').innerText());
  const root = page.locator(`[class*="${key}_root"], [class*="${key}_card"], [class*="${key}_page"], [class*="${key}_block"]`).first();
  console.log(key, 'roots', await root.count());
  if (await root.count()) {
    await root.scrollIntoViewIfNeeded();
    await root.screenshot({ path: `${out}/${key}-initial.png` });
    await fs.writeFile(`${out}/${key}-dom.html`, await root.evaluate(el => el.outerHTML));
    console.log(key, await root.innerText());
    console.log('controls', await root.locator('button,input').evaluateAll(es => es.map(e => ({ tag: e.tagName, text: e.innerText, label: e.getAttribute('aria-label'), type: e.getAttribute('type') }))));
  } else {
    console.log((await page.locator('main').innerText()).slice(0, 4500));
    console.log(await page.locator('button').evaluateAll(es => es.map(e => ({ text: e.innerText, aria: e.getAttribute('aria-label'), cls: e.className })).filter(e => /menu|security/i.test(e.cls + e.aria))));
    await page.screenshot({ path: `${out}/${key}-page.png` });
  }
  await page.close();
}
await browser.close();
