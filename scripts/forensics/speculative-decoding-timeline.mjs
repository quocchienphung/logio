import fs from 'node:fs/promises';
import { chromium } from 'playwright';

// Public rendered preview only: every DOM change and every animation of the card, time-stamped from the moment Restart is pressed.
// No bundle or private source is read. Output: docs/research/speculative-decoding/source/timeline-*.json
const directory = 'docs/research/speculative-decoding/source';
const SPAN = Number(process.argv[2] || 12000);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('https://uiarc.dev/components/speculative-decoding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const card = page.locator('[class*="speculative-decoding_card"]').first();
  await card.scrollIntoViewIfNeeded();
  // Let the first autoplay finish so the recording starts from a clean "Restart".
  await page.waitForFunction(() => /Done in/.test(document.querySelector('[class*="speculative-decoding_status"]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => {
    const root = document.querySelector('[class*="speculative-decoding_card"]');
    const short = n => { const c = typeof n.className === 'string' ? n.className : ''; const m = c.match(/(speculative-decoding|text-shimmer)_(\w+?)__/); return m ? (m[1] === 'text-shimmer' ? 'ts_' : 'sd_') + m[2] : n.tagName.toLowerCase(); };
    const ev = window.__ev = [], seen = new WeakSet(); let t0 = performance.now();
    window.__reset = () => { t0 = performance.now(); ev.length = 0; };
    const push = o => ev.push({ t: +(performance.now() - t0).toFixed(1), ...o });
    new MutationObserver(list => { for (const m of list) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue;
      const inShimmer = !!el.closest('[class*="text-shimmer_"]');
      if (m.type === 'attributes') { if (m.attributeName === 'style' && inShimmer) continue; const v = el.getAttribute(m.attributeName); push({ k: 'attr', el: short(el), j: el.closest('[class*="sd_column"], [class*="speculative-decoding_column"]')?.style.getPropertyValue('--j') || undefined, a: m.attributeName, v: m.attributeName === 'style' ? (v ?? '').slice(0, 120) : v }); }
      else if (m.type === 'characterData') push({ k: 'text', el: short(el), v: (m.target.data ?? '').slice(0, 80) });
      else { const names = [...m.addedNodes].map(n => n.nodeType === 1 ? short(n) : '#text'); const gone = [...m.removedNodes].map(n => n.nodeType === 1 ? short(n) : '#text'); if (names.length || gone.length) push({ k: 'child', el: short(el), add: names, del: gone }); }
    } }).observe(root, { subtree: true, attributes: true, childList: true, characterData: true });
    const sample = () => { for (const a of document.getAnimations()) { if (seen.has(a)) continue; const target = a.effect?.target; if (!target || !root.contains(target)) continue; seen.add(a); const timing = a.effect.getTiming(); let frames = []; try { frames = a.effect.getKeyframes().map(f => Object.fromEntries(Object.entries(f).filter(([k]) => !['composite', 'computedOffset'].includes(k)))); } catch {} push({ k: 'anim', kind: a.constructor.name, el: short(target), j: target.closest('[class*="sd_column"], [class*="speculative-decoding_column"]')?.style.getPropertyValue('--j') || undefined, prop: a.transitionProperty ?? a.animationName ?? undefined, dur: timing.duration, delay: timing.delay, ease: String(timing.easing).slice(0, 90), fill: timing.fill, frames: frames.slice(0, 4) }); } requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  });
  const run = async (name, action, span = SPAN) => {
    await page.evaluate(() => window.__reset());
    await action();
    await page.waitForTimeout(span);
    const events = await page.evaluate(() => window.__ev.slice());
    await fs.writeFile(`${directory}/timeline-${name}.json`, JSON.stringify(events, null, 1));
    console.log(name, events.length, 'events');
  };
  await run('restart', () => card.getByRole('button', { name: 'Restart' }).click());
  const slider = card.getByRole('slider').first();
  const sliderInfo = async () => ({ min: await slider.getAttribute('aria-valuemin'), max: await slider.getAttribute('aria-valuemax'), now: await slider.getAttribute('aria-valuenow'), text: await slider.getAttribute('aria-valuetext'), label: await slider.getAttribute('aria-label'), orientation: await slider.getAttribute('aria-orientation') });
  const info = { initial: await sliderInfo(), switch: await card.getByRole('switch').first().evaluate(n => ({ label: n.getAttribute('aria-label') ?? n.closest('label')?.textContent ?? n.textContent, checked: n.getAttribute('aria-checked') })) };
  await slider.focus();
  await run('slider-min', async () => { await page.keyboard.press('Home'); }, 9000);
  info.atMin = await sliderInfo();
  await run('slider-max', async () => { await page.keyboard.press('End'); }, 9000);
  info.atMax = await sliderInfo();
  await run('slider-step', async () => { await page.keyboard.press('ArrowLeft'); }, 1500);
  info.afterLeft = await sliderInfo();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500); info.twoRight = await sliderInfo();
  await run('compare-on', () => card.getByRole('switch').first().click(), 9000);
  info.compareOn = await card.getByRole('switch').first().getAttribute('aria-checked');
  await run('compare-off', () => card.getByRole('switch').first().click(), 2000);
  await run('restart-again', () => card.getByRole('button', { name: 'Restart' }).click(), 800);
  await run('pause-play', async () => { await page.waitForTimeout(700); await card.getByRole('button', { name: 'Pause' }).click(); await page.waitForTimeout(1500); await card.getByRole('button', { name: 'Play' }).click(); }, 8000);
  await fs.writeFile(`${directory}/controls.json`, JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info));
  await browser.close();
} catch (error) { console.error(error); await browser.close(); process.exitCode = 1; }
