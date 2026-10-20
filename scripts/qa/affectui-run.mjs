import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import { goToSection } from './lib/nav.mjs';
const base=process.argv[2]||'http://localhost:3000';
const out='docs/research/affectui-run/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();page.setDefaultTimeout(15000);
const errors=[],passed=[];page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();passed.push(name);console.log(`PASS ${name}`);};
const nav=name=>goToSection(page,name,450);
const options=async name=>{await page.getByRole('button',{name:'Run options',exact:true}).click();await page.getByRole('menuitem',{name,exact:true}).click();};
const readRun=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('affectui:acme:agent-run')));
try{
  await page.goto(`${base}/personalize?section=run`,{waitUntil:'networkidle'});await page.locator('.ui-ar').waitFor();await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await check('Run follows Reports and renders actual interactive DOM',async()=>{
    const labels=await page.locator('.workspace-nav-label').allTextContents();assert.deepEqual(labels,['Run','Settings']);assert.equal(await page.locator('.ui-pl__step').count(),5);assert.equal(await page.locator('.ui-ar iframe,.ui-ar img,canvas').count(),0);assert.equal(await page.locator('.ui-df__chg').count(),9);
  });
  await check('Simulation advances sequentially and gates email/calendar on approval',async()=>{
    await page.getByRole('button',{name:'Approve',exact:true}).waitFor();const run=await readRun();assert.equal(run.phase,'waiting');assert.equal(run.states.draft.status,'done');assert.equal(run.states.send.completedCalls,0);assert.equal(run.states.review.status,'pending');assert.equal(await page.locator('.ui-tc-group').count(),3);
    const elapsed=await page.locator('.ui-pl__elapsed').textContent();await page.waitForTimeout(1200);assert.notEqual(await page.locator('.ui-pl__elapsed').textContent(),elapsed);assert.equal((await readRun()).elapsed,run.elapsed);
  });
  await check('Escape denies approval, stops later tools, and freezes stopped UI',async()=>{
    await page.getByRole('button',{name:'Deny',exact:true}).focus();await page.keyboard.press('Escape');await page.waitForTimeout(700);assert.equal(await page.locator('.ui-ar').getAttribute('data-phase'),'stopped');const run=await readRun();assert.equal(run.approvals.send,'denied');assert.equal(run.states.review.status,'pending');assert.match(await page.locator('.ui-ap').innerText(),/Denied/);
    const elapsed=await page.locator('.ui-ar__time').innerText();await page.waitForTimeout(1100);assert.equal(await page.locator('.ui-ar__time').innerText(),elapsed);
  });
  await check('Retry requests approval again; Ctrl+Enter finishes all eight tools',async()=>{
    await page.getByRole('button',{name:'Retry from here',exact:true}).click();await page.getByRole('button',{name:'Approve',exact:true}).waitFor();await page.keyboard.press('Control+Enter');await page.waitForFunction(()=>document.querySelector('.ui-ar')?.getAttribute('data-phase')==='done');
    const run=await readRun();assert.equal(run.approvals.send,'approved');assert.equal(Object.values(run.states).filter(s=>s.status==='done').length,5);assert.equal(Object.values(run.states).reduce((n,s)=>n+s.completedCalls,0),8);assert.match(await page.locator('.ui-ar__feed').innerText(),/You approved this step/);assert.equal(await page.locator('.ui-ar__pill').innerText(),'Done');
    await page.screenshot({path:`${out}/local-done.png`});
  });
  await check('Run options keyboard navigation, real clipboard link and dismissal',async()=>{
    const button=page.getByRole('button',{name:'Run options',exact:true});await button.focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(50);assert.match(await page.locator(':focus').innerText(),/Copy run link/);await page.keyboard.press('Enter');assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/section=run/);
    await button.focus();await page.keyboard.press('ArrowUp');await page.waitForTimeout(50);assert.match(await page.locator(':focus').innerText(),/Edit plan/);await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');assert.equal(await button.evaluate(el=>el===document.activeElement),true);
  });
  await check('Share downloads real run JSON; conversation displays actual workflow data',async()=>{
    await options('Share');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download snapshot',exact:true}).click();const download=await pending,chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));assert.equal(data.phase,'done');assert.equal(data.simulation,true);assert.equal(data.states.review.completedCalls,1);assert.match(data.draft,/Revenue grew 18/);await page.keyboard.press('Escape');
    await options('View in Chat');assert.match(await page.locator('dialog[open]').innerText(),/Sent to maya@acme.com/);assert.match(await page.locator('dialog[open]').innerText(),/Rewrote the revenue paragraph/);await page.keyboard.press('Escape');
  });
  await check('Refresh preserves completed workflow and rerun resets reviewed draft',async()=>{
    await page.getByRole('button',{name:'Accept all',exact:true}).click();await page.reload({waitUntil:'networkidle'});await page.locator('.ui-ar').waitFor();assert.equal(await page.locator('.ui-ar').getAttribute('data-phase'),'done');assert.match(await page.locator('.ui-df').innerText(),/All changes reviewed/);
    await page.getByRole('button',{name:'Run again',exact:true}).click();await page.waitForTimeout(650);assert.equal(await page.locator('.ui-df__chg').count(),9);assert.equal(await page.locator('.ui-ar').getAttribute('data-phase'),'running');await page.getByRole('button',{name:'Stop run',exact:true}).click();
  });
  await check('Workspace progress and draft remain isolated',async()=>{
    await page.locator('.ui-as-side__workspace').click();await page.getByRole('menuitemradio',{name:/Personal Free/}).click();await page.waitForTimeout(350);assert.equal(await page.locator('.ui-ar').getAttribute('data-phase'),'running');await page.getByRole('button',{name:'Stop run',exact:true}).click();
    await page.locator('.ui-as-side__workspace').click();await page.getByRole('menuitemradio',{name:/Acme Pro/}).click();await page.waitForTimeout(350);assert.equal(await page.locator('.ui-ar').getAttribute('data-phase'),'stopped');assert.match(await page.locator('.ui-pl').innerText(),/Stopped by you/);
  });
  await check('Mobile overlay has working close, focus trap and no page overflow',async()=>{
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(450);if(await page.getByRole('button',{name:'Close side panel',exact:true}).isVisible())await page.getByRole('button',{name:'Close side panel',exact:true}).click();await page.getByRole('button',{name:'Show side panel',exact:true}).tap();await page.waitForTimeout(450);
    assert.equal(await page.locator('#run-side-panel').getAttribute('aria-modal'),'true');assert.equal(await page.locator('.ui-ar__main').getAttribute('inert'),'');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const close=page.getByRole('button',{name:'Close side panel',exact:true});await close.focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#run-side-panel').evaluate(el=>el.contains(document.activeElement)),true);await close.tap();assert.equal(await page.locator('#run-side-panel').isVisible(),false);assert.equal(await page.getByRole('button',{name:'Show side panel',exact:true}).evaluate(el=>el===document.activeElement),true);
  });
  await check('Mobile approval panel opens on request; reduced motion and theme retain controls',async()=>{
    await page.getByRole('button',{name:'Run again',exact:true}).tap();await page.locator('.ui-ar__pill[data-phase="waiting"]').waitFor();await page.getByRole('button',{name:'Show side panel',exact:true}).tap();await page.getByRole('button',{name:'Approve',exact:true}).waitFor();assert.equal(await page.locator('#run-side-panel').isVisible(),true);await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.ui-ar__pill > span').evaluate(el=>getComputedStyle(el).animationIterationCount),'1');
    await page.getByRole('button',{name:'Approve',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('.ui-ar')?.getAttribute('data-phase')==='done');await page.screenshot({path:`${out}/local-mobile-panel.png`});await page.getByRole('button',{name:'Close side panel',exact:true}).tap();await page.getByRole('button',{name:'Open sidebar',exact:true}).click();await page.waitForTimeout(450);await page.locator('.ui-as-user').click();await page.getByRole('menuitem',{name:'Dark mode',exact:true}).click();assert.equal(await page.locator('.crm-page').getAttribute('data-theme'),'dark');await nav('Run');await page.getByRole('button',{name:'Show side panel',exact:true}).tap();await page.waitForTimeout(250);await page.screenshot({path:`${out}/local-dark.png`});
  });
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({passed,errors},null,2));
}finally{await browser.close();}
