import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
const dir='docs/research/command-palette';const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto(process.argv[2]||'http://localhost:3000/',{waitUntil:'load'});await page.waitForFunction(()=>document.querySelector('.cp-dialog')?.dataset.ready==='true');
await page.keyboard.press('Tab');await page.waitForTimeout(1100);await page.evaluate(()=>document.fonts.ready);
const read=selector=>page.locator(selector).first().evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {rect:[r.x,r.y,r.width,r.height],style:Object.fromEntries(['fontSize','fontWeight','lineHeight','letterSpacing','padding','gap','borderRadius','background','backgroundColor','color','boxShadow'].map(k=>[k,s[k]]))};});
const reference=JSON.parse(await fs.readFile(`${dir}/source/open-styles.json`));const reports=[];
// Next's CSS compiler may serialize the same color as Lab rather than OKLCH.
const canonical=value=>page.evaluate(value=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');return value.replace(/(?:oklch|oklab|lab|lch|rgba?|color)\([^)]*\)/g,color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return `rgba(${[...ctx.getImageData(0,0,1,1).data].join(',')})`;});},value);
const pairs=[['_palette__','.cp-palette',['fontSize','fontWeight','lineHeight','letterSpacing','borderRadius','color','boxShadow']],['_searchRow__','.cp-search',['padding','gap']],['_groupHeading__','.cp-heading',['padding','fontSize','fontWeight','lineHeight','color']],['_result__','.cp-result',['padding','gap','borderRadius']],['_resultLabel__','.cp-label',['fontSize','fontWeight','lineHeight']],['_resultDescription__','.cp-description',['fontSize','fontWeight','lineHeight','color']],['_itemIcon__','.cp-item-icon',['color']],['_highlight__','.cp-highlight',['borderRadius']]];
for(const [part,selector,properties] of pairs){
  const source=reference.find(e=>e.cls?.includes(part)),local=await read(selector);
  for(const property of properties){assert.equal(await canonical(local.style[property]),await canonical(source.style[property]),`${selector} ${property}`);reports.push({selector,property,value:local.style[property],matches:true});}
}
await page.getByRole('combobox',{name:'Navigate pages',exact:true}).fill('qzxxzz');await page.waitForTimeout(1200);
// The inline demo's top is an integer pixel; a centered 203px modal lands on a half pixel.
// Align only this comparison capture's host, avoiding a spurious extra PNG edge row.
const box=await page.locator('.cp-palette').boundingBox();
await page.locator('.cp-dialog').evaluate((e,shift)=>{e.style.translate=`${shift.x}px ${shift.y}px`;},{x:Math.round(box.x)-box.x,y:Math.round(box.y)-box.y});
await page.locator('.cp-palette').screenshot({path:`${dir}/local/empty-final.png`});
await page.locator('.cp-dialog').evaluate(e=>{e.style.translate='';});
const a=PNG.sync.read(await fs.readFile(`${dir}/source/empty.png`)),b=PNG.sync.read(await fs.readFile(`${dir}/local/empty-final.png`));assert.equal(a.width,b.width);assert.equal(a.height,b.height);
const diff=new PNG({width:a.width,height:a.height});let compared=0;
// Exclude host pixels outside the card's rounded corners and the intentionally changed Tab keycap.
for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
  const cx=x<26?26:x>a.width-26?a.width-26:x,cy=y<26?26:y>a.height-26?a.height-26:y;
  const outside=(x-cx)**2+(y-cy)**2>26**2,shortcut=x>380&&y<45;
  if(outside||shortcut){const offset=(y*a.width+x)*4;for(let n=0;n<4;n++)a.data[offset+n]=b.data[offset+n];}else compared++;
}
const count=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.1});await fs.writeFile(`${dir}/local/empty-diff.png`,PNG.sync.write(diff));
await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.waitForTimeout(250);await page.keyboard.press('Tab');await page.waitForTimeout(900);
const dark=JSON.parse(await fs.readFile(`${dir}/source/dark-styles.json`));
for(const [part,selector] of [['_palette__','.cp-palette'],['_searchRow__','.cp-search'],['_groupHeading__','.cp-heading'],['_resultDescription__','.cp-description'],['_highlight__','.cp-highlight']]){
  const source=dark.find(e=>e.cls?.includes(part)),local=await read(selector);
  for(const property of ['color','backgroundColor']){assert.equal(await canonical(local.style[property]),await canonical(source.style[property]),`dark ${selector} ${property}`);reports.push({theme:'dark',selector,property,value:local.style[property],matches:true});}
}
await fs.writeFile(`${dir}/comparison.json`,JSON.stringify({reports,empty:{width:a.width,height:a.height,comparedPixels:compared,differentPixels:count,percent:count/compared*100,note:'Rounded host corners and the adapted Tab hint masked. Comparison host shifted by half a pixel to align the inline reference capture; application centering is unchanged.'}},null,2));console.log(`${reports.length} reference style checks pass; empty-state diff ${count}/${compared} pixels (${(count/compared*100).toFixed(3)}%).`);await browser.close();
