import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.argv[2]||'http://localhost:3013',results=[],errors=[];
for(const [name,launch]of[['Chromium',()=>chromium.launch({channel:'chrome'})],['WebKit',()=>webkit.launch()]]){
 const browser=await launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/personalize?section=reports`,{waitUntil:'networkidle'});const trigger=page.locator('.ui-as-user');await trigger.click();
  const menu=page.locator('.ui-as-user-menu [data-interaction-menu]');await menu.waitFor();await menu.getByRole('menuitemradio').first().focus();await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);await menu.waitFor({state:'detached'});
  await trigger.click();await menu.waitFor();await menu.getByRole('menuitemradio').first().focus();await page.keyboard.press('ControlOrMeta+k');
  const search=page.getByRole('textbox',{name:'Search workspace',exact:true});await search.waitFor();await page.waitForTimeout(250);assert.equal(await search.evaluate(n=>document.activeElement===n),true);
  results.push({engine:name,pass:true,escapeRestoresTrigger:true,newDialogKeepsFocus:true});console.log('PASS',name,'animated menu keyboard, exit focus and new-dialog focus');
 }finally{await browser.close();}
}
assert.deepEqual(errors,[]);await fs.writeFile('docs/research/uiarc-interactions/qa/menu-focus.json',JSON.stringify({base,results,errors},null,2));
