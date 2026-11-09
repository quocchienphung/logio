import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/affectui-crm/comparison';
await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch({channel:'chrome'});
const result=[];
const source = await browser.newPage();
const local = await browser.newPage();
for (const viewport of [{width:1440,height:1000},{width:1920,height:1080},{width:900,height:900},{width:768,height:1024},{width:390,height:844}]) {
  for (const [label,page,url] of [['source',source,'https://www.affectui.com/screens/crm/full'],['local',local,`${base}/personalize`]]) {
    await page.setViewportSize(viewport);
    await page.goto(url,{waitUntil:'networkidle'});
    await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(600);
    await page.screenshot({path:`${out}/${label}-${viewport.width}.png`,animations:'disabled'});
  }
  const a=PNG.sync.read(await fs.readFile(`${out}/source-${viewport.width}.png`));
  const b=PNG.sync.read(await fs.readFile(`${out}/local-${viewport.width}.png`));
  const diff=new PNG({width:a.width,height:a.height});
  const count=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15});
  await fs.writeFile(`${out}/diff-${viewport.width}.png`,PNG.sync.write(diff));
  const metrics = async page=>page.evaluate(()=>Object.fromEntries(['.ui-as-side','.ui-as-main','.ui-as-crm__top','.ui-as-crm__tabs','.ui-as-crm__table','.ui-dt__head','.ui-dt__table','.ui-dt__tag','.ui-as-side__foot'].map(selector=>{
    const el=document.querySelector(selector), r=el.getBoundingClientRect(), s=getComputedStyle(el);
    return [selector,{x:r.x,y:r.y,width:r.width,height:r.height,font:s.font,fontFamily:s.fontFamily,lineHeight:s.lineHeight}];
  })));
  const entry={viewport,diffPercent:Number((100*count/(a.width*a.height)).toFixed(3)),source:await metrics(source),local:await metrics(local),overflow:await local.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
  result.push(entry);
  console.log(`${viewport.width}: ${entry.diffPercent}% different; overflow=${entry.overflow}`);
}
await fs.writeFile(`${out}/metrics.json`,JSON.stringify(result,null,2));
const states=[];
for (const [label,page,url] of [['source',source,'https://www.affectui.com/screens/crm/full'],['local',local,`${base}/personalize`]]) {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
  for (const name of ['Team strategy','Pixel integration','Sales docs']) {
    await page.getByRole('button',{name,exact:true}).click();
    await page.mouse.move(1400,950);
    await page.waitForTimeout(600);
    await page.screenshot({path:`${out}/${label}-${name.replaceAll(' ','-')}.png`,animations:'disabled'});
  }
}
for (const name of ['Team strategy','Pixel integration','Sales docs']) {
  const slug=name.replaceAll(' ','-');
  const a=PNG.sync.read(await fs.readFile(`${out}/source-${slug}.png`));
  const b=PNG.sync.read(await fs.readFile(`${out}/local-${slug}.png`));
  const diff=new PNG({width:a.width,height:a.height});
  const count=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15});
  const entry={state:name,diffPercent:Number((100*count/(a.width*a.height)).toFixed(3))};
  await fs.writeFile(`${out}/diff-${slug}.png`,PNG.sync.write(diff));
  states.push(entry); console.log(`${name}: ${entry.diffPercent}% different`);
}
await fs.writeFile(`${out}/states.json`,JSON.stringify(states,null,2));
await browser.close();
