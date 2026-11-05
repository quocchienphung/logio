import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='docs/research/storage/onboarding-run'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
for(const [slug,base] of [['blocks/onboarding-illustration','onboarding-illustration'],['blocks/agent-run','agent-run']]){
const page=await browser.newPage({viewport:{width:1440,height:1000}}); await page.goto('https://uiarc.dev/components/'+slug,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2500);
const root=page.locator(`[class*="${base}_card"], [class*="${base}_root"]`).first();
console.log(base, 'root count',await root.count());
if(!await root.count()){console.log((await page.locator('main').innerText()).slice(0,1300));await page.screenshot({path:`${out}/${base}-page.png`});continue;}
await root.scrollIntoViewIfNeeded();
await fs.writeFile(`${out}/${base}-component.html`,await root.evaluate(el=>el.outerHTML));
await fs.writeFile(`${out}/${base}-measure.json`,JSON.stringify(await root.evaluate(el=>[el,...el.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return{tag:e.tagName,cls:e.getAttribute('class'),text:e.children.length?null:e.textContent,rect:[b.x,b.y,b.width,b.height],font:s.font,padding:s.padding,gap:s.gap,radius:s.borderRadius,bg:s.background,color:s.color,border:s.border,transition:s.transition,transform:s.transform}})),null,2));
await root.screenshot({path:`${out}/${base}-initial.png`});
if(base==='onboarding-illustration'){
for(let i=1;i<=3;i++){await root.getByRole('button',{name:'Next',exact:true}).click();await page.waitForTimeout(650);await root.screenshot({path:`${out}/${base}-step-${i+1}.png`});await fs.writeFile(`${out}/${base}-step-${i+1}.html`,await root.evaluate(el=>el.outerHTML));}
}else{
console.log('Agent:',await root.innerText()); const buttons=await root.getByRole('button').all();console.log('buttons:',await Promise.all(buttons.map(b=>b.innerText())));
for(let i=0;i<6;i++){await page.waitForTimeout(1800);await root.screenshot({path:`${out}/${base}-time-${i}.png`});await fs.writeFile(`${out}/${base}-time-${i}.txt`,await root.innerText());}
const detail=root.locator('summary').first();if(await detail.count())await detail.click(); await root.screenshot({path:`${out}/${base}-expanded.png`});}
await page.setViewportSize({width:390,height:844});await root.scrollIntoViewIfNeeded();await root.screenshot({path:`${out}/${base}-mobile.png`}); await page.close();}
await browser.close();
