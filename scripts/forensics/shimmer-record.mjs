// How the public Text shimmer moves: the percentage in its gradient's stops over time (rendered page only). Usage: node scripts/forensics/shimmer-record.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await page.goto('https://uiarc.dev/components/agent-timeline', { waitUntil: 'networkidle' });
const root = page.locator('section[class*="agent-timeline_root"]').first();
await root.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
await page.evaluate(() => {
  window.__s = []; const t0 = performance.now();
  const el = document.querySelector('[class*="text-shimmer_label"]');
  window.__el = el;
  const tick = () => { const bg = getComputedStyle(el).backgroundImage; const m = bg.match(/calc\(([\d.]+)% [+-] [\d.-]+px\)/g); window.__s.push([+(performance.now() - t0).toFixed(1), m ? m.slice(0, 8) : null, el.getBoundingClientRect().width, el.textContent]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await page.waitForTimeout(6500);
const samples = await page.evaluate(() => window.__s);
await fs.writeFile('docs/research/orchestrator/source/primitives/shimmer-frames-long.json', JSON.stringify(samples));
console.log(samples.length, JSON.stringify(samples[0]), JSON.stringify(samples[40]), JSON.stringify(samples.at(-1)));
const pct = samples.map(s => [s[0], s[1] ? +s[1][0].match(/\(([\d.]+)%/)[1] : null]).filter(p => p[1] !== null);
console.log(pct.filter((_, i) => i % 40 === 0).map(p => `${p[0].toFixed(0)}:${p[1]}`).join(' '));
// the em offsets are also in the computed value: print the first stop set once
const bg = await page.evaluate(() => getComputedStyle(window.__el).backgroundImage);
console.log(bg.slice(0, 900));
await browser.close();
