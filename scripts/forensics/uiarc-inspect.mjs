import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const directory='docs/research/uiarc-interactions/source';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const name of ['dropdown-menu','button']) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto(`https://uiarc.dev/components/${name}`,{waitUntil:'networkidle'});
    await page.screenshot({path:`${directory}/${name}-desktop.png`,fullPage:true});
    await fs.writeFile(`${directory}/${name}.html`,await page.content());
    const overview=await page.evaluate(()=>({
      text:document.body.innerText,
      controls:[...document.querySelectorAll('main button,main [role="button"],iframe')].map((n,i)=>({index:i,tag:n.tagName,text:n.textContent?.trim(),label:n.getAttribute('aria-label'),role:n.getAttribute('role'),html:n.outerHTML.slice(0,1700),rect:n.getBoundingClientRect().toJSON()})),
    }));
    await fs.writeFile(`${directory}/${name}-overview.json`,JSON.stringify(overview,null,2));
    console.log(name,JSON.stringify({text:overview.text.slice(-13000),controls:overview.controls}));
    await page.close();
  }
}finally{await browser.close();}
