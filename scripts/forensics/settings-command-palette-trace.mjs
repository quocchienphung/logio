import {chromium} from 'playwright';

// Frame trace of the local palette opening (compare with docs/research/uiarc-settings-command/source/trace-palette-open.json).
const base=process.argv[2]||'http://localhost:3000';
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${base}/personalize?section=settings`,{waitUntil:'networkidle'});
  await page.waitForSelector('.sc-frame');await page.waitForTimeout(800);
  const from=await page.locator('.sc-trigger').boundingBox();
  console.log('trigger',JSON.stringify(from));
  await page.evaluate(()=>{
    const start=performance.now();window.__cap=[];window.__done=false;
    const sample=now=>{const node=document.querySelector('.sc-palette');const r=node?.getBoundingClientRect();window.__cap.push({at:Math.round(now-start),r:r?[Math.round(r.x*10)/10,Math.round(r.y*10)/10,Math.round(r.width*10)/10,Math.round(r.height*10)/10,getComputedStyle(node).borderRadius]:null});if(now-start<1300)requestAnimationFrame(sample);else window.__done=true;};
    requestAnimationFrame(sample);
  });
  await page.locator('.sc-trigger').click();
  await page.waitForFunction(()=>window.__done);
  const cap=await page.evaluate(()=>window.__cap);
  console.log(cap.filter((_,index)=>index%6===0).map(frame=>`${frame.at}: ${JSON.stringify(frame.r)}`).join('\n'));
} finally {await browser.close();}
