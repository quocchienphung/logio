import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Computed style of the legend, swatches, outside labels, leaders and readout in rest / hovered / off states of the public Split bar preview. Rendered output only.
const out = 'docs/research/uiarc-split-bar';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('https://uiarc.dev/components/split-bar', { waitUntil: 'networkidle' });
const figure = page.locator('figure').first();
await figure.scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);

const measure = () => {
  const fig = document.querySelector('figure');
  const pick = (sel, n = 2) => [...fig.querySelectorAll(sel)].slice(0, n).map(e => {
    const s = getComputedStyle(e), b = e.getBoundingClientRect(), before = getComputedStyle(e, '::before'), after = getComputedStyle(e, '::after');
    return {
      sel, text: e.childElementCount ? undefined : e.textContent?.slice(0, 30), rect: [b.x, b.y, b.width, b.height].map(v => Math.round(v * 10) / 10),
      font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight}`, ls: s.letterSpacing, color: s.color, bg: s.backgroundColor, border: s.border, borderRight: s.borderRightWidth + ' ' + s.borderRightColor, radius: s.borderRadius,
      padding: s.padding, gap: s.gap, opacity: s.opacity, deco: s.textDecorationLine, shadow: s.boxShadow, transition: s.transition, outline: s.outline, tnum: s.fontVariantNumeric,
      before: before.content !== 'none' ? { content: before.content, bg: before.backgroundColor, w: before.width, h: before.height, radius: before.borderRadius } : undefined,
      after: after.content !== 'none' ? { content: after.content, bg: after.backgroundColor, w: after.width, h: after.height } : undefined,
    };
  });
  return {
    legend: pick('[class*="split-bar_legend_"]', 1), legendItem: pick('[class*="legendItem"]', 2), swatch: pick('[class*="swatch"]', 2), legendName: pick('[class*="legendName"]', 1), legendShare: pick('[class*="legendShare"]', 1),
    readoutLine: pick('[class*="readoutLine"]', 1), readoutName: pick('[class*="readoutName"]', 1), readoutShare: pick('[class*="readoutShare"]', 1), readoutValue: pick('[class*="readoutValue"]', 1),
    lane: pick('[class*="split-bar_lane"]', 1), outside: pick('[class*="split-bar_outside_"]', 2), outsideName: pick('[class*="outsideName"]', 1), leader: pick('[class*="split-bar_leader_"]', 1),
    bar: pick('[class*="split-bar_bar_"]', 1), segment: pick('[class*="split-bar_segment"]', 1), cap: pick('[class*="split-bar_cap"]', 1), insideName: pick('[class*="insideName"]', 1),
  };
};
const result = { rest: await page.evaluate(measure) };
const bar = figure.locator('[class*="split-bar_bar_"]'), b = await bar.boundingBox();
await page.mouse.move(b.x + b.width * 0.5, b.y + 20, { steps: 6 });
await page.waitForTimeout(900);
result.hovered = await page.evaluate(measure);
result.hoveredSegments = await page.evaluate(() => [...document.querySelectorAll('figure [class*="split-bar_segment"]')].map(s => ({ bg: getComputedStyle(s).backgroundColor, opacity: getComputedStyle(s).opacity })));
await page.mouse.move(b.x + b.width * 0.5, b.y - 200);
await page.waitForTimeout(700);
await figure.locator('[class*="legendItem"]').nth(1).hover();
await page.waitForTimeout(500);
result.legendHover = await page.evaluate(() => ({ items: [...document.querySelectorAll('figure [class*="legendItem"]')].map(e => ({ bg: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color })), segs: [...document.querySelectorAll('figure [class*="split-bar_segment"]')].map(s => getComputedStyle(s).opacity), readout: document.querySelector('figure [class*="readoutLine"]')?.textContent?.replace(/\d/g, '#').slice(0, 40) }));
await figure.locator('[class*="legendItem"]').nth(1).click();
await page.mouse.move(b.x + b.width * 0.5, b.y - 200);
await page.waitForTimeout(1200);
result.off = await page.evaluate(measure);
result.offItem = await page.evaluate(() => { const e = document.querySelectorAll('figure [class*="legendItem"]')[1]; return { aria: e.getAttribute('aria-label'), pressed: e.getAttribute('aria-pressed'), html: e.outerHTML.replace(/<span class="split-bar_(column|wheel|glyph|sizer)[^]*?<\/span>/g, '').slice(0, 900) }; });
await fs.writeFile(`${out}/legend-measure.json`, JSON.stringify(result, null, 2));
console.log('written');
await browser.close();
