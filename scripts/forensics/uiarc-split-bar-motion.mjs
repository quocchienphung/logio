import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Records, frame by frame, what the public Split bar preview paints (clip-path insets, caps, label transforms, readout opacity) while real input drives it.
// Reads rendered output only. No API, registry, CLI or Pro source.
const out = 'docs/research/uiarc-split-bar';
// raw traces (about 400 KB each) stay out of the repository: set SPLIT_BAR_TRACES to a folder outside it
const traces = process.env.SPLIT_BAR_TRACES ?? out;
const browser = await chromium.launch({ channel: 'chrome' });

const install = () => {
  window.__frames = []; window.__rec = false;
  const read = () => {
    const fig = document.querySelector('figure');
    const segs = [...fig.querySelectorAll('[class*="split-bar_segment"]')].map(s => {
      const m = /inset\(([^)]*)\)/.exec(s.style.clipPath || '');
      const cap = s.querySelector('[class*="split-bar_cap"]'), inside = s.querySelector('[class*="split-bar_inside"]'), name = s.querySelector('[class*="insideName"]');
      return { clip: m ? m[1] : null, opacity: getComputedStyle(s).opacity, cap: cap?.style.transform, capOp: cap?.style.opacity, inside: inside?.style.transform, insideOp: inside?.style.opacity, nameW: name?.style.width, nameOp: name?.style.opacity };
    });
    const outs = [...fig.querySelectorAll('[class*="split-bar_outside_"], [class*="split-bar_outside__"]')].map(o => ({ t: o.style.transform, o: o.style.opacity }));
    const lane = fig.querySelector('[class*="split-bar_lane"]');
    const legend = [...fig.querySelectorAll('[class*="legendLabel"]')].map(l => l.style.transform), live = fig.querySelector('[role="status"]')?.textContent;
    return { legend, live, segs, readout: [...fig.querySelectorAll('[class*="readoutLine"]')].map(l => ({ o: l.style.opacity, f: l.style.filter, t: l.style.transform, text: l.textContent?.slice(0, 40) })), outs, lane: lane?.style.height };
  };
  const tick = t => { if (window.__rec) window.__frames.push({ t: Math.round(t * 100) / 100, ...read() }); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

async function run(name, act) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://uiarc.dev/components/split-bar', { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: `(${install})()` });
  const figure = page.locator('figure').first();
  await figure.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await page.evaluate(() => { window.__frames = []; window.__rec = true; window.__mark = performance.now(); });
  await page.waitForTimeout(150);
  const t0 = await page.evaluate(() => performance.now());
  await act(page, figure);
  await page.waitForTimeout(1800);
  const frames = await page.evaluate(() => { window.__rec = false; return window.__frames; });
  await fs.writeFile(`${traces}/motion-${name}.json`, JSON.stringify({ t0, frames }));
  console.log(name, frames.length, 'frames');
  await page.screenshot({ path: `${out}/motion-${name}.png`, clip: await figure.boundingBox() });
  await page.close();
}

try {
  const bar = f => f.locator('[class*="split-bar_bar_"]');
  await run('hover-direct', async (p, f) => { const b = await bar(f).boundingBox(); await p.mouse.move(b.x + b.width * 0.5, b.y + 20, { steps: 6 }); });
  await run('hover-small', async (p, f) => { const b = await bar(f).boundingBox(); await p.mouse.move(b.x + b.width * 0.9, b.y + 20, { steps: 6 }); });
  await run('hide-direct', async (p, f) => { await f.locator('[class*="legendItem"]').nth(1).click(); });
  await run('hide-direct-then-show', async (p, f) => { const item = f.locator('[class*="legendItem"]').nth(1); await item.click(); await p.waitForTimeout(1500); await p.evaluate(() => { window.__frames = []; }); await item.click(); });
  await run('period-30', async p => { await p.getByRole('button', { name: '30 days' }).first().click(); });
  await run('keyboard-arrow', async p => { const f = p.locator('figure').first(); await bar(f).focus(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.press('ArrowRight'); });
  await run('last-visible-shake', async (p, f) => {
    const items = f.locator('[class*="legendItem"]');
    for (let i = 1; i < 6; i++) { await items.nth(i).click(); await p.waitForTimeout(250); }
    await p.waitForTimeout(1200); await p.evaluate(() => { window.__frames = []; });
    await items.nth(0).click();
  });
} finally { await browser.close(); }
