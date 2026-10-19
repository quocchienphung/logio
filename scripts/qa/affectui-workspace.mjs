import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.argv[2] || 'http://localhost:3000';
const out='docs/research/affectui-analytics/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage();
page.setDefaultTimeout(12000);
const errors=[],passed=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error' && /Encountered two children|Cannot update|hydration|Invalid DOM|unique.*key/i.test(message.text()))errors.push(message.text());});
const check=async(name,fn)=>{await fn();passed.push(name);console.log(`PASS ${name}`);};
const nav=async name=>{await page.locator('.ui-as-side__nav .workspace-nav-label').getByText(name,{exact:true}).click();await page.waitForTimeout(450);};
const period=async days=>{await page.locator('.ui-as-rev__period').click();await page.getByRole('menuitemradio',{name:`Last ${days} days`,exact:true}).click();};
const userMenu=async name=>{await page.locator('.ui-as-user').click();await page.getByRole('menuitem',{name,exact:true}).click();};
const readDownload=async download=>{const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks).toString('utf8');};

try{
  await page.goto(`${base}/personalize?section=reports`,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.locator('.ui-as-rev').waitFor();
  await check('Reports route, sidebar selection and source data',async()=>{
    assert.equal(await page.locator('.ui-as-side__item[aria-current="page"]').innerText(),'Reports');
    assert.equal(await page.locator('.ui-kpi').count(),3);
    assert.match(await page.locator('.ui-as-rev__stats').innerText(),/96,412/);
  });
  await check('chart pointer tooltips, keyboard and boundaries',async()=>{
    const plot=page.locator('.ui-kpi__plot').first();const box=await plot.boundingBox();
    await page.mouse.move(box.x+2,box.y+box.height/2);
    assert.match(await plot.locator('.ui-kpi__tooltip').innerText(),/Mon, Mar 3/);
    await page.mouse.move(box.x+box.width-2,box.y+box.height/2);
    assert.equal(await plot.locator('.ui-kpi__tooltip').getAttribute('data-side'),'left');
    await plot.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
    assert.match(await plot.locator('.ui-kpi__tooltip').innerText(),/Tue, Mar 4/);
    await page.keyboard.press('End');assert.match(await plot.locator('.ui-kpi__tooltip').innerText(),/Sun, Mar 9/);
    await page.keyboard.press('Escape');assert.equal(await plot.locator('.ui-kpi__marker').getAttribute('data-open'),null);
  });
  await check('period numbers and paths animate to 30/90-day source data',async()=>{
    const path=page.locator('.ui-kpi__lines path').first();const before=await path.getAttribute('d');
    await period(30);await page.waitForTimeout(120);const during=await path.getAttribute('d');
    await page.waitForTimeout(750);const after=await path.getAttribute('d');
    assert.notEqual(before,after);assert.notEqual(during,after);
    assert.match(await page.locator('.ui-as-rev__stats').innerText(),/414,572/);
    await period(90);await page.waitForTimeout(800);
    assert.match(await page.locator('.ui-as-rev__stats').innerText(),/1,243,715/);
    await period(7);await page.waitForTimeout(800);
    assert.match(await page.locator('.ui-as-rev__stats').innerText(),/96,412/);
  });
  await check('period menu supports keyboard selection and outside dismissal',async()=>{
    await page.locator('.ui-as-rev__period').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');
    assert.match(await page.locator('.ui-as-rev__period').innerText(),/90/);
    await period(7);await page.locator('.ui-as-rev__period').click();await page.locator('.ui-as-rev__head h1').click();
    assert.equal(await page.locator('.ui-as-rev__period').getAttribute('aria-expanded'),'false');
  });
  await check('legend toggles series and preserves at least one visible line',async()=>{
    await page.getByRole('button',{name:'Top 4 channels',exact:true}).click();
    await page.getByRole('checkbox',{name:'Organic',exact:true}).click();
    assert.equal(await page.getByRole('checkbox',{name:'Organic',exact:true}).getAttribute('aria-checked'),'false');
    await page.waitForTimeout(700);assert.equal(await page.locator('.ui-kpi__lines path').first().evaluate(el=>getComputedStyle(el).opacity),'0.08');
    await page.getByRole('checkbox',{name:'Organic',exact:true}).click();
    await page.getByRole('button',{name:'Top 4 channels',exact:true}).click();
  });
  await check('Export downloads actual CSV values',async()=>{
    await page.waitForTimeout(800);const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();
    const download=await event;assert.match(download.suggestedFilename(),/last-7-days\.csv/);
    const text=await readDownload(download);assert.match(text,/Gross revenue.*96412/);assert.match(text,/Organic/);
  });
  await check('save, reopen and delete named reports, with refresh persistence',async()=>{
    await period(30);await page.getByRole('button',{name:'Save as report',exact:true}).click();
    await page.getByLabel('Report name').fill('Quarterly review');await page.getByRole('button',{name:'Save report',exact:true}).click();
    await page.reload({waitUntil:'networkidle'});await page.locator('.ui-as-rev').waitFor();
    await period(7);await page.getByRole('button',{name:'Saved reports',exact:true}).click();
    await page.getByRole('button',{name:/Quarterly review Last 30 days/}).click();
    assert.match(await page.locator('.ui-as-rev__period').innerText(),/30/);
    await page.getByRole('button',{name:'Saved reports',exact:true}).click();
    await page.getByRole('button',{name:'Delete Quarterly review',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Saved reports',exact:true}).count(),0);
  });
  await check('metric explanations and product detail dialogs',async()=>{
    await page.getByRole('button',{name:'About gross revenue',exact:true}).click();
    assert.match(await page.locator('dialog[open]').innerText(),/before operational expenses/);await page.keyboard.press('Escape');
    await page.locator('.ui-as-rev__product').first().click();assert.match(await page.locator('dialog[open]').innerText(),/Annual plan/);await page.keyboard.press('Escape');
  });
  await check('company edits persist and preset views filter owners',async()=>{
    await nav('Companies');await page.getByRole('button',{name:'Company CRM',exact:true}).click();await page.locator('tbody tr').first().waitFor();
    await page.locator('tbody tr').first().locator('td').nth(5).dblclick();await page.getByRole('textbox',{name:'Edit Value'}).fill('50000');await page.keyboard.press('Enter');
    await page.reload({waitUntil:'networkidle'});await page.locator('tbody tr').first().waitFor();assert.match(await page.locator('tbody tr').first().innerText(),/50,000/);
    await page.locator('.ui-as-crm__view').click();await page.getByRole('menuitemradio',{name:'Account executive',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===2);
    assert.match(await page.locator('tbody').innerText(),/Jonas Weber/);
    await page.locator('.ui-as-crm__view').click();await page.getByRole('menuitemradio',{name:'Head of Sales',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===10);
  });
  await check('create and remove an owner-filtered custom view',async()=>{
    await page.getByRole('button',{name:'New view',exact:true}).click();await page.getByLabel('View name').fill('Lea accounts');await page.getByLabel('View owner',{exact:true}).selectOption('Lea Braun');
    await page.getByRole('button',{name:'Create view',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===3);
    assert.match(await page.locator('tbody').innerText(),/Lea Braun/);
    await page.getByRole('button',{name:'Add row',exact:true}).click();await page.getByRole('textbox',{name:'Edit Company'}).fill('Lea pilot');await page.keyboard.press('Enter');
    await page.getByRole('checkbox',{name:'Select Lea pilot',exact:true}).click();await page.getByRole('button',{name:'Delete',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===3);
    await page.getByRole('button',{name:'Close Lea accounts view',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===10);
  });
  await check('contact create, edit, search and delete',async()=>{
    await nav('Contacts');await page.getByRole('button',{name:'New contact',exact:true}).click();
    await page.getByLabel('Name',{exact:true}).fill('Alice Brooks');await page.getByLabel('Email',{exact:true}).fill('alice@example.com');await page.getByLabel('Role',{exact:true}).fill('Sales lead');
    await page.getByRole('button',{name:'Save contact',exact:true}).click();await page.getByRole('textbox',{name:'Search contacts'}).fill('Alice');
    await page.locator('.workspace-contact').filter({hasText:'Alice Brooks'}).click();await page.getByLabel('Name',{exact:true}).fill('Alicia Brooks');await page.getByRole('button',{name:'Save contact',exact:true}).click();
    await page.getByRole('textbox',{name:'Search contacts'}).fill('Alicia');await page.locator('.workspace-contact').filter({hasText:'Alicia Brooks'}).click();await page.getByRole('button',{name:'Delete contact',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.workspace-contact').length===0);
  });
  await check('Home and pipelines navigate to real company records',async()=>{
    await nav('Home');assert.equal(await page.locator('.workspace-home-stats button').count(),3);
    await page.locator('.workspace-recent-list button').first().click();await page.locator('.workspace-filter-chip').waitFor();assert.match(await page.locator('tbody').innerText(),/Notion/);
    await nav('Deals');await page.getByLabel('Filter deals by owner').selectOption('Lea Braun');assert.equal(await page.locator('.ui-as-board__card').count(),3);
    await page.getByLabel('Filter deals by owner').selectOption('');await page.getByRole('button',{name:'Open Notion',exact:true}).click();await page.locator('.workspace-filter-chip').waitFor();
    await nav('Renewals');assert.match(await page.locator('.workspace-page-head h1').innerText(),/Renewals/);await nav('Partnerships');assert.equal(await page.locator('.ui-as-board__card').count(),3);
  });
  await check('Profile, settings, feedback and changelog are working screens',async()=>{
    await userMenu('Profile');await page.getByLabel('Name',{exact:true}).fill('Alex River');await page.getByRole('button',{name:'Save profile',exact:true}).click();assert.match(await page.locator('.ui-as-user').innerText(),/Alex River/);
    await userMenu('Appearance & notifications');await page.getByLabel('Appearance').selectOption('dark');await page.getByRole('button',{name:'Save settings',exact:true}).click();assert.equal(await page.locator('.crm-page').getAttribute('data-theme'),'dark');
    await userMenu('Help & feedback');await page.getByLabel('Feedback',{exact:true}).fill('The reports are useful.');await page.getByRole('button',{name:'Save feedback',exact:true}).click();assert.match(await page.locator('dialog[open]').innerText(),/Saved on this device/);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Full changelog',exact:true}).click();assert.match(await page.locator('dialog[open]').innerText(),/Reports, with a clearer picture/);await page.keyboard.press('Escape');
  });
  await check('documents, folders, uploads and downloads contain real data',async()=>{
    await nav('Companies');await page.getByRole('button',{name:'Sales docs',exact:true}).click();await page.locator('.workspace-doc-toolbar').waitFor();
    await page.getByRole('button',{name:'Create folder',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('QA folder');await page.locator('dialog[open]').getByRole('button',{name:'Create folder',exact:true}).click();
    await page.getByRole('button',{name:'New document',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Meeting notes');await page.getByRole('button',{name:'Create document',exact:true}).click();
    await page.getByRole('textbox',{name:'Document content',exact:true}).fill('# Meeting notes\n\nNext step: follow up.');await page.getByRole('button',{name:'Save draft',exact:true}).click();
    const event=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();assert.match(await readDownload(await event),/Next step: follow up/);await page.keyboard.press('Escape');
    await page.locator('.workspace-doc-toolbar input[type="file"]').setInputFiles({name:'uploaded-note.md',mimeType:'text/markdown',buffer:Buffer.from('# Uploaded note\nWorks on this device.')});
    await page.getByRole('textbox',{name:'Document content',exact:true}).waitFor();assert.match(await page.getByRole('textbox',{name:'Document content',exact:true}).inputValue(),/Works on this device/);await page.keyboard.press('Escape');
  });
  await check('new workspaces isolate records and survive a reload',async()=>{
    await page.locator('.ui-as-side__workspace').click();await page.getByRole('menuitem',{name:'Create workspace',exact:true}).click();await page.getByLabel('Workspace name').fill('QA workspace');await page.getByRole('button',{name:'Create workspace',exact:true}).click();
    await page.locator('.ui-dt__empty').waitFor();assert.match(await page.locator('.ui-as-side__workspace').innerText(),/QA workspace/);
    await page.getByRole('button',{name:'Add row',exact:true}).click();await page.getByRole('textbox',{name:'Edit Company'}).fill('Fresh company');await page.keyboard.press('Enter');
    await page.reload({waitUntil:'networkidle'});await page.locator('tbody tr').first().waitFor();assert.equal(await page.locator('tbody tr').count(),1);assert.match(await page.locator('tbody').innerText(),/Fresh company/);
    await page.locator('.ui-as-side__workspace').click();await page.getByRole('menuitemradio',{name:/Acme/}).click();await page.getByRole('button',{name:'Company CRM',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===10);
  });
  await check('mobile Reports, touch tooltips and local scroll',async()=>{
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open sidebar',exact:true}).click();await nav('Reports');
    await page.locator('.ui-as-rev').waitFor();await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('.ui-kpi__plot').first().tap();assert.equal(await page.locator('.ui-kpi__marker').first().getAttribute('data-open'),'');
    await page.screenshot({path:`${out}/mobile-interaction.png`});
    await page.locator('.ui-as-main').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:`${out}/mobile-bottom.png`});
    assert.equal(await page.locator('.ui-as-main').evaluate(el=>el.scrollTop>0),true);
  });
  await check('reduced motion keeps charts usable without entrance animation',async()=>{
    const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await reduced.goto(`${base}/personalize?section=reports`,{waitUntil:'networkidle'});await reduced.locator('.ui-kpi__lines').first().waitFor();
    assert.equal(await reduced.locator('.ui-kpi__lines').first().evaluate(el=>getComputedStyle(el).animationName),'none');await reduced.close();
  });
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${out}/results.json`,JSON.stringify({base,passed,errors},null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`});await fs.writeFile(`${out}/results.json`,JSON.stringify({base,passed,errors,failure:error.message},null,2));throw error;}
finally{await browser.close();}
