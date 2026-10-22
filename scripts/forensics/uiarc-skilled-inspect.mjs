import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'docs/research/uiarc-skilled';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, route] of [['tasks', 'blocks/agent-tasks'], ['stream', 'realtime-stream']]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`https://uiarc.dev/components/${route}`, { waitUntil: 'networkidle' });
    await fs.writeFile(`${out}/${name}-docs.txt`, await page.locator('main').innerText());
    const root = name === 'tasks' ? page.locator('form[aria-label="New task"]').locator('..') : page.locator('figure').first();
    console.log(name, await root.evaluate(el => ({tag:el.tagName, cls:el.className, html:el.outerHTML.slice(0,1800)})));
    await root.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/${name}-desktop.png` });
    await fs.writeFile(`${out}/${name}-dom.html`, await root.evaluate(el => el.outerHTML));
    await fs.writeFile(`${out}/${name}-styles.json`, JSON.stringify(await root.evaluate(el => [el,...el.querySelectorAll('*')].slice(0,180).map(e => { const s=getComputedStyle(e),b=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,text:e.childElementCount?undefined:e.textContent,rect:[b.x,b.y,b.width,b.height],font:s.font,color:s.color,background:s.backgroundColor,padding:s.padding,gap:s.gap,radius:s.borderRadius,transition:s.transition};})),null,2));
    await fs.writeFile(`${out}/${name}-motion.json`, JSON.stringify(await page.evaluate(async () => {
      const frames=[]; let last=performance.now(); const start=last;
      await new Promise(resolve=>{const tick=now=>{frames.push({at:now-start,delta:now-last});last=now;if(now-start<1800)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
      return {frames,animations:document.getAnimations().map(a=>({timing:a.effect?.getTiming(),keyframes:a.effect?.getKeyframes()}))};
    }),null,2));
    if(name==='tasks') {
      const timing = await page.evaluate(async () => {
        const button=document.querySelector('button[data-focus="toggle"]'), body=document.getElementById(button.getAttribute('aria-controls'));
        const frames=[], start=performance.now();button.click();
        await new Promise(resolve=>{const tick=now=>{frames.push({at:now-start,height:body.getBoundingClientRect().height,opacity:getComputedStyle(body).opacity});if(now-start<1000)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});return frames;
      });
      await fs.writeFile(`${out}/tasks-expansion-frames.json`,JSON.stringify(timing,null,2));
      await page.screenshot({path:`${out}/tasks-expanded.png`});
      await page.getByRole('button',{name:'Repository: arc-ui/web',exact:true}).click();
      await page.screenshot({path:`${out}/tasks-repository-menu.png`});
      await page.keyboard.press('Escape');
    } else {
      const canvas=page.locator('canvas').first(); await canvas.hover();
      await page.screenshot({path:`${out}/stream-hover.png`});
      await root.getByRole('button').first().click();
      await page.screenshot({path:`${out}/stream-paused.png`});
    }
    await page.setViewportSize({width:390,height:844});
    await root.scrollIntoViewIfNeeded();
    await page.screenshot({path:`${out}/${name}-mobile.png`});
    await page.close();
  }
} finally { await browser.close(); }
