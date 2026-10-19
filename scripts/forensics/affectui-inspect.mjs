import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const out = 'docs/research/affectui-crm';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const assets = new Set();
page.on('response', r => { if (r.url().startsWith('https://www.affectui.com/')) assets.add(r.url()); });
await page.goto('https://www.affectui.com/screens/crm', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${out}/source-desktop.png`, fullPage: true });
await fs.writeFile(`${out}/source-dom.html`, await page.content());
await fs.writeFile(`${out}/source-text.txt`, await page.locator('body').innerText());
console.log(await page.locator('body').innerText());
console.log('FRAMES', page.frames().map(f => f.url()));
console.log('ASSETS', [...assets]);
await fs.writeFile(`${out}/assets.json`, JSON.stringify([...assets], null, 2));
await fs.writeFile(`${out}/library-routes.json`, JSON.stringify(await page.locator('a[href]').evaluateAll(els => els.map(e => ({ label: e.textContent, href: e.getAttribute('href') })).filter(e => /^\/(components|screens|blocks|illustrations|motion)\//.test(e.href))), null, 2));
await fs.writeFile(`${out}/observed-styles.css`, await page.locator('style').evaluateAll(els => els.map(e => e.textContent).filter(t => t.includes('.ui-as') || t.includes('.ui-dt')).join('\n')));
await fs.writeFile(`${out}/crm-dom.html`, await page.locator('.ui-as').evaluate(el => el.outerHTML));
await fs.writeFile(`${out}/controls.json`, JSON.stringify(await page.locator('.ui-as button').evaluateAll(els => els.map(e => ({class:e.className,text:e.textContent,label:e.getAttribute('aria-label'),title:e.getAttribute('title')}))), null, 2));
await fs.writeFile(`${out}/structure.json`, JSON.stringify(await page.locator('.ui-as [class]').evaluateAll(els => [...new Set(els.map(e=>e.className).filter(c=>typeof c==='string'))]), null, 2));
const fullscreen = page.getByText('Open full screen', { exact: true });
await page.goto(new URL(await fullscreen.getAttribute('href'), page.url()).href, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${out}/source-fullscreen.png` });
await fs.writeFile(`${out}/fullscreen-dom.html`, await page.content());
const save = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/source-${name}.png` });
  await fs.writeFile(`${out}/${name}.html`, await page.locator('.ui-as').evaluate(el => el.outerHTML));
  await fs.writeFile(`${out}/${name}.txt`, await page.locator('.ui-as').innerText());
};
await fs.writeFile(`${out}/icons.json`, JSON.stringify(await page.locator('.ui-as').evaluate(root => {
  const icons = {};
  root.querySelectorAll('button').forEach(el => { const svg = el.querySelector('svg'); if(svg) icons[el.getAttribute('aria-label') || el.textContent.trim()] = svg.outerHTML; });
  root.querySelectorAll('tbody tr').forEach(el => { const svg = el.querySelector('.ui-dt__logo svg'); if(svg) icons[el.querySelector('.ui-dt__name-text').textContent.trim()] = svg.outerHTML; });
  root.querySelectorAll('.ui-as-crm__tab').forEach(el => { const svg = el.querySelector('svg'); if(svg) icons[el.textContent.trim()] = svg.outerHTML; });
  return icons;
}), null, 2));
for (const tab of ['Team strategy', 'Pixel integration', 'Sales docs', 'Company CRM']) {
  await page.getByRole('button', { name: tab, exact: true }).click();
  await save(tab.toLowerCase().replaceAll(' ', '-'));
}
for (const name of ['Head of Sales', 'New view', 'All views', 'Search', 'Getting started', 'Acme', 'Alex Morgan']) {
  const button = page.locator('.ui-as').getByRole('button', { name: name === 'Acme' ? /Acme/ : name === 'Alex Morgan' ? /Alex Morgan/ : name === 'Getting started' ? /Getting started/ : name, exact: !['Acme', 'Alex Morgan', 'Getting started'].includes(name) });
  await button.click();
  await save(name.toLowerCase().replaceAll(' ', '-'));
  await page.keyboard.press('Escape');
  await page.locator('.ui-as-crm__top').click({position:{x:300,y:10}});
}
await page.locator('tbody tr').first().locator('td').nth(6).dblclick();
await save('stage-picker');
await page.keyboard.press('Escape');
await page.setViewportSize({width:390,height:844});
await save('mobile');
await page.getByRole('button', {name:'Open sidebar',exact:true}).click();
await save('mobile-sidebar');
await browser.close();
