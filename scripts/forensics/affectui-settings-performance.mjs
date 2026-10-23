import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.argv[2] || 'http://localhost:3100';
const out='docs/research/affectui-settings/qa';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(`${base}/personalize`,{waitUntil:'networkidle'});
  const before=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script').map(r=>r.name));
  await page.locator('.workspace-nav-label').getByText('Usage',{exact:true}).click();await page.locator('.ui-sb').waitFor();await page.waitForTimeout(2200);
  const lazy=await page.evaluate(before=>performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script'&&!before.includes(r.name)).map(r=>({file:r.name.split('/').at(-1),encodedBytes:r.encodedBodySize,decodedBytes:r.decodedBodySize})),before);
  assert.ok(lazy.length>0,'Settings has JavaScript chunks loaded only on navigation');
  await page.evaluate(()=>{
    window.settingsPerf={frames:[],longTasks:[],mutations:0,phase:'interaction'};
    window.settingsLongTaskObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())window.settingsPerf.longTasks.push({duration:entry.duration,phase:window.settingsPerf.phase});});
    window.settingsLongTaskObserver.observe({type:'longtask'});
    window.settingsMutationObserver=new MutationObserver(records=>{window.settingsPerf.mutations+=records.length;});
    window.settingsMutationObserver.observe(document.querySelector('.ui-sb'),{subtree:true,childList:true,attributes:true,characterData:true});
    let previous=performance.now();const tick=now=>{window.settingsPerf.frames.push(now-previous);previous=now;window.settingsPerf.raf=requestAnimationFrame(tick);};window.settingsPerf.raf=requestAnimationFrame(tick);
  });
  const labels=page.locator('.ui-sb-tier__price strong');
  await page.getByRole('radio',{name:/Yearly/}).click();await page.waitForTimeout(180);const during=await labels.allTextContents();await page.waitForTimeout(650);const settled=await labels.allTextContents();assert.notDeepEqual(during,settled);
  await page.getByRole('radio',{name:'Monthly',exact:true}).click();await page.waitForTimeout(800);
  const interaction=await page.evaluate(()=>{cancelAnimationFrame(window.settingsPerf.raf);return {frames:window.settingsPerf.frames,longTasks:window.settingsPerf.longTasks,mutations:window.settingsPerf.mutations};});
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{window.settingsPerf.mutations=0;window.settingsPerf.longTasks=[];window.settingsPerf.phase='idle';});await page.waitForTimeout(2000);
  const idle=await page.evaluate(()=>{window.settingsMutationObserver.disconnect();window.settingsLongTaskObserver.disconnect();return {durationMs:2000,domMutations:window.settingsPerf.mutations,longTasks:window.settingsPerf.longTasks};});
  const frames=interaction.frames.slice(2).sort((a,b)=>a-b);
  const result={environment:'Chrome headless, production Next start, 1440×1100, this machine; not a cross-device benchmark',lazyChunks:lazy,lazyEncodedBytes:lazy.reduce((n,r)=>n+r.encodedBytes,0),interaction:{frames:frames.length,medianFrameMs:Number(frames[Math.floor(frames.length*.5)].toFixed(2)),p95FrameMs:Number(frames[Math.floor(frames.length*.95)].toFixed(2)),framesOver25ms:frames.filter(v=>v>25).length,longTasks:interaction.longTasks,priceMidAnimation:during,priceSettled:settled},idle,errors};
  assert.equal(idle.domMutations,0,'Settled settings performs no continuous DOM updates');assert.deepEqual(errors,[]);
  await fs.mkdir(out,{recursive:true});await fs.writeFile(`${out}/performance.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}
