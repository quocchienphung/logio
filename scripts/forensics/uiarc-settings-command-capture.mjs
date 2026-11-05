import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// Reads the public preview of https://uiarc.dev/components/blocks/settings-command through the rendered page only:
// DOM, resolved + declared CSS, screenshots of each state. No UIArc API, registry, CLI or gated Pro source.
const directory='docs/research/uiarc-settings-command/source';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const rootSelector='div[class*="settings-command_root"]';
async function snapshot(page,label,name){
  const root=page.locator(rootSelector).first();
  await root.screenshot({path:`${directory}/${label}-${name}.png`});
}
try {
  for(const [label,width] of [['d1440',1440],['m390',390]]){
    const page=await browser.newPage({viewport:{width,height:label==='m390'?844:1000},deviceScaleFactor:1});
    await page.goto('https://uiarc.dev/components/blocks/settings-command',{waitUntil:'networkidle'});
    await page.waitForTimeout(1500);
    const root=page.locator(rootSelector).first();
    await root.scrollIntoViewIfNeeded();await page.waitForTimeout(600);
    await snapshot(page,label,'rest');
    if(label==='d1440'){
      await fs.writeFile(`${directory}/root.html`,await root.evaluate(node=>node.outerHTML));
      const styles=await root.evaluate(base=>[base,...base.querySelectorAll('*')].map(node=>{
        const s=getComputedStyle(node),r=node.getBoundingClientRect(),b=base.getBoundingClientRect();
        return{tag:node.tagName,class:String(node.className).slice(0,110),text:node.children.length?undefined:node.textContent?.trim().slice(0,40),role:node.getAttribute('role'),aria:{label:node.getAttribute('aria-label'),pressed:node.getAttribute('aria-pressed'),checked:node.getAttribute('aria-checked'),selected:node.getAttribute('aria-selected'),current:node.getAttribute('aria-current')},rect:{x:Math.round((r.x-b.x)*10)/10,y:Math.round((r.y-b.y)*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10},color:s.color,background:s.backgroundColor,border:s.border,font:`${s.fontFamily.slice(0,40)} ${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.letterSpacing}`,padding:s.padding,margin:s.margin,gap:s.gap,radius:s.borderRadius,shadow:s.boxShadow,display:s.display,position:s.position,transition:s.transition,overflow:s.overflow};
      }));
      await fs.writeFile(`${directory}/root-styles.json`,JSON.stringify(styles,null,1));
      const css=await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{try{return[...sheet.cssRules].map(rule=>rule.cssText).filter(text=>/settings-command_|preview-shell_/.test(text));}catch{return[];}}));
      await fs.writeFile(`${directory}/declared-styles.css`,css.join('\n\n'));
      const tokens=await root.evaluate(node=>{const s=getComputedStyle(node),out={};for(const sheet of document.styleSheets){try{for(const rule of sheet.cssRules){if(rule.style)for(const name of rule.style){if(name.startsWith('--')&&!(name in out))out[name]=s.getPropertyValue(name).trim();}}}catch{}}return out;});
      await fs.writeFile(`${directory}/tokens.json`,JSON.stringify(tokens,null,1));
      // Open the search palette with the trigger.
      const trigger=root.locator('button[class*="settings-command_trigger"]').first();
      await trigger.click();await page.waitForTimeout(900);
      await snapshot(page,label,'palette-open');
      await fs.writeFile(`${directory}/palette.html`,await page.evaluate(()=>{const d=document.querySelector('[role="dialog"]');return d?d.outerHTML:'(no dialog)';}));
      await page.keyboard.type('sess');await page.waitForTimeout(500);
      await snapshot(page,label,'palette-typed');
      await page.keyboard.press('Escape');await page.waitForTimeout(700);
      // Section nav: click each item and screenshot.
      const navItems=await root.locator('nav button, nav a').allTextContents();
      console.log('nav items',navItems);
      for(const name of navItems.map(text=>text.trim()).filter(Boolean)){
        await root.locator('nav').getByText(name,{exact:true}).first().click();await page.waitForTimeout(900);
        await snapshot(page,label,`section-${name.toLowerCase()}`);
      }
      // Edit something to raise the unsaved bar.
      await root.locator('nav').getByText('General',{exact:true}).first().click();await page.waitForTimeout(700);
      const input=root.locator('input[type="text"],input:not([type])').first();
      await input.fill('Arc studio edited');await page.waitForTimeout(900);
      await snapshot(page,label,'dirty');
      await fs.writeFile(`${directory}/dirty.html`,await root.evaluate(node=>node.outerHTML));
    }
    await page.close();
  }
} finally {await browser.close();}
