import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const base=process.argv[2] || 'http://localhost:3000';
const out='docs/research/affectui-settings/comparison';
const browser=await chromium.launch({channel:'chrome'});const results=[];
for(const viewport of [{width:1440,height:1100},{width:390,height:844}]){
  for(const state of ['invoices','yearly']){
    for(const [label,url] of [['source','https://www.affectui.com/screens/settings-billing/full'],['local',`${base}/personalize?section=usage`]]){
      const page=await browser.newPage({viewport});await page.goto(url,{waitUntil:'networkidle'});await page.locator('.ui-sb').waitFor();await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});await page.waitForTimeout(1600);
      if(state==='yearly')await page.getByRole('radio',{name:/Yearly/}).click();
      await page.locator('.ui-as-main').evaluate(el=>el.scrollTop=el.scrollHeight);await page.mouse.move(1,1);await page.waitForTimeout(1100);
      const box=await page.locator('.ui-as-main').boundingBox();await page.screenshot({path:`${out}/${label}-${viewport.width}-${state}.png`,clip:{x:Math.ceil(box.x),y:Math.ceil(box.y),width:Math.floor(box.width),height:Math.floor(box.height)}});await page.close();
    }
    const name=`${viewport.width}-${state}`,a=PNG.sync.read(await fs.readFile(`${out}/source-${name}.png`)),b=PNG.sync.read(await fs.readFile(`${out}/local-${name}.png`)),diff=new PNG({width:a.width,height:a.height});
    const percent=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.15})/a.width/a.height*100;await fs.writeFile(`${out}/diff-${name}.png`,PNG.sync.write(diff));const entry={viewport,state,contentDiffPercent:Number(percent.toFixed(3))};results.push(entry);console.log(entry);
  }
}
await fs.writeFile(`${out}/details.json`,JSON.stringify(results,null,2));await browser.close();
