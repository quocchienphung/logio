// Visual timing and real workflows, using isolated browser storage. No UIArc API calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {createBlankProcess,createLibrary,createNode} from '../../src/components/sites/process/process-model.ts';

const base=process.argv[2]||'http://localhost:3013',out='docs/research/uiarc-interactions/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),safari=await webkit.launch();
const results=[],errors=[],evidence={},contexts=[];
const check=async(name,work)=>{try{await work();results.push({name,ok:true});console.log('PASS',name);}catch(error){results.push({name,ok:false,error:String(error.stack)});console.log('FAIL',name,String(error.stack));}};
const doc=createBlankProcess('Motion review');doc.id='motion-review';
doc.root=createNode({id:'motion-root',name:'Motion review block',approval:true,task:'Review the animation without changing approval rules.',sim:{durationMs:1000},children:[createNode({id:'child',name:'Follow-up',task:'Continue only after approval.',sim:{durationMs:1000}})]});
async function pageFor(options={},engine=browser){
 const context=await engine.newContext({viewport:{width:1440,height:1000},...options});contexts.push(context);
 await context.addInitScript(library=>localStorage.setItem('affectui:acme:process',JSON.stringify(library)),createLibrary([doc]));
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));return page;
}
async function capture(page,selector,action,label,duration=1200){
 await page.evaluate(({selector,duration})=>{
  const start=performance.now();window.__interactionFrames=[];window.__interactionDone=false;
  const frame=now=>{const node=document.querySelector(selector);if(node){const r=node.getBoundingClientRect(),s=getComputedStyle(node);window.__interactionFrames.push({at:now-start,x:r.x,y:r.y,width:r.width,height:r.height,opacity:Number(s.opacity),transform:s.transform,morphing:node.hasAttribute('data-morphing')});}if(now-start<duration)requestAnimationFrame(frame);else window.__interactionDone=true;};requestAnimationFrame(frame);
 },{selector,duration});
 await action();await page.waitForFunction(()=>window.__interactionDone);
 const frames=await page.evaluate(()=>window.__interactionFrames);await fs.writeFile(`${out}/${label}.json`,JSON.stringify(frames,null,2));return frames;
}
const settled=page=>page.waitForFunction(()=>{const n=document.querySelector('.proc-permissions');return n&&!n.hasAttribute('data-morphing');});
try{
 for(const [name,options,engine]of[['desktop',{},browser],['phone',{viewport:{width:390,height:844},hasTouch:true},browser],['webkit',{viewport:{width:390,height:844},hasTouch:true},safari]]){
  await check(`${name}: permission surface grows through intermediate sizes and folds back to the same Review chip`,async()=>{
   const page=await pageFor(options,engine);await page.goto(`${base}/personalize?section=process`);await page.locator('.pmap__block[data-root]').waitFor();
   const opening=await capture(page,'.proc-permissions',()=>page.locator('.agt__extra').getByRole('button',{name:'Run',exact:true}).click(),`${name}-permission-open`);
   const end=opening.at(-1);assert.ok(opening.some(f=>f.height<end.height*.5),'An actual compact-to-expanded size change is visible');
   assert.ok(new Set(opening.map(f=>Math.round(f.height))).size>10,'Many intermediate sizes, not a binary pop');
   assert.ok(opening.find(f=>f.at>350)?.height>opening[0].height+40);await settled(page);
   await page.screenshot({path:`${out}/${name}-expanded.png`});
   const folding=await capture(page,'.proc-permissions',()=>page.getByRole('button',{name:'Minimize permission requests'}).click(),`${name}-permission-fold`);
   assert.ok(folding.at(-1).height<folding[0].height*.4);assert.ok(new Set(folding.map(f=>Math.round(f.height))).size>10);
   assert.equal(await page.locator('.permission-request[role=dialog]').count(),0);
   const compact=await page.locator('.proc-permissions').boundingBox();
   const reopened=await capture(page,'.proc-permissions',()=>page.locator('.agt__sum-btn[data-kind=waiting]').click(),`${name}-permission-reopen`);
   assert.ok(reopened[0].height<end.height*.5);assert.ok(Math.abs(reopened.at(-1).height-end.height)<2);
   assert.ok(Math.abs(reopened[0].width-compact.width)<8,'Review reuses its existing surface rather than remounting full size');
   assert.equal(await page.locator('.proc-permissions .permission-request').evaluate(n=>document.activeElement===n),true);
   const viewport=page.viewportSize();assert.ok(end.x>=0&&end.y>=0&&end.x+end.width<=viewport.width+1&&end.y+end.height<=viewport.height+1);
   const dock=await page.locator('.proc-dock').boundingBox();assert.ok(end.y+end.height<=dock.y);
   evidence[name]={first:opening[0],middle:opening.find(f=>f.at>350),last:end,uniqueHeights:new Set(opening.map(f=>Math.round(f.height))).size};
   await page.locator('.proc-permissions').getByRole('button',{name:'Allow once',exact:true}).click();await page.getByText('Allowed just once',{exact:true}).waitFor();
   await settled(page);assert.ok((await page.locator('.proc-permissions').boundingBox()).height<end.height*.5);
   await page.context().close();
  });
 }
 await check('A rapid reversal retargets a growing permission surface; no duplicate dialog or lost waiting task',async()=>{
  const page=await pageFor();await page.goto(`${base}/personalize?section=process`);await page.locator('.pmap__block[data-root]').waitFor();await page.locator('.agt__extra').getByRole('button',{name:'Run',exact:true}).click();await settled(page);
  await page.getByRole('button',{name:'Minimize permission requests'}).click();await settled(page);await page.getByRole('button',{name:/1 permission request/}).click();await page.waitForTimeout(160);
  await page.getByRole('button',{name:'Minimize permission requests'}).focus();await page.keyboard.press('Space');await settled(page);
  assert.equal(await page.locator('.proc-permissions').count(),1);assert.equal(await page.locator('.proc-permissions--minimized').count(),1);assert.match(await page.locator('.agt__sum-btn[data-kind=waiting]').innerText(),/1 needs you/);
 });
 await check('Reduced motion opens immediately without size animation and keeps the decision keyboard behavior',async()=>{
  const page=await pageFor({reducedMotion:'reduce'});await page.goto(`${base}/personalize?section=process`);await page.locator('.pmap__block[data-root]').waitFor();await page.locator('.agt__extra').getByRole('button',{name:'Run',exact:true}).click();
  const card=page.locator('.permission-request');await card.waitFor();assert.equal(await page.locator('.proc-permissions').getAttribute('data-morphing'),null);
  assert.equal(await page.locator('.proc-permissions').evaluate(n=>n.getAnimations().filter(a=>a.effect.getKeyframes().some(k=>'height'in k)).length),0);
  await card.focus();await page.keyboard.press('Escape');await page.getByText('Denied',{exact:true}).waitFor();
 });
 await check('Workspace menus scale in, retain an inert exit, glide with the pointer and jump immediately for keyboard input',async()=>{
  const page=await pageFor();await page.goto(`${base}/personalize?section=usage`);await page.locator('.ui-sb').waitFor();
  const opening=await capture(page,'.ui-as-user-menu [data-interaction-menu]',()=>page.locator('.ui-as-user').click(),'workspace-menu-open',750);
  assert.ok(opening.some(f=>f.opacity<.8));assert.equal(opening.at(-1).opacity,1);
  const menu=page.locator('.ui-as-user-menu [data-interaction-menu]'),rows=menu.locator('.ui-as-menu__item');
  await rows.first().hover();await page.waitForTimeout(650);const highlight=menu.locator('[data-interaction-highlight]');const first=await highlight.evaluate(n=>getComputedStyle(n).transform);
  await rows.last().hover();await page.waitForTimeout(55);const middle=await highlight.evaluate(n=>getComputedStyle(n).transform);await page.waitForTimeout(650);const last=await highlight.evaluate(n=>getComputedStyle(n).transform);assert.notEqual(first,last);assert.notEqual(middle,first);assert.notEqual(middle,last);
  await rows.first().focus();await page.keyboard.press('ArrowDown');assert.equal(await highlight.evaluate(n=>n.getAnimations().filter(a=>a.playState==='running'&&a.effect.getKeyframes().some(k=>'transform'in k)).length),0);
  await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('inert'),'');await menu.waitFor({state:'detached'});
 });
 await check('Settings menu selection remains keyboard operable after the animated exit lifecycle',async()=>{
  const page=await pageFor();await page.goto(`${base}/personalize?section=usage`);await page.locator('.ui-sb').waitFor();await page.getByRole('tab',{name:'General',exact:true}).click();
  const trigger=page.getByRole('button',{name:'Europe (Frankfurt)',exact:true});await trigger.focus();await page.keyboard.press('ArrowDown');await page.getByRole('menu').last().waitFor();await page.keyboard.press('End');await page.keyboard.press('Enter');assert.match(await page.locator('.ui-sb').innerText(),/Asia Pacific \(Singapore\)/);
 });
 await check('Press feedback uses the observed scale and releases; popup anchors remain steady',async()=>{
  const page=await pageFor();await page.goto(`${base}/personalize?section=process`);await page.locator('.pmap__block[data-root]').waitFor();const button=page.getByRole('button',{name:'Tidy up the map',exact:true}),box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(150);const scale=await button.evaluate(n=>Number(getComputedStyle(n).scale));assert.ok(scale>.95&&scale<.98,`Icon press scale ${scale}`);await page.mouse.up();await page.waitForTimeout(650);assert.ok(await button.evaluate(n=>getComputedStyle(n).scale==='none'||Number(getComputedStyle(n).scale)===1));
  const anchor=page.getByRole('button',{name:'Add block',exact:true}),r=await anchor.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(140);assert.ok(await anchor.evaluate(n=>getComputedStyle(n).scale==='none'||Number(getComputedStyle(n).scale)===1));await page.mouse.up();
 });
 await check('Desktop and phone marketing navigation animate with reachable links and close cleanly',async()=>{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await pageFor({viewport});await page.goto(base);if(viewport.width<500)await page.getByRole('button',{name:/menu/i}).first().click();else await page.locator('.hds-navigation-menu__trigger').first().hover();
   await page.locator('.hds-navigation-menu__popup[data-status=open]').waitFor();await page.waitForTimeout(650);assert.ok(await page.locator('.hds-navigation-menu__popup a:visible').count()>3);await page.keyboard.press('Escape');await page.locator('.hds-navigation-menu__popup').waitFor({state:'detached'});
  }
 });
 await check('Legacy and HDS product dropdowns keep their content through the exit and restore trigger focus',async()=>{
  for(const [route,selector]of[['/invoicing','.ProductNavDropdownItem__trigger'],['/billing/subscriptions','.hero-static-subnav .hero-subnav-dropdown-item__trigger']]){
   const page=await pageFor();await page.goto(`${base}${route}`,{waitUntil:'networkidle'});const trigger=page.locator(selector).first();await trigger.waitFor();await trigger.hover();
   await page.waitForTimeout(650);assert.equal(await trigger.getAttribute('aria-expanded'),'true',route);const menu=page.locator('[data-interaction-menu]:not([hidden])').first();await menu.waitFor();assert.ok(await menu.locator('a').count()>0);
   await trigger.focus();await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await menu.getAttribute('inert'),'');
   await page.waitForTimeout(180);assert.equal(await page.locator('[data-interaction-menu]:not([hidden])').count(),0);assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);
  }
 });
 await check('The homepage time-of-day menu keeps list semantics and supports Arrow/End/Enter selection',async()=>{
  const page=await pageFor();await page.goto(base);const trigger=page.getByRole('combobox',{name:/Choose a time of day/});await trigger.scrollIntoViewIfNeeded();await trigger.focus();await page.keyboard.press('ArrowDown');await page.getByRole('listbox',{name:'Time of day'}).waitFor();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.locator('.time-of-day-select__menu').waitFor({state:'detached'});assert.equal(await trigger.getAttribute('data-value'),'night');assert.equal(await trigger.evaluate(n=>document.activeElement===n),true);
 });
 await check('An idle model menu makes no repeated trigger geometry reads, and stays anchored after resize',async()=>{
  const page=await pageFor();await page.goto(`${base}/personalize?section=new-chat`);await page.locator('.mp__trigger').click();await page.waitForTimeout(750);
  await page.evaluate(()=>{window.__modelReads=0;const original=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){if(this.matches('.mp__trigger'))window.__modelReads++;return original.call(this);};});
  await page.waitForTimeout(1000);const reads=await page.evaluate(()=>window.__modelReads);assert.equal(reads,0);evidence.idleModelTriggerReadsPerSecond=reads;
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);const box=await page.locator('.mp__pop').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391&&box.y>=0&&box.y+box.height<=845,JSON.stringify(box));
 });
 await check('Shared interaction tokens load across public pages and every workspace section without runtime errors',async()=>{
  const page=await pageFor();
  const routes=['/','/billing','/billing/subscriptions','/billing/usage-based-billing','/managed-payments','/payments','/payments/checkout','/payments/payment-links','/payments/payment-methods','/payments/elements','/payments/link','/invoicing','/terminal','/tax','/sigma','/data-pipeline','/financial-connections','/authorization-boost','/revenue-recognition','/guide','/personalize?section=companies&crm-view=Sales%20docs',...['home','companies','contacts','deals','reports','settings','run','mapping','invoice','process','tracing','new-chat','files','new-business','renewals','partnerships'].map(section=>`/personalize?section=${section}`)];
  evidence.routes=[];
  for(const route of routes){const response=await page.goto(`${base}${route}`);assert.ok(response.status()<400,`${route}: ${response.status()}`);await page.waitForTimeout(120);assert.ok(await page.locator('body').innerText());const duration=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--interaction-duration-spring').trim());assert.equal(parseFloat(duration)*(duration.endsWith('ms')?1:1000),580);evidence.routes.push(route);}
 });
 await check('No uncaught runtime errors',()=>assert.deepEqual(errors,[]));
}finally{
 for(const context of contexts)await context.close();await browser.close();await safari.close();
 await fs.writeFile(`${out}/report.json`,JSON.stringify({date:new Date().toISOString(),base,results,evidence,errors,note:'Public preview geometry/timings, adapted locally. No claim of physical iPhone FPS or access to gated KPI source.'},null,2));
}
console.log(`${results.filter(r=>r.ok).length}/${results.length} checks passed`);if(results.some(r=>!r.ok))process.exitCode=1;
