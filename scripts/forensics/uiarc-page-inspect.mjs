import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered page only (DOM, declared CSS, visible text, headings). No bundle, API or registry is read.
// Usage: node uiarc-page-inspect.mjs <slug> <css class prefix> <out dir>
const [slug, prefix, directory] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`https://uiarc.dev/components/${slug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(`${directory}/visible.txt`, await page.locator('main').innerText().catch(async () => page.locator('body').innerText()));
  const css = await page.evaluate(p => [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText).filter(text => text.includes(p)); } catch { return []; } }), prefix);
  await fs.writeFile(`${directory}/declared-styles.css`, css.join('\n\n'));
  const classes = await page.evaluate(p => [...new Set([...document.querySelectorAll('*')].flatMap(n => typeof n.className === 'string' ? n.className.split(/\s+/) : []).filter(c => c.includes(p)))].sort(), prefix);
  await fs.writeFile(`${directory}/classes.json`, JSON.stringify(classes, null, 1));
  const headings = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map(h => `${h.tagName} ${h.textContent.trim()}`));
  await fs.writeFile(`${directory}/headings.txt`, headings.join('\n'));
  const roots = await page.evaluate(p => [...document.querySelectorAll(`[class*="${p}"]`)].filter(n => !n.parentElement?.closest(`[class*="${p}"]`)).map(n => ({ tag: n.tagName, cls: n.className.toString().slice(0, 80), box: (r => `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`)(n.getBoundingClientRect()), html: n.outerHTML.length })), prefix);
  console.log(slug, '| rules', css.length, '| classes', classes.length, '| roots', JSON.stringify(roots));
  console.log(headings.join(' | '));
  await page.screenshot({ path: `${directory}/page-ref.png`, fullPage: false });
} finally { await browser.close(); }
