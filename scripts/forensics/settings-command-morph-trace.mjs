import {chromium} from 'playwright';

// Frame trace of the Settings panel growing out of the account menu (usage: node scripts/forensics/settings-command-morph-trace.mjs [base-url])
const base=process.argv[2]||'http://localhost:3000';
const out='docs/research/uiarc-settings-command/qa';
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${base}/personalize?section=new-chat`,{waitUntil:'networkidle'});
  await page.waitForSelector('.ui-as-user');await page.waitForTimeout(800);
  await page.locator('.ui-as-user').click();
  await page.waitForSelector('[role="menu"].ui-as-popover');await page.waitForTimeout(500);
  const menu=await page.locator('[role="menu"].ui-as-popover').boundingBox();
  console.log('menu',JSON.stringify(menu));
  await page.evaluate(()=>{
    const start=performance.now();window.__cap=[];window.__done=false;
    const sample=now=>{
      const panel=document.querySelector('.sc-overlay__panel');const r=panel?.getBoundingClientRect();
      const rows=[...document.querySelectorAll('.sc-row')];const shown=rows.filter(row=>+getComputedStyle(row).opacity>0.5&&row.getBoundingClientRect().bottom<(r?r.bottom:0)).length;
      window.__cap.push({at:Math.round(now-start),r:r?[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]:null,shown,menu:!!document.querySelector('[role="menu"].ui-as-popover')});
      if(now-start<1600)requestAnimationFrame(sample);else window.__done=true;
    };requestAnimationFrame(sample);
  });
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await page.waitForFunction(()=>window.__done);
  const cap=await page.evaluate(()=>window.__cap);
  console.log(cap.filter((_,index)=>index%8===0).map(frame=>`${frame.at}ms ${JSON.stringify(frame.r)} rowsVisible=${frame.shown} menu=${frame.menu}`).join('\n'));
  await page.screenshot({path:`${out}/local-morph-end.png`});
  console.log('url',page.url());
  // mid-flight stills
  await page.keyboard.press('Escape');await page.waitForTimeout(900);
  await page.locator('.ui-as-user').click();await page.waitForTimeout(400);
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await page.waitForTimeout(140);await page.screenshot({path:`${out}/local-morph-140ms.png`});
  await page.waitForTimeout(160);await page.screenshot({path:`${out}/local-morph-300ms.png`});
} finally {await browser.close();}
