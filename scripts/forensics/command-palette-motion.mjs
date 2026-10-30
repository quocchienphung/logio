import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='docs/research/command-palette/source'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('https://uiarc.dev/components/blocks/command-palette',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1200);
const input=page.getByRole('combobox'); const panel=()=>input.locator('..').locator('..');
async function sample(name,action){
  await page.evaluate(()=>{window.__cpFrames=[]; const start=performance.now(); const frame=t=>{const e=document.querySelector('[class*="command-palette_palette"]'),r=e?.getBoundingClientRect();window.__cpFrames.push({t:t-start,rect:r?[r.x,r.y,r.width,r.height]:null,nodes:[...document.querySelectorAll('[class*="command-palette_palette"], [class*="command-palette_highlight"], [class*="command-palette_resultsFrame"]')].map(e=>({cls:e.className,style:e.getAttribute('style'),animations:e.getAnimations().map(a=>({timing:a.effect.getTiming(),frames:a.effect.getKeyframes()}))}))});if(t-start<900)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
  await action();await page.waitForTimeout(1000);await fs.writeFile(`${out}/${name}-frames.json`,JSON.stringify(await page.evaluate(()=>window.__cpFrames),null,2));
}
await sample('entry',()=>page.getByRole('button',{name:'Open command palette',exact:true}).click());
await sample('highlight',()=>page.keyboard.press('ArrowDown'));
await sample('filter',()=>input.fill('shpr'));
console.log('fuzzy',await page.getByRole('option').allTextContents());await panel().screenshot({path:`${out}/filtered.png`});
await input.fill('qzxxzz');await page.waitForTimeout(700);console.log('empty',await panel().innerText());await panel().screenshot({path:`${out}/empty.png`});
await page.keyboard.press('Escape');console.log('Escape clears',await input.inputValue());
await input.fill('theme');await page.waitForTimeout(700);await panel().screenshot({path:`${out}/one-result.png`});
console.log('font assets',await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/woff/.test(e.name)).map(e=>e.name)));
await page.setViewportSize({width:390,height:844});await input.fill('');await page.waitForTimeout(700);await panel().screenshot({path:`${out}/mobile.png`});
await fs.writeFile(`${out}/mobile-styles.json`,JSON.stringify(await panel().evaluate(el=>[el,...el.querySelectorAll('input,button,[class*="searchRow"],[class*="resultCopy"],[class*="Description"],[class*="shortcut"],[class*="commandKey"]')].slice(0,30).map(e=>{let s=getComputedStyle(e),r=e.getBoundingClientRect();return {cls:e.className,rect:[r.x,r.y,r.width,r.height],display:s.display,padding:s.padding,flexDirection:s.flexDirection,fontSize:s.fontSize};})),null,2));
await sample('exit',()=>page.getByRole('button',{name:'Close command palette',exact:true}).click());
await browser.close();
