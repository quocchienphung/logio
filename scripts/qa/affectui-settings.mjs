import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.argv[2] || 'http://localhost:3000';
const out='docs/research/affectui-settings/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write'],hasTouch:true});
const page=await context.newPage();page.setDefaultTimeout(12000);
const errors=[],passed=[];page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();passed.push(name);console.log(`PASS ${name}`);};
const tab=async name=>{await page.getByRole('tab',{name,exact:true}).click();await page.waitForTimeout(450);};
const nav=async name=>{await page.locator('.ui-as-side__nav .workspace-nav-label').getByText(name,{exact:true}).click();await page.waitForTimeout(450);};
const readDownload=async download=>{const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);return Buffer.concat(chunks).toString('utf8');};
try {
  await page.goto(`${base}/personalize?section=settings`,{waitUntil:'networkidle'});await page.locator('.ui-sb').waitFor();await page.waitForTimeout(1400);
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await check('Settings navigation and exact source billing baseline',async()=>{
    assert.equal(await page.locator('.ui-as-side__item[aria-current=page]').innerText(),'Settings');
    assert.equal(await page.getByRole('tab',{name:'Billing',exact:true}).getAttribute('aria-selected'),'true');
    assert.match(await page.locator('.ui-um__amount').innerText(),/34,000/);assert.equal(await page.locator('.ui-sb-tier').count(),3);assert.equal(await page.locator('.ui-sb-table tbody tr').count(),5);
  });
  await check('Usage categories and daily bars support keyboard and touch',async()=>{
    await page.locator('.ui-um__bar').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('.ui-um__tip').innerText(),/Chat/);
    await page.keyboard.press('ArrowRight');assert.match(await page.locator('.ui-um__tip').innerText(),/Agents/);await page.keyboard.press('Escape');
    const spark=page.locator('.ui-um__spark');await spark.focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('.ui-um__daily-read').innerText(),/Oct 1/);
    const box=await spark.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);assert.match(await page.locator('.ui-um__daily-read').innerText(),/Oct/);
  });
  await check('Monthly/yearly prices animate and keyboard frequency selection works',async()=>{
    await page.getByRole('radio',{name:/Yearly/}).click();await page.waitForTimeout(800);
    assert.match(await page.locator('.ui-sb-tier').nth(1).innerText(),/\$39/);assert.match(await page.locator('.ui-sb-tier').nth(1).innerText(),/billed yearly/);
    await page.keyboard.press('ArrowLeft');assert.equal(await page.getByRole('radio',{name:'Monthly',exact:true}).getAttribute('aria-checked'),'true');
  });
  await check('Upgrade scrolls plans into view; plan change cancel and confirm',async()=>{
    await page.getByRole('button',{name:'Upgrade',exact:true}).click();await page.waitForTimeout(650);assert.equal(await page.locator('#settings-plans').isVisible(),true);
    await page.getByRole('button',{name:'Switch to Team',exact:true}).click();await page.getByRole('button',{name:'Keep Pro',exact:true}).click();assert.match(await page.locator('.ui-sb-plan__name').innerText(),/Pro/);
    await page.getByRole('button',{name:'Switch to Team',exact:true}).click();await page.getByRole('button',{name:'Confirm switch',exact:true}).click();await page.waitForTimeout(750);
    assert.match(await page.locator('.ui-sb-plan__name').innerText(),/Team/);assert.match(await page.locator('.ui-um__of').innerText(),/150,000/);
    await page.getByRole('button',{name:'Cancel plan',exact:true}).click();assert.match(await page.locator('.ui-sb-plan').innerText(),/Cancels soon/);
    await page.getByRole('button',{name:'Resume plan',exact:true}).click();assert.match(await page.locator('.ui-sb-plan').innerText(),/Active/);
  });
  await check('Yearly subscription and billing persist after reload',async()=>{
    await page.getByRole('radio',{name:/Yearly/}).click();await page.getByRole('button',{name:'Switch to yearly',exact:true}).click();await page.getByRole('button',{name:'Confirm switch',exact:true}).click();
    await page.reload({waitUntil:'networkidle'});await page.locator('.ui-sb-plan').waitFor();assert.match(await page.locator('.ui-sb-plan').innerText(),/\$79\/mo/);assert.match(await page.locator('.ui-sb-plan').innerText(),/billed yearly/);
    assert.equal(await page.getByRole('radio',{name:/Yearly/}).getAttribute('aria-checked'),'true');
  });
  await check('Payment form validates and saves masked local card',async()=>{
    await page.getByRole('button',{name:'Update',exact:true}).click();await page.locator('dialog[open]').getByLabel('Card ending').fill('5555');await page.locator('dialog[open]').getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Update',exact:true}).click();const dialog=page.locator('dialog[open]');assert.equal(await dialog.getByLabel('Card ending').inputValue(),'4242');await dialog.getByLabel('Card ending').fill('123');
    await dialog.getByRole('button',{name:'Save payment method'}).click();assert.equal(await dialog.count(),1);
    await dialog.getByLabel('Card ending').fill('1234');await dialog.getByLabel('Expiry',{exact:true}).fill('2030-12');await dialog.getByRole('button',{name:'Save payment method'}).click();assert.match(await page.locator('.ui-sb-pay').innerText(),/1234/);assert.match(await page.locator('.ui-sb-pay').innerText(),/12\/2030/);
  });
  await check('Billing email inline save, cancel and native validation',async()=>{
    await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Billing email').fill('invalid');await page.getByRole('button',{name:'Save',exact:true}).click();assert.equal(await page.getByLabel('Billing email').count(),1);
    await page.getByLabel('Billing email').fill('finance@example.com');await page.getByRole('button',{name:'Save',exact:true}).click();assert.match(await page.locator('.ui-sb-pay').innerText(),/finance@example.com/);
    await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Billing email').fill('discard@example.com');await page.keyboard.press('Escape');assert.equal(await page.getByLabel('Billing email').count(),0);assert.doesNotMatch(await page.locator('.ui-sb-pay').innerText(),/discard/);
  });
  await check('Invoice downloads contain real rows, amounts and updated billing email',async()=>{
    let pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download INV-2026-0329',exact:true}).click();const download=await pending;const text=await readDownload(download);assert.match(text,/69.00/);assert.match(text,/finance@example.com/);assert.doesNotMatch(text,/INV-2026-0412/);
    pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download all',exact:true}).click();const all=await readDownload(await pending);for(const id of ['0412','0371','0329','0288','0240'])assert.match(all,new RegExp(id));
  });
  await check('Deep links, browser back and keyboard tabs',async()=>{
    await tab('General');await tab('Members');await page.goBack();await page.waitForTimeout(400);assert.equal(await page.getByRole('tab',{name:'General',exact:true}).getAttribute('aria-selected'),'true');
    await page.getByRole('tab',{name:'General',exact:true}).focus();await page.keyboard.press('End');await page.waitForTimeout(450);assert.equal(await page.getByRole('tab',{name:'API keys',exact:true}).getAttribute('aria-selected'),'true');
    await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Create key',exact:true}).waitFor();assert.match(page.url(),/settings-tab=api-keys/);
  });
  await check('Workspace data remains isolated; Settings user menu routes correctly',async()=>{
    await tab('Billing');await page.locator('.ui-as-side__workspace').click();await page.getByRole('menuitemradio',{name:/Personal Free/}).click();await page.locator('.ui-sb-plan').waitFor();assert.match(await page.locator('.ui-sb-plan__name').innerText(),/Pro/);assert.match(await page.locator('.ui-sb-pay').innerText(),/4242/);
    await page.locator('.ui-as-side__workspace').click();await page.getByRole('menuitemradio',{name:/Acme Pro/}).click();await page.waitForTimeout(350);assert.match(await page.locator('.ui-sb-plan__name').innerText(),/Team/);
    await nav('Reports');await page.locator('.ui-as-rev').waitFor();await page.locator('.ui-as-user').click();await page.getByRole('menuitem',{name:'Settings',exact:true}).click();await page.locator('.ui-sb').waitFor();
    await nav('Companies');await page.getByRole('button',{name:'Company CRM',exact:true}).click();assert.equal(await page.locator('.ui-dt tbody tr').count(),10);await nav('Settings');
  });
  await check('Mobile drawer, invoice overflow and reduced motion',async()=>{
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open sidebar',exact:true}).click();await page.waitForTimeout(400);await nav('Settings');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.ui-sb-table-wrap').scrollIntoViewIfNeeded();assert.equal(await page.locator('.ui-sb-table-wrap').evaluate(el=>el.scrollWidth>el.clientWidth),true);
    await page.locator('.ui-sb-table-wrap').evaluate(el=>el.scrollLeft=el.scrollWidth);assert.equal(await page.getByRole('button',{name:'Download INV-2026-0412',exact:true}).isVisible(),true);
    await page.screenshot({path:`${out}/local-mobile-invoices.png`});await page.emulateMedia({reducedMotion:'reduce'});await tab('General');assert.equal(await page.locator('.ui-sb').evaluate(el=>getComputedStyle(el.querySelector('.ui-sb-card')).animationDuration),'1e-05s');
  });
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/billing-results.json`,JSON.stringify({passed,errors},null,2));
} finally {await browser.close();}
