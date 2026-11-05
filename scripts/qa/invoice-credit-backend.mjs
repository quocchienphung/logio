import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createLibrary,createDefaultInvoice} from '../../src/components/sites/invoice/invoice-model.ts';
const base=process.argv[2]||'http://localhost:3000',out='docs/research/invoice-credit/qa';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome'}),c=await b.newContext({viewport:{width:1600,height:1200}}),p=await c.newPage(),results=[],errors=[],puts=[];
let data=createLibrary(createDefaultInvoice()),version='r1',getFailure=0,putFailure=0;
p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.__workspaceBackendConfig={baseUrl:location.origin+'/invoice-mock',headers:()=>({Authorization:'Bearer invoice-test'}),timeoutMs:2000};});
await p.route('**/invoice-mock/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname;
 if(!path.endsWith('/invoice'))return route.fulfill({status:404,json:{}});
 if(req.method()==='GET'){if(getFailure)return route.fulfill({status:getFailure,json:{error:{message:'Invoice load rejected'}}});return route.fulfill({json:{data,version}});}
 if(req.method()==='PUT'){puts.push({body:req.postDataJSON(),headers:req.headers()});if(putFailure)return route.fulfill({status:putFailure,json:{error:{message:putFailure===409?'Invoice revision conflict':'Invoice write rejected'}}});data=req.postDataJSON().data;version='r2';return route.fulfill({json:{version}});}
 return route.fulfill({status:405});
});
const open=async()=>{await p.goto(`${base}/personalize?section=invoice`,{waitUntil:'networkidle'});},button=name=>p.getByRole('button',{name,exact:true}),check=async(name,fn)=>{await fn();results.push({name,pass:true});console.log('PASS',name)};
try{
 await open();await p.locator('.ui-iv').waitFor();
 await check('authenticated save sends library, command, If-Match and reloads server data',async()=>{await button('Edit invoice').click();await p.getByLabel('Client name',{exact:true}).fill('Remote client');await button('Save draft').click();await p.waitForFunction(()=>document.querySelector('.invoice-save-state')?.textContent==='Saved to workspace.');assert.equal(puts.at(-1).body.data.version,2);assert.equal(puts.at(-1).body.data.documents[0].buyer.name,'Remote client');assert.equal(puts.at(-1).headers['if-match'],'r1');assert.equal(puts.at(-1).headers.authorization,'Bearer invoice-test');assert.equal(puts.at(-1).body.commands[0].type,'invoice.save');assert.equal(await p.evaluate(()=>localStorage.getItem('affectui:acme:invoice')),null);await open();await p.locator('.ui-iv').waitFor();assert.match(await p.locator('[data-doc=invoice]').innerText(),/Remote client/);});
 await check('save failure retains edits and never reports successful issue',async()=>{putFailure=403;await p.getByRole('tab',{name:'Credit note',exact:true}).click();await button('Issue credit note').click();await p.getByRole('alert').filter({hasText:'Invoice write rejected'}).waitFor();assert.equal(await button('Issue credit note').count(),1);assert.equal(await button('Edit credit note').count(),0);putFailure=0;await button('Issue credit note').click();await button('Edit credit note').waitFor();assert.equal(data.documents[0].credit.issued,true);});
 await check('revision conflicts block overwrites and offer explicit reload',async()=>{await button('Edit credit note').click();putFailure=409;await button('Save draft').click();await button('Reload saved copy').waitFor();assert.equal(await button('Save draft').isDisabled(),true);assert.match(await p.locator('.invoice-feedback-error').innerText(),/changed elsewhere/);putFailure=0;});
 await check('load errors show retry instead of invented invoice data',async()=>{getFailure=403;await open();await button('Retry loading').waitFor();assert.equal(await p.locator('.ui-iv').count(),0);getFailure=0;await button('Retry loading').click();await p.locator('.ui-iv').waitFor();});
 assert.deepEqual(errors,[]);
}finally{await fs.writeFile(`${out}/backend-results.json`,JSON.stringify({results,errors},null,2));await b.close();}
