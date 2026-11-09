import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const directory='docs/research/uiarc-interactions/source';
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport});
  await page.goto('https://uiarc.dev/components/blocks/kpi-drilldown',{waitUntil:'networkidle'});
  const card=page.locator('button[class*="kpi-drilldown_card__"]').first();await card.scrollIntoViewIfNeeded();
  const record=async(name,action)=>{
   await page.evaluate(()=>{
    const start=performance.now();window.__kpi={frames:[],inputs:[]};window.__done=false;
    const input=event=>window.__kpi.inputs.push({type:event.type,at:performance.now()-start});
    document.addEventListener('pointerdown',input,{once:true,capture:true});
    const sample=time=>{
     window.__kpi.frames.push({at:time-start,nodes:[...document.querySelectorAll('[class*="kpi-drilldown_"]')].filter(n=>/card__|detail|panel|label__|valueRow|body__|breakdown/.test(n.className)).map(n=>{const s=getComputedStyle(n);return{class:n.className,tag:n.tagName,rect:n.getBoundingClientRect().toJSON(),opacity:s.opacity,transform:s.transform,radius:s.borderRadius,overflow:s.overflow};})});
     if(time-start<1200)requestAnimationFrame(sample);else window.__done=true;
    };requestAnimationFrame(sample);
   });
   await action();await page.waitForFunction(()=>window.__done);
   await fs.writeFile(`${directory}/kpi-${name}-${viewport.width}.json`,JSON.stringify(await page.evaluate(()=>window.__kpi),null,2));
   await page.screenshot({path:`${directory}/kpi-${name}-${viewport.width}.png`});
  };
  await record('open',()=>card.click());
  console.log(viewport.width,await page.locator('main button').evaluateAll(ns=>ns.filter(n=>/kpi-drilldown/.test(n.className)).map(n=>({text:n.innerText.slice(0,45),label:n.getAttribute('aria-label'),class:n.className}))));
  const styles=await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{try{return[...sheet.cssRules].map(r=>r.cssText).filter(t=>/kpi-drilldown_/.test(t));}catch{return[];}}));
  await fs.writeFile(`${directory}/kpi-styles-${viewport.width}.txt`,styles.join('\n\n'));
  await record('close',()=>page.keyboard.press('Escape'));
  await page.close();
 }
}finally{await browser.close();}
