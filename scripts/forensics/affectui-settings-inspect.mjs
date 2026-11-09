import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out='docs/research/affectui-settings';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
await page.goto('https://www.affectui.com/screens/settings-billing/full',{waitUntil:'networkidle'});
await page.evaluate(()=>document.fonts.ready);
async function save(name){
  await page.waitForTimeout(1400);
  await fs.writeFile(`${out}/${name}.html`,await page.locator('.ui-as').evaluate(el=>el.outerHTML));
  await fs.writeFile(`${out}/${name}.txt`,await page.locator('.ui-as-main').innerText());
  await page.screenshot({path:`${out}/source-${name}.png`});
}
await save('billing');
await fs.writeFile(`${out}/styles.css`,await page.locator('style').evaluateAll(els=>els.map(el=>el.textContent).filter(css=>css.includes('.ui-sb')||css.includes('.ui-seg')||css.startsWith('\n.ui-button')).join('\n')));
await fs.writeFile(`${out}/usage.json`,JSON.stringify(await page.locator('.ui-um').evaluate(el=>({html:el.outerHTML,bars:[...el.querySelectorAll('.ui-um__day')].map(day=>({label:day.getAttribute('aria-label'),height:day.firstElementChild.style.height,future:day.hasAttribute('data-future')}))})),null,2));
await fs.writeFile(`${out}/icons.json`,JSON.stringify(await page.locator('.ui-as-main').evaluate(root=>Object.fromEntries([...root.querySelectorAll('button')].filter(el=>el.querySelector('svg')).map(el=>[el.getAttribute('aria-label')||el.textContent.trim(),el.querySelector('svg').outerHTML]))),null,2));
for(const label of ['General','Members','API keys']){
  await page.getByRole('tab',{name:label,exact:true}).click();
  await save(label.toLowerCase().replaceAll(' ','-'));
  console.log(label,await page.locator('.ui-as-main').innerText());
  console.log('CONTROLS',await page.locator('.ui-as-main input,.ui-as-main select,.ui-as-main button').evaluateAll(els=>els.map(el=>({tag:el.tagName,text:el.textContent,label:el.getAttribute('aria-label'),placeholder:el.getAttribute('placeholder'),value:el.value,type:el.type}))));
}
await page.getByRole('tab',{name:'Billing',exact:true}).click();
for(const label of ['Change plan','Cancel plan','Update','Edit','Switch to Team']){
  await page.getByRole('button',{name:label,exact:true}).click();
  await save(label.toLowerCase().replaceAll(' ','-'));
  console.log(label,await page.locator('.ui-as').innerText());
  await page.keyboard.press('Escape');
}
await page.getByRole('radio',{name:/Yearly/}).click();
await save('yearly');
await page.setViewportSize({width:390,height:844});
await save('mobile');
await page.locator('.ui-as-main').evaluate(el=>el.scrollTop=el.scrollHeight);
await save('mobile-bottom');
await browser.close();
