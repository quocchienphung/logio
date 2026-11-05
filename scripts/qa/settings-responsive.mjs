import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]||'http://localhost:3000',out='docs/research/settings-responsive/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const checks=[],errors=[],measurements=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);console.log(`PASS ${name}`);};
try{
 for(const viewport of [{width:1920,height:1080},{width:1440,height:1000},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/personalize?section=home&settings=general`,{waitUntil:'load'});await page.locator('.sc-frame').waitFor();await page.waitForTimeout(1800);
  const consent=page.getByRole('button',{name:'Reject all',exact:true});if(await consent.isVisible()){await consent.click();await page.waitForTimeout(1000);}
  const prefix=`${viewport.width}x${viewport.height}`;
  const measure=()=>page.evaluate(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
    const scroller=document.querySelector('.sc-scroller'),style=getComputedStyle(scroller),section=document.querySelector('.sc-section');
    return {panel:rect('.sc-overlay__panel'),content:rect('.sc-section'),available:scroller.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),overflow:scroller.scrollWidth-scroller.clientWidth,font:parseFloat(getComputedStyle(document.querySelector('.sc-row__label label')).fontSize),field:rect('.sc-text'),label:rect('.sc-row__text'),scroller:rect('.sc-scroller'),card:getComputedStyle(document.querySelector('.sec-settings')).backgroundColor,cardBorder:getComputedStyle(document.querySelector('.sec-settings')).borderWidth,bodyColor:getComputedStyle(section).color,cardColor:getComputedStyle(document.querySelector('.sec-settings')).color};
  });
  let m=await measure();measurements.push({viewport,theme:'light',...m});
  check(`${prefix}: panel fits viewport`,m.panel.x>=0&&m.panel.y>=0&&m.panel.x+m.panel.w<=viewport.width+1&&m.panel.y+m.panel.h<=viewport.height+1);
  check(`${prefix}: sections fill available width`,Math.abs(m.content.w-m.available)<1);
  check(`${prefix}: no horizontal content overflow`,m.overflow<=1);
  check(`${prefix}: readable label size`,m.font>=14);
  check(`${prefix}: correct field grid`,m.scroller.w<720 ? m.field.y>=m.label.y+m.label.h : m.field.x>m.label.x+m.label.w);
  await page.screenshot({path:`${out}/${prefix}-general-light.png`});
  const where=page.locator('.sc-nav__item').filter({hasText:/^Where you log$/});await where.click();await page.waitForTimeout(900);m=await measure();
  check(`${prefix}: embedded account uses Settings surface and text`,m.card==='rgba(0, 0, 0, 0)'&&m.cardBorder==='0px'&&m.cardColor===m.bodyColor);
  check(`${prefix}: single Where you log heading`,await page.getByRole('heading',{name:'Where you log',exact:true}).count()===1&&await page.locator('.sec-header h3').count()===0);
  await page.getByRole('button',{name:'Enable',exact:true}).click();await page.waitForTimeout(650);
  const setup=await page.locator('.sec-setup').boundingBox(),qr=await page.locator('.sec-qr').boundingBox(),copy=await page.locator('.sec-scan-copy').boundingBox();
  check(`${prefix}: QR setup fits content`,qr.x>=setup.x&&qr.x+qr.width<=setup.x+setup.width+1&&copy.x+copy.width<=setup.x+setup.width+1);
  check(`${prefix}: expanded setup has no horizontal overflow`,(await measure()).overflow<=1);
  await page.screenshot({path:`${out}/${prefix}-setup-light.png`});
  await page.locator('.sec-aside').getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Change password',exact:true}).click();await page.waitForTimeout(600);
  const fields=await page.locator('.sec-field').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width};}));
  check(`${prefix}: password fields adapt to available width`,m.scroller.w<720 ? fields[1].y>fields[0].y : fields[1].x>fields[0].x);
  check(`${prefix}: password form spans content`,Math.abs((await page.locator('.sec-password-form').boundingBox()).width-m.content.w)<1);
  await page.screenshot({path:`${out}/${prefix}-password-light.png`});
  await page.locator('.sc-nav__item').filter({hasText:/^Appearance$/}).click();await page.waitForTimeout(850);await page.locator('[data-setting="theme"]').getByRole('button',{name:'Dark',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForTimeout(1400);
  await where.click();await page.waitForTimeout(1700);m=await measure();measurements.push({viewport,theme:'dark',...m});
  check(`${prefix}: dark account inherits theme without its own card`,m.card==='rgba(0, 0, 0, 0)'&&m.cardColor===m.bodyColor);
  check(`${prefix}: dark content remains within viewport`,m.overflow<=1);
  await page.screenshot({path:`${out}/${prefix}-account-dark.png`});
  // Scroll the embedded list to its footer, then verify the action is visible/reachable.
  await page.locator('.sec-session-footer').scrollIntoViewIfNeeded();await page.waitForTimeout(180);
  const footer=await page.locator('.sec-session-footer').boundingBox(),scroll=await page.locator('.sc-scroller').boundingBox();
  check(`${prefix}: session actions are reachable`,footer.y>=scroll.y-1&&footer.y+footer.height<=scroll.y+scroll.height+1);
  await context.close();
 }
 check('no runtime errors',errors.length===0);await fs.writeFile(`${out}/results.json`,JSON.stringify({base,checks,measurements,errors},null,2));
}finally{await browser.close();}
