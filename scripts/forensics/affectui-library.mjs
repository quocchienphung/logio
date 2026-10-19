// Public documentation/preview inventory. Does not request gated code, auth APIs, or installation endpoints.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const out = 'docs/research/affectui-library';
await fs.mkdir(`${out}/pages`, { recursive: true });
await fs.mkdir(`${out}/styles`, { recursive: true });
const routes = JSON.parse(await fs.readFile('docs/research/affectui-crm/library-routes.json', 'utf8'));
const queue = [...new Set(routes.map(r => r.href))].filter(route => !route.endsWith('/full'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const result = [];
await Promise.all(Array.from({length: 3}, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  while (queue.length) {
    const route = queue.shift();
    const slug = route.slice(1).replaceAll('/', '--');
    try {
      await page.goto(`https://www.affectui.com${route}`, { waitUntil: 'networkidle', timeout: 25000 });
      await page.locator('h1').first().waitFor({timeout:5000});
      const data = await page.evaluate(() => ({
        title: document.querySelector('h1')?.textContent,
        text: document.body.innerText,
        roots: [...new Set([...document.querySelectorAll('[class]')].map(e=>e.className).filter(c=>typeof c === 'string' && /^ui-/.test(c)))],
        styles: [...document.querySelectorAll('style')].map(s=>s.textContent).filter(t=>t.includes('.ui-')),
        assets: [...document.images].map(i=>({src:i.currentSrc,alt:i.alt})),
        controls: [...document.querySelectorAll('[class^="ui-"] button')].map(b=>({text:b.textContent,label:b.getAttribute('aria-label')})),
      }));
      const hashes = [];
      for (const style of data.styles) {
        const hash = createHash('sha256').update(style).digest('hex').slice(0,12);
        hashes.push(hash);
        await fs.writeFile(`${out}/styles/${hash}.css`, style);
      }
      delete data.styles;
      await fs.writeFile(`${out}/pages/${slug}.json`, JSON.stringify({...data,route,styleHashes:hashes},null,2));
      // One viewport per public item; CRM receives a separate interaction/responsive audit.
      await page.screenshot({path:`${out}/pages/${slug}.png`});
      result.push({route,title:data.title,styleHashes:hashes,status:'captured',pro:/Installation is part of Pro|is a Pro component/.test(data.text)});
      console.log(`captured ${route}`);
    } catch(error) { result.push({route,status:'failed',error:error.message}); console.log(`failed ${route}`); }
  }
  await page.close();
}));
await fs.writeFile(`${out}/manifest.json`, JSON.stringify(result.sort((a,b)=>a.route.localeCompare(b.route)),null,2));
await browser.close();
console.log(`${result.length} pages; ${result.filter(r=>r.status==='failed').length} failures`);
