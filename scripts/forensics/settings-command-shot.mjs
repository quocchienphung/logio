import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// Screenshots of the local Settings page (usage: node scripts/forensics/settings-command-shot.mjs [base-url])
const base=process.argv[2]||'http://localhost:3000';
const directory='docs/research/uiarc-settings-command/qa';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const [label,width,height] of [['d1440',1440,1000],['m390',390,844]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(`${base}/personalize?section=settings`,{waitUntil:'networkidle'});
    await page.waitForSelector('.sc-frame',{timeout:30000});
    await page.waitForTimeout(1200);
    await page.screenshot({path:`${directory}/local-${label}-page.png`});
    await page.locator('.sc').first().screenshot({path:`${directory}/local-${label}-rest.png`});
    console.log(label,'errors',errors);
    await page.close();
  }
} finally {await browser.close();}
