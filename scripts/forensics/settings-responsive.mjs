import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]||'http://localhost:3000',label=process.argv[3]||'before';
const dir=`docs/research/settings-responsive/${label}`;await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${base}/personalize?section=home&settings=general`,{waitUntil:'load'});await page.locator('.sc-frame').waitFor();await page.waitForTimeout(2200);
const results=[];
async function capture(theme,section){
  await page.locator('.sc-nav__item').filter({hasText:new RegExp(`^${section}$`)}).click();await page.waitForTimeout(1300);
  const measure=await page.evaluate(()=>{
    const box=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return{rect:[r.x,r.y,r.width,r.height],background:s.backgroundColor,color:s.color,fontSize:s.fontSize,border:s.border};};
    return {panel:box('.sc-overlay__panel'),scroller:box('.sc-scroller'),section:box('.sc-section'),label:box('.sc-row__label label'),hint:box('.sc-row__text p'),security:box('.sec-settings'),sectionOverflow:document.querySelector('.sc-scroller').scrollWidth-document.querySelector('.sc-scroller').clientWidth};
  });results.push({theme,sectionName:section,...measure});await page.screenshot({path:`${dir}/${theme}-${section.toLowerCase().replaceAll(' ','-')}.png`});
}
await capture('light','General');await capture('light','Where you log');
await page.locator('.sc-nav__item').filter({hasText:/^Appearance$/}).click();await page.waitForTimeout(900);await page.locator('[data-setting="theme"]').getByRole('button',{name:'Dark',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForTimeout(1400);
await capture('dark','General');await capture('dark','Where you log');
await fs.writeFile(`${dir}/measurements.json`,JSON.stringify({results,errors},null,2));console.log(results.map(r=>({theme:r.theme,section:r.section,panel:r.panel.rect,content:r.section.rect,font:r.label.fontSize,card:r.security.background})));await browser.close();
