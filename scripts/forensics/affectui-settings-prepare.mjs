import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out='docs/research/affectui-settings';
const dest='src/components/sites/affectui-settings';
await fs.mkdir(dest,{recursive:true});
await fs.copyFile(`${out}/styles.css`,`${dest}/settings-reference.css`);
await fs.copyFile(`${out}/icons.json`,`${dest}/icons.json`);
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
await page.goto('https://www.affectui.com/screens/settings-billing/full',{waitUntil:'networkidle'});
await page.waitForTimeout(1800);
await page.locator('.ui-um__spark').focus();
await page.keyboard.press('ArrowRight');
const days=[];
for(let index=0;index<30;index++){
  await page.waitForTimeout(25);
  days.push(await page.locator('.ui-um__daily-read').innerText());
  await page.keyboard.press('ArrowRight');
}
await fs.writeFile(`${out}/daily-samples.json`,JSON.stringify(days,null,2));
await fs.writeFile(`${dest}/usage-seed.json`,JSON.stringify(days.map(text=>({label:text.split(' · ')[0],value:text.includes('–') ? null : Number(text.match(/· ([\d,]+)/)?.[1].replaceAll(',',''))||null})),null,2));
console.log(days);
await browser.close();
