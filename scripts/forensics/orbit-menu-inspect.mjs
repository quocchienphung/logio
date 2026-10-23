import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. No API, registry, Code tab, bundle, or prompt reads.
const directory = 'docs/research/orbit-menu/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/orbit-menu', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await fs.writeFile(`${directory}/visible.txt`, await page.locator('body').innerText());
  await page.screenshot({ path: `${directory}/desktop-page.png`, fullPage: true });
  const trigger = page.getByRole('button', { name:'Photo actions', exact:true });
  await trigger.scrollIntoViewIfNeeded();
  const root = page.locator('[class*="orbit-menu_root"]').first();
  await fs.writeFile(`${directory}/initial.html`, await trigger.locator('..').evaluate(n=>n.outerHTML));
  await trigger.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path:`${directory}/desktop-open.png` });
  await page.locator('[class*="orbit-menu_stage"]').screenshot({path:`${directory}/desktop-open-stage.png`});
  await fs.writeFile(`${directory}/open.html`,await trigger.locator('..').evaluate(n=>n.outerHTML));
  const css = await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.cssText).filter(text=>/orbit-menu_|orbitMenu/.test(text));}catch{return [];}}));
  await fs.writeFile(`${directory}/declared-styles.css`,css.join('\n\n'));
  const styles=await page.locator('[class*="orbit-menu_"]').evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {tag:n.tagName,class:n.getAttribute('class'),aria:n.getAttribute('aria-label'),rect:{x:r.x,y:r.y,width:r.width,height:r.height},color:s.color,background:s.backgroundColor,font:s.font,border:s.border,shadow:s.boxShadow,transition:s.transition,transform:s.transform,opacity:s.opacity,filter:s.filter,radius:s.borderRadius};}));
  await fs.writeFile(`${directory}/open-styles.json`,JSON.stringify(styles,null,2));
  await page.getByRole('menuitem',{name:'Download',exact:true}).hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path:`${directory}/desktop-hover-download.png` });
  await page.getByRole('menuitem',{name:'Download',exact:true}).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path:`${directory}/desktop-result-download.png` });
  await fs.writeFile(`${directory}/result.html`,await trigger.locator('..').evaluate(n=>n.outerHTML));
  await page.waitForTimeout(1600);
  const box=await trigger.boundingBox();
  const center={x:box.x+box.width/2,y:box.y+box.height/2};
  await page.mouse.move(center.x,center.y);await page.mouse.down();
  const samples=[];
  for(const delay of [30,50,80,150,400]){
    await page.waitForTimeout(delay);
    samples.push({afterDelay:delay,styles:await page.locator('[class*="orbit-menu_item"]').evaluateAll(nodes=>nodes.map(n=>({label:n.getAttribute('aria-label'),transform:getComputedStyle(n).transform,opacity:getComputedStyle(n).opacity,filter:getComputedStyle(n).filter})))});
  }
  await fs.writeFile(`${directory}/motion-samples.json`,JSON.stringify(samples,null,2));
  await page.mouse.up();await page.waitForTimeout(600);
  await fs.writeFile(`${directory}/hold-without-drag.txt`,await trigger.getAttribute('aria-expanded'));
  await page.mouse.move(center.x,center.y);await page.mouse.down();await page.waitForTimeout(200);
  // The pointer is only 52px from the trigger, well inside the 104px action radius.
  await page.mouse.move(center.x,center.y-52,{steps:8});await page.waitForTimeout(350);
  await page.screenshot({path:`${directory}/desktop-pie-drag.png`});
  await page.mouse.up();await page.waitForTimeout(300);
  await page.screenshot({path:`${directory}/desktop-pie-drag-result.png`});
  await page.waitForTimeout(1600);
  await page.setViewportSize({width:390,height:844});
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();await page.waitForTimeout(700);
  await page.screenshot({path:`${directory}/mobile-open.png`});
  await page.locator('[class*="orbit-menu_stage"]').screenshot({path:`${directory}/mobile-open-stage.png`});
  await trigger.click();await page.waitForTimeout(600);
  await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await page.waitForTimeout(400);
  await trigger.click();await page.waitForTimeout(600);
  await page.screenshot({path:`${directory}/mobile-dark-open.png`});
  console.log('Saved public desktop/mobile, hover, confirmation, hold, pie-drag and dark evidence.');
} finally { await browser.close(); }

