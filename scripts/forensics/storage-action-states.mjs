import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('https://uiarc.dev/components/action-button',{waitUntil:'networkidle'});
 const root=page.locator('#preview-canvas'); await root.scrollIntoViewIfNeeded();
 await root.getByRole('button').click();
 const frames=[]; let previous=0;
 for(const at of [180,700,1400,2200,3600]) {
  await page.waitForTimeout(at-previous); previous=at;
  frames.push({at,...await root.evaluate(e=>({text:e.innerText,svg:e.querySelector('svg')?.outerHTML}))});
  await root.screenshot({path:`docs/research/storage/buttons/action-button-at-${at}.png`});
 }
 await fs.writeFile('docs/research/storage/buttons/action-timed.json',JSON.stringify(frames,null,2));
 console.log(frames.map(f=>({at:f.at,text:f.text})));
} finally {await browser.close();}
