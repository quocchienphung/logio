import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'docs/research/storage/buttons';
const browser = await chromium.launch({ channel: 'chrome' });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 const evidence = {};
 const read = () => page.locator('#preview-canvas').evaluate(el => ({ text: el.innerText, svg: [...el.querySelectorAll('svg')].map(e => e.outerHTML), controls: [...el.querySelectorAll('button')].map(e => ({text:e.innerText, label:e.getAttribute('aria-label'), style:getComputedStyle(e).cssText, rect:JSON.stringify(e.getBoundingClientRect())})) }));
 await page.goto('https://uiarc.dev/components/expanding-button-group', {waitUntil:'networkidle'});
 await page.locator('#preview-canvas').scrollIntoViewIfNeeded();
 await page.getByRole('button',{name:'Forward',exact:true}).hover();
 await page.waitForTimeout(600);
 evidence.expandingHover = await read();
 await page.locator('#preview-canvas').screenshot({path:`${out}/expanding-hover.png`});
 await page.goto('https://uiarc.dev/components/icon-morph', {waitUntil:'networkidle'});
 evidence.iconSVG = await read();
 await page.goto('https://uiarc.dev/components/confirm-morph', {waitUntil:'networkidle'});
 await page.locator('#preview-canvas').scrollIntoViewIfNeeded();
 for(const mode of ['Click','Hold','Countdown']) {
   await page.goto('https://uiarc.dev/components/confirm-morph', {waitUntil:'networkidle'});
   await page.locator('#preview-canvas').scrollIntoViewIfNeeded();
   await page.getByRole('button',{name:mode,exact:true}).click();
   await page.getByRole('button',{name:'Delete project',exact:true}).click();
   await page.waitForTimeout(600);
   evidence[`${mode}Open`] = await read();
   await page.locator('#preview-canvas').screenshot({path:`${out}/confirm-${mode.toLowerCase()}-open.png`});
   const confirm = page.locator('#preview-canvas button').filter({hasText:/^(Delete|Hold to delete|Hold to confirm|Confirm)/}).last();
   if(mode==='Hold') { const box=await confirm.boundingBox(); if(box){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(2200);await page.mouse.up();} }
   else if(mode==='Click') await page.locator('#preview-canvas').getByRole('button',{name:'Delete',exact:true}).click();
   else {
     await page.locator('#preview-canvas').getByRole('button',{name:'Delete',exact:true}).click();
     for(const delay of [200,900,1000,1800]) { await page.waitForTimeout(delay); evidence[`CountdownAt${delay}`] = await read(); await page.locator('#preview-canvas').screenshot({path:`${out}/confirm-countdown-${delay}.png`}); }
   }
   await page.waitForTimeout(250);
   evidence[`${mode}After`] = await read();
   await fs.writeFile(`${out}/motion.json`,JSON.stringify(evidence,null,2));
   await page.locator('#preview-canvas').screenshot({path:`${out}/confirm-${mode.toLowerCase()}-after.png`});
   await page.waitForTimeout(2500);
 }
 await fs.writeFile(`${out}/motion.json`,JSON.stringify(evidence,null,2));
 console.log(Object.fromEntries(Object.entries(evidence).map(([k,v])=>[k,v.text])));
} finally {await browser.close();}
