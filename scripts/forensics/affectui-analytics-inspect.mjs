import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const out='docs/research/affectui-analytics';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('https://www.affectui.com/screens/analytics/full',{waitUntil:'networkidle'});
await page.evaluate(()=>document.fonts.ready);
const save=async name=>{
  await page.waitForTimeout(600);
  await page.screenshot({path:`${out}/source-${name}.png`});
  await fs.writeFile(`${out}/${name}.html`,await page.locator('.ui-as').evaluate(el=>el.outerHTML));
  await fs.writeFile(`${out}/${name}.txt`,await page.locator('.ui-as').innerText());
};
await save('desktop');
await fs.writeFile(`${out}/styles.css`,await page.locator('style').evaluateAll(els=>els.map(el=>el.textContent).filter(css=>css.includes('.ui-as-rev')||css.includes('.ui-kpi')||css.startsWith('\n.ui-button')).join('\n')));
await fs.writeFile(`${out}/icons.json`,JSON.stringify(await page.locator('.ui-as').evaluate(root=>{
  const result={};root.querySelectorAll('button').forEach(el=>{const svg=el.querySelector('svg');if(svg)result[el.getAttribute('aria-label')||el.textContent.trim()]=svg.outerHTML;});return result;
}),null,2));
await fs.writeFile(`${out}/chart-dom.json`,JSON.stringify(await page.locator('.ui-kpi').evaluateAll(els=>els.map(el=>el.outerHTML)),null,2));
await page.getByRole('button',{name:'Last 7 days',exact:true}).click();
await save('period-menu');
console.log('PERIODS',await page.locator('.ui-as-menu').innerText());
await page.keyboard.press('Escape');
const plot=page.locator('.ui-kpi__plot').first();
const box=await plot.boundingBox();
const samples=[];
for(let i=0;i<7;i++){
  await page.mouse.move(box.x+box.width*(i/6),box.y+box.height/2);
  await page.waitForTimeout(120);
  samples.push(await page.locator('.ui-kpi').first().innerText());
}
await fs.writeFile(`${out}/hover-samples.json`,JSON.stringify(samples,null,2));
await save('hover');
await page.getByRole('button',{name:'Export',exact:true}).click();
await save('export');
await page.getByRole('button',{name:'Save as report',exact:true}).click();
await save('save-report');
const dates={};
const readDates=async days=>{
  await page.locator('.ui-kpi__plot').first().focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(100);
  const observed=[];
  for(let index=0;index<9;index++){
    observed.push(await page.locator('.ui-kpi').first().locator('.ui-kpi__date').innerText());
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
  }
  const dateKey=text=>new Date(`${text.replace(/^\w{3},\s*/, '')}, ${text.includes('Dec') ? 2024 : 2025}`).getTime();
  dates[days]=[...new Set(observed)].sort((a,b)=>dateKey(a)-dateKey(b));
};
await readDates(7);
for(const period of ['Last 30 days','Last 90 days']){
  await page.locator('.ui-as-rev__period').click();
  await page.locator('.ui-as-menu').getByText(period,{exact:true}).click();
  await save(period.replaceAll(' ','-').toLowerCase());
  await readDates(period.includes('30') ? 30 : 90);
}
await fs.writeFile(`${out}/period-dates.json`,JSON.stringify(dates,null,2));
await page.locator('.ui-as-rev__period').click();
await page.locator('.ui-as-menu').getByText('Last 7 days',{exact:true}).click();
await page.setViewportSize({width:390,height:844});
await save('mobile');
await page.locator('.ui-as-main').evaluate(el=>el.scrollTop=el.scrollHeight);
await save('mobile-bottom');
console.log('SOURCE',await page.locator('.ui-as').innerText());
await browser.close();
