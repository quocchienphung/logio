import fs from 'node:fs/promises';
import { chromium } from 'playwright';
// Public rendered preview only: the surface's entrance (opacity, rise, scale) from the first frame, on a warm cache.
const directory = 'docs/research/cookie-consent/source';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.addInitScript(`window.__f = []; const t0 = performance.now(); const tick = () => { const s = document.querySelector('[class*="cookie-consent_surface"]'); if (s) { const c = getComputedStyle(s); window.__f.push({ t: +(performance.now() - t0).toFixed(1), op: +c.opacity, tf: c.transform, w: s.getBoundingClientRect().width }); } requestAnimationFrame(tick); }; requestAnimationFrame(tick);`);
const runs = [];
for (let i = 0; i < 4; i++) {
  await page.goto('https://uiarc.dev/components/cookie-consent', { waitUntil: 'networkidle' });
  await page.locator('[class*="cookie-consent_stage"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  runs.push(await page.evaluate(() => window.__f));
}
await fs.writeFile(`${directory}/motion-entrance-warm.json`, JSON.stringify(runs.slice(1)));
for (const r of runs.slice(1)) { const t0 = r[0].t; console.log(r.length, 'first', r[0].op, r[0].tf, '| at +100ms', JSON.stringify(r.find(x => x.t - t0 > 100)), '| +300', JSON.stringify(r.find(x => x.t - t0 > 300))); }
await browser.close();
