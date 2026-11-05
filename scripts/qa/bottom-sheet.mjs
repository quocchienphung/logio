// QA for the bottom sheet (src/components/sites/bottom-sheet) on /personalize?section=process: the saved-processes and new-process sheets.
// Behaviour, accessibility, drag / flick / rubber band / detents, and frame-by-frame comparison with the recordings of the public preview
// (docs/research/bottom-sheet/source). Usage: node scripts/qa/bottom-sheet.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/bottom-sheet/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?section=process`;
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 5).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });
const reference = async name => JSON.parse(await fs.readFile(`docs/research/bottom-sheet/source/${name}.json`, 'utf8'));
const ty = f => { const m = f.tf?.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[5] : 0; };

const RECORDER = () => {
  window.__on = false; window.__f = [];
  window.__go = () => {
    window.__f = []; window.__on = true; const t0 = performance.now();
    const tick = () => { if (!window.__on) return; const d = document.querySelector('.bs-sheet'), o = document.querySelector('.bs-overlay'); if (d) { const m = getComputedStyle(d).transform.match(/matrix\(([^)]+)\)/); window.__f.push({ t: performance.now() - t0, ty: m ? +m[1].split(',')[5] : 0, ov: o ? +getComputedStyle(o).opacity : null }); } else window.__f.push({ t: performance.now() - t0, gone: true }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  window.__stop = () => { window.__on = false; return window.__f; };
};
async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await context.addInitScript(RECORDER);
  await context.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource|hydrat/i.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pmap__block');
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(900);
  return { context, page };
}
const sheet = page => page.locator('.bs-sheet');
const trigger = page => page.locator('.sb-primary');
const settled = async page => { await page.waitForFunction(() => { const s = document.querySelector('.bs-sheet'); if (!s) return true; const m = getComputedStyle(s).transform.match(/matrix\(([^)]+)\)/); const v = m ? +m[1].split(',')[5] : 0; window.__last = window.__last ?? {}; const same = Math.abs((window.__last.v ?? -999) - v) < 0.05; window.__last.v = v; return same; }, null, { polling: 150 }); await page.waitForTimeout(120); };
const openNew = async page => { await trigger(page).click(); await sheet(page).waitFor(); await settled(page); };
const tyNow = page => page.evaluate(() => { const s = document.querySelector('.bs-sheet'); if (!s) return null; const m = getComputedStyle(s).transform.match(/matrix\(([^)]+)\)/); return m ? +m[1].split(',')[5] : 0; });
const ovNow = page => page.evaluate(() => { const o = document.querySelector('.bs-overlay'); return o ? +getComputedStyle(o).opacity : null; });
const record = async (page, action, ms = 1300) => { await page.evaluate(() => window.__go()); await page.waitForTimeout(40); await action(); await page.waitForTimeout(ms); return page.evaluate(() => window.__stop()); };
const progress = (frames, from, to) => { const s = frames.filter(f => !f.gone).map(f => ({ t: f.t, p: (f.ty - from) / (to - from) })); const anchor = s.find(x => x.p >= 0.1); return s.filter(x => x.t >= anchor.t - 120).map(x => ({ t: x.t - anchor.t, p: x.p })); };
const at = (series, t) => { if (t <= series[0].t) return series[0].p; for (let i = 1; i < series.length; i += 1) if (series[i].t >= t) { const a = series[i - 1], b = series[i]; return a.p + (b.p - a.p) * (t - a.t) / (b.t - a.t || 1); } return series.at(-1).p; };
const rmse = (a, b, from = -40, to = 450) => { let sum = 0, n = 0; for (let t = from; t <= to; t += 8) { sum += (at(a, t) - at(b, t)) ** 2; n += 1; } return Math.sqrt(sum / n); };
const theirsProgress = async (name, from, to) => progress((await reference(name)).filter(f => !f.gone).map(f => ({ ...f, ty: ty(f) })), from, to);

/** Drags from the header: `moves` is a list of [dy from the grab point, ms to get there]; the pointer then rests `rest` ms before it is released. */
async function dragHeader(page, moves, rest = 250, grabOffset = 22) {
  const box = await sheet(page).boundingBox();
  const x = box.x + box.width / 2, y0 = box.y + grabOffset;
  await page.mouse.move(x, y0); await page.mouse.down();
  let at = y0;
  for (const [dy, ms] of moves) { const steps = Math.max(1, Math.round(ms / 12)), from = at, to = y0 + dy; for (let i = 1; i <= steps; i += 1) { await page.mouse.move(x, from + (to - from) * i / steps); await page.waitForTimeout(12); } at = to; }
  if (rest) await page.waitForTimeout(rest);
  const during = await tyNow(page);
  await page.mouse.up();
  return during;
}

{
  const { context, page } = await open();
  const VH = 1000, REST = 0.37 * VH, CLOSED = 0.92 * VH + 40; // the New process sheet: detents .55 and .92
  await check('The primary button opens the New process sheet: a dialog titled "New process", focus on the sheet, page inert and scroll locked', async () => {
    await trigger(page).click(); await sheet(page).waitFor(); await settled(page);
    const dialog = page.getByRole('dialog', { name: 'New process' });
    assert.equal(await dialog.count(), 1);
    assert.equal(await dialog.getAttribute('aria-modal'), 'true');
    assert.ok(await dialog.getAttribute('aria-describedby'));
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('bs-sheet')), true, 'the sheet itself has the focus');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    assert.equal(await page.evaluate(() => [...document.body.children].filter(c => !c.classList.contains('bs-root') && c.tagName !== 'SCRIPT' && c.tagName !== 'NEXT-ROUTE-ANNOUNCER' && !c.hasAttribute('inert')).length), 0, 'every other part of the page is inert');
    const t = await tyNow(page); assert.ok(Math.abs(t - REST) < 1, `rests at ${t}`);
    assert.ok(Math.abs((await ovNow(page)) - 0.78) < 0.01, 'the backdrop is .78 at the smallest detent');
    await page.screenshot({ path: `${out}/new-sheet-small.png` });
  });
  await check('Layout: 36rem wide, centred, 34px top corners, 1080px-style height = .92 x viewport + 160px, anchored 160px below the viewport', async () => {
    const box = await sheet(page).boundingBox();
    assert.ok(Math.abs(box.width - 576) < 1 && Math.abs(box.x + box.width / 2 - 720) < 1, JSON.stringify(box));
    assert.ok(Math.abs(box.height - (0.92 * VH + 160)) < 1, `height ${box.height}`);
    assert.equal(await sheet(page).evaluate(n => getComputedStyle(n).borderTopLeftRadius), '34px');
    assert.equal(await page.locator('.bs-grabber').evaluate(n => { const r = n.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)].join('x'); }), '56x20');
  });
  await check('Escape closes it: the sheet springs to the closed position like the recording, is gone after ~650ms, the focus goes back to the button', async () => {
    const frames = await record(page, () => page.keyboard.press('Escape'), 1100);
    const ours = progress(frames, REST, CLOSED), their = await theirsProgress('motion-escape-close', 460, 960);
    const error = rmse(ours, their, -40, 500);
    const goneAt = frames.find(f => f.gone)?.t, first = frames.find(f => !f.gone && f.ty > REST + 1).t;
    console.log(`   close rmse vs recording ${error.toFixed(4)}; gone ${(goneAt - first).toFixed(0)}ms after it starts moving (recording 659ms)`);
    assert.ok(error < 0.05, `differs from the recording by ${error.toFixed(3)}`);
    assert.ok(goneAt - first > 450 && goneAt - first < 950, `gone after ${goneAt - first}ms`);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('sb-primary')), true, 'focus returned');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await page.evaluate(() => [...document.body.children].filter(c => c.hasAttribute('inert')).length), 0, 'nothing left inert');
  });
  await check('Opening: closed to the smallest detent with the fitted spring (stiffness 160, damping 25), the backdrop tracking the position', async () => {
    const frames = await record(page, () => trigger(page).click(), 1400);
    const live = frames.filter(f => !f.gone);
    // the recorded opening of the preview stalls for ~100ms mid-way (the page was busy), so the curve is compared with the spring fitted from clean releases
    const simulate = (times) => { const out = []; let x = 0, v = 0, t = 0, i = 0; const k = 160, c = 25, dt = 0.0005; while (i < times.length) { while (t < times[i]) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; } out.push(x); i++; } return out; };
    const ours = progress(live, CLOSED, REST);
    let best = Infinity;
    for (let shift = -40; shift <= 40; shift += 4) { const model = simulate(ours.map(s => Math.max(0, (s.t + 40 + shift) / 1000))); let sum = 0, n = 0; for (const [i, s] of ours.entries()) if (s.t < 600) { sum += (s.p - model[i]) ** 2; n++; } best = Math.min(best, Math.sqrt(sum / n)); }
    console.log(`   open rmse vs the fitted spring ${best.toFixed(4)}`);
    assert.ok(best < 0.04, `differs from the spring by ${best.toFixed(3)}`);
    const live2 = live;
    // the backdrop is a function of the position, not a timer: at every frame it matches the piecewise curve
    let worst = 0;
    for (const f of live2) { const y = f.ty; const expected = y <= 0 ? 1 : y >= CLOSED ? 0 : y <= REST ? 1 - 0.22 * y / REST : 0.78 * (1 - (y - REST) / (CLOSED - REST)); if (f.ov !== null) worst = Math.max(worst, Math.abs(f.ov - expected)); }
    assert.ok(worst < 0.04, `backdrop off by ${worst.toFixed(3)} from its curve of the position`);
    await settled(page);
  });
  await check('The header drags the sheet 1:1 (within a pixel) and the content does not scroll while it is not fully open', async () => {
    const before = await tyNow(page);
    const during = await dragHeader(page, [[-60, 300], [-120, 300]], 250);
    assert.ok(Math.abs(during - (before - 120)) < 2, `followed ${before - during}px of 120`);
    await page.waitForTimeout(900); await settled(page);
    assert.ok(Math.abs((await tyNow(page)) - REST) < 1, 'released at rest it goes back to the smallest detent');
    assert.equal(await page.locator('.bs-body').evaluate(n => getComputedStyle(n).overflowY), 'hidden');
  });
  await check('Releases at rest snap to the nearest of the detents and the closed position (thresholds at the middle of each gap)', async () => {
    const mid1 = REST / 2, mid2 = (REST + CLOSED) / 2;
    for (const [target, expectTall] of [[mid1 + 25, false], [mid1 - 25, true]]) {
      await settled(page);
      const dy = target - REST;
      await dragHeader(page, [[dy, 400]], 300);
      await page.waitForTimeout(900); await settled(page);
      const now = await tyNow(page);
      assert.ok(expectTall ? Math.abs(now) < 1 : Math.abs(now - REST) < 1, `released at ${target.toFixed(0)}: ended at ${now}`);
      if (expectTall) { await sheet(page).locator('.bs-grabber').focus(); await page.keyboard.press('End'); await page.waitForTimeout(1100); await settled(page); }
    }
    await settled(page);
    await dragHeader(page, [[mid2 - 25 - REST, 500]], 300); await page.waitForTimeout(1000); await settled(page);
    assert.ok(Math.abs((await tyNow(page)) - REST) < 1, 'just short of the dismissal threshold it stays');
    await dragHeader(page, [[mid2 + 25 - REST, 500]], 300);
    await sheet(page).waitFor({ state: 'detached', timeout: 4000 });
    assert.equal(await page.locator('.bs-sheet').count(), 0, 'past it the sheet is dismissed');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('sb-primary')), true);
  });
  await check('Flicks decide by velocity: a slow short drag stays, a fast short one goes to the next stop (up to the tallest, down to dismiss)', async () => {
    await openNew(page);
    await dragHeader(page, [[-20, 160]], 0); await page.waitForTimeout(1000); await settled(page);
    assert.ok(Math.abs((await tyNow(page)) - REST) < 1, 'a slow 20px drag up stays');
    await dragHeader(page, [[-40, 16]], 0); await page.waitForTimeout(1000); await settled(page);
    assert.ok(Math.abs(await tyNow(page)) < 1, `a fast flick up reaches the tallest (${await tyNow(page)})`);
    await sheet(page).locator('.bs-grabber').focus(); await page.keyboard.press('End'); await page.waitForTimeout(1100); await settled(page);
    await dragHeader(page, [[40, 16]], 0);
    await sheet(page).waitFor({ state: 'detached', timeout: 4000 });
    assert.equal(await page.locator('.bs-sheet').count(), 0, 'a fast flick down from the smallest dismisses');
  });
  await check('Past the tallest detent the sheet rubber-bands (recorded: 100px -> 40, 320px -> 72, 640px -> 89.5) and returns on release', async () => {
    await openNew(page);
    await sheet(page).locator('.bs-grabber').focus(); await page.keyboard.press('Home'); await page.waitForTimeout(1100); await settled(page);
    const readings = {};
    for (const d of [100, 320, 640]) {
      const during = await dragHeader(page, [[-d, 400]], 300);
      readings[d] = -during;
      await page.waitForTimeout(1000); await settled(page);
      assert.ok(Math.abs(await tyNow(page)) < 1, 'back at the tallest detent after the release');
    }
    console.log('   band at 100/320/640:', readings[100].toFixed(1), readings[320].toFixed(1), readings[640].toFixed(1));
    for (const [d, expected] of [[100, 40.1], [320, 72.1], [640, 89.5]]) assert.ok(Math.abs(readings[d] - expected) < 3.5, `${d}px -> ${readings[d]}`);
    assert.equal(await page.locator('.bs-sheet').getAttribute('data-expanded'), '');
    assert.ok(Math.abs((await ovNow(page)) - 1) < 0.01, 'the backdrop is fully dim at the tallest detent');
    await page.screenshot({ path: `${out}/new-sheet-tall.png` });
  });
  await check('Keyboard on the grabber: ArrowUp/Down one detent, Home/End the ends, Enter toggles; the live region says what happened', async () => {
    const grabber = sheet(page).locator('.bs-grabber');
    await grabber.focus(); await page.keyboard.press('End'); await page.waitForTimeout(1100); await settled(page);
    assert.equal(await grabber.getAttribute('aria-label'), 'Expand sheet'); assert.equal(await grabber.getAttribute('aria-expanded'), 'false');
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(1100); await settled(page);
    assert.equal(await grabber.getAttribute('aria-label'), 'Collapse sheet'); assert.equal(await grabber.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.bs-sr').innerText(), 'Sheet expanded');
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(1100); await settled(page);
    assert.equal(await page.locator('.bs-sr').innerText(), 'Sheet collapsed');
    await page.keyboard.press('Enter'); await page.waitForTimeout(1100); await settled(page);
    assert.ok(Math.abs(await tyNow(page)) < 1, 'Enter toggles to the tallest');
    await page.keyboard.press('Enter'); await page.waitForTimeout(1100); await settled(page);
    assert.ok(Math.abs((await tyNow(page)) - REST) < 1, 'and back');
  });
  await check('Focus is trapped: Tab walks the sheet and wraps; Escape closes it; the page behind is restored', async () => {
    const seen = [];
    for (let i = 0; i < 9; i += 1) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => { const a = document.activeElement; return a?.closest('.bs-sheet') ? (a.textContent || a.getAttribute('aria-label') || a.className).slice(0, 18) : 'OUTSIDE'; })); }
    assert.ok(!seen.includes('OUTSIDE'), `focus left the sheet: ${seen}`);
    assert.ok(new Set(seen).size < seen.length, `focus wrapped: ${seen}`);
    await page.keyboard.press('Escape'); await sheet(page).waitFor({ state: 'detached' });
  });
  await check('Clicking the backdrop closes the sheet; so does the close button; Space on the sheet opens it fully before it scrolls', async () => {
    await openNew(page);
    await page.mouse.click(60, 200); await sheet(page).waitFor({ state: 'detached', timeout: 4000 });
    await openNew(page);
    await page.locator('.bs-sheet').focus();
    await page.keyboard.press('Space'); await page.waitForTimeout(1100); await settled(page);
    assert.ok(Math.abs(await tyNow(page)) < 1, 'Space expands to full height');
    await page.getByRole('button', { name: 'Close new process' }).click(); await sheet(page).waitFor({ state: 'detached', timeout: 4000 });
  });
  await check('Choosing a template in the sheet creates it and closes the sheet; the split button says "Created" and goes back', async () => {
    await openNew(page);
    await page.getByRole('dialog').getByRole('button', { name: /^Blank/ }).click();
    await page.waitForSelector('.pmap__block');
    assert.equal(await page.locator('.sb-primary .sb-sr').textContent(), 'Created');
    await sheet(page).waitFor({ state: 'detached', timeout: 4000 });
    await page.waitForFunction(() => document.querySelector('.sb-primary .sb-sr')?.textContent === 'New process', null, { timeout: 5000 });
  });
  await check('Dark: a sheet opened from a dark page takes the dark tokens (overlay, surface)', async () => {
    await page.evaluate(() => { document.querySelector('.crm-page')?.setAttribute('data-theme', 'dark'); });
    await openNew(page);
    assert.equal(await page.locator('.bs-root').getAttribute('data-theme'), 'dark');
    assert.match(await sheet(page).evaluate(n => getComputedStyle(n).backgroundColor), /(oklch\(0\.24|lab\(1[0-9]\.|rgb\(\d{2},)/);
    await page.screenshot({ path: `${out}/new-sheet-dark.png` });
    await page.keyboard.press('Escape'); await sheet(page).waitFor({ state: 'detached', timeout: 4000 });
    await page.evaluate(() => { document.querySelector('.crm-page')?.setAttribute('data-theme', 'light'); });
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await check('Phone: the sheet is the full width, header and body use 16px padding, and a finger on the content drags the sheet until it is fully open', async () => {
    await page.locator('.sb-primary').tap(); await sheet(page).waitFor(); await settled(page);
    const box = await sheet(page).boundingBox();
    assert.ok(Math.abs(box.width - 390) < 1 && box.x < 1, JSON.stringify(box));
    assert.equal(await page.locator('.bs-header').evaluate(n => getComputedStyle(n).paddingLeft), '16px');
    const cdp = await context.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const b = await page.locator('.bs-body').boundingBox();
    const startTy = await tyNow(page);
    await touch('touchStart', 200, b.y + 80);
    for (let i = 1; i <= 12; i += 1) { await touch('touchMove', 200, b.y + 80 - i * 14); await page.waitForTimeout(16); }
    const during = await tyNow(page);
    await page.waitForTimeout(250);
    await touch('touchEnd', 200, b.y + 80 - 168);
    assert.ok(startTy - during > 100, `the content drag moved the sheet ${startTy - during}px`);
    assert.equal(await page.locator('.bs-body').evaluate(n => n.scrollTop), 0);
    await page.waitForTimeout(1100); await settled(page);
    await page.screenshot({ path: `${out}/new-sheet-phone.png` });
    await page.keyboard.press('Escape');
  });
  await context.close();
}

{
  const { context, page } = await open({ reducedMotion: 'reduce' });
  await check('Reduced motion: the sheet jumps to its detent and fades in and out (no spring)', async () => {
    const frames = await record(page, () => trigger(page).click(), 700);
    const positions = new Set(frames.filter(f => !f.gone).map(f => Math.round(f.ty)));
    assert.ok([...positions].length <= 3, `positions seen while opening: ${[...positions]}`);
    await settled(page);
    await page.keyboard.press('Escape'); await sheet(page).waitFor({ state: 'detached', timeout: 3000 });
  });
  await context.close();
}

await check('No page or console errors during the whole run', async () => assert.deepEqual(errors, []));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
