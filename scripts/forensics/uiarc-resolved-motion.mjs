import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome'}),results={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 for(const name of ['dropdown-menu','button']){
  await page.goto(`https://uiarc.dev/components/${name}`,{waitUntil:'networkidle'});
  if(name==='dropdown-menu')await page.locator('button[class*="dropdown-menu_trigger"]').click();
  results[name]=await page.evaluate(()=>[...document.querySelectorAll('[class*="dropdown-menu_menu__"],[class*="dropdown-menu_item__"],button[class*="dropdown-menu_trigger"],button[class*="button_primary"]')].map(node=>{
   const s=getComputedStyle(node);return{class:node.className,text:node.textContent.slice(0,60),transition:s.transition,animation:s.animation,tokens:Object.fromEntries(['--duration-instant','--duration-fast','--duration-standard','--duration-spring','--ease-standard','--ease-enter','--ease-spring'].map(key=>[key,s.getPropertyValue(key)]))};
  }));
  console.log(name,JSON.stringify(results[name]));
 }
 await fs.writeFile('docs/research/uiarc-interactions/source/resolved-motion.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
