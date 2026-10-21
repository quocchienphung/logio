import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
const base=process.argv[2]||'http://localhost:3000',out='docs/research/invoice-credit/comparison';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),results=[];
for(const width of [760,620,390,320]){
 const source=await browser.newPage({viewport:{width:1440,height:1600}}),local=await browser.newPage({viewport:{width:1440,height:1600}});
 await source.goto('https://www.affectui.com/blocks/invoice-credit',{waitUntil:'networkidle'});
 await source.getByRole('button',{name:'Decline',exact:true}).click().catch(()=>{});
 await local.goto(`${base}/personalize?section=invoice`,{waitUntil:'networkidle'});await local.locator('.ui-iv').waitFor();
 for(const page of [source,local]){
  await page.locator('.ui-iv').evaluate((root,width)=>{for(let parent=root.parentElement;parent;parent=parent.parentElement){Object.assign(parent.style,{transform:'none',scale:'none',zoom:'1',overflow:'visible',contain:'none',height:'auto',maxHeight:'none'});}Object.assign(root.style,{position:'absolute',top:'0',left:'0',width:`${width}px`,maxWidth:'none',margin:'0',zIndex:'999999'});},width);
  await page.locator('.ui-iv').evaluate(root=>{for(const e of document.querySelectorAll('body *')){if(e!==root&&!root.contains(e)&&!e.contains(root))e.style.visibility='hidden';}});
  await page.evaluate(()=>document.fonts.ready);
 }
 for(const state of ['invoice','credit']){
  if(state==='credit')for(const p of [source,local])await p.locator('.ui-iv').getByRole('tab',{name:'Credit note',exact:true}).click();
  await Promise.all([source.waitForTimeout(850),local.waitForTimeout(850)]);
  const a=PNG.sync.read(await source.locator('.ui-iv').screenshot({path:`${out}/source-${width}-${state}.png`})),b=PNG.sync.read(await local.locator('.ui-iv').screenshot({path:`${out}/local-${width}-${state}.png`}));
  const height=Math.min(a.height,b.height),aa=new PNG({width,height}),bb=new PNG({width,height}),diff=new PNG({width,height});PNG.bitblt(a,aa,0,0,width,height,0,0);PNG.bitblt(b,bb,0,0,width,height,0,0);
  const changed=pixelmatch(aa.data,bb.data,diff.data,width,height,{threshold:.12});await fs.writeFile(`${out}/diff-${width}-${state}.png`,PNG.sync.write(diff));
  const result={width,state,sourceHeight:a.height,localHeight:b.height,differentPercent:+(100*changed/width/height).toFixed(3)};results.push(result);console.log(result);
 }
 await source.close();await local.close();
}
await fs.writeFile(`${out}/metrics.json`,JSON.stringify(results,null,2));await browser.close();
