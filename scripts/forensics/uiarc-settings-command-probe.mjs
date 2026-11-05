import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// First pass over the public preview of https://uiarc.dev/components/blocks/settings-command (rendered page only).
const directory='docs/research/uiarc-settings-command/source';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('https://uiarc.dev/components/blocks/settings-command',{waitUntil:'networkidle'});
  await page.waitForTimeout(1500);
  const info=await page.evaluate(()=>{
    const search=[...document.querySelectorAll('input,button')].filter(node=>/search settings/i.test((node.getAttribute('aria-label')||'')+(node.getAttribute('placeholder')||'')+(node.textContent||'')));
    const out=search.map(node=>{
      const chain=[];let current=node;
      for(let depth=0;current&&depth<9;depth++,current=current.parentElement){const r=current.getBoundingClientRect();chain.push({tag:current.tagName,class:String(current.className).slice(0,120),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top+scrollY)});}
      return {tag:node.tagName,label:node.getAttribute('aria-label'),chain};
    });
    return {out,title:document.title};
  });
  console.log(JSON.stringify(info,null,1));
  await page.screenshot({path:`${directory}/page-top.png`});
} finally {await browser.close();}
