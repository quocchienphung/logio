// Ten-second collaborative art document: painting, text anchors and navigation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const output = 'docs/research/guide-intro/qa/wands';
await fs.mkdir(output, { recursive: true });
const results = [], errors = [], external = new Set(), evidence = {};
const browser = await chromium.launch({ channel: 'chrome' });
const contexts = [];
let currentPage, safari;
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false, error: String(error.stack) }); console.log('FAIL', name, String(error.stack)); if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: `${output}/failed-${results.length}.png` }).catch(() => {}); }
};
async function open(options = {}, controlled = true, engine = browser, setup, waitReady = true) {
  const context = await engine.newContext({ viewport: { width: 1440, height: 900 }, ...options }); contexts.push(context);
  const page = await context.newPage(); currentPage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { const url = new URL(request.url()); if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) external.add(url.origin); });
  if (controlled) { const now = new Date(); await page.clock.install({ time: now }); await page.clock.pauseAt(now); }
  if (setup) await setup(page);
  await page.goto(`${base}/guide`);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  if(waitReady) await page.locator('.guide-intro[data-ready="true"]').waitFor();
  return page;
}
const elapsed = page => page.locator('.guide-intro').getAttribute('data-elapsed').then(Number);
async function stats(page) {
  return page.locator('canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let white = 0, color = 0, total = 0, hash = 0;
    for (let y = 6; y < canvas.height; y += 12) for (let x = 6; x < canvas.width; x += 12) {
      const i = (y * canvas.width + x) * 4, r = data[i], g = data[i+1], b = data[i+2]; total++;
      if (r > 242 && g > 242 && b > 235) white++;
      if (Math.max(r,g,b) - Math.min(r,g,b) > 45 && Math.min(r,g,b) < 170) color++;
      hash = (hash * 31 + r * 3 + g * 5 + b * 7) >>> 0;
    }
    return { white: white / total, color: color / total, hash, width: canvas.width, height: canvas.height };
  });
}
async function finished(page) {
  const difference = await page.locator('canvas').evaluate(async canvas => {
    const art = new Image(); art.src='/sites/guide-intro/starry-night.jpg'; await art.decode();
    const expected = document.createElement('canvas'); expected.width=canvas.width; expected.height=canvas.height;
    const ctx=expected.getContext('2d'), scale=Math.min(canvas.width/art.width,canvas.height/art.height);
    ctx.drawImage(art,(canvas.width-art.width*scale)/2,(canvas.height-art.height*scale)/2,art.width*scale,art.height*scale);
    const actual=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data, target=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let sum=0,count=0,wrong=0;
    for(let y=4;y<canvas.height;y+=8) for(let x=4;x<canvas.width;x+=8){const i=(y*canvas.width+x)*4; const d=(Math.abs(actual[i]-target[i])+Math.abs(actual[i+1]-target[i+1])+Math.abs(actual[i+2]-target[i+2]))/3;sum+=d;count++;if(d>10)wrong++;}
    return {mean:sum/count,wrongFraction:wrong/count};
  });
  assert.ok(difference.mean<1.5 && difference.wrongFraction<.01, `Finished artwork matches original ${JSON.stringify(difference)}`);
  return difference;
}
async function workspace(page) {
  const geometry = await page.evaluate(() => {
    const root = document.querySelector('.guide-intro'), canvas = root.querySelector('canvas'), r = root.getBoundingClientRect(), c = canvas.getBoundingClientRect();
    const sheet = root.querySelector('.guide-intro__sheet').getBoundingClientRect();
    return { width: innerWidth, height: innerHeight, root: { x:r.x,y:r.y,w:r.width,h:r.height }, canvas: { x:c.x,y:c.y,w:c.width,h:c.height }, sheet: { x:sheet.x,y:sheet.y,w:sheet.width,h:sheet.height }, background: getComputedStyle(root).backgroundColor, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight };
  });
  assert.deepEqual(geometry.root, { x: 0, y: 0, w: geometry.width, h: geometry.height });
  assert.ok(geometry.canvas.w < geometry.width && geometry.canvas.h < geometry.height);
  assert.ok(geometry.sheet.x >= 0 && geometry.sheet.y >= 0 && geometry.sheet.y + geometry.sheet.h <= geometry.height + 1, JSON.stringify(geometry));
  assert.ok(Math.abs(geometry.canvas.w / geometry.canvas.h - 1280/1014) < .005, 'The entire painting keeps its original proportions');
  assert.equal(geometry.background, 'rgb(255, 255, 255)');
  assert.ok(geometry.scrollWidth <= geometry.width && geometry.scrollHeight <= geometry.height);
  assert.equal(await page.locator('.artwork-note').count(),2);
  assert.equal(await page.locator('[data-painting-frame]').count(),1);
  assert.equal(await page.locator('[role="slider"],footer').count(),0,'No duration, progress controls or explanatory footer');
  return geometry;
}

try {
  await check('White workspace frames the painting and its surrounding document without extra titles', async () => {
    const page = await open(); evidence.desktop = await workspace(page);
    assert.equal(await page.locator('.artist-cursor').count(), 6);
    assert.equal(await page.getByRole('heading').count(), 0);
    const blank = await stats(page); assert.ok(blank.white > .999); evidence.blank = blank;
    await page.screenshot({ path: `${output}/blank.png` });
  });
  await check('One continuous color pass builds the painting over ten seconds', async () => {
    const page = await open(), samples = [];
    let current = 0;
    for (const [time, phase] of [[900,'color'],[2400,'color'],[4800,'color'],[7000,'color'],[9200,'final']]) {
      await page.clock.runFor(time-current); current=time;
      assert.equal(await page.locator('.guide-intro').getAttribute('data-phase'), phase);
      samples.push({ time: await elapsed(page), phase, ...await stats(page) });
      await page.screenshot({ path: `${output}/${phase}-${time}.png` });
    }
    assert.equal(new Set(samples.map(s=>s.hash)).size, samples.length);
    assert.ok(samples[1].color > .05 && samples[1].color < .6, 'Early color stays localized');
    assert.ok(samples[2].color > samples[1].color + .15, 'Color follows more wand passes');
    evidence.finalDifference=await finished(page); evidence.stages = samples;
  });
  await check('Paint appears along actual cursor trajectories and stays absent ahead of the wands', async () => {
    const page = await open(); await page.clock.runFor(2500);
    const sample = c => {const s=document.createElement('canvas');s.width=144;s.height=90;s.getContext('2d').drawImage(c,0,0,144,90);return Array.from(s.getContext('2d').getImageData(0,0,144,90).data);};
    const before = await page.locator('canvas').evaluate(sample);
    const history = [];
    for (let n=0;n<30;n++) {
      await page.clock.runFor(16);
      history.push(await page.locator('.artist-cursor[data-x]').evaluateAll(nodes => nodes.map(n=>({x:Number(n.dataset.x),y:Number(n.dataset.y)}))));
    }
    const after = {width:144,height:90,pixels:await page.locator('canvas').evaluate(sample)};
    let changed=0, near=0, farUntouched=0;
    const radius=after.height*.105;
    const trajectory=history.flat();
    for(let y=1;y<after.height;y+=2) for(let x=1;x<after.width;x+=2) {
      const i=(y*after.width+x)*4, delta=Math.abs(after.pixels[i]-before[i])+Math.abs(after.pixels[i+1]-before[i+1])+Math.abs(after.pixels[i+2]-before[i+2]);
      const distance=Math.min(...trajectory.map(p=>Math.hypot(x-p.x*after.width,y-p.y*after.height)));
      if(delta>80 && before[i]>240 && before[i+1]>240 && before[i+2]>240){changed++;if(distance<radius)near++;} else if(distance>radius*1.4)farUntouched++;
    }
    assert.ok(changed>50 && near/changed>.94, `Localized reveal ${near}/${changed}`);
    assert.ok(farUntouched>100, 'Future parts of the canvas remain unrevealed');
    evidence.wandCorrelation={changed,near,fraction:near/changed,farUntouched};
  });
  await check('Autoplay opens browse at ten seconds and replaces the intro history entry', async () => {
    const page=await open({},false); const start=await page.evaluate(()=>performance.now()-Number(document.querySelector('.guide-intro').dataset.elapsed||0));
    await page.waitForURL('**/personalize?browse=1',{timeout:14000});
    const duration=await page.evaluate(()=>performance.now())-start;
    assert.ok(duration>=9850 && duration<11500, `Ten second duration ${duration}`); evidence.autoplayMs=duration;
    const history=await page.evaluate(()=>navigation.entries().map(e=>e.url));
    assert.ok(!history.some(url=>new URL(url).pathname==='/guide')); evidence.history=history;
  });
  await check('Writers type, revise and follow their actual text carets, including after mobile reflow', async () => {
    const page=await open();
    await page.clock.runFor(1000);
    const first=await page.locator('.artwork-note__body').first().innerText();
    await page.clock.runFor(3900);
    assert.ok((await page.locator('.artwork-note__body').first().innerText()).length>first.length);
    assert.equal(await page.locator('.artwork-note del').count(),2);
    assert.ok((await page.locator('.artwork-note ins').first().innerText()).includes('June'));
    const aligned=async()=> page.evaluate(()=>['left','right'].map((side,i)=>{
      const a=document.querySelector(`[data-writing-anchor="${side}"]`).getBoundingClientRect();
      const c=document.querySelector(`[data-agent="${i?'researcher':'writer'}"]`).getBoundingClientRect();
      return Math.hypot(a.left-c.left,a.top+3-c.top);
    }));
    await page.keyboard.press('Space'); await page.clock.runFor(250);
    assert.ok((await aligned()).every(d=>d<2),JSON.stringify({desktop:await aligned()}));
    await page.setViewportSize({width:390,height:844}); await page.clock.runFor(250);
    assert.ok((await aligned()).every(d=>d<2),JSON.stringify({phone:await aligned()}));
    await page.keyboard.press('Space'); await page.clock.runFor(3500);
    assert.equal(await page.locator('.artwork-note del').count(),0);
    assert.ok((await page.locator('.artwork-note__body').first().innerText()).includes('June 1889'));
    assert.ok((await page.locator('.artwork-note__detail').last().innerText()).includes('New York'));
  });
  await check('Provider presence follows the chosen agent and dims its teammates', async()=>{
    const page=await open(); await page.clock.runFor(1000);
    const follow=page.getByRole('button',{name:/^Follow Writer,/}); await follow.click();
    assert.equal(await page.getByRole('button',{name:/^Stop following Writer,/}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.artist-cursor[data-dimmed]').count(),5);
    await page.getByRole('button',{name:/^Stop following Writer,/}).click();
    assert.equal(await page.locator('.artist-cursor[data-dimmed]').count(),0);
  });
  await check('Comment popups stream in, collapse to pins and reopen on hover', async()=>{
    const page=await open(); await page.clock.runFor(1700);
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.clock.runFor(600);
    const card=page.getByRole('dialog',{name:'Comment from Researcher',exact:true});
    await card.waitFor({state:'visible'});
    assert.equal(await card.isVisible(),true);
    const initial=await card.locator('.studio-comment__text').innerText();
    await page.clock.runFor(700);
    assert.ok((await card.locator('.studio-comment__text').innerText()).length>initial.length);
    await page.screenshot({path:`${output}/researcher-popup.png`});
    await page.clock.runFor(1250);
    assert.equal(await card.isVisible(),false);
    await page.getByRole('button',{name:/^Comment from Researcher:/}).hover();
    await page.clock.runFor(400);
    await card.waitFor({state:'visible'});
    assert.equal(await card.isVisible(),true);
    assert.ok((await card.innerText()).includes('June 1889'));
    await page.mouse.move(0,0); await page.clock.runFor(400);
    assert.equal(await card.isVisible(),false);
  });
  await check('Reading and replying pauses the intro; Escape closes only the popup and resumes it',async()=>{
    const page=await open(); await page.clock.runFor(2750);
    const card=page.getByRole('dialog',{name:'Comment from Researcher',exact:true});
    await card.hover(); const at=await elapsed(page);
    await page.clock.runFor(800); assert.equal(await elapsed(page),at);
    await card.getByRole('textbox',{name:'Reply to Researcher'}).fill('Keep the original date in the final story.');
    await card.getByRole('textbox').press('Enter');
    assert.ok((await card.locator('.studio-comment__replies').innerText()).includes('Keep the original date'));
    await page.clock.runFor(500); assert.equal(await elapsed(page),at);
    await card.getByRole('textbox').press('Escape');
    assert.equal(new URL(page.url()).pathname,'/guide');
    await page.mouse.move(0,0); await page.clock.runFor(450);
    assert.ok(await elapsed(page)>at+300);
    assert.equal(await card.isVisible(),false);
  });
  await check('Popup replies stay local and the check button resolves its comment',async()=>{
    const page=await open(); await page.clock.runFor(5200);
    const card=page.getByRole('dialog',{name:'Comment from Colorist',exact:true});
    await card.getByRole('textbox',{name:'Reply to Colorist'}).fill('A little more warmth.');
    await card.getByRole('textbox').press('Enter');
    assert.equal(await card.locator('.studio-comment__replies p').count(),1);
    await card.getByRole('button',{name:'Resolve comment from Colorist'}).click();
    await page.mouse.move(0,0); await page.clock.runFor(350);
    assert.equal(await card.isVisible(),false);
    assert.equal(await page.getByRole('button',{name:/^Comment from Colorist:/}).count(),0);
    assert.equal(await page.locator('.guide-intro').getAttribute('data-interacting'),'false');
  });
  await check('Popup windows fit phones and small landscape screens and remain touch operable',async()=>{
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]) {
      const page=await open({viewport,hasTouch:true}); await page.clock.runFor(3000);
      const card=page.getByRole('dialog',{name:'Comment from Researcher',exact:true});
      const box=await card.boundingBox(); assert.ok(box && box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width+1 && box.y+box.height<=viewport.height+1,JSON.stringify({viewport,box}));
      await page.screenshot({path:`${output}/popup-${viewport.width}.png`});
      await card.getByRole('button',{name:'Resolve comment from Researcher'}).tap();
      await page.clock.runFor(350); assert.equal(await card.isVisible(),false);
    }
  });
  await check('Painter tips travel steadily through the old phase boundaries, without teleporting',async()=>{
    const page=await open(); await page.clock.runFor(1000);
    const frames=[];
    for(let n=0;n<60;n++) {
      await page.clock.runFor(32);
      frames.push(await page.evaluate(()=>{
        const canvas=document.querySelector('canvas').getBoundingClientRect();
        return {at:Number(document.querySelector('.guide-intro').dataset.elapsed),points:Array.from(document.querySelectorAll('.artist-cursor[data-x]')).map(c=>({x:Number(c.dataset.x)*canvas.width,y:Number(c.dataset.y)*canvas.height}))};
      }));
    }
    const speeds=frames.slice(1).flatMap((f,n)=>f.points.map((p,i)=>Math.hypot(p.x-frames[n].points[i].x,p.y-frames[n].points[i].y)/(f.at-frames[n].at))).filter(v=>v>.01).sort((a,b)=>a-b);
    const median=speeds[Math.floor(speeds.length/2)],maximum=speeds.at(-1);
    assert.ok(maximum<median*1.8 && maximum<.9,JSON.stringify({median,maximum}));
    evidence.cursorSpeedPxPerMs={median,maximum};
  });
  await check('Phone, small phone, tablet, wide desktop and landscape keep all content within the white workspace', async () => {
    evidence.viewports=[];
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024},{width:1280,height:800},{width:1920,height:1080},{width:844,height:390}]) {
      const page=await open({viewport}); await page.clock.runFor(3000); evidence.viewports.push(await workspace(page));
      await page.screenshot({path:`${output}/viewport-${viewport.width}.png`});
      await page.clock.runFor(6200); await finished(page);
    }
  });
  await check('Resizing during painting redraws its current reveal correctly', async () => {
    const page=await open(); await page.clock.runFor(2600); await page.setViewportSize({width:390,height:844}); await page.clock.runFor(100); await workspace(page);
    const sample=await stats(page); assert.ok(sample.color>.1 && sample.color<.8);
    await page.clock.runFor(6500); await finished(page);
  });
  await check('Keyboard pause/resume and Escape work without visible controls', async () => {
    const page=await open(); await page.clock.runFor(800); await page.keyboard.press('Space'); const at=await elapsed(page);
    await page.clock.runFor(600); assert.equal(await elapsed(page),at);
    await page.keyboard.press('Space'); await page.clock.runFor(200); assert.ok(await elapsed(page)>at+150);
    await page.keyboard.press('Escape'); await page.waitForURL('**/personalize?browse=1');
  });
  await check('Reduced motion shows finished art without cursors, then continues at ten seconds', async () => {
    const page=await open({reducedMotion:'reduce'}); await page.clock.runFor(50);
    await finished(page);
    assert.equal(await page.locator('.artist-cursor').first().isVisible(),false);
    await page.clock.runFor(10050); await page.waitForURL('**/personalize?browse=1');
  });
  await check('An asset failure allows retry and recovery', async () => {
    let fail=true;
    const page=await open({},true,browser, async page=>{ await page.route('**/sites/guide-intro/starry-night.jpg',route=>fail?route.abort():route.continue()); },false);
    await page.locator('.guide-intro__error').waitFor(); fail=false; await page.getByRole('button',{name:'Retry artwork'}).click(); await page.locator('.guide-intro[data-ready="true"]').waitFor();
    await page.clock.runFor(3000); assert.ok((await stats(page)).color>.2);
  });
  await check('Homepage desktop/mobile Guide me links enter this intro; direct browse bypasses it', async()=>{
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
      const page=await open({viewport}); await page.goto(base);
      await page.clock.runFor(500);
      if(viewport.width<600) { await page.getByRole('button',{name:/menu/i}).first().click(); await page.clock.runFor(600); }
      const link=page.locator('a[href="/guide"]:visible').filter({hasText:'Guide me'}).first(); assert.equal(await link.getAttribute('href'),'/guide'); await link.click(); await page.waitForURL('**/guide');
    }
    const page=await open(); await page.goto(`${base}/personalize?browse=1`); assert.equal(await page.locator('.guide-intro').count(),0);
  });
  await check('WebKit paints distinct early and final pixels with the same document layout', async()=>{
    safari=await webkit.launch(); const page=await open({},true,safari); await page.clock.runFor(700); const sketch=await stats(page);
    await page.clock.runFor(8500); const final=await stats(page); assert.notEqual(sketch.hash,final.hash); await finished(page); await workspace(page);
    await page.screenshot({path:`${output}/webkit-final.png`});
  });
  await check('No runtime errors or external runtime service requests occur',async()=>{assert.deepEqual(errors,[]);assert.deepEqual([...external],[]);});
} finally {
  for(const context of contexts) await context.close(); await browser.close(); if(safari)await safari.close();
  await fs.writeFile(`${output}/report.json`,JSON.stringify({date:new Date().toISOString(),base,results,evidence,errors,externalOrigins:[...external]},null,2));
}
console.log(`${results.filter(r=>r.ok).length}/${results.length} checks passed`);
if(results.some(r=>!r.ok))process.exitCode=1;
