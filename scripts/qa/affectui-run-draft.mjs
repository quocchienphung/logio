import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.argv[2]||'http://localhost:3000';
const out='docs/research/affectui-run/qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();page.setDefaultTimeout(12000);
const errors=[],passed=[];
page.on('pageerror',error=>errors.push(error.message));
const check=async(name,work)=>{await work();passed.push(name);console.log(`PASS ${name}`);};
const draft=()=>page.locator('.ui-df');
const pending=()=>draft().locator('.ui-df__chg[data-state="pending"]');
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('affectui:acme:run-draft')));
const load=async()=>{await page.goto(`${base}/personalize?section=run`,{waitUntil:'networkidle'});await draft().waitFor();};
try{
  await load();
  await check('Initial draft is actual selectable HTML with nine exact source suggestions',async()=>{
    assert.equal(await pending().count(),9);
    assert.equal(await draft().locator('img,canvas,iframe').count(),0);
    assert.match(await draft().locator('.ui-df__label').innerText(),/Board memo – Q3 · Revenue/);
    assert.match(await pending().nth(4).getAttribute('aria-label'),/stayed flat at 2\./);
  });
  await check('Pointer hover reveals review popover and pointer leave dismisses it',async()=>{
    await pending().nth(1).hover();await draft().locator('.ui-df__pop[data-open]').waitFor();
    await page.mouse.move(600,900);await page.waitForTimeout(200);
    assert.equal(await draft().locator('.ui-df__pop[data-open]').count(),0);
  });
  await check('Single decision animates original text away and focuses next pending change',async()=>{
    await pending().nth(1).click();
    await draft().getByRole('button',{name:'Accept suggestion',exact:true}).click();
    assert.equal(await pending().count(),8);
    await page.waitForTimeout(500);
    const accepted=draft().locator('.ui-df__chg[data-state="accepted"]');
    assert.equal(await accepted.locator('del').getAttribute('aria-hidden'),'true');
    assert.equal(await accepted.locator('del').evaluate(el=>getComputedStyle(el).fontSize),'0px');
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Suggestion 3 of 9: remove “mostly”. Press Y to accept, N to reject');
  });
  await check('Y and N keyboard review, previous/next wrapping, Escape dismissal',async()=>{
    await pending().first().focus();await page.keyboard.press('n');
    assert.equal(await draft().locator('.ui-df__chg[data-state="rejected"]').count(),1);
    await page.keyboard.press('y');assert.equal(await pending().count(),6);
    await draft().getByRole('button',{name:'Previous suggestion',exact:true}).click();
    const active=await draft().locator('.ui-df__chg[data-active]').getAttribute('aria-label');
    assert.match(active,/Suggestion 9 of 9/);
    await draft().getByRole('button',{name:'Next suggestion',exact:true}).click();
    assert.match(await draft().locator('.ui-df__chg[data-active]').getAttribute('aria-label'),/Suggestion 4 of 9/);
    await page.keyboard.press('Escape');assert.equal(await draft().locator('.ui-df__pop[data-open]').count(),0);
  });
  await check('Accept all changes only pending decisions and Undo restores previous snapshot',async()=>{
    await draft().getByRole('button',{name:'Accept all',exact:true}).click();
    assert.equal(await pending().count(),0);
    assert.equal(await draft().locator('.ui-df__chg[data-state="rejected"]').count(),1);
    await draft().getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await pending().count(),6);
    await draft().getByRole('button',{name:'Reject all',exact:true}).click();
    assert.equal(await draft().locator('.ui-df__chg[data-state="rejected"]').count(),7);
  });
  await check('Draft decisions and undo survive page refresh',async()=>{
    await page.waitForTimeout(100);const before=await state();await load();
    assert.deepEqual((await state()).decisions,before.decisions);
    assert.equal(await pending().count(),0);
    await draft().getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await pending().count(),6);
  });
  await check('Settled draft text follows accepted/rejected decisions with no duplicated deleted text for assistive technology',async()=>{
    await draft().getByRole('button',{name:'Accept all',exact:true}).click();
    const text=await draft().locator('.ui-df__text').evaluate(root=>{
      const read=node=>node.nodeType===Node.TEXT_NODE?node.textContent:node.nodeType===Node.ELEMENT_NODE&&node.getAttribute('aria-hidden')==='true'?'':[...node.childNodes].map(read).join('');
      return read(root);
    });
    assert.equal(text,'Revenue grew 18% in Q3 to $4.3M, driven by six new enterprise customers. Churn fell to 1.8%, and the pipeline supports raising the Q4 target by 5%.');
  });
  assert.deepEqual(errors,[]);
}finally{
  await fs.writeFile(`${out}/draft-results.json`,JSON.stringify({passed,errors},null,2));
  await browser.close();
}
