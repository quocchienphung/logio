import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// Reads the public demo https://quanhoangindex.github.io/ascii-reveal/ through the rendered page only:
// requests it makes (to see whether it talks to anyone), DOM, resolved styles and screenshots over time.
const directory='docs/research/ascii-reveal/source';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const requests=[],consoleLines=[];
  page.on('request',request=>requests.push({url:request.url(),type:request.resourceType(),method:request.method()}));
  page.on('console',message=>consoleLines.push(`${message.type()}: ${message.text().slice(0,200)}`));
  await page.addInitScript(()=>{
    // Record what the page reaches for (storage, timers, observers) without changing it.
    window.__probe={storage:[],raf:0,canvas:0,fonts:[]};
    const rafOriginal=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>{window.__probe.raf++;return rafOriginal(callback);};
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(...args){window.__probe.canvas++;return getContext.apply(this,args);};
    for(const name of ['setItem','getItem']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__probe.storage.push([name,String(args[0])]);return original.apply(this,args);};}
  });
  const start=Date.now();
  await page.goto('https://quanhoangindex.github.io/ascii-reveal/',{waitUntil:'commit'});
  for(const at of [0,150,350,600,900,1300,1800,2600,3600,5000,7000]){
    const wait=at-(Date.now()-start);if(wait>0)await page.waitForTimeout(wait);
    await page.screenshot({path:`${directory}/t${String(at).padStart(4,'0')}.png`});
  }
  await page.waitForLoadState('networkidle').catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({path:`${directory}/settled.png`,fullPage:true});
  const html=await page.content();
  await fs.writeFile(`${directory}/page.html`,html);
  const summary=await page.evaluate(()=>({
    title:document.title,
    probe:window.__probe,
    scripts:[...document.scripts].map(script=>({src:script.src,inline:!script.src,length:script.textContent.length})),
    links:[...document.querySelectorAll('link')].map(link=>({rel:link.rel,href:link.href})),
    forms:document.forms.length,iframes:document.querySelectorAll('iframe').length,
    canvases:[...document.querySelectorAll('canvas')].map(canvas=>({w:canvas.width,h:canvas.height,class:canvas.className})),
    pres:[...document.querySelectorAll('pre,code')].map(node=>({tag:node.tagName,class:String(node.className),text:node.textContent.slice(0,120),font:getComputedStyle(node).font})),
    bodyClass:document.body.className,
    rootStyle:getComputedStyle(document.documentElement).cssText.length,
    cookies:document.cookie,
    localStorageKeys:Object.keys(localStorage),
    textSample:document.body.innerText.slice(0,600),
  }));
  await fs.writeFile(`${directory}/summary.json`,JSON.stringify({summary,requests,consoleLines},null,1));
  const hosts=[...new Set(requests.map(request=>new URL(request.url).host))];
  console.log('hosts',hosts);
  console.log('requests',requests.length,'console',consoleLines.slice(0,8));
  console.log(JSON.stringify(summary,null,1).slice(0,3500));
} finally {await browser.close();}
