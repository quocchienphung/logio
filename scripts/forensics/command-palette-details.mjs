import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='docs/research/command-palette/source';const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('https://uiarc.dev/components/blocks/command-palette',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1000);await page.getByRole('button',{name:'Open command palette',exact:true}).click();await page.waitForTimeout(700);
const panel=page.getByRole('combobox').locator('..').locator('..');
const read=el=>[el,...el.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,cls:e.getAttribute('class'),text:e.children.length?null:e.textContent,rect:[r.x,r.y,r.width,r.height],style:Object.fromEntries(['padding','margin','gap','height','width','minHeight','fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','borderRadius','boxShadow','borderColor'].map(k=>[k,s[k]]))};});
await page.getByRole('combobox').fill('qzxxzz');await page.waitForTimeout(1200);await fs.writeFile(`${out}/empty-styles.json`,JSON.stringify(await panel.evaluate(read),null,2));
await page.getByRole('combobox').fill('theme');await page.waitForTimeout(600);await fs.writeFile(`${out}/filtered-styles.json`,JSON.stringify(await panel.evaluate(read),null,2));
console.log('fonts',await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{try{return[...sheet.cssRules]}catch{return[]}}).filter(r=>r.constructor.name==='CSSFontFaceRule').map(r=>r.cssText)));
await page.getByRole('button').filter({hasText:/^Appearance$/}).click();console.log('theme choices',await page.getByRole('menuitemradio').allTextContents(),await page.getByRole('menuitem').allTextContents());
const dark=page.getByRole('menuitemradio',{name:/dark/i});if(await dark.count()){await dark.click();await page.waitForTimeout(500);await panel.screenshot({path:`${out}/dark.png`});await fs.writeFile(`${out}/dark-styles.json`,JSON.stringify(await panel.evaluate(read),null,2));}
console.log('appearance controls',await page.getByRole('button').evaluateAll(es=>es.map(e=>({text:e.textContent,label:e.getAttribute('aria-label')})).filter(e=>/dark|light|system|theme/i.test(`${e.text} ${e.label}`))));
const darkButton=page.getByRole('button',{name:'Dark',exact:true});if(await darkButton.count()){
  await darkButton.click();await page.keyboard.press('Escape');await page.waitForTimeout(1600);
  console.log('after theme',page.url(),await page.getByRole('button').allTextContents());
  await page.screenshot({path:`${out}/theme-page.png`});
  if(!await page.getByRole('combobox').count()&&await page.getByRole('button',{name:'Open command palette',exact:true}).count())await page.getByRole('button',{name:'Open command palette',exact:true}).click();
  if(await page.getByRole('combobox').count()){await page.waitForTimeout(700);await panel.screenshot({path:`${out}/dark.png`});await fs.writeFile(`${out}/dark-styles.json`,JSON.stringify(await panel.evaluate(read),null,2));}
}
await browser.close();
