import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/affectui-files/comparison';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const [width, height] of [[1440,1000],[390,844],[768,1024],[1920,1080]]) {
    const captures = [];
    for (const [label,url,root,card] of [['source','https://www.affectui.com/screens/files/full','.ui-as-page','.ui-as-template'],['local',`${base}/personalize?section=files`,'.files-page','.files-template']]) {
      const page = await browser.newPage({ viewport: { width,height }, reducedMotion: 'reduce' });
      await page.goto(url); await page.locator(card).first().waitFor(); await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await page.mouse.move(width-2,height-2); await page.waitForTimeout(500);
      const shot = PNG.sync.read(await page.screenshot({ path: `${out}/${label}-${width}.png` }));
      const geometry = await page.locator(root).evaluate(el => {
        const r=el.getBoundingClientRect(), title=el.querySelector('h1').getBoundingClientRect(), headings=[...el.querySelectorAll('h2')].filter(e=>e.getBoundingClientRect().height>0).map(e=>{const b=e.getBoundingClientRect();return {text:e.textContent,x:b.x-r.x,y:b.y-r.y};});
        return { x:r.x,y:r.y,width:r.width,height:r.height,title:{x:title.x-r.x,y:title.y-r.y,width:title.width,height:title.height},headings,overflow:document.documentElement.scrollWidth>innerWidth };
      });
      const cardPng = PNG.sync.read(await page.locator(card).first().screenshot({ path: `${out}/${label}-card-${width}.png` }));
      await page.mouse.move(width-70,height-120); await page.mouse.wheel(0,1000); await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${label}-bottom-${width}.png` });
      captures.push({ geometry, shot, cardPng }); await page.close();
    }
    const [a,b]=captures, montage=new PNG({width:width*2,height});
    PNG.bitblt(a.shot,montage,0,0,width,height,0,0); PNG.bitblt(b.shot,montage,0,0,width,height,width,0);
    await fs.writeFile(`${out}/side-${width}.png`,PNG.sync.write(montage));
    let cardDiff=null;
    if(a.cardPng.width===b.cardPng.width && a.cardPng.height===b.cardPng.height) {
      const diff=new PNG({width:a.cardPng.width,height:a.cardPng.height});
      cardDiff=pixelmatch(a.cardPng.data,b.cardPng.data,diff.data,diff.width,diff.height,{threshold:.15})/diff.width/diff.height*100;
      await fs.writeFile(`${out}/card-diff-${width}.png`,PNG.sync.write(diff));
    }
    results.push({viewport:{width,height},source:a.geometry,local:b.geometry,firstCardDiffPercent:cardDiff});
    console.log(`${width}: first card ${cardDiff?.toFixed(2) ?? 'different dimensions'}%; overflow ${b.geometry.overflow}`);
  }
} finally { await fs.writeFile(`${out}/metrics.json`,JSON.stringify(results,null,2)); await browser.close(); }
