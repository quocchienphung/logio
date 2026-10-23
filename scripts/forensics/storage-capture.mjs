import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='docs/research/storage/comparison';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://localhost:3000/personalize?section=storage');await page.locator('.storage-onboarding[open]').waitFor();await page.keyboard.press('Escape');
 for(const [subject,count] of [['Finance',4],['Banking',3],['SQL',2],['Data',2]]){
  await page.getByLabel('Upload knowledge area').selectOption(subject);
  const files=Array.from({length:count},(_,i)=>({name:`${subject.toLowerCase()}-${['research','reference','notes','guide'][i]}.${subject==='SQL'?'sql':i%2?'md':'txt'}`,mimeType:'text/plain',buffer:Buffer.from(`${subject} source document ${i+1}\n`+`${subject} analysis, source reference, recorded observations, knowledge library. `.repeat((i+1)*8))}));
  await page.locator('.stg-content>input[type=file]').setInputFiles(files);await page.getByRole('button',{name:'Process files',exact:true}).click();await page.getByText('Your review, before storage',{exact:true}).waitFor();await page.waitForTimeout(650);
  if(subject==='Finance')await page.screenshot({path:`${out}/local-review-1440.png`});
  await page.getByRole('button',{name:'Approve & store',exact:true}).click();await page.locator('.storage-run[data-status=completed]').waitFor();
 }
 await page.locator('.stg-page-head').scrollIntoViewIfNeeded();await page.waitForTimeout(700);await page.screenshot({path:`${out}/local-top-1440.png`});await page.locator('.stg-map').screenshot({path:`${out}/local-map.png`});
 await page.locator('.stg-map-tile[data-level="0"]').filter({hasText:'Finance'}).click({position:{x:20,y:8}});await page.waitForTimeout(650);await page.locator('.stg-map').screenshot({path:`${out}/local-map-drilled.png`});await page.locator('.stg-map-summary').getByRole('button',{name:'All knowledge'}).click();
 await page.locator('.stg-library').scrollIntoViewIfNeeded();await page.waitForTimeout(700);await page.screenshot({path:`${out}/local-library-1440.png`});
 await page.locator('.ui-as-user').click();await page.getByRole('menuitem',{name:'Dark mode',exact:true}).click();await page.locator('.stg-page-head').scrollIntoViewIfNeeded();await page.waitForTimeout(500);await page.screenshot({path:`${out}/local-dark-1440.png`});
 for(const width of [390,320,768,1920]){await page.setViewportSize({width,height:900});await page.locator('.stg-page-head').scrollIntoViewIfNeeded();await page.waitForTimeout(600);await page.screenshot({path:`${out}/local-dark-${width}.png`});}
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Storage guide',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:`${out}/local-guide-mobile.png`});
 console.log('Settled local captures ready.');
}finally{await browser.close();}
