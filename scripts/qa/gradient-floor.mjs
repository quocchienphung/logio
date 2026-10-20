// QA of the Gradient Floor behind the Guide me selector (/personalize?browse=1).
// Usage: node scripts/qa/gradient-floor.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/gradient-floor/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [], passed = [], external = new Set();
const check = async (name, fn) => { await fn(); passed.push(name); console.log(`PASS ${name}`); };
const url = `${base}/personalize?browse=1&group=agent-chat`;

async function open(options = {}, query = url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/favicon|Failed to load resource/.test(message.text())) errors.push(message.text()); });
  page.on('request', request => { const u = new URL(request.url()); if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && u.protocol.startsWith('http')) external.add(request.url()); });
  await page.goto(query, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(600);
  return { page, context };
}
const heights = d => { const n = d.match(/-?\d+\.?\d*/g).map(Number); return { rim: n[1], left: n[5], right: n[10], shelf: n[12], mid: n[16] }; };
const colorD = page => page.locator('.guide-floor .gf-layer--color path').getAttribute('d');

try {
  await check('The floor is the page background: two layers, behind the stage, covering the page, never catching the pointer', async () => {
    const { page, context } = await open();
    const m = await page.evaluate(() => {
      const floor = document.querySelector('.guide-floor').getBoundingClientRect();
      const pageBox = document.querySelector('.guide-page').getBoundingClientRect();
      const f = document.querySelector('.guide-floor');
      const stage = document.querySelector('.guide-stage');
      return {
        floor: [floor.left, floor.top, floor.width, floor.height], page: [pageBox.left, pageBox.top, pageBox.width, pageBox.height],
        layers: document.querySelectorAll('.guide-floor .gf-layer').length,
        hidden: [...document.querySelectorAll('.guide-floor .gf-layer')].every(l => l.getAttribute('aria-hidden') === 'true'),
        z: [getComputedStyle(f).zIndex, getComputedStyle(stage).zIndex], pe: getComputedStyle(f).pointerEvents,
        blend: getComputedStyle(document.querySelector('.gf-layer--light')).mixBlendMode, overflow: getComputedStyle(f).overflow,
        gradient: [...document.querySelectorAll('.guide-floor linearGradient stop')].map(s => s.getAttribute('stop-color')),
      };
    });
    assert.deepEqual(m.floor, m.page, 'covers the whole page');
    assert.equal(m.layers, 2);
    assert(m.hidden, 'layers are hidden from assistive tech');
    assert(Number(m.z[0]) < Number(m.z[1]), 'behind the stage');
    assert.equal(m.pe, 'none');
    assert.equal(m.blend, 'plus-lighter');
    assert.equal(m.overflow, 'hidden');
    assert.deepEqual(m.gradient, ['#FF7700', '#FF0055', '#0073FF']);
    await page.screenshot({ path: `${out}/page-laptop.png` });
    await context.close();
  });

  await check('The contour morphs as five sine waves with a 3 s period; the light layer is the same shape at 0.8427 scale; drift runs on its own 2.5 s beat', async () => {
    const { page, context } = await open();
    const rows = await page.evaluate(async () => {
      const color = document.querySelector('.guide-floor .gf-layer--color path'), light = document.querySelector('.guide-floor .gf-layer--light path');
      const out = []; const t0 = performance.now();
      while (performance.now() - t0 < 6500) { out.push({ t: performance.now() - t0, c: color.getAttribute('d'), l: light.getAttribute('d') }); await new Promise(r => setTimeout(r, 100)); }
      return out;
    });
    const distinct = new Set(rows.map(r => r.c)).size;
    assert(distinct > 40, `path changes continuously (${distinct} distinct)`);
    const a = rows.find(r => r.t > 500);
    const b = rows.reduce((best, r) => Math.abs(r.t - (a.t + 3000)) < Math.abs(best.t - (a.t + 3000)) ? r : best);
    const ha = heights(a.c), hb = heights(b.c);
    const timing = Math.abs(b.t - a.t - 3000);
    for (const k of Object.keys(ha)) assert(Math.abs(ha[k] - hb[k]) < 12 + timing * 0.3, `${k} returns after 3 s: ${ha[k]} vs ${hb[k]} (timing error ${timing.toFixed(0)}ms)`);
    const span = key => { const v = rows.map(r => heights(r.c)[key]); return (Math.max(...v) - Math.min(...v)) / 2; };
    for (const [key, amp] of [['rim', 80], ['shelf', 80], ['left', 110], ['right', 110], ['mid', 110]]) assert(Math.abs(span(key) - amp) < 8, `${key} amplitude ${span(key)}`);
    for (const r of rows.filter((_, i) => i % 6 === 0)) {
      const c = r.c.match(/-?\d+\.?\d*/g).map(Number), l = r.l.match(/-?\d+\.?\d*/g).map(Number);
      c.forEach((n, i) => assert(Math.abs(l[i] - n * 0.8427) < 0.3, `light ${i}`));
    }
    const anim = await page.evaluate(() => [...document.querySelectorAll('.gf-bleed')].map(el => { const cs = getComputedStyle(el); return [cs.animationName, cs.animationDuration, cs.animationIterationCount]; }));
    assert.deepEqual(anim, [['gf-drift-color', '2.5s', 'infinite'], ['gf-drift-light', '2.5s', 'infinite']]);
    await context.close();
  });

  await check('One rAF loop drives it; it pauses when the floor leaves the screen and resumes without a jump', async () => {
    const { page, context } = await open();
    const moving = async () => { const a = await colorD(page); await page.waitForTimeout(250); return a !== await colorD(page); };
    assert.equal(await moving(), true);
    await page.addStyleTag({ content: '.guide-floor{transform:translateY(-300vh)!important}' });
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.guide-floor').getAttribute('data-paused'), '');
    assert.equal(await moving(), false, 'path stops while off screen');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.gf-bleed')).animationPlayState), 'paused');
    const before = heights(await colorD(page));
    await page.addStyleTag({ content: '.guide-floor{transform:none!important}' });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.guide-floor').getAttribute('data-paused'), null);
    const after = heights(await colorD(page));
    for (const k of Object.keys(before)) assert(Math.abs(before[k] - after[k]) < 60, `${k} resumes where it stopped (${before[k]} -> ${after[k]})`);
    assert.equal(await moving(), true);
    await context.close();
  });

  await check('Reduced motion: the floor holds the preview still pose and nothing animates', async () => {
    const { page, context } = await open({ reducedMotion: 'reduce' });
    const h = heights(await colorD(page));
    for (const [k, v] of Object.entries({ rim: 643.3, left: 297.3, right: 453.9, shelf: 507.3, mid: 376.1 })) assert(Math.abs(h[k] - v) < 0.6, `${k} ${h[k]} vs ${v}`);
    const first = await colorD(page);
    await page.waitForTimeout(500);
    assert.equal(await colorD(page), first);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest('.gf') && Number(a.effect.getTiming().duration) > 1).length), 0);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.gf-bleed')).animationName), 'none');
    await context.close();
  });

  await check('It scales with the page width and stays anchored at the bottom in every orientation and size, with no overflow', async () => {
    const rows = [];
    for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [844, 390], [390, 844], [320, 568], [320, 480]]) {
      const { page, context } = await open({ viewport: { width, height } });
      const m = await page.evaluate(() => {
        const f = document.querySelector('.guide-floor').getBoundingClientRect();
        const layer = document.querySelector('.gf-layer--color').getBoundingClientRect();
        const doc = document.documentElement;
        // The layer is scaled by the drift animation, so measure its unscaled box.
        const unscaled = document.querySelector('.gf-layer--color').offsetWidth;
        return { fw: f.width, fh: f.height, layerUnits: unscaled / (f.width / 2200), layerBox: layer.width, overflowX: doc.scrollWidth > innerWidth, pageH: doc.scrollHeight, bottom: f.bottom + scrollY };
      });
      assert(Math.abs(m.layerUnits - 2864.5) * (m.fw / 2200) < 1, `${width}x${height} layer width ${m.layerUnits} units (within 1px of the measured proportion)`);
      assert(!m.overflowX, `${width}x${height} no horizontal overflow`);
      assert(m.fh >= height - 1, `${width}x${height} floor covers the page`);
      assert(Math.abs(m.bottom - Math.max(m.pageH, height)) < 1.5, `${width}x${height} anchored to the page bottom`);
      rows.push({ width, height, floor: `${m.fw}x${m.fh}` });
      if (width === 390 || width === 844) await page.screenshot({ path: `${out}/page-${width}x${height}.png` });
      await context.close();
    }
    console.table(rows);
  });

  await check('The selector still works on the floor: hover, the live card, clicks on the bare floor; nothing leaves localhost', async () => {
    const { page, context } = await open();
    await page.locator('.guide-item').filter({ hasText: /CRM$/ }).hover();
    await page.waitForTimeout(900);
    assert.match(await page.locator('.guide-item[aria-current]').innerText(), /CRM/);
    await page.locator('.guide-item').filter({ hasText: /Agent Chat$/ }).hover();
    await page.waitForTimeout(900);
    await page.locator('.guide-preview__frame[data-live] .wra__chip').first().click();
    await page.waitForFunction(() => document.querySelector('.guide-preview__frame[data-live] .wra__msg--assistant')?.textContent?.length > 20);
    assert.equal(await page.locator('.guide-page').count(), 1);
    await page.mouse.click(40, 860);
    assert.equal(await page.locator('.guide-page').count(), 1);
    assert.deepEqual([...external], []);
    await context.close();
  });

  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed, errors, external: [...external] }, null, 2));
  await browser.close();
}
