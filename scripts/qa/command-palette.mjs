import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.argv[2]||'http://localhost:3000';const out='docs/research/command-palette/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
const checks=[],errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const check=(label,ok)=>{assert.ok(ok,label);checks.push(label);console.log(`PASS ${label}`);};
const dialog=()=>page.getByRole('dialog',{name:'Navigate pages',exact:true});
const input=()=>page.getByRole('combobox',{name:'Navigate pages',exact:true});
async function visit(route){await page.goto(`${base}${route}`,{waitUntil:'load'});await page.locator('.cp-dialog').waitFor({state:'attached'});await page.waitForFunction(()=>document.querySelector('.cp-dialog')?.getAttribute('data-ready')==='true');}
async function open(){await page.keyboard.press('Tab');await dialog().waitFor();await page.waitForTimeout(750);}
async function close(){if(await input().count())await input().fill('');await page.keyboard.press('Escape');await dialog().waitFor({state:'hidden'});}
async function query(value){await input().fill(value);await page.waitForTimeout(900);}
try{
  await visit('/');
  for(const key of ['Shift+Tab','Control+Tab','Alt+Tab','Control+k','Meta+k']){
    // Native browser tab/window shortcuts cannot be delivered in headless Chrome; Shift+Tab and
    // Ctrl/Cmd+K still exercise the event guard without adding a second app shortcut.
    if(['Control+Tab','Alt+Tab'].includes(key))continue;
    await page.keyboard.press(key);check(`${key} does not open navigator`,await dialog().count()===0);
  }
  await open();check('bare Tab opens a modal and focuses search',await input().evaluate(e=>e===document.activeElement));
  const rect=await page.locator('.cp-palette').boundingBox();console.log('panel bounds',rect);check('desktop panel matches 440 × 398 reference dimensions',Math.abs(rect.width-440)<.1&&Math.abs(rect.height-398)<.1);
  check('panel is centered on both axes',Math.abs(rect.x+rect.width/2-720)<1&&Math.abs(rect.y+rect.height/2-500)<1);
  const initialHighlight=await page.locator('.cp-highlight').boundingBox(),initialRow=await page.getByRole('option').first().boundingBox();
  check('initial highlight is visible on the first result',initialHighlight.height===38&&Math.abs(initialHighlight.y-initialRow.y)<.5);
  const destinations=await page.getByRole('option').evaluateAll(es=>es.map(e=>({label:e.textContent,href:e.dataset.href})));
  const routes=[];async function walk(dir,parts=[]){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(entry.isDirectory()&&!entry.name.startsWith('[')&&!entry.name.startsWith('_'))await walk(path.join(dir,entry.name),entry.name.startsWith('(')?parts:[...parts,entry.name]);else if(entry.name==='page.tsx')routes.push('/'+parts.join('/'));}}
  await walk('src/app');
  for(const route of routes)check(`catalog covers route ${route}`,destinations.some(d=>new URL(d.href,base).pathname===route));
  const source=await fs.readFile('src/components/sites/affectui-crm/workspace-state.ts','utf8');
  const sections=JSON.parse(source.match(/workspaceSections = (\[[^\]]+\])/)[1]);
  for(const section of sections){const value=section.toLowerCase().replaceAll(' ','-');check(`catalog covers workspace ${section}`,destinations.some(d=>section==='Skilled'?d.href==='/skilled':new URL(d.href,base).searchParams.get('section')===value));}
  check('catalog has unique destinations',new Set(destinations.map(d=>d.href)).size===destinations.length);
  check('all option IDs are valid single ARIA references',await page.getByRole('option').evaluateAll(es=>es.every(e=>e.id&&!/\s/.test(e.id))));
  await page.screenshot({path:`${out}/desktop.png`});
  const first=await input().getAttribute('aria-activedescendant');await page.keyboard.press('ArrowDown');await page.waitForTimeout(550);
  check('arrows move active result while input keeps focus',await input().getAttribute('aria-activedescendant')!==first&&await input().evaluate(e=>e===document.activeElement));
  await page.keyboard.press('End');await page.waitForTimeout(550);
  check('End reaches last result and scrolls it into view',await page.locator('.cp-results').evaluate(e=>e.scrollTop>0));
  await page.keyboard.press('Home');await page.waitForTimeout(550);check('Home returns to first result',await input().getAttribute('aria-activedescendant')===first);
  const item=page.getByRole('option').filter({hasText:'Explore pages'});await item.hover();await page.waitForTimeout(500);
  check('hover updates selection without stealing input focus',await item.getAttribute('aria-selected')==='true'&&await input().evaluate(e=>e===document.activeElement));
  await query('Process');check('label prefix ranks first',await page.getByRole('option').first().getAttribute('data-href')==='/personalize?section=process');
  await input().evaluate(e=>e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true,isComposing:true})));
  check('IME composition Escape preserves query and modal',await input().inputValue()==='Process'&&await dialog().count()===1);
  check('matched label letters are emphasized',await page.getByRole('option').first().locator('.cp-label strong').count()===7);
  await query('prcs');check('ordered-letter matching finds Process',await page.getByRole('option').filter({hasText:'Process'}).count()>0);
  await query('quy trinh');check('Vietnamese aliases match without accents',await page.getByRole('option').first().getAttribute('data-href')==='/personalize?section=process');
  await query('process qzxxzz');check('every query word must match',await page.getByRole('option').count()===0);
  await query('qzxxzz');await page.locator('.cp-palette').screenshot({path:`${out}/empty.png`});check('empty state matches reference height',(await page.locator('.cp-palette').boundingBox()).height===203);
  check('no results removes active descendant',await input().getAttribute('aria-activedescendant')===null);
  await page.keyboard.press('Enter');check('Enter with no results keeps panel open',await dialog().count()===1);
  await page.keyboard.press('Escape');check('first Escape clears query',await input().inputValue()===''&&await dialog().count()===1);
  await page.keyboard.press('Escape');await dialog().waitFor({state:'hidden'});check('second Escape closes',await dialog().count()===0);
  const field=page.locator('input').first();if(await field.count()){await field.focus();await open();await close();check('closing restores previous editable focus',await field.evaluate(e=>e===document.activeElement));}
  await open();await page.mouse.click(20,20);await dialog().waitFor({state:'hidden'});check('backdrop closes modal',await dialog().count()===0);
  await open();await query('qzxxzz');await page.getByRole('button',{name:'Clear search',exact:true}).click();check('clear button resets results and refocuses input',await input().inputValue()===''&&await input().evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Tab');check('Tab stays inside open modal',await page.evaluate(()=>document.querySelector('.cp-dialog').contains(document.activeElement)));
  await close();
  // Dispatch from a real palette selection and verify the resulting page, not just the URL.
  await open();await query('Process');await page.keyboard.press('Enter');await page.waitForURL(/section=process/);await page.locator('.proc-workspace').waitFor({timeout:30000});
  check('homepage → Process navigation works',new URL(page.url()).searchParams.get('section')==='process');
  await page.evaluate(()=>{window.__paletteNavigationSentinel=1;});
  await open();await query('Contacts');await page.keyboard.press('Enter');await page.waitForURL(/section=contacts/);await dialog().waitFor({state:'hidden'});
  check('workspace navigation preserves document state',await page.evaluate(()=>window.__paletteNavigationSentinel===1));
  await page.locator('.ui-as-user').click();await page.getByRole('menuitem',{name:'Search',exact:true}).click();
  const underlying=page.getByRole('dialog',{name:'Search workspace',exact:true});await underlying.waitFor();
  const underlyingInput=underlying.locator('input');await underlyingInput.focus();await open();
  check('Tab opens above an existing native modal',await input().evaluate(e=>e===document.activeElement));await close();
  check('closing restores the underlying native modal and input',await underlying.isVisible()&&await underlyingInput.evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Escape');await underlying.waitFor({state:'hidden'});
  await open();await query('Where you log');await page.keyboard.press('Enter');await page.waitForURL(/settings=where-you-log/);await dialog().waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'Where you log',exact:true}).waitFor({timeout:30000});
  check('settings destination opens correct section',await page.getByRole('heading',{name:'Where you log',exact:true}).count()>0);
  check('Settings opens over the current workspace page',new URL(page.url()).searchParams.get('section')==='contacts');
  // Tab opens on top of an existing Settings overlay; Escape must leave that overlay intact.
  await open();await close();check('Escape does not close the underlying Settings',new URL(page.url()).searchParams.get('settings')==='where-you-log');
  await visit('/payments/checkout');await open();check('palette works on a product page',await input().count()===1);await close();
  await visit('/personalize?browse=1');await open();check('palette works on Explore pages',await input().count()===1);await close();
  await visit('/skilled');await open();check('palette works on Skilled',await input().count()===1);await close();
  await visit('/');
  for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
    await page.setViewportSize(size);await open();const r=await page.locator('.cp-palette').boundingBox();
    check(`${size.width} × ${size.height} fits and stays centered`,r.x>=0&&r.x+r.width<=size.width&&r.y>=0&&r.y+r.height<=size.height&&Math.abs(r.y+r.height/2-size.height/2)<1);
    if(size.width<480)check('phone hides opening shortcut hint',await page.locator('.cp-key').evaluate(e=>getComputedStyle(e).display==='none'));
    await page.screenshot({path:`${out}/viewport-${size.width}-${size.height}.png`});await close();
  }
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await open();
  check('reduced motion has no travel or scale',await page.locator('.cp-palette').evaluate(e=>getComputedStyle(e).transform==='none'));
  await close();await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');await open();check('palette follows dark theme',await dialog().getAttribute('data-theme')==='dark');await page.screenshot({path:`${out}/dark.png`});await close();
  check('no runtime errors',errors.length===0);check('no calls to UIArc services',requests.every(url=>!new URL(url).hostname.endsWith('uiarc.dev')));
  await fs.writeFile(`${out}/results.json`,JSON.stringify({base,checks,errors,destinations},null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser.close();}
