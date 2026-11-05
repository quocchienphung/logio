import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
try {
 const page = await browser.newPage({ viewport:{width:1440,height:1000} });
 await page.goto('https://uiarc.dev/components/icon-morph',{waitUntil:'networkidle'});
 const root=page.locator('#preview-canvas'); await root.scrollIntoViewIfNeeded();
 const states=[];
 for(let i=0;i<8;i++) {
  await root.locator('button').nth(i).click(); await page.waitForTimeout(600);
  states.push(await root.locator('button').nth(i).evaluate(e=>({label:e.getAttribute('aria-label'),text:e.innerText,svg:e.querySelector('svg')?.outerHTML})));
 }
 await root.screenshot({path:'docs/research/storage/buttons/icon-active-pairs.png'});
 await fs.writeFile('docs/research/storage/buttons/icon-active-pairs.json',JSON.stringify(states,null,2));
 console.log(states.map(s=>s.text));
} finally {await browser.close();}
