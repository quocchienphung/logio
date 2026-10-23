import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const base=process.argv[2] || 'http://localhost:3000';
const out='docs/research/affectui-settings/comparison';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const results=[];
const quick=process.argv.includes('--quick');
for(const viewport of quick ? [{width:1440,height:1100}] : [{width:1440,height:1100},{width:1920,height:1080},{width:1024,height:900},{width:768,height:1024},{width:390,height:844}]){
  const pages=[];
  for(const [label,url] of [['source','https://www.affectui.com/screens/settings-billing/full'],['local',`${base}/personalize?section=usage`]]){
    const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url,{waitUntil:'networkidle'});await page.locator('.ui-sb').waitFor();await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.waitForTimeout(1800);
    await page.screenshot({path:`${out}/${label}-${viewport.width}.png`});pages.push({page,label,errors});
  }
  for(const state of quick ? ['Billing'] : ['Billing','General','Members','API keys']){
    for(const {page,label} of pages){
      if(state!=='Billing'){await page.getByRole('tab',{name:state,exact:true}).click();await page.waitForTimeout(650);}
      const box=await page.locator('.ui-as-main').boundingBox();
      await page.screenshot({path:`${out}/${label}-${viewport.width}-${state.replaceAll(' ','-')}.png`,clip:{x:Math.ceil(box.x),y:Math.ceil(box.y),width:Math.floor(box.width),height:Math.min(Math.floor(box.height),viewport.height-Math.ceil(box.y))}});
    }
    const name=`${viewport.width}-${state.replaceAll(' ','-')}`;
    const a=PNG.sync.read(await fs.readFile(`${out}/source-${name}.png`)),b=PNG.sync.read(await fs.readFile(`${out}/local-${name}.png`));
    const diff=new PNG({width:a.width,height:a.height});
    const percent=a.width===b.width&&a.height===b.height ? pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.15})/a.width/a.height*100 : null;
    await fs.writeFile(`${out}/diff-${name}.png`,PNG.sync.write(diff));
    const metric=async page=>page.locator('.ui-sb').evaluate(root=>Object.fromEntries(['.ui-as-page-title','.ui-sb__bar','.ui-sb__body','.ui-sb-overview','.ui-sb-stack','.ui-sb-plans'].map(selector=>{const el=root.querySelector(selector);if(!el)return [selector,null];const r=el.getBoundingClientRect();return [selector,{x:r.x,y:r.y,w:r.width,h:r.height}];})));
    const entry={viewport,state,contentDiffPercent:percent===null ? null : Number(percent.toFixed(3)),source:await metric(pages[0].page),local:await metric(pages[1].page),errors:pages[1].errors,overflow:await pages[1].page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
    results.push(entry);console.log(`${name}: ${entry.contentDiffPercent}% diff, overflow ${entry.overflow}, errors ${entry.errors.length}`);
  }
  for(const {page} of pages)await page.close();
}
await fs.writeFile(`${out}/${quick ? 'quick' : 'metrics'}.json`,JSON.stringify(results,null,2));
await browser.close();
