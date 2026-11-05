import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='docs/research/affectui-run';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('https://www.affectui.com/screens/agent-run/full',{waitUntil:'domcontentloaded'});
await page.locator('.ui-ar').waitFor();await page.evaluate(()=>document.fonts.ready);
const save=async name=>{
  await fs.writeFile(`${out}/${name}.html`,await page.locator('.ui-as').evaluate(el=>el.outerHTML));
  await fs.writeFile(`${out}/${name}.txt`,await page.locator('.ui-ar').innerText());
  await page.screenshot({path:`${out}/source-${name}.png`});
};
await save('initial');
await fs.writeFile(`${out}/styles.css`,await page.locator('style').evaluateAll(els=>els.map(el=>el.textContent).filter(css=>['.ui-ar','.ui-pl','.ui-df','.ui-tc','.ui-ap','.ui-tl'].some(prefix=>css.includes(prefix))||css.startsWith('\n.ui-button')).join('\n')));
await fs.writeFile(`${out}/icons.json`,JSON.stringify(await page.locator('.ui-ar').evaluate(root=>Object.fromEntries([...root.querySelectorAll('button')].filter(el=>el.querySelector('svg')).map(el=>[el.getAttribute('aria-label')||el.textContent.trim(),el.querySelector('svg').outerHTML]))),null,2));
for(let index=0;index<14;index++){
  await page.waitForTimeout(1800);await save(`time-${index}`);
  console.log(index,await page.locator('.ui-ar').innerText());
  if(await page.getByRole('button',{name:'Approve',exact:true}).count())break;
}
await page.getByRole('button',{name:'Run options',exact:true}).click();await save('options');console.log('OPTIONS',await page.locator('[role="menu"]').allTextContents());await page.keyboard.press('Escape');
console.log('CONTROLS',await page.locator('.ui-ar button').evaluateAll(els=>els.map(el=>({text:el.textContent,label:el.getAttribute('aria-label'),role:el.getAttribute('role')}))));
await browser.close();
