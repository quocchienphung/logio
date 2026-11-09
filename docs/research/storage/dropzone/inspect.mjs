import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Reads only the publicly rendered preview. Never opens prompts, Pro code or APIs.
const out = 'docs/research/storage/dropzone';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://www.affectui.com/components/dropzone', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Decline', exact: true }).click().catch(() => {});
const root = page.locator('.ui-dzc').first();
await root.scrollIntoViewIfNeeded();
// The public demo automatically adds four files; let that sample settle, then
// clear through its visible control before taking the actual idle reference.
await root.getByRole('button', { name: 'Clear', exact: true }).waitFor({ state:'visible', timeout:18000 });
await root.screenshot({ path: `${out}/source-demo-complete.png` });
const sampleRetry = root.getByRole('button', { name: /retry/i }).first();
if (await sampleRetry.count()) {
  await sampleRetry.click();
  await page.waitForTimeout(450);
  await root.screenshot({ path: `${out}/source-demo-retry.png` });
  await fs.writeFile(`${out}/demo-retry-dom.html`, await root.evaluate(el => el.outerHTML));
}
await root.getByRole('button', { name: 'Clear', exact: true }).click({ timeout:18000 });
await page.waitForTimeout(600);
async function capture(name) {
  await root.screenshot({ path: `${out}/source-${name}.png` });
  await fs.writeFile(`${out}/${name}.json`, JSON.stringify(await root.evaluate(el => [...el.querySelectorAll('*')].map(node => {
    const c = getComputedStyle(node), b = node.getBoundingClientRect();
    return { tag: node.tagName, cls: node.className.baseVal ?? node.className, text: node.childElementCount ? '' : node.textContent,
      box: [b.x,b.y,b.width,b.height], style: Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','border','borderRadius','padding','gap','transform','transition','animation','opacity'].map(key => [key,c[key]])) };
  })), null, 2));
}
await capture('idle');
await fs.writeFile(`${out}/preview-dom.html`, await root.evaluate(el => el.outerHTML));
await fs.writeFile(`${out}/observed-rules.css`, await page.evaluate(() => {
  const out = [];
  const walk = (rules, wrap='') => { for (const r of rules) {
    if (r.cssRules && r.conditionText !== undefined) walk(r.cssRules, `@media ${r.conditionText}`);
    else if (/ui-dz|dz-/.test(r.cssText)) out.push(wrap ? `${wrap} { ${r.cssText} }` : r.cssText);
  }};
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch {} }
  return out.join('\n');
}));
console.log(await root.evaluate(el => el.outerHTML));
const area = root.locator('button.ui-dzc__area').first();
const drag = await page.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(['test'], 'Finance.pdf', { type: 'application/pdf' })); d.items.add(new File(['test'], 'Notes.txt', { type: 'text/plain' })); return d; });
await area.dispatchEvent('dragenter', { dataTransfer: drag });
await area.dispatchEvent('dragover', { dataTransfer: drag });
await page.waitForTimeout(350);
await capture('drag');
await area.dispatchEvent('drop', { dataTransfer: drag });
await page.waitForTimeout(450);
await capture('processing');
await page.waitForTimeout(6500);
await capture('complete');
const input = root.locator('input[type="file"]');
await input.setInputFiles({ name:'oversize.pdf', mimeType:'application/pdf', buffer:Buffer.alloc(26 * 1024 * 1024) });
await page.waitForTimeout(400);
await capture('error');
const remove = root.getByRole('button', { name: /remove/i }).first();
if (await remove.count()) { await remove.click(); await page.waitForTimeout(450); await capture('removed'); }
const retry = root.getByRole('button', { name: /retry/i }).first();
if (await retry.count()) { await retry.click(); await page.waitForTimeout(450); await capture('retry'); }
await page.setViewportSize({ width:390,height:844 });
await root.scrollIntoViewIfNeeded();
await capture('mobile');
await page.getByRole('radio', { name: 'Dark theme', exact: true }).first().click();
await capture('mobile-dark');
await page.emulateMedia({ reducedMotion: 'reduce' });
await capture('mobile-reduced-motion');
await browser.close();
