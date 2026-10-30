import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only. Records every glyph of the main label while "Publish" morphs to "Published" and back,
// plus the design tokens (spring easing and durations) the component's CSS refers to.
const directory = 'docs/research/split-button/source';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://uiarc.dev/components/split-button', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const group = page.locator('[class*="split-button_group"]').first();
await group.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(1200);

const tokens = await group.evaluate(n => { const s = getComputedStyle(n); const root = getComputedStyle(document.documentElement); return Object.fromEntries(['--ease-spring', '--duration-spring', '--ease-standard', '--duration-fast', '--duration-instant', '--control-height-md', '--control-height-sm', '--radius-control', '--radius-panel', '--radius-pill', '--shadow-floating', '--surface-raised', '--border', '--surface-muted', '--text-sm', '--text-xs', '--space-2', '--space-3', '--space-4'].map(k => [k, (s.getPropertyValue(k) || root.getPropertyValue(k)).trim()])); });
await fs.writeFile(`${directory}/tokens.json`, JSON.stringify(tokens, null, 1));
console.log(JSON.stringify(tokens));

await page.evaluate(() => {
  window.__g = []; window.__on = true; const t0 = performance.now();
  const tick = () => {
    if (!window.__on) return;
    const grp = document.querySelector('[class*="split-button_group"]');
    const content = grp.querySelector('[class*="split-button_primaryContent"]');
    const glyphs = [...grp.querySelectorAll('[class*="split-button_glyph_"], [class*="split-button_glyph"]')].filter(g => g.className.includes('glyph__') || /split-button_glyph_/.test(g.className));
    const items = [...grp.querySelectorAll('[class*="split-button_glyphs"] > *')].map(g => { const c = getComputedStyle(g), r = g.getBoundingClientRect(); return [g.textContent, +(+c.opacity).toFixed(3), c.filter === 'none' ? 0 : +parseFloat(c.filter.replace(/[^\d.]/g, '')).toFixed(2), c.transform === 'none' ? 0 : +(+c.transform.match(/matrix\(([^)]+)\)/)[1].split(',')[4]).toFixed(2), +(r.x - grp.getBoundingClientRect().x).toFixed(2), +r.width.toFixed(2), c.position]; });
    window.__g.push({ t: +(performance.now() - t0).toFixed(1), w: +grp.getBoundingClientRect().width.toFixed(2), items });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.waitForTimeout(50);
const b = await group.getByRole('button').first().boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.up();
await page.waitForTimeout(3500);
const frames = await page.evaluate(() => { window.__on = false; return window.__g; });
await fs.writeFile(`${directory}/motion-label-glyphs.json`, JSON.stringify(frames));
console.log('frames', frames.length);
const names = [];
let last = '';
for (const f of frames) { const k = f.items.map(i => i.slice(0, 4).join(':')).join('|'); if (k !== last) { names.push(f); last = k; } }
for (const f of names.filter((_, i) => i < 14 || i % 9 === 0).slice(0, 40)) console.log(f.t, f.w, f.items.map(i => `${JSON.stringify(i[0])}${i[1] < 1 ? '@' + i[1] : ''}${i[2] ? ' b' + i[2] : ''}${i[3] ? ' x' + i[3] : ''}${i[6] === 'absolute' ? ' abs' : ''}`).join(' '));
await browser.close();
