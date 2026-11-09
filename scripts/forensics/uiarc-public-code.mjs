import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const directory='docs/research/uiarc-interactions/source';
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const name of ['dropdown-menu','button']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`https://uiarc.dev/components/${name}`,{waitUntil:'networkidle'});
  const tokens=await page.evaluate(()=>{
   const style=getComputedStyle(document.documentElement);
   return Object.fromEntries([...style].filter(key=>/^--(duration|ease|spring)/.test(key)).map(key=>[key,style.getPropertyValue(key)]));
  });
  await page.getByRole('tab',{name:'Code',exact:true}).click();
  const source=await page.locator('pre').evaluateAll(nodes=>nodes.map(node=>({text:node.innerText,html:node.innerHTML.slice(0,2500)})));
  await fs.writeFile(`${directory}/${name}-published-code.json`,JSON.stringify({tokens,source},null,2));
  console.log(name,JSON.stringify({tokens,source:source.map(item=>({text:item.text.slice(0,10000),html:item.html.slice(0,600)}))}));
  await page.close();
 }
}finally{await browser.close();}
