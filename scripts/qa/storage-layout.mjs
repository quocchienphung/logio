import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const base=process.argv[2]||'http://localhost:3000',out='docs/research/storage/layout-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(12000);
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS',name);};
const combo=label=>page.getByRole('combobox',{name:label,exact:true});
const uploadCombo=()=>combo('Upload knowledge area');
const choose=async(label,value)=>{await combo(label).click();await page.getByRole('option',{name:value,exact:true}).click();};
const gap=()=>page.evaluate(()=>document.querySelector('.stg-library').getBoundingClientRect().top-document.querySelector('.stg-map').getBoundingClientRect().bottom);
try{
  await page.goto(`${base}/personalize?section=storage`);
  await page.locator('.storage-onboarding[open]').waitFor();await page.keyboard.press('Escape');
  await page.locator('.storage-onboarding[open]').waitFor({state:'hidden'});
  await check('Knowledge area uses the animated listbox with keyboard, typeahead, selection and Escape focus return',async()=>{
    await uploadCombo().click();await page.getByRole('option',{name:'Banking',exact:true}).click();
    assert.equal(await uploadCombo().innerText(),'Banking');
    await uploadCombo().focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('s');await page.keyboard.press('Enter');
    assert.equal(await uploadCombo().innerText(),'SQL');
    await uploadCombo().click();await page.getByRole('listbox').waitFor();await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.querySelector('[role=combobox][aria-label="Upload knowledge area"]')?.getAttribute('aria-expanded')==='false');
    assert.equal(await uploadCombo().getAttribute('aria-expanded'),'false');
    await page.waitForFunction(()=>document.activeElement?.matches('[role=combobox][aria-label="Upload knowledge area"]'));
    assert.equal(await uploadCombo().evaluate(el=>el===document.activeElement),true);
  });
  const before=await gap();
  await page.locator('.stg-content>input[type=file]').setInputFiles(Array.from({length:25},(_,i)=>({name:`knowledge-${String(i).padStart(2,'0')}.txt`,mimeType:'text/plain',buffer:Buffer.from(`Source ${i}. Finance banking SQL data reference. ${'Knowledge for testing upload layout. '.repeat(12)}`)})));
  await page.waitForTimeout(600);
  await check('25 queued files scroll inside a bounded list and do not push Documents away from its map',async()=>{
    const sizes=await page.locator('.storage-dropzone__list').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,rows:el.children.length}));
    assert.equal(sizes.rows,25);assert.ok(sizes.height<=225 && sizes.content>sizes.height);
    const noticeHeight=await page.locator('.stg-notice').evaluate(el=>el.getBoundingClientRect().height);
    assert.ok(Math.abs(await gap()-before-noticeHeight-22)<2,'only the upload confirmation takes space between map and library');
    assert.ok((await page.locator('.stg-ingestion').boundingBox()).height<=960);
    await page.screenshot({path:`${out}/queue-desktop.png`,fullPage:true});
  });
  await choose('Upload knowledge area','Data');
  await page.getByRole('button',{name:'Process files',exact:true}).click();
  await page.locator('.storage-run[data-status=review]').waitFor();
  await check('Review keeps upload locked, its dropdown works through the scroll container, and the library remains close to the map',async()=>{
    assert.equal(await uploadCombo().isDisabled(),true);
    await choose('Knowledge area for knowledge-00.txt','Finance');
    assert.equal(await combo('Knowledge area for knowledge-00.txt').innerText(),'Finance');
    assert.ok(await gap()<=24);
    await page.screenshot({path:`${out}/review-desktop.png`,fullPage:true});
  });
  await page.getByRole('button',{name:'Approve & store',exact:true}).click();
  await page.locator('.storage-run[data-status=completed]').waitFor();
  await page.waitForTimeout(700);
  await check('All 25 real documents are stored with the selected review subjects',async()=>{
    assert.equal(await page.locator('.stg-document-row').count(),25);
    assert.match(await page.locator('.stg-document-row').filter({hasText:'knowledge-00.txt'}).innerText(),/Finance/);
    assert.match(await page.locator('.stg-document-row').filter({hasText:'knowledge-01.txt'}).innerText(),/Data/);
    await page.screenshot({path:`${out}/library-desktop.png`,fullPage:true});
  });
  await page.locator('.stg-document-row').filter({hasText:'knowledge-00.txt'}).locator('.stg-file-name>button').click();
  await check('The document dropdown stays inside the native modal top layer and Escape closes only the listbox',async()=>{
    await combo('Document knowledge area').click();
    await page.getByRole('option',{name:'Banking',exact:true}).click();
    assert.equal(await combo('Document knowledge area').innerText(),'Banking');
    // choosing is a draft: it is stored when Save changes has finished
    await page.getByRole('button',{name:'Save changes',exact:true}).click();
    await page.locator('.ab[data-state=success]').waitFor();
    await combo('Document knowledge area').click();await page.getByRole('listbox').waitFor();await page.keyboard.press('Escape');
    assert.equal(await page.locator('.crm-dialog[open]').count(),1);
    assert.equal(await combo('Document knowledge area').getAttribute('aria-expanded'),'false');
    await page.getByRole('button',{name:'Close knowledge-00.txt',exact:true}).click();
  });
  await page.reload();await page.locator('.stg-document-row').first().waitFor();
  await check('The subject edited through the dialog dropdown persists after reload',async()=>{
    assert.equal(await page.locator('.stg-document-row').count(),25);
    assert.match(await page.locator('.stg-document-row').filter({hasText:'knowledge-00.txt'}).innerText(),/Banking/);
  });
  await page.locator('.ui-as-user').click();await page.getByRole('menuitem',{name:'Dark mode',exact:true}).click();await page.keyboard.press('Escape');
  await uploadCombo().click();
  await page.waitForTimeout(650);
  await check('The portaled listbox inherits actual workspace dark colors',async()=>{
    const colors=await page.locator('.ui-select-popup').evaluate(el=>({paper:getComputedStyle(el).backgroundColor,ink:getComputedStyle(el).color}));
    assert.notEqual(colors.paper,'rgb(255, 255, 255)');assert.notEqual(colors.paper,colors.ink);
    await page.screenshot({path:`${out}/dropdown-dark.png`});await page.keyboard.press('Escape');
  });
  for(const width of [1920,1200,1050,768,390,320]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(400);
    await check(`Library and dropdown fit ${width}px without horizontal overflow`,async()=>{
      const overflow=await page.locator('.stg-workspace').evaluate(el=>el.scrollWidth-el.clientWidth);
      assert.ok(overflow<=1,`${overflow}px overflow`);
      await uploadCombo().click();await page.getByRole('option',{name:'SQL',exact:true}).waitFor();
      const r=await page.locator('.ui-select-popup').boundingBox();
      assert.ok(r.x>=0&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<=900);
      await page.keyboard.press('Escape');
      if(width===390){
        await page.locator('.stg-library-head').evaluate(el=>el.scrollIntoView({block:'start'}));
        await page.waitForTimeout(350);
        await page.screenshot({path:`${out}/library-phone.png`,fullPage:true});
      }
    });
  }
  await check('No runtime errors',async()=>assert.deepEqual(errors,[]));
  const wk=await webkit.launch();
  try{
    const p=await wk.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
    await p.goto(`${base}/personalize?section=storage`);await p.locator('.storage-onboarding[open]').waitFor();await p.keyboard.press('Escape');
    await p.getByRole('combobox',{name:'Upload knowledge area'}).tap();await p.getByRole('option',{name:'Banking',exact:true}).tap();
    assert.equal((await p.getByRole('combobox',{name:'Upload knowledge area'}).innerText()).trim(),'Banking');
    console.log('PASS WebKit touch selection with reduced motion');checks++;
  }finally{await wk.close();}
  console.log(`${checks} checks passed`);
}finally{await browser.close();}
