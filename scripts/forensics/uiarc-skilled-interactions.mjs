import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out='docs/research/uiarc-skilled/interactions';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('https://uiarc.dev/components/blocks/agent-tasks',{waitUntil:'networkidle'});
  const evidence=[];
  for(const [name,label] of [['repository','Repository: arc-ui/web'],['branch','Branch: main'],['model','Model: Opus 5.5']]) {
    const trigger=page.getByRole('button',{name:label,exact:true});
    if(!await trigger.count()) { evidence.push({name,unavailable:label});continue; }
    await trigger.scrollIntoViewIfNeeded();
    await page.evaluate(()=>{ window.__arcFrames=[];const start=performance.now();const tick=now=>{const e=document.querySelector('[role=menu]');if(e){const s=getComputedStyle(e);window.__arcFrames.push({at:now-start,opacity:s.opacity,transform:s.transform,height:e.getBoundingClientRect().height});}if(now-start<800)requestAnimationFrame(tick);};requestAnimationFrame(tick); });
    await trigger.click();
    const menu=page.locator('[role=menu][data-state=open]');await menu.waitFor();
    await page.screenshot({path:`${out}/source-${name}-menu.png`});
    const styles=await menu.evaluate(el=>[el,...el.querySelectorAll('[role=menuitemradio]')].map(e=>{const s=getComputedStyle(e);return {role:e.role,text:e.innerText,rect:e.getBoundingClientRect().toJSON(),font:s.font,padding:s.padding,radius:s.borderRadius,gap:s.gap,shadow:s.boxShadow,transition:s.transition};}));
    await page.waitForTimeout(800);
    evidence.push({name,styles,frames:await page.evaluate(()=>window.__arcFrames)});
    await page.keyboard.press('Escape');
    evidence.at(-1).restoredFocus=await trigger.evaluate(e=>e===document.activeElement);
    await page.waitForTimeout(200);
  }
  await fs.writeFile(`${out}/source-menus.json`,JSON.stringify(evidence,null,2));
  await page.setViewportSize({width:390,height:844});
  await page.locator('form[aria-label="New task"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${out}/source-mobile-composer.png`});
}finally{await browser.close();}
