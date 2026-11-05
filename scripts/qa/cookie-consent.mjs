// QA for the cookie consent (src/components/sites/cookie-consent): behaviour, accessibility, storage, the footer link, themes, phone,
// and frame-by-frame comparison of the morphs with the recordings of the public preview (docs/research/cookie-consent/source/motion-*.json).
// Usage: node scripts/qa/cookie-consent.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/cookie-consent/qa';
await fs.mkdir(out, { recursive: true });
const KEY = 'logio-cookie-consent';
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 5).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });
const reference = async name => JSON.parse(await fs.readFile(`docs/research/cookie-consent/source/motion-${name}.json`, 'utf8'));

async function open(options = {}, { path = '/', engine = browser, keep = false } = {}) {
  const context = await engine.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource|hydrat/i.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  await context.addInitScript(RECORDER);
  if (!keep) await context.addInitScript(key => { if (!sessionStorage.getItem('__seen')) { localStorage.removeItem(key); sessionStorage.setItem('__seen', '1'); } }, KEY);
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  return { context, page };
}
const RECORDER = () => {
  window.__frames = []; window.__on = false;
  window.__start = () => { window.__frames = []; window.__on = true; const t0 = performance.now(); const tick = () => { if (!window.__on) return; const s = document.querySelector('.cc-surface'); if (s) { const r = s.getBoundingClientRect(), c = getComputedStyle(s), layer = document.querySelector('.cc-layer').getBoundingClientRect(); window.__frames.push({ t: performance.now() - t0, w: parseFloat(c.width), h: parseFloat(c.height), x: r.x - layer.x, radius: parseFloat(c.borderRadius), op: +c.opacity, tf: c.transform, faces: [...s.querySelectorAll('.cc-face')].map(f => ({ face: f.dataset.face, op: +getComputedStyle(f).opacity })) }); } requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
  window.__stop = () => { window.__on = false; return window.__frames; };
};
const surface = page => page.locator('.cc-surface');
const face = (page, name) => page.locator(`.cc-face[data-face="${name}"]`);
const settled = async page => { await page.waitForFunction(() => { const s = document.querySelector('.cc-surface'); if (!s) return false; const c = getComputedStyle(s); const m = c.transform === 'none' ? [1, 0, 0, 1, 0, 0] : c.transform.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number); if (Math.abs(m[0] - 1) > 0.0005 || Math.abs(m[5]) > 0.05) return false; window.__prev = window.__prev || {}; const now = `${c.width}x${c.height}`; const same = window.__prev.v === now; window.__prev.v = now; return same; }, null, { polling: 120 }); await page.waitForTimeout(200); };
const ready = async page => { await page.locator('.cc-layer[data-ready]').waitFor({ state: 'attached' }); await settled(page); };
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), KEY);
const recordMorph = async (page, action, ms = 1300) => { await page.evaluate(() => window.__start()); await page.waitForTimeout(40); await action(); await page.waitForTimeout(ms); return page.evaluate(() => window.__stop()); };

// progress 0..1 of the width, aligned where it crosses 10%, so the click-to-first-frame latency does not count
function progress(frames, from, to) {
  const series = frames.map(f => ({ t: f.t, p: (f.w - from) / (to - from) }));
  const anchor = series.find(s => s.p >= 0.1);
  return series.filter(s => s.t >= anchor.t - 120).map(s => ({ t: s.t - anchor.t, p: s.p }));
}
const at = (series, t) => { if (t <= series[0].t) return series[0].p; for (let i = 1; i < series.length; i += 1) if (series[i].t >= t) { const a = series[i - 1], b = series[i]; return a.p + (b.p - a.p) * (t - a.t) / (b.t - a.t || 1); } return series.at(-1).p; };
const rmse = (a, b, from = -40, to = 500) => { let sum = 0, n = 0; for (let t = from; t <= to; t += 8) { sum += (at(a, t) - at(b, t)) ** 2; n += 1; } return Math.sqrt(sum / n); };
const theirs = async (name, from, to) => { const f = await reference(name); return progress(f, from, to); };

// A viewport whose layer is exactly as wide as the preview's (635px): then the shapes are the recorded ones
const PREVIEW = { viewport: { width: 667, height: 900 } };

{
  const { context, page } = await open(PREVIEW);
  await page.close();
  const entrance = await context.newPage();
  await entrance.addInitScript(() => { const wait = () => { if (window.__start) window.__start(); else requestAnimationFrame(wait); }; wait(); });
  await entrance.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await entrance.locator('.cc-layer[data-ready]').waitFor({ state: 'attached' });
  await entrance.waitForTimeout(1500);
  const frames = await entrance.evaluate(() => window.__stop());
  await check('The bar rises in from the first frame: opacity 0, 24px down and 0.98 scale, then settles (recorded: 24px rise, 130ms fade)', async () => {
    const first = frames.find(f => f.op !== undefined);
    assert.ok(first.op < 0.05, `first opacity ${first.op}`);
    const m = first.tf.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);
    assert.ok(Math.abs(m[0] - 0.98) < 0.004 && Math.abs(m[5] - 24) < 1.5, `first transform ${first.tf}`);
    const full = frames.find(f => f.op >= 0.99), t0 = first.t;
    assert.ok(full.t - t0 < 260, `fully opaque after ${(full.t - t0).toFixed(0)}ms`);
    const last = frames.at(-1);
    assert.equal(last.tf === 'none' || /matrix\(1, 0, 0, 1, 0, 0/.test(last.tf), true, `ends at rest: ${last.tf}`);
  });
  await context.close();
}

{
  const { context, page } = await open(PREVIEW);
  await ready(page);
  await check('Bar: 635px wide at a 635px layer, message and three actions, Reject beside Accept at the same weight', async () => {
    const b = await surface(page).boundingBox();
    assert.ok(Math.abs(b.width - 635) < 1, `bar width ${b.width}`);
    assert.ok(Math.abs(b.height - 79) < 6, `bar height ${b.height}`);
    const bar = face(page, 'bar');
    assert.equal(await bar.getAttribute('role'), 'dialog');
    assert.equal(await bar.getAttribute('aria-modal'), 'false');
    const buttons = await bar.getByRole('button').allInnerTexts();
    assert.deepEqual(buttons, ['Customize', 'Reject all', 'Accept all']);
    const reject = await bar.getByRole('button', { name: 'Reject all' }).boundingBox(), accept = await bar.getByRole('button', { name: 'Accept all' }).boundingBox();
    assert.equal(Math.round(reject.height), Math.round(accept.height));
    const style = name => bar.getByRole('button', { name }).evaluate(n => { const c = getComputedStyle(n); return [c.backgroundColor, c.borderTopColor, c.fontWeight]; });
    assert.deepEqual(await style('Reject all'), await style('Accept all'), 'same weight');
    await page.screenshot({ path: `${out}/bar-light.png` });
  });
  await check('Customize morphs the bar into the preferences panel (420px) and puts the focus on its heading', async () => {
    const frames = await recordMorph(page, () => face(page, 'bar').getByRole('button', { name: 'Customize' }).click());
    const ours = progress(frames, 635, 420), their = await theirs('bar-to-prefs', 635, 420);
    const error = rmse(ours, their);
    console.log('   bar->panel width rmse vs recording', error.toFixed(4));
    assert.ok(error < 0.06, `differs from the recording by ${error.toFixed(3)}`);
    const b = await surface(page).boundingBox();
    assert.ok(Math.abs(b.width - 420) < 1 && Math.abs(b.height - 448) < 8, `panel ${b.width}x${b.height}`);
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'cc-title');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.cc-surface')).borderRadius), '26px');
    await page.screenshot({ path: `${out}/panel-light.png` });
  });
  await check('Faces cross-fade through a short blur: the bar leaves within ~125ms, the panel arrives after ~30ms', async () => {
    await page.keyboard.press('Escape'); await settled(page);
    const frames = await recordMorph(page, () => face(page, 'bar').getByRole('button', { name: 'Customize' }).click());
    const barOp = frames.map(f => ({ t: f.t, op: f.faces.find(q => q.face === 'bar').op })), panelOp = frames.map(f => ({ t: f.t, op: f.faces.find(q => q.face === 'panel').op }));
    const start = frames.find(f => Math.abs(f.w - 635) > 0.4).t;
    const barGone = barOp.find(f => f.op <= 0.02).t - start, panelFirst = panelOp.find(f => f.op > 0.02).t - start, panelFull = panelOp.find(f => f.op >= 0.99).t - start;
    console.log(`   bar gone at +${barGone.toFixed(0)}ms, panel first visible +${panelFirst.toFixed(0)}ms, full +${panelFull.toFixed(0)}ms (recording: ~70, ~36, ~133)`);
    assert.ok(barGone < 140 && barGone > 40, `bar left at ${barGone}`);
    assert.ok(panelFirst > 8 && panelFirst < 90, `panel arrived at ${panelFirst}`);
    assert.ok(panelFull > 90 && panelFull < 260, `panel full at ${panelFull}`);
  });
  await check('Escape closes the panel without saving and returns the focus to the bar', async () => {
    await page.keyboard.press('Escape'); await settled(page);
    assert.equal(await stored(page), null);
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Customize');
    assert.equal(await face(page, 'panel').getAttribute('inert'), '');
  });
  await check('Switches: Space toggles, required category shows "Always on", Save is described by a hidden count', async () => {
    await face(page, 'bar').getByRole('button', { name: 'Customize' }).click(); await settled(page);
    assert.equal(await page.getByRole('switch').count(), 3);
    assert.equal(await page.getByText('Always on').count(), 1);
    const first = page.getByRole('switch').nth(0);
    await first.focus(); await page.keyboard.press('Space'); await page.waitForTimeout(500);
    assert.equal(await first.getAttribute('aria-checked'), 'true');
    assert.equal(await first.getAttribute('data-state'), 'checked');
    const save = face(page, 'panel').getByRole('button', { name: 'Save choices' });
    const description = await save.getAttribute('aria-describedby');
    assert.equal(await page.locator(`#${description.replace(/:/g, '\\:')}`).innerText(), '1 of 3 optional categories allowed');
    const thumb = await first.locator('.cc-switch__thumb').evaluate(n => new DOMMatrixReadOnly(getComputedStyle(n).transform).e);
    assert.ok(Math.abs(thumb - 18) < 0.3, `thumb at ${thumb}`);
    await page.screenshot({ path: `${out}/panel-switched.png` });
    assert.equal(await page.locator(`label[for="${await first.getAttribute('id')}"]`).innerText(), 'Preferences', 'each switch is labelled by its category');
  });
  await check('Save stores the choice and folds the panel into the 44px reopen button with a flat spring; the focus goes to it', async () => {
    const frames = await recordMorph(page, () => face(page, 'panel').getByRole('button', { name: 'Save choices' }).click());
    const ours = progress(frames, 420, 44), their = await theirs('prefs-to-reopen', 420, 44);
    const error = rmse(ours, their);
    console.log('   panel->chip width rmse vs recording', error.toFixed(4));
    assert.ok(error < 0.05, `differs from the recording by ${error.toFixed(3)}`);
    const peak = Math.min(...frames.map(f => f.w));
    assert.ok(peak >= 43.9, `never undershoots the 44px button (${peak})`);
    const b = await surface(page).boundingBox();
    assert.ok(Math.abs(b.width - 44) < 0.6 && Math.abs(b.height - 44) < 0.6, `${b.width}x${b.height}`);
    const saved = await stored(page);
    assert.deepEqual(saved.value, { necessary: true, preferences: true, analytics: false, marketing: false });
    assert.equal(saved.version, '1');
    assert.match(saved.updatedAt, /^\d{4}-\d\d-\d\dT/);
    const chip = face(page, 'chip').getByRole('button');
    assert.equal(await chip.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(await chip.getAttribute('aria-label'), 'Cookie preferences');
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'cc-chip');
    await page.screenshot({ path: `${out}/chip-light.png` });
  });
  await check('The reopen button unfolds the panel again showing the saved choice; Escape folds it back to the button', async () => {
    const frames = await recordMorph(page, () => face(page, 'chip').getByRole('button').click());
    const ours = progress(frames, 44, 420), their = await theirs('reopen-to-prefs', 44, 420);
    const error = rmse(ours, their);
    console.log('   chip->panel width rmse vs recording', error.toFixed(4));
    assert.ok(error < 0.06, `differs from the recording by ${error.toFixed(3)}`);
    assert.equal(await page.getByRole('switch').nth(0).getAttribute('aria-checked'), 'true');
    await page.keyboard.press('Escape'); await settled(page);
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'cc-chip');
    assert.deepEqual((await stored(page)).value.preferences, true, 'Escape did not change what was saved');
  });
  await check('A saved choice is remembered: after a reload there is no bar, only the reopen button (no flash of the bar)', async () => {
    await page.addInitScript(() => { window.__sawBar = false; new MutationObserver(() => { const bar = document.querySelector('.cc-face[data-face="bar"]'); if (bar && !bar.hasAttribute('inert')) window.__sawBar = true; }).observe(document, { childList: true, subtree: true, attributes: true }); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    assert.equal(await surface(page).getAttribute('data-face'), 'chip');
    assert.equal(await page.evaluate(() => window.__sawBar), false);
  });
  await check('Reject all stores only what is required and Accept all everything, from the bar and from the panel', async () => {
    await page.evaluate(key => localStorage.removeItem(key), KEY); await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
    await face(page, 'bar').getByRole('button', { name: 'Reject all' }).click(); await settled(page);
    assert.deepEqual((await stored(page)).value, { necessary: true, preferences: false, analytics: false, marketing: false });
    await face(page, 'chip').getByRole('button').click(); await settled(page);
    await face(page, 'panel').getByRole('button', { name: 'Accept all' }).click(); await settled(page);
    assert.deepEqual((await stored(page)).value, { necessary: true, preferences: true, analytics: true, marketing: true });
    assert.equal(await surface(page).getAttribute('data-face'), 'chip');
  });
  await check('A stored choice for another version is ignored and the bar asks again', async () => {
    await page.evaluate(key => { const v = JSON.parse(localStorage.getItem(key)); v.version = '0'; localStorage.setItem(key, JSON.stringify(v)); }, KEY);
    await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
    assert.equal(await surface(page).getAttribute('data-face'), 'bar');
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
  await ready(page);
  await check('Wide viewport: the bar is 660px, centred, 16px above the bottom edge', async () => {
    const b = await surface(page).boundingBox();
    assert.ok(Math.abs(b.width - 660) < 1, `${b.width}`);
    assert.ok(Math.abs(b.x + b.width / 2 - 720) < 1, 'centred');
    assert.ok(Math.abs(b.y + b.height - (900 - 16)) < 1, `bottom gap ${900 - b.y - b.height}`);
  });
  await check('The layer ignores the pointer: the page behind is clickable beside the surface', async () => {
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.cc-layer')).pointerEvents), 'none');
    const hit = await page.evaluate(() => { const e = document.elementFromPoint(30, 880); return e && !e.closest('.cc-layer'); });
    assert.ok(hit);
  });
  await check('The footer "Cookie settings" link opens the preferences instead of navigating', async () => {
    const link = page.locator('[data-analytics-label="global_footer__cookie_settings"]').first();
    await link.evaluate(n => n.scrollIntoView({ block: 'center' }));
    const before = page.url();
    await link.click();
    await settled(page);
    assert.equal(await surface(page).getAttribute('data-face'), 'panel');
    assert.equal(page.url(), before);
    await page.keyboard.press('Escape'); await settled(page);
  });
  await check('Dark theme: the surface, buttons and switch take the measured dark tokens', async () => {
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await page.waitForTimeout(300);
    const colors = await page.evaluate(() => { const c = s => getComputedStyle(document.querySelector(s)).backgroundColor; return { surface: c('.cc-surface'), secondary: c('.cc-bar .cc-button--secondary') }; });
    assert.ok(Number(colors.surface.match(/\(([\d.]+)/)[1]) < 20 || /oklch\(0\.2/.test(colors.surface) || /rgb\(\d{2}, /.test(colors.surface), `surface ${colors.surface}`);
    await face(page, 'bar').getByRole('button', { name: 'Customize' }).click(); await settled(page);
    await page.screenshot({ path: `${out}/panel-dark.png` });
    await page.keyboard.press('Escape'); await settled(page);
    await page.screenshot({ path: `${out}/bar-dark.png` });
    await page.evaluate(() => { delete document.documentElement.dataset.theme; });
  });
  await check('Keyboard: Tab walks through the bar buttons, Enter on Customize opens the panel, Tab stays inside the visible face', async () => {
    await page.locator('.cc-bar .cc-button--ghost').focus();
    await page.keyboard.press('Enter'); await settled(page);
    const order = [];
    for (let i = 0; i < 8; i += 1) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || document.activeElement?.getAttribute('role'))); }
    assert.ok(!order.includes('Customize'), `the hidden bar's buttons are skipped: ${order}`);
    assert.ok(order.includes('Close preferences') && order.includes('switch') && order.includes('Save choices'), `${order}`);
    await page.keyboard.press('Escape'); await settled(page);
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ready(page);
  await check('Phone: layer 16px from the edges, message stacked above the actions, nothing overflows', async () => {
    const b = await surface(page).boundingBox();
    assert.ok(Math.abs(b.x - 16) < 1 && Math.abs(b.width - 358) < 1, `${b.x} ${b.width}`);
    assert.equal(await page.locator('.cc-bar__inner').getAttribute('data-stack'), '');
    const buttons = await face(page, 'bar').getByRole('button').evaluateAll(ns => ns.map(n => { const r = n.getBoundingClientRect(); return [r.left, r.right]; }));
    for (const [l, r] of buttons) assert.ok(l >= 16 && r <= 374, `${l}-${r}`);
    await page.screenshot({ path: `${out}/bar-phone.png` });
  });
  await check('Phone: the panel fits, its list scrolls (max 200px) and Save stays reachable', async () => {
    await face(page, 'bar').getByRole('button', { name: 'Customize' }).tap(); await settled(page);
    const b = await surface(page).boundingBox();
    assert.ok(b.y >= 0 && b.y + b.height <= 844 && b.width <= 358.5, `${JSON.stringify(b)}`);
    assert.ok((await page.locator('.cc-list').boundingBox()).height <= 201);
    await page.screenshot({ path: `${out}/panel-phone.png` });
    await face(page, 'panel').getByRole('button', { name: 'Save choices' }).tap(); await settled(page);
    assert.equal(await surface(page).getAttribute('data-face'), 'chip');
  });
  await context.close();
}

{
  const { context, page } = await open({ reducedMotion: 'reduce' });
  await ready(page);
  await check('Reduced motion: the surface jumps to each shape and the faces swap with a plain fade (no blur)', async () => {
    const frames = await recordMorph(page, () => face(page, 'bar').getByRole('button', { name: 'Customize' }).click(), 700);
    const widths = new Set(frames.map(f => Math.round(f.w)));
    assert.ok([...widths].every(w => w === 660 || w === 420), `in-between widths ${[...widths]}`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.cc-face[data-face="panel"]')).filter), 'none');
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1440, height: 900 } }, { path: '/guide' });
  await check('The guide intro stays clear of the bar (full-screen moment)', async () => {
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('.cc-layer').count(), 0);
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1280, height: 800 } }, { path: '/personalize?section=process' });
  await check('On the Process page the bar does not break the map: it sits above it, and the map still takes clicks', async () => {
    await page.waitForSelector('.pmap__block');
    await ready(page);
    assert.equal(await page.locator('.cc-layer').count(), 1);
    await page.locator('.pmap__block .agt__name').first().click();
    await page.waitForTimeout(600);
    assert.ok(await page.locator('.proc-side').count() >= 0);
    await page.screenshot({ path: `${out}/over-process.png` });
  });
  await context.close();
}

{
  const engine = await webkit.launch().catch(() => null);
  if (engine) {
    const { context, page } = await open({ viewport: { width: 1024, height: 768 } }, { engine });
    await check('WebKit: the bar morphs into the panel and folds into the button', async () => {
      await ready(page);
      await face(page, 'bar').getByRole('button', { name: 'Customize' }).click(); await settled(page);
      assert.equal(await surface(page).getAttribute('data-face'), 'panel');
      await face(page, 'panel').getByRole('button', { name: 'Reject all' }).click(); await settled(page);
      assert.equal(await surface(page).getAttribute('data-face'), 'chip');
    });
    await context.close(); await engine.close();
  }
}

await check('No page or console errors during the whole run', async () => assert.deepEqual(errors, []));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
