import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const base=process.argv[2] || 'http://localhost:3000';
const out='docs/research/affectui-analytics/comparison';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const results=[];
for(const viewport of process.argv.includes('--states-only') ? [] : [{width:1440,height:1000},{width:1920,height:1080},{width:1024,height:900},{width:768,height:1024},{width:390,height:844}]){
  const pages=[];
  for(const [label,url] of [['source','https://www.affectui.com/screens/analytics/full'],['local',`${base}/personalize?section=reports`]]){
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url,{waitUntil:'networkidle'});
    await page.locator('.ui-as-rev').waitFor();
    await page.addStyleTag({content:'nextjs-portal {display:none!important}'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1700);
    await page.screenshot({path:`${out}/${label}-${viewport.width}.png`});
    const clip=await page.locator('.ui-as-main').boundingBox();
    const region={x:Math.ceil(clip.x),y:Math.ceil(clip.y),width:Math.floor(clip.width),height:Math.min(Math.floor(clip.height),viewport.height-Math.ceil(clip.y))};
    await page.screenshot({path:`${out}/${label}-content-${viewport.width}.png`,clip:region});
    pages.push({page,label,errors,region});
  }
  const a=PNG.sync.read(await fs.readFile(`${out}/source-content-${viewport.width}.png`));
  const b=PNG.sync.read(await fs.readFile(`${out}/local-content-${viewport.width}.png`));
  const diff=new PNG({width:a.width,height:a.height});
  const percent=a.width===b.width && a.height===b.height ? pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15})/(a.width*a.height)*100 : null;
  await fs.writeFile(`${out}/diff-${viewport.width}.png`,PNG.sync.write(diff));
  const metrics=async page=>page.evaluate(()=>Object.fromEntries(['.ui-as-rev__head','.ui-as-rev__stats','.ui-as-rev__row--main','.ui-as-rev__row--3','.ui-kpi__plot'].map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return[selector,{x:r.x,y:r.y,w:r.width,h:r.height}]})));
  const entry={viewport,contentDiffPercent:percent===null ? null : Number(percent.toFixed(3)),source:await metrics(pages[0].page),local:await metrics(pages[1].page),errors:pages[1].errors,overflow:await pages[1].page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
  results.push(entry);console.log(`${viewport.width}: content diff ${entry.contentDiffPercent}%; overflow ${entry.overflow}; errors ${entry.errors.length}`);
  for(const {page} of pages)await page.close();
}
if(results.length)await fs.writeFile(`${out}/metrics.json`,JSON.stringify(results,null,2));
const states=[];
for(const days of [30,90]){
  for(const [label,url] of [['source','https://www.affectui.com/screens/analytics/full'],['local',`${base}/personalize?section=reports`]]){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto(url,{waitUntil:'networkidle'});await page.locator('.ui-as-rev__period').waitFor();
    await page.addStyleTag({content:'nextjs-portal {display:none!important}'});
    await page.locator('.ui-as-rev__period').click();await page.locator('.ui-as-menu').getByText(`Last ${days} days`,{exact:true}).click();
    await page.mouse.move(1435,995);await page.waitForTimeout(1500);
    await page.screenshot({path:`${out}/${label}-${days}-days.png`,clip:{x:220,y:8,width:1212,height:984}});
    await page.close();
  }
  const a=PNG.sync.read(await fs.readFile(`${out}/source-${days}-days.png`)),b=PNG.sync.read(await fs.readFile(`${out}/local-${days}-days.png`));
  const diff=new PNG({width:a.width,height:a.height});
  const changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15});
  await fs.writeFile(`${out}/diff-${days}-days.png`,PNG.sync.write(diff));
  const result={days,viewport:{width:1440,height:1000},contentDiffPercent:Number((changed/a.width/a.height*100).toFixed(3))};
  states.push(result);console.log(`${days} days: content diff ${result.contentDiffPercent}%`);
}
await fs.writeFile(`${out}/states.json`,JSON.stringify(states,null,2));
await browser.close();
