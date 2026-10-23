import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// Replays each preset of the public ascii-reveal demo and records the cards region over time (rendered page only).
const directory='docs/research/ascii-reveal/source/presets';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  await page.goto('https://quanhoangindex.github.io/ascii-reveal/',{waitUntil:'commit'});
  await page.waitForTimeout(6000);
  await page.getByRole('button',{name:/Replay/}).scrollIntoViewIfNeeded();
  const info={};
  for(const preset of ['Decode','Dither','Terminal','Blueprint']){
    await page.getByLabel('Animation controls').getByRole('button',{name:preset,exact:true}).click();
    await page.waitForTimeout(300);
    const start=Date.now();
    await page.getByRole('button',{name:/Replay/}).click();
    const marks=[120,300,500,750,1050,1400,2000,3200];
    for(const at of marks){
      const wait=at-(Date.now()-start);if(wait>0)await page.waitForTimeout(wait);
      await page.screenshot({path:`${directory}/${preset.toLowerCase()}-${String(at).padStart(4,'0')}.png`,clip:{x:120,y:0,width:1200,height:900}});
    }
    info[preset]=await page.evaluate(()=>({
      canvases:[...document.querySelectorAll('canvas')].length,
      layer:[...document.querySelectorAll('[data-ascii]')].length,
      html:document.querySelector('main')?.innerHTML.length,
    }));
    await page.waitForTimeout(1500);
  }
  // controls: wave origin / speed
  const controls=await page.evaluate(()=>[...document.querySelectorAll('input,button,[role=radio],[role=slider]')].slice(0,40).map(node=>({tag:node.tagName,role:node.getAttribute('role'),label:node.getAttribute('aria-label'),text:node.textContent.trim().slice(0,30),type:node.type,min:node.min,max:node.max,step:node.step,value:node.value})));
  await fs.writeFile(`${directory}/controls.json`,JSON.stringify({info,controls},null,1));
  console.log(JSON.stringify(info),'\n',JSON.stringify(controls.filter(control=>control.tag==='INPUT')));
  // data-ascii hooks and attributes the page documents
  const hooks=await page.evaluate(()=>[...document.querySelectorAll('[data-ascii]')].map(node=>node.getAttribute('data-ascii')));
  console.log('data-ascii',[...new Set(hooks)]);
} finally {await browser.close();}
