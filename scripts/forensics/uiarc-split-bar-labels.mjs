import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// For several widths of the public Split bar preview: each segment's pixel width, the pixel width of its name and share text, and which label mode it chose
// (name + share inside, share inside, outside). Used to fit the label rule. Rendered output only.
const out = 'docs/research/uiarc-split-bar';
const browser = await chromium.launch({ channel: 'chrome' });
const rows = [];
for (const width of [1440, 1100, 900, 768, 600, 480, 390, 340]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.goto('https://uiarc.dev/components/split-bar', { waitUntil: 'networkidle' });
  const figure = page.locator('figure').first();
  await figure.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2600);
  const data = await page.evaluate(() => {
    const fig = document.querySelector('figure'), bar = fig.querySelector('[class*="split-bar_bar_"]'), barW = bar.getBoundingClientRect().width;
    const probe = (text, weight) => { const s = document.createElement('span'); s.textContent = text; s.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${weight} 12px Inter, sans-serif;letter-spacing:-0.16px;font-variant-numeric:tabular-nums`; fig.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return Math.round(w * 100) / 100; };
    const segs = [...fig.querySelectorAll('[class*="split-bar_segment"]')];
    const names = [...fig.querySelectorAll('[class*="legendName"]')].map(n => n.textContent);
    const outside = [...fig.querySelectorAll('[class*="split-bar_outside_"]')].filter(o => getComputedStyle(o).opacity > 0.5).map(o => o.querySelector('[class*="outsideName"]')?.textContent ?? o.textContent.slice(0, 20));
    return {
      barW, outside, segs: segs.map((s, i) => {
        const m = /inset\(0px calc\(([\d.]+)% \+ ([\d.]+)px\) 0px calc\(([\d.]+)% \+ ([\d.]+)px\)/.exec(s.style.clipPath), l = Number(m[3]), r = 100 - Number(m[1]);
        const nameEl = s.querySelector('[class*="insideName"]'), inside = s.querySelector('[class*="split-bar_inside"]');
        const share = (r - l) / 100;
        return { name: names[i], segPx: Math.round(share * barW * 100) / 100, nameW: probe(names[i], 400), pctW: probe(`${(share * 100).toFixed(1)}%`, 500), nameShown: nameEl.style.opacity === '1', insideOpacity: inside.style.opacity };
      }),
    };
  });
  rows.push({ viewport: width, ...data });
  await page.close();
}
await fs.writeFile(`${out}/labels-fit.json`, JSON.stringify(rows, null, 2));
for (const r of rows) console.log(r.viewport, 'bar', Math.round(r.barW), 'outside:', r.outside.join(','), '|', r.segs.map(s => `${s.name} ${s.segPx}px name${s.nameW}+pct${s.pctW} ${s.nameShown ? 'NAME' : s.insideOpacity === '0' ? 'out' : 'pct'}`).join(' ; '));
await browser.close();
