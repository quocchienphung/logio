import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'docs/research/affectui-files';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const source = 'https://www.affectui.com/screens/files/full';
const states = {};
async function capture(name) {
  await page.waitForTimeout(350);
  states[name] = { url: page.url(), text: await page.locator('body').innerText(), controls: await page.locator('main button,dialog button,dialog input,dialog textarea').evaluateAll(nodes => nodes.map(e => ({ tag: e.tagName, text: e.textContent, aria: e.getAttribute('aria-label'), placeholder: e.getAttribute('placeholder') }))) };
  await page.screenshot({ path: `${out}/source-${name}.png`, fullPage: true });
}
try {
  await page.goto(source); await page.evaluate(() => document.fonts.ready);
  await capture('desktop');
  const metrics = await page.locator('main').evaluate(root => {
    const selectors = ['.ui-as-page','.ui-as-page-title','.ui-as-page-sub','.ui-as-section-head','.ui-as-toolbar','.ui-as-folders','.ui-as-folder-card','.ui-as-templates','.ui-as-template__preview','.ui-as-meta','.ui-as-doc__art'];
    return Object.fromEntries(selectors.map(s => [s, [...root.querySelectorAll(s)].slice(0,2).map(e => { const r=e.getBoundingClientRect(),c=getComputedStyle(e); return { x:r.x,y:r.y,width:r.width,height:r.height,font:c.font,padding:c.padding,gap:c.gap,margin:c.margin,borderRadius:c.borderRadius,columns:c.gridTemplateColumns }; })]));
  });
  await fs.writeFile(`${out}/metrics.json`, JSON.stringify(metrics,null,2));
  await fs.writeFile(`${out}/public-css.txt`, await page.evaluate(() => [...document.styleSheets].flatMap(sheet => {try{return [...sheet.cssRules].map(r=>r.cssText).filter(t=>/ui-as-(page|folder|template|doc|sheet|toolbar|file-grid|section-head)/.test(t));}catch{return [];}}).join('\n')));
  await page.getByRole('button',{name:'Create folder',exact:true}).click(); await capture('create-folder');
  await page.keyboard.press('Escape');
  await page.goto(source); await page.getByRole('button',{name:'Add template',exact:true}).click(); await capture('add-template');
  await page.keyboard.press('Escape');
  await page.goto(source); await page.getByRole('button',{name:'Type',exact:true}).click(); await capture('type-filter');
  await page.keyboard.press('Escape');
  await page.goto(source); await page.getByRole('radio',{name:'List',exact:true}).click(); await capture('list');
  await page.getByRole('button',{name:/Brand assets.*Shared/}).click(); await capture('folder');
  await page.goto(source); await page.getByRole('button',{name:/Brand-Guidelines/}).click(); await capture('template');
  for (const width of [390,768,1920]) { await page.setViewportSize({width,height:width===390?844:1000}); await page.goto(source); await capture(`${width}`); }
  console.log(JSON.stringify(Object.fromEntries(Object.entries(states).map(([k,v])=>[k,{url:v.url,text:v.text.slice(-5000)}])),null,2));
} finally { await fs.writeFile(`${out}/states.json`,JSON.stringify(states,null,2)); await browser.close(); }
