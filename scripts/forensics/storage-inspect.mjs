import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out='docs/research/storage';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const [name,url] of [['treemap','https://uiarc.dev/components/treemap'],['dropzone','https://www.affectui.com/components/dropzone']]) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto(url,{waitUntil:'networkidle',timeout:60000});
    await fs.writeFile(`${out}/${name}-docs.txt`,await page.locator('body').innerText());
    const root=page.locator('figure').first();
    console.log(name,'figures',await root.count(),'iframes',await page.locator('iframe').count());
    if(await root.count())await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await page.screenshot({path:`${out}/${name}-desktop.png`});
    await fs.writeFile(`${out}/${name}-dom.html`,await (await root.count()?root:page.locator('main')).evaluate(e=>e.outerHTML));
    await fs.writeFile(`${out}/${name}-styles.json`,JSON.stringify(await (await root.count()?root:page.locator('main')).evaluate(el=>[el,...el.querySelectorAll('*')].slice(0,350).map(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return {tag:e.tagName,cls:String(e.className?.baseVal??e.className),text:e.childElementCount?undefined:e.textContent?.slice(0,90),rect:[b.x,b.y,b.width,b.height],font:s.font,color:s.color,bg:s.backgroundColor,border:s.border,radius:s.borderRadius,gap:s.gap,padding:s.padding,transition:s.transition,transform:s.transform};})),null,2));
    await page.setViewportSize({width:390,height:844});
    if(await root.count())await root.scrollIntoViewIfNeeded();
    await page.screenshot({path:`${out}/${name}-mobile.png`});
    await page.close();
  }
}finally{await browser.close();}
