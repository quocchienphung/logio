import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.argv[2]||'http://localhost:3197',out='docs/research/affectui-run/qa';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`${base}/personalize`,{waitUntil:'networkidle'});
  const before=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script').map(r=>r.name));
  await page.locator('.workspace-nav-label').getByText('Run',{exact:true}).click();await page.locator('.ui-ar').waitFor();await page.waitForTimeout(200);
  const lazy=await page.evaluate(before=>performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script'&&!before.includes(r.name)).map(r=>({file:r.name.split('/').at(-1),encodedBytes:r.encodedBodySize,decodedBytes:r.decodedBodySize})),before);assert.ok(lazy.length);
  await page.evaluate(()=>{
    window.runPerf={frames:[],longTasks:[]};window.runLongObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())window.runPerf.longTasks.push(entry.duration);});window.runLongObserver.observe({type:'longtask'});
    let previous=performance.now();const tick=now=>{window.runPerf.frames.push(now-previous);previous=now;window.runPerf.raf=requestAnimationFrame(tick);};window.runPerf.raf=requestAnimationFrame(tick);
  });
  await page.waitForTimeout(3600);await page.getByRole('button',{name:'Stop run',exact:true}).click();
  const interaction=await page.evaluate(()=>{cancelAnimationFrame(window.runPerf.raf);window.runLongObserver.disconnect();return window.runPerf;});await page.waitForTimeout(3500);
  await page.evaluate(()=>{window.runIdleMutations=0;window.runMutationObserver=new MutationObserver(records=>window.runIdleMutations+=records.length);window.runMutationObserver.observe(document.querySelector('.ui-ar'),{subtree:true,attributes:true,characterData:true,childList:true});});await page.waitForTimeout(2000);
  const idle=await page.evaluate(()=>{window.runMutationObserver.disconnect();return {durationMs:2000,domMutations:window.runIdleMutations};});assert.equal(idle.domMutations,0);assert.deepEqual(errors,[]);
  const frames=interaction.frames.slice(2).sort((a,b)=>a-b);
  const result={environment:'Chrome headless, production Next start, 1440×1000 on this machine; no cross-device or competitor claim',lazyChunks:lazy,lazyEncodedBytes:lazy.reduce((sum,r)=>sum+r.encodedBytes,0),interaction:{frames:frames.length,medianFrameMs:Number(frames[Math.floor(frames.length*.5)].toFixed(2)),p95FrameMs:Number(frames[Math.floor(frames.length*.95)].toFixed(2)),framesOver25ms:frames.filter(v=>v>25).length,longTasks:interaction.longTasks},idle,errors};
  await fs.mkdir(out,{recursive:true});await fs.writeFile(`${out}/performance.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
