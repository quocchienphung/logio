import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const directory='docs/research/uiarc-interactions/source';
const browser=await chromium.launch({channel:'chrome'});
try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500});
  const suffix=viewport.width;
  const record=async(label,action)=>{
   await page.evaluate(()=>{
    const start=performance.now();window.__motionCapture={start,inputs:[],frames:[]};
    const input=event=>window.__motionCapture.inputs.push({type:event.type,at:performance.now()-start,key:event.key});
    for(const type of ['pointerdown','pointerup','keydown','keyup','pointerover'])document.addEventListener(type,input,{capture:true});
    const sample=now=>{
     const nodes=[...document.querySelectorAll('[class*="dropdown-menu_"],[class*="button_button"],[class*="button_label"],[role="menu"]')];
     window.__motionCapture.frames.push({at:now-start,nodes:nodes.map(node=>{
      const style=getComputedStyle(node);return{tag:node.tagName,class:node.className,role:node.getAttribute('role'),text:node.textContent?.slice(0,80),state:node.getAttribute('data-state'),highlighted:node.hasAttribute('data-highlighted'),opacity:style.opacity,transform:style.transform,scale:style.scale,filter:style.filter,origin:style.transformOrigin,background:style.backgroundColor,rect:node.getBoundingClientRect().toJSON()};
     })});
     if(now-start<750)requestAnimationFrame(sample);else{
      for(const type of ['pointerdown','pointerup','keydown','keyup','pointerover'])document.removeEventListener(type,input,{capture:true});
      window.__captureDone=true;
     }
    };window.__captureDone=false;requestAnimationFrame(sample);
   });
   await action();await page.waitForFunction(()=>window.__captureDone);
   const result=await page.evaluate(()=>window.__motionCapture);
   await fs.writeFile(`${directory}/${label}-${suffix}.json`,JSON.stringify(result,null,2));
   console.log(label,suffix,JSON.stringify({inputs:result.inputs,frames:result.frames.length,first:result.frames[0]?.at,last:result.frames.at(-1)?.at}));
  };
  await page.goto('https://uiarc.dev/components/dropdown-menu',{waitUntil:'networkidle'});
  const trigger=page.locator('button[class*="dropdown-menu_trigger"]');await trigger.scrollIntoViewIfNeeded();
  await record('menu-open',()=>trigger.click());
  await page.screenshot({path:`${directory}/menu-open-${suffix}.png`});
  await fs.writeFile(`${directory}/menu-open-${suffix}.html`,await page.getByRole('menu').evaluate(node=>node.outerHTML));
  const items=page.getByRole('menuitem');console.log('items',await items.allTextContents());
  if(viewport.width>500){await items.first().hover();await record('menu-highlight',()=>items.nth(2).hover());}
  await record('menu-close',()=>page.keyboard.press('Escape'));
  await trigger.focus();await record('menu-keyboard',()=>page.keyboard.press('ArrowDown'));await page.keyboard.press('Escape');
  const styles=await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{try{return[...sheet.cssRules].map(rule=>rule.cssText).filter(text=>/dropdown-menu_|button_button|button_label|button_icon/.test(text));}catch{return[];}}));
  await fs.writeFile(`${directory}/declared-styles-${suffix}.txt`,styles.join('\n\n'));
  await page.goto('https://uiarc.dev/components/button',{waitUntil:'networkidle'});
  const save=page.locator('button[class*="button_button"]').filter({hasText:'Save changes'});await save.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${directory}/buttons-${suffix}.png`});
  const box=await save.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await record('button-press',async()=>{await page.mouse.down();await page.waitForTimeout(140);await page.mouse.up();});
  const upload=page.locator('button[class*="button_button"]').filter({hasText:'Upload file'});
  await record('button-loading',()=>upload.click());
  await page.waitForTimeout(1800);
  await page.getByRole('tab',{name:'Code',exact:true}).click();
  const code=await page.locator('pre').allTextContents();
  await fs.writeFile(`${directory}/button-public-code-${suffix}.txt`,code.join('\n\n'));
  console.log('public code excerpts',code.join('\n').split('\n').filter(line=>/stiffness|damping|duration|delay|scale:|spring|stagger|transition/.test(line)).slice(0,65));
  await page.close();
 }
}finally{await browser.close();}
