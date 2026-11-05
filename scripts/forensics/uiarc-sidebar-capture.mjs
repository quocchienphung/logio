import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// Reads the public App rail preview of https://uiarc.dev/components/blocks/sidebar through the rendered page only.
const directory='docs/research/uiarc-sidebar/source';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('https://uiarc.dev/components/blocks/sidebar',{waitUntil:'networkidle'});
  const shell=page.locator('section[class*="sidebar-rail_shell"]').first();
  await shell.scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Expand sidebar'}).click();
  await page.waitForTimeout(1200);
  await shell.screenshot({path:`${directory}/rail-expanded.png`});
  const aside=shell.locator('aside, nav').first();
  await fs.writeFile(`${directory}/rail-expanded.html`,await shell.evaluate(node=>node.outerHTML));
  const styles=await shell.evaluate(root=>[root,...root.querySelectorAll('*')].map(node=>{
    const s=getComputedStyle(node),r=node.getBoundingClientRect();
    return{tag:node.tagName,class:String(node.className),text:node.children.length?undefined:node.textContent?.trim().slice(0,40),aria:{expanded:node.getAttribute('aria-expanded'),current:node.getAttribute('aria-current')},rect:{x:r.x,y:r.y,w:r.width,h:r.height},color:s.color,background:s.backgroundColor,font:`${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.letterSpacing}`,padding:s.padding,margin:s.margin,gap:s.gap,radius:s.borderRadius,borderLeft:s.borderLeft,transition:s.transition,transform:s.transform,opacity:s.opacity,overflow:s.overflow};
  }));
  await fs.writeFile(`${directory}/rail-styles.json`,JSON.stringify(styles,null,2));
  const css=await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{try{return[...sheet.cssRules].map(rule=>rule.cssText).filter(text=>/sidebar-rail_/.test(text));}catch{return[];}}));
  await fs.writeFile(`${directory}/rail-declared-styles.txt`,css.join('\n\n'));
  const group=shell.locator('button[aria-expanded]').filter({hasText:'Projects'}).first();
  console.log('group found',await group.count());
  const record=async(label,action)=>{
    await shell.evaluate(root=>{
      const start=performance.now();window.__cap={start,frames:[]};
      const sample=now=>{
        const nodes=[...root.querySelectorAll('[class*="sidebar-rail_"]')].filter(node=>/Projects|Checkout redesign|Mobile onboarding|Design system 2.0|Roadmap|Research/.test(node.textContent||'')&&node.children.length<=3);
        window.__cap.frames.push({at:now-start,nodes:nodes.map(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return{class:String(node.className).slice(0,70),text:node.textContent?.trim().slice(0,24),opacity:s.opacity,transform:s.transform,filter:s.filter,h:r.height,top:r.top,left:r.left};})});
        if(now-start<1300)requestAnimationFrame(sample);else window.__capDone=true;
      };window.__capDone=false;requestAnimationFrame(sample);
    });
    await action();await page.waitForFunction(()=>window.__capDone);
    await fs.writeFile(`${directory}/${label}.json`,JSON.stringify(await page.evaluate(()=>window.__cap),null,2));
  };
  await record('group-collapse',()=>group.click());
  await shell.screenshot({path:`${directory}/rail-group-collapsed.png`});
  await record('group-expand',()=>group.click());
  const child=shell.getByText('Mobile onboarding').first();
  await child.hover();await page.waitForTimeout(500);
  await shell.screenshot({path:`${directory}/rail-child-hover.png`});
  await record('child-select',()=>child.click());
  await shell.screenshot({path:`${directory}/rail-child-selected.png`});
} finally {await browser.close();}
