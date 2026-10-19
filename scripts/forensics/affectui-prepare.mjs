import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const source = 'docs/research/affectui-crm';
const dest = 'src/components/sites/affectui-crm';
await fs.mkdir(dest, {recursive:true});
await fs.writeFile(`${dest}/reference.css`, `/* Observed public preview CSS, affectUI CRM, 2026-10-19. Re-capture with scripts/forensics/affectui-inspect.mjs. Local adjustments belong in crm-overrides.css. */\n@import "../affectui-fonts.css";\n${await fs.readFile(`${source}/observed-styles.css`,'utf8')}`);
await fs.copyFile(`${source}/icons.json`, `${dest}/icons.json`);
const browser = await chromium.launch({channel:'chrome'});
const page = await browser.newPage();
await page.setContent(await fs.readFile(`${source}/crm-dom.html`,'utf8'));
const icons = JSON.parse(await fs.readFile(`${source}/icons.json`, 'utf8'));
icons['Table title'] = await page.locator('.ui-dt__title-icon svg').evaluate(el=>el.outerHTML);
await fs.writeFile(`${dest}/icons.json`,JSON.stringify(icons,null,2));
const rows = await page.locator('tbody tr').evaluateAll(els=>els.map((tr,i)=>{
 const cells=[...tr.querySelectorAll('td')].slice(1);
 return {id:`company-${i+1}`,company:cells[0].textContent.trim(),category:cells[1].textContent.trim(),domain:cells[2].textContent.trim(),owner:cells[3].textContent.trim(),value:Number(cells[4].textContent.replaceAll(',','')),stage:cells[5].textContent.trim(),lastContact:cells[6].textContent.trim()};
}));
await fs.writeFile(`${dest}/seed.json`,JSON.stringify(rows,null,2));
console.log('rows',rows.length);
const manifestPath = 'docs/research/affectui-library/manifest.json';
try {
  const manifest = JSON.parse(await fs.readFile(manifestPath,'utf8'));
  await fs.writeFile(manifestPath,JSON.stringify(manifest.filter(item=>!item.route.endsWith('/full')),null,2));
} catch { /* Library capture can be run separately. */ }
await browser.close();
