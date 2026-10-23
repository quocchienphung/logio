import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const out='docs/research/storage/dropzone';
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:3000/personalize?section=storage',{waitUntil:'networkidle'});
await page.locator('.storage-onboarding[open]').waitFor();
await page.getByRole('button',{name:'Skip',exact:true}).click();
const root=page.locator('.storage-dropzone');
const input=root.locator('input[type=file]');
await root.waitFor();
assert.match(await input.getAttribute('accept'),/\.tsv/);
await root.screenshot({path:`${out}/integrated-idle.png`});

// Enter and Space must each open the native browser picker.
for(const [key,name] of [['Enter','keyboard-enter.txt'],['Space','keyboard-space.tsv']]) {
  await root.locator('.storage-dropzone__area').focus();
  const picker=page.waitForEvent('filechooser');
  await page.keyboard.press(key);
  await (await picker).setFiles({name,mimeType:'text/plain',buffer:Buffer.from('Finance banking SQL data source reference.\nRevenue\t2026\t42')});
  await root.getByText(name,{exact:true}).waitFor();
}
assert.equal(await root.locator('.storage-dropzone__row').count(),2);

const dataTransfer=await page.evaluateHandle(()=>{
  const dt=new DataTransfer();dt.items.add(new File(['Knowledge from a native drop.'],'drag-source.md',{type:'text/markdown'}));return dt;
});
const area=root.locator('.storage-dropzone__area');
await area.dispatchEvent('dragenter',{dataTransfer});
await area.dispatchEvent('dragover',{dataTransfer});
assert.equal(await area.getAttribute('data-dragging'),'true');
await page.waitForTimeout(450);
await root.screenshot({path:`${out}/integrated-drag.png`});
await area.dispatchEvent('drop',{dataTransfer});
await root.getByText('drag-source.md',{exact:true}).waitFor();
assert.equal(await area.getAttribute('data-dragging'),null);

// Validation is parent-owned, and real rejected files must appear as error rows.
await input.setInputFiles([
  {name:'invalid.exe',mimeType:'application/octet-stream',buffer:Buffer.from('invalid type')},
  {name:'empty.txt',mimeType:'text/plain',buffer:Buffer.alloc(0)},
  {name:'too-large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(20*1024*1024+1)},
]);
await root.getByText('too-large.pdf',{exact:true}).waitFor();
assert.equal(await root.locator('.storage-dropzone__row[data-status=error]').count(),3);
assert.match(await root.innerText(),/This file is empty/);
assert.match(await root.innerText(),/20 MB limit/);
await root.screenshot({path:`${out}/integrated-validation.png`});

// Remove an actual queued file; re-add the same name through the same input.
await root.getByRole('button',{name:'Remove drag-source.md',exact:true}).click();
await root.getByText('drag-source.md',{exact:true}).waitFor({state:'detached'});
await input.setInputFiles({name:'drag-source.md',mimeType:'text/markdown',buffer:Buffer.from('Knowledge from a native drop.')});
await root.getByText('drag-source.md',{exact:true}).waitFor();

// Remove the pending files to expose Clear for the remaining error-only rows.
for(const name of ['keyboard-enter.txt','keyboard-space.tsv','drag-source.md']) {
  await root.getByRole('button',{name:`Remove ${name}`,exact:true}).click();
  await root.getByText(name,{exact:true}).waitFor({state:'detached'});
}
await root.getByRole('button',{name:'Retry invalid.exe',exact:true}).click();
await page.getByRole('alert').filter({hasText:'No new valid documents'}).waitFor();
assert.equal(await root.locator('.storage-dropzone__row[data-status=error]').count(),3);
await root.getByRole('button',{name:'Clear',exact:true}).click();
await page.waitForFunction(()=>document.querySelectorAll('.storage-dropzone__row').length===0);

// Process -> review -> store: progress comes from the parent's real extraction.
await input.setInputFiles({name:'integrated-finance.txt',mimeType:'text/plain',buffer:Buffer.from('Finance banking knowledge. Revenue is recorded in SQL data. Quarterly accounting documents and financial controls.')});
await page.getByRole('button',{name:'Process files',exact:true}).click();
await page.getByRole('button',{name:'Approve & store',exact:true}).waitFor();
assert.equal(await root.getByRole('button',{name:'Remove integrated-finance.txt',exact:true}).isDisabled(),true);
assert.equal(await root.locator('[role=progressbar]').getAttribute('aria-valuenow'),'82');
await root.screenshot({path:`${out}/integrated-review.png`});
await page.getByRole('button',{name:'Approve & store',exact:true}).click();
await root.locator('.storage-dropzone__row[data-status=ready]').waitFor();
assert.equal(await root.getByRole('button',{name:'Remove integrated-finance.txt',exact:true}).isDisabled(),false);
await root.screenshot({path:`${out}/integrated-ready.png`});
await page.screenshot({path:`${out}/integrated-desktop.png`,fullPage:true});

await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.documentElement.classList.add('dark');});
await page.mouse.move(0,0);
await page.waitForTimeout(500);
console.log('Dark styles',await root.evaluate(el=>[el,el.querySelector('.storage-dropzone__area'),el.querySelector('.storage-dropzone__clear')].map(n=>({class:n.className,bg:getComputedStyle(n).backgroundColor,card:getComputedStyle(n).getPropertyValue('--sd-card'),opacity:getComputedStyle(n).opacity}))));
await root.screenshot({path:`${out}/integrated-dark.png`});
const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const mobile=await mobileContext.newPage();
mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto('http://localhost:3000/personalize?section=storage',{waitUntil:'networkidle'});
await mobile.getByRole('button',{name:'Skip',exact:true}).click();
const mobileRoot=mobile.locator('.storage-dropzone');
await mobileRoot.scrollIntoViewIfNeeded();
await mobileRoot.screenshot({path:`${out}/integrated-mobile.png`});
assert.equal(await mobileRoot.locator('.storage-dropzone__touch').isVisible(),true);
const measurements=await mobile.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,dropzone:(()=>{const r=document.querySelector('.storage-dropzone');return {width:r.clientWidth,scroll:r.scrollWidth};})()}));
assert.ok(measurements.document<=measurements.viewport,`Mobile page overflow ${JSON.stringify(measurements)}`);
assert.ok(measurements.dropzone.scroll<=measurements.dropzone.width);
assert.equal(errors.length,0,errors.join('\n'));
await fs.writeFile(`${out}/integrated-check.json`,JSON.stringify({passed:['Enter picker','Space picker','TSV accept','native drag/drop','unsupported format','empty file','over 20MB','remove and same-file re-add','retry callback','Clear callback','real extraction progress','review disables removal','approve and store','dark appearance','390px touch reduced motion','no horizontal overflow','no runtime errors'],measurements,errors},null,2));
await browser.close();
console.log('Integrated Dropzone QA passed.');
