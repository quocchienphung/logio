import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Frame-by-frame DOM motion of the public preview: segmented thumb, animated counters (digit columns), label "rise" spans, delta icon, peak rows.
const out = 'docs/research/uiarc-terrain/source/dom-motion.json';
const URL = 'https://uiarc.dev/components/blocks/activity-terrain';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  const result = {};
  const sample = (ms, selectorClick) => page.evaluate(async ([ms, click]) => {
    const root = document.querySelector('[class*="activity-terrain_root"]');
    const frames = [], start = performance.now();
    const read = now => {
      const thumbs = [...root.querySelectorAll('[class*="segmented-control_selection"]')].map(el => { const b = el.getBoundingClientRect(), s = getComputedStyle(el); return { x: +b.x.toFixed(2), w: +b.width.toFixed(2), op: s.opacity, tr: s.transform, parent: el.parentElement.getAttribute('data-value') }; });
      const cols = [...root.querySelectorAll('[class*="animated-counter_column"]')].slice(0, 12).map(col => ({ w: +col.getBoundingClientRect().width.toFixed(2), style: col.getAttribute('style'), glyphs: [...col.querySelectorAll('[class*="animated-counter_glyph"]')].filter(g => g.style.visibility !== 'hidden').map(g => ({ t: g.textContent, tr: g.style.transform, op: g.style.opacity, f: g.style.filter })) }));
      const rises = [...root.querySelectorAll('[class*="activity-terrain_rise"] > span')].slice(0, 6).map(s => ({ text: s.textContent.slice(0, 18), op: s.style.opacity, tr: s.style.transform, f: s.style.filter }));
      const icon = root.querySelector('[class*="activity-terrain_deltaIcon"]'), peaks = [...root.querySelectorAll('button[class*="activity-terrain_peak"]')].map(b => b.getAttribute('aria-pressed'));
      frames.push({ t: +(now - start).toFixed(1), thumbs, cols, rises, icon: icon?.style.transform, peaks });
    };
    if (click) document.querySelector(click)?.click();
    await new Promise(resolve => { const tick = now => { read(now); if (now - start < ms) requestAnimationFrame(tick); else resolve(); }; requestAnimationFrame(tick); });
    return frames;
  }, [ms, selectorClick]);
  result.deploys = await sample(1500, '[data-value="deploys"]');
  await page.waitForTimeout(800);
  result.errors = await sample(1500, '[data-value="errors"]');
  await page.waitForTimeout(800);
  result.sessions = await sample(1500, '[data-value="sessions"]');
  await page.waitForTimeout(800);
  result.top = await sample(1500, '[data-value="top"]');
  await fs.writeFile(out, JSON.stringify(result));
  const f = result.deploys;
  console.log('frames', f.length, 'first thumbs', JSON.stringify(f[0].thumbs), 'last', JSON.stringify(f.at(-1).thumbs));
  console.log('thumb x over time', f.filter((_, i) => i % 6 === 0).map(x => `${x.t}:${JSON.stringify(x.thumbs.map(t => [t.parent, t.x, t.w, t.op]))}`).slice(0, 14).join('\n'));
  console.log('counter col0 over time', f.filter((_, i) => i % 6 === 0).slice(0, 14).map(x => `${x.t}: ${JSON.stringify(x.cols[0])}`).join('\n'));
  console.log('rises', f.filter((_, i) => i % 8 === 0).slice(0, 8).map(x => `${x.t}: ${JSON.stringify(x.rises.slice(0, 2))}`).join('\n'));
} finally { await browser.close(); }
