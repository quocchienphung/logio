import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const root='docs/research/affectui-run',dest='src/components/sites/affectui-run';
await fs.copyFile(`${root}/styles-settled.css`,`${dest}/run-reference.css`);
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage();
const icons={...JSON.parse(await fs.readFile(`${root}/icons.json`,'utf8')),...JSON.parse(await fs.readFile(`${root}/icons-settled.json`,'utf8'))};
const parts={};
for(const state of ['approval-email','email-approved','done','denied','stopped']){
  await page.setContent(await fs.readFile(`${root}/${state}.html`,'utf8'));
  parts[state]=await page.locator('.ui-ap').evaluateAll(els=>els.map(el=>el.outerHTML));
  Object.assign(icons,await page.locator('.ui-ar').evaluate(root=>Object.fromEntries([...root.querySelectorAll('button,dt,.ui-ar__quiet > span,.ui-ap__icon')].filter(el=>el.querySelector('svg')).map(el=>[el.getAttribute('aria-label')||el.textContent.trim()||el.className,el.querySelector('svg').outerHTML]))));
}
await fs.writeFile(`${dest}/icons.json`,JSON.stringify(icons,null,2));
await fs.writeFile(`${root}/approval-parts.json`,JSON.stringify(parts,null,2));
console.log(parts['approval-email']);console.log(parts['done']);
await browser.close();
