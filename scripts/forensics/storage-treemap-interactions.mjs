import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='docs/research/storage/treemap';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('https://uiarc.dev/components/treemap',{waitUntil:'networkidle'});
  const stage=page.locator('[class*="treemap_stage__"]').first();await stage.scrollIntoViewIfNeeded();await page.waitForTimeout(900);
  await page.screenshot({path:`out.png`}).then(()=>fs.rename('out.png',`${out}/source-initial.png`));
  const parent=page.locator('[class*="treemap_tile__"][data-level="1"]').filter({hasText:'North America'}).first();
  await parent.hover({position:{x:20,y:8}});await page.screenshot({path:`${out}/source-hover.png`});
  await stage.evaluate(stage=>{window.__storageFrames=[];let count=0;function record(t){const tiles=[...stage.querySelectorAll('[class*="treemap_tile__"]')].filter(e=>getComputedStyle(e).visibility==='visible').slice(0,40).map(e=>({text:e.textContent,rect:[e.offsetWidth,e.offsetHeight],transform:getComputedStyle(e).transform,opacity:getComputedStyle(e).opacity}));window.__storageFrames.push({t,tiles});if(count++<100)requestAnimationFrame(record);}requestAnimationFrame(record);});
  await parent.click({position:{x:20,y:8}});await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/source-drilled.png`});
  await fs.writeFile(`${out}/source-drill-frames.json`,JSON.stringify(await page.evaluate(()=>window.__storageFrames),null,2));
  await fs.writeFile(`${out}/source-drilled-dom.html`,await stage.evaluate(e=>e.outerHTML));
  await stage.focus();await page.keyboard.press('Escape');await page.waitForTimeout(700);await page.screenshot({path:`${out}/source-back.png`});
  await page.getByRole('button',{name:'Customers',exact:true}).click();await page.waitForTimeout(700);await page.screenshot({path:`${out}/source-measure.png`});
  await page.setViewportSize({width:390,height:844});await stage.scrollIntoViewIfNeeded();await page.waitForTimeout(600);await page.screenshot({path:`${out}/source-mobile.png`});
  console.log('Source hierarchy, hover, affine drill frames, breadcrumb/back, measure and mobile captured.');
}finally{await browser.close();}
