import fs from 'node:fs/promises';
import { chromium } from 'playwright';
// Public rendered preview only. No API, registry, Code tab, bundle, or prompt reads.
const directory = 'docs/research/ai-side-panel/source';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://uiarc.dev/components/blocks/ai-side-panel', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const assistant = page.getByText('Assistant', { exact: true }).first();
await assistant.scrollIntoViewIfNeeded();
const root = await assistant.evaluateHandle(node => {
  // the nearest ancestor that also holds the page text
  let el = node; while (el && !el.textContent.includes('Team workspaces')) el = el.parentElement; return el;
});
const html = await root.evaluate(el => el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>'));
await fs.writeFile(`${directory}/open.html`, html.slice(0, 60000));
const classes = await root.evaluate(el => { const out = new Set(); el.querySelectorAll('*').forEach(n => String(n.className?.baseVal ?? n.className).split(' ').filter(c => /_/.test(c)).forEach(c => out.add(c))); out.add(String(el.className)); return [...out]; });
const css = await page.evaluate(names => [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].flatMap(rule => rule.cssText && names.some(n => rule.cssText.includes('.' + n.split(' ')[0])) ? [rule.cssText] : (rule.cssRules ? [...rule.cssRules].filter(r => names.some(n => r.cssText.includes('.' + n))).map(r => `${rule.conditionText ? '@media ' + rule.conditionText + ' ' : ''}${r.cssText}`) : [])); } catch { return []; } }), classes);
await fs.writeFile(`${directory}/declared-styles.css`, [...new Set(css)].join('\n\n'));
console.log('classes', classes.length, 'css rules', css.length);
await page.screenshot({ path: `${directory}/open.png` });
await browser.close();
