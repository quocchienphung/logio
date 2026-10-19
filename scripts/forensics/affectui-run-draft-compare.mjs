import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';

const base=process.argv[2]||'http://localhost:3000';
const out='docs/research/affectui-run/comparison/draft';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const results=[];
try{
  for(const width of [1440,390]){
    const contexts=[];const pages=[];
    for(const url of ['https://www.affectui.com/screens/agent-run/full',`${base}/personalize?section=run`]){
      const context=await browser.newContext({viewport:{width,height:1000}});contexts.push(context);
      const page=await context.newPage();pages.push(page);
      await page.goto(url,{waitUntil:'networkidle'});await page.locator('.ui-df').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);
      const show=page.getByRole('button',{name:'Show side panel',exact:true});
      if(await show.isVisible())await show.click();
      await page.locator('.ui-df').scrollIntoViewIfNeeded();
      await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
      await page.mouse.move(0,0);await page.waitForTimeout(800);
    }
    for(const state of ['initial','active','accepted','rejected']){
      for(let index=0;index<pages.length;index++){
        const page=pages[index],draft=page.locator('.ui-df');
        if(state==='active')await draft.locator('.ui-df__chg[data-state="pending"]').nth(1).click();
        if(state==='accepted')await draft.getByRole('button',{name:'Accept all',exact:true}).click();
        if(state==='rejected'){
          await draft.getByRole('button',{name:'Undo',exact:true}).click();
          await draft.getByRole('button',{name:'Reject all',exact:true}).click();
        }
        await page.waitForTimeout(800);
        await draft.screenshot({path:`${out}/${width}-${state}-${index===0?'source':'local'}.png`});
      }
      const [a,b]=await Promise.all(['source','local'].map(async label=>PNG.sync.read(await fs.readFile(`${out}/${width}-${state}-${label}.png`))));
      const sameSize=a.width===b.width&&a.height===b.height;
      let different=null;
      if(sameSize){
        const diff=new PNG({width:a.width,height:a.height});
        different=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15});
        await fs.writeFile(`${out}/${width}-${state}-diff.png`,PNG.sync.write(diff));
      }
      const geometry=await Promise.all(pages.map(page=>page.locator('.ui-df').boundingBox()));
      const result={width,state,sourceSize:[a.width,a.height],localSize:[b.width,b.height],geometry,different,percent:different===null?null:Number((different/(a.width*a.height)*100).toFixed(4))};
      results.push(result);console.log(JSON.stringify(result));
    }
    for(const context of contexts)await context.close();
  }
}finally{await fs.writeFile(`${out}/metrics.json`,JSON.stringify(results,null,2));await browser.close();}
