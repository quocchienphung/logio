import { chromium } from 'playwright';
// Public rendered preview only: where the sheet rests for several viewport heights (to get the detent formula).
const browser = await chromium.launch({ channel: 'chrome' });
for (const [w, h] of [[1440, 600], [1440, 700], [1440, 800], [1440, 1000], [1440, 1200], [390, 844], [390, 600]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto('https://uiarc.dev/components/bottom-sheet', { waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
  const t = page.getByRole('button', { name: 'View trip details' });
  await t.evaluate(n => { n.scrollIntoView({ block: 'center', behavior: 'instant' }); n.click(); }); await page.waitForTimeout(1300);
  const d = page.getByRole('dialog');
  const info = await d.evaluate(n => { const s = getComputedStyle(n); const m = s.transform.match(/matrix\(([^)]+)\)/); const r = n.getBoundingClientRect(); const head = n.querySelector('[class*="bottom-sheet_header"]').getBoundingClientRect(); return { ty: m ? +m[1].split(',')[5] : 0, top: r.top, height: r.height, vars: n.getAttribute('style').match(/--sheet-max: [\d.]+/)?.[0], headH: head.height, vv: innerHeight }; });
  const g = d.getByRole('button', { name: /expand sheet/i }).first(); await g.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(900);
  const tall = await d.evaluate(n => n.getBoundingClientRect().top);
  console.log(`${w}x${h}`, JSON.stringify(info), 'visible at smallest', h - info.top, 'visible at tallest', h - tall, '| .45*vh', (0.45 * h).toFixed(1), '.92*vh', (0.92 * h).toFixed(1));
  await page.close();
}
await browser.close();
