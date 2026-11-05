import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// Second pass over the public settings-command preview: select options, the Switch / Segmented / Select module CSS,
// and frame traces of the palette flight and the unsaved-changes bar (rendered page only).
const directory='docs/research/uiarc-settings-command/source';
const rootSelector='div[class*="settings-command_root"]';
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  await page.goto('https://uiarc.dev/components/blocks/settings-command',{waitUntil:'networkidle'});
  await page.waitForTimeout(1500);
  const root=page.locator(rootSelector).first();
  await root.scrollIntoViewIfNeeded();await page.waitForTimeout(500);

  const css=await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{try{return[...sheet.cssRules].map(rule=>rule.cssText).filter(text=>/(switch_|segmented-control_|select_|animated-counter|text-morph|button_)[A-Za-z0-9_-]*/.test(text)&&!/preview-shell|docs_/.test(text));}catch{return[];}}));
  await fs.writeFile(`${directory}/control-styles.css`,css.join('\n\n'));

  const options={};
  for(const key of ['language','timezone','font-size','email-cadence','session-length','audit-retention','default-role','currency']){
    const trigger=root.locator(`[data-setting="${key}"] button[role="combobox"]`);
    await trigger.scrollIntoViewIfNeeded();await trigger.click();await page.waitForTimeout(500);
    options[key]=await page.evaluate(()=>[...document.querySelectorAll('[role="option"]')].map(node=>({text:node.textContent.trim(),selected:node.getAttribute('aria-selected')})));
    if(key==='language'){
      await page.screenshot({path:`${directory}/select-open.png`});
      await fs.writeFile(`${directory}/select-popup.html`,await page.evaluate(()=>{const listbox=document.querySelector('[role="listbox"]');return listbox?listbox.closest('[data-radix-popper-content-wrapper],[class*="select_"]')?.outerHTML||listbox.outerHTML:'(none)';}));
      const popupCss=await page.evaluate(()=>{const listbox=document.querySelector('[role="listbox"]');if(!listbox)return'';const box=listbox.closest('[class*="select_"]')||listbox;const s=getComputedStyle(box),r=box.getBoundingClientRect();return JSON.stringify({class:box.className,rect:[r.x,r.y,r.width,r.height],background:s.backgroundColor,border:s.border,radius:s.borderRadius,shadow:s.boxShadow,padding:s.padding});});
      await fs.writeFile(`${directory}/select-popup-style.json`,popupCss);
    }
    await page.keyboard.press('Escape');await page.waitForTimeout(300);
  }
  await fs.writeFile(`${directory}/select-options.json`,JSON.stringify(options,null,1));

  // Frame traces
  const trace=async(label,action,duration=1400)=>{
    await page.evaluate(duration=>{
      const start=performance.now();window.__cap=[];window.__capDone=false;
      const sample=now=>{
        const palette=document.querySelector('[class*="settings-command_palette__"]');
        const bar=document.querySelector('[class*="settings-command_bar__"]');
        const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return{x:Math.round(r.x*10)/10,y:Math.round(r.y*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,radius:s.borderRadius,opacity:s.opacity};};
        const scroller=document.querySelector('[class*="settings-command_scroller"]');
        window.__cap.push({at:Math.round(now-start),palette:rect(palette),bar:rect(bar),scroll:scroller?Math.round(scroller.scrollTop):null});
        if(now-start<duration)requestAnimationFrame(sample);else window.__capDone=true;
      };requestAnimationFrame(sample);
    },duration);
    await action();await page.waitForFunction(()=>window.__capDone);
    await fs.writeFile(`${directory}/trace-${label}.json`,JSON.stringify(await page.evaluate(()=>window.__cap)));
  };
  const trigger=root.locator('button[class*="settings-command_trigger"]').first();
  await root.locator('[class*="settings-command_scroller"]').evaluate(node=>{node.scrollTop=0;});
  await trace('palette-open',()=>trigger.click());
  await page.keyboard.type('billing em');await page.waitForTimeout(400);
  await trace('palette-pick',()=>page.keyboard.press('Enter'),2200);
  await page.waitForTimeout(600);
  await root.screenshot({path:`${directory}/after-jump.png`});
  // The bar: grow, count, save.
  const name=root.locator('[data-setting="weekly-digest"] button[role="switch"]');
  await name.scrollIntoViewIfNeeded();
  await trace('bar-appear',()=>name.click(),1000);
  await root.screenshot({path:`${directory}/bar-1.png`});
  const second=root.locator('[data-setting="mentions"] button[role="switch"]');
  await second.scrollIntoViewIfNeeded();
  await trace('bar-count',()=>second.click(),800);
  await root.screenshot({path:`${directory}/bar-2.png`});
  await fs.writeFile(`${directory}/bar.html`,await page.evaluate(()=>{const dock=document.querySelector('[class*="settings-command_dock"]');return dock?dock.outerHTML:'(none)';}));
  const save=root.getByRole('button',{name:'Save'});
  await trace('bar-save',()=>save.click(),2400);
  await root.screenshot({path:`${directory}/bar-saved.png`});
  await fs.writeFile(`${directory}/bar-saved.html`,await page.evaluate(()=>{const dock=document.querySelector('[class*="settings-command_dock"]');return dock?dock.outerHTML:'(none)';}));
  // Keyboard
  console.log('done');
} finally {await browser.close();}
