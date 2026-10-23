import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base=process.argv[2]||'http://localhost:3012';
const label=process.argv[3]||'current';
const directory='docs/research/guide-intro/qa/performance';
await fs.mkdir(directory,{recursive:true});
const safari=process.argv.includes('--webkit');
const browser=safari?await webkit.launch():await chromium.launch({channel:'chrome'});
const quantile=(values,p)=>values.sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))]||0;
const cases=[];
try {
  for(const [name,viewport,scale,throttle]of[['desktop',{width:1440,height:900},1,1],['phone-4x',{width:390,height:844},3,4]]) {
    const context=await browser.newContext({viewport,deviceScaleFactor:scale});
    const page=await context.newPage();const cdp=safari?null:await context.newCDPSession(page);
    if(cdp){await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});await cdp.send('Performance.enable');}
    await page.addInitScript(()=>{
      const native=requestAnimationFrame;const frames=new Map(),longTasks=[];
      window.__guidePerf={frames,longTasks};
      window.requestAnimationFrame=callback=>native.call(window,time=>{
        const ready=document.querySelector('.guide-intro[data-ready="true"]');
        if(!ready){callback(time);return;}
        const begin=performance.now();callback(time);const duration=performance.now()-begin;
        const old=frames.get(time)||{duration:0,at:Number(ready.dataset.elapsed)};old.duration+=duration;frames.set(time,old);
      });
      if(PerformanceObserver.supportedEntryTypes.includes('longtask'))new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({at:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
    });
    await page.goto(`${base}/guide`);await page.locator('.guide-intro[data-ready="true"]').waitFor();
    const start=(cdp?await cdp.send('Performance.getMetrics'):{metrics:[]});
    await page.waitForFunction(()=>Number(document.querySelector('.guide-intro')?.dataset.elapsed)>14200,{timeout:25000});
    const end=(cdp?await cdp.send('Performance.getMetrics'):{metrics:[]});
    const sample=await page.evaluate(()=>({frames:[...window.__guidePerf.frames].map(([time,data])=>({time,...data})),longTasks:window.__guidePerf.longTasks}));
    const frames=sample.frames.filter(f=>f.at>500&&f.at<14000),intervals=frames.slice(1).map((f,i)=>f.time-frames[i].time),durations=frames.map(f=>f.duration);
    const delta={};for(const metric of end.metrics){const previous=start.metrics.find(x=>x.name===metric.name);if(previous&&/Duration|Count$/.test(metric.name))delta[metric.name]=metric.value-previous.value;}
    const phases={};for(const [phase,from,to]of[['painting',1000,8500],['laser',9500,13500]]){const values=frames.filter(f=>f.at>=from&&f.at<to).map(f=>f.duration);phases[phase]={p50:quantile([...values],.5),p95:quantile([...values],.95),p99:quantile([...values],.99)};}
    const report={name:safari&&name==='phone-4x'?'phone':name,viewport,deviceScaleFactor:scale,cpuThrottle:safari?1:throttle,engine:safari?"WebKit":"Chromium",frames:frames.length,callbackMs:{p50:quantile([...durations],.5),p95:quantile([...durations],.95),p99:quantile([...durations],.99)},intervalMs:{p50:quantile([...intervals],.5),p95:quantile([...intervals],.95),over25ms:intervals.filter(v=>v>25).length},phases,metrics:delta,longTasks:sample.longTasks};
    cases.push(report);console.log(JSON.stringify(report));await context.close();
  }
}finally{await browser.close();}
await fs.writeFile(`${directory}/${label}.json`,JSON.stringify({date:new Date().toISOString(),base,cases,note:`Local ${safari?'WebKit (no CPU throttling)':'Chromium (phone uses 4x CPU throttling)'} measurements; not a physical iPhone or proof of 120 Hz presentation.`},null,2));
