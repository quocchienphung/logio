import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
const out='docs/research/affectui-run/comparison';await fs.mkdir(out,{recursive:true});
const base=process.argv[2]||'http://localhost:3000';
const browser=await chromium.launch({channel:'chrome'});const results=[];
const quick=process.argv.includes('--quick');
const selected=process.argv.find(value=>value.startsWith('--widths='))?.split('=')[1].split(',').map(Number);
if(selected){try{const previous=JSON.parse(await fs.readFile(`${out}/metrics.json`,'utf8'));results.push(...previous.filter(entry=>!selected.includes(entry.viewport.width)));}catch{}}
const waitApproval=async page=>{await page.locator('.ui-ar__pill[data-phase="waiting"]').waitFor({timeout:25000});const show=page.getByRole('button',{name:'Show side panel',exact:true});if(await show.isVisible())await show.click();await page.getByRole('button',{name:'Approve',exact:true}).waitFor();};
for(const viewport of (quick ? [{width:1440,height:1000}] : [{width:1440,height:1000},{width:1920,height:1080},{width:1228,height:900},{width:1024,height:900},{width:768,height:1024},{width:390,height:844}]).filter(viewport=>!selected||selected.includes(viewport.width))){
  const pages=[];
  await Promise.all([['source','https://www.affectui.com/screens/agent-run/full'],['local',`${base}/personalize?section=run`]].map(async([label,url],index)=>{
    const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('.ui-ar').waitFor();await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
    await waitApproval(page);await page.mouse.move(1,1);await page.waitForTimeout(600);
    pages[index]={page,label,errors};
  }));
  for(const state of quick ? ['waiting'] : ['waiting','panel-hidden','denied','done','expanded']){
    await Promise.all(pages.map(async({page,label})=>{
      if(state==='panel-hidden'){
        const close=page.getByRole('button',{name:'Close side panel',exact:true});
        if(await close.isVisible())await close.click();
        else await page.locator('button[aria-label="Hide side panel"]').evaluate(el=>el.click());
      }
      if(state==='denied'){
        await page.getByRole('button',{name:'Show side panel',exact:true}).click();await page.getByRole('button',{name:'Deny',exact:true}).click();
      }
      if(state==='done'){
        if(viewport.width<=1228){const close=page.getByRole('button',{name:'Close side panel',exact:true});if(await close.isVisible())await close.click();else await page.locator('button[aria-label="Hide side panel"]').evaluate(el=>el.click());}
        await page.getByRole('button',{name:'Run again',exact:true}).click();await waitApproval(page);await page.getByRole('button',{name:'Approve',exact:true}).click();await page.locator('.ui-ar__pill[data-phase="done"]').waitFor({timeout:10000});
      }
      if(state==='expanded'){
        const hide=page.locator('button[aria-label="Hide side panel"]');if(await hide.count())await hide.evaluate(el=>el.click());
        await page.locator('.ui-tc-group__head').first().click();await page.locator('.ui-tc__head').first().click();
        await page.waitForTimeout(650);
        await page.locator('.ui-ar__scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
      }
      await page.mouse.move(1,1);await page.waitForTimeout(850);
      // Dynamic wall-clock text is excluded equally on source and local.
      await page.addStyleTag({content:'.ui-ar__time,.ui-pl__time,.ui-pl__elapsed,.ui-as-toast{visibility:hidden!important}'});
      const box=await page.locator('.ui-as-main').boundingBox();await page.screenshot({path:`${out}/${label}-${viewport.width}-${state}.png`,clip:{x:Math.ceil(box.x),y:Math.ceil(box.y),width:Math.floor(box.width),height:Math.floor(box.height)}});
    }));
    const name=`${viewport.width}-${state}`,a=PNG.sync.read(await fs.readFile(`${out}/source-${name}.png`)),b=PNG.sync.read(await fs.readFile(`${out}/local-${name}.png`)),diff=new PNG({width:a.width,height:a.height});
    const percent=a.width===b.width&&a.height===b.height ? pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.15})/a.width/a.height*100 : null;
    await fs.writeFile(`${out}/diff-${name}.png`,PNG.sync.write(diff));
    const metrics=async page=>page.evaluate(()=>Object.fromEntries(['.ui-ar','.ui-ar__bar','.ui-ar__column','.ui-pl','.ui-ar__feed','.ui-ar__panel','.ui-ap','.ui-df'].map(selector=>{const el=document.querySelector(selector);if(!el)return[selector,null];const r=el.getBoundingClientRect();return[selector,{x:r.x,y:r.y,w:r.width,h:r.height}];})));
    const result={viewport,state,contentDiffPercent:percent===null ? null : Number(percent.toFixed(3)),source:await metrics(pages[0].page),local:await metrics(pages[1].page),errors:pages[1].errors,overflow:await pages[1].page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};results.push(result);console.log(viewport.width,state,result.contentDiffPercent,result.errors);await fs.writeFile(`${out}/${quick?'quick':'metrics'}.json`,JSON.stringify(results,null,2));
  }
  for(const {page} of pages)await page.close();
}
await fs.writeFile(`${out}/${quick?'quick':'metrics'}.json`,JSON.stringify(results,null,2));await browser.close();
