// QA for the docked settings panel on /personalize?section=process: it slides in and pushes the map over with the spring fitted from the
// public AI side panel preview. Frames are recorded in the page and compared with docs/research/ai-side-panel/source/motion-*.json.
// Usage: node scripts/qa/ai-side-panel.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/ai-side-panel/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?section=process`;
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 5).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });
const reference = async name => JSON.parse(await fs.readFile(`docs/research/ai-side-panel/source/motion-${name}.json`, 'utf8'));

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/404 \(Not Found\)|Failed to load resource/.test(message.text())) errors.push(`console ${message.text().slice(0, 200)}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pmap__block');
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(1200);
  return { context, page };
}
const block = (page, name) => page.locator('.pmap__block').filter({ has: page.locator('.agt__name', { hasText: new RegExp(`^${name}$`) }) });

/** Records the panel and one block on every frame while `action` runs. */
async function record(page, action, settle = 1300) {
  await page.evaluate(() => {
    const frames = window.__frames = [];
    window.__recording = true;
    const t0 = performance.now();
    const tick = () => {
      const side = document.querySelector('.proc-side'), tracked = document.querySelector('.pmap__block[data-root]');
      frames.push({ t: performance.now() - t0, panelX: side ? side.getBoundingClientRect().x : null, blockX: tracked ? tracked.getBoundingClientRect().x : null, tree: document.querySelector('.proc-treewrap') ? parseFloat(getComputedStyle(document.querySelector('.proc-treewrap')).paddingRight) : null });
      if (window.__recording) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await action();
  await page.waitForTimeout(settle);
  return page.evaluate(() => { window.__recording = false; return window.__frames; });
}
/** progress 0..1 of `key` over time, counted from its first movement */
function progress(frames, key, fromOverride) {
  const valid = frames.filter(frame => frame[key] !== null);
  const to = valid.at(-1)[key], from = fromOverride === undefined ? valid[0][key] : to + fromOverride;
  // Aligned where it crosses 10%: the start itself is hidden in a frame or two of slow rendering, the shape after it is not
  const anchor = valid.find(frame => (frame[key] - from) / (to - from) >= 0.1);
  return { from, to, series: valid.filter(frame => frame.t >= anchor.t - 120).map(frame => ({ t: frame.t - anchor.t, p: (frame[key] - from) / (to - from) })) };
}
function at(series, t) {
  if (t <= series[0].t) return series[0].p;
  for (let i = 1; i < series.length; i += 1) if (series[i].t >= t) { const a = series[i - 1], b = series[i]; return a.p + (b.p - a.p) * (t - a.t) / (b.t - a.t || 1); }
  return series.at(-1).p;
}
/** the same series from a reference recording of the public preview (panel x) */
function referenceSeries(frames, opening) {
  const mapped = frames.map(frame => ({ t: frame.t, panelX: frame.panel[0], blockX: null }));
  const p = progress(mapped.map(frame => ({ ...frame, panelX: frame.panelX })), 'panelX');
  return { ...p, opening };
}
const rmse = (ours, theirs, until = 600) => {
  let sum = 0, n = 0;
  for (let t = -40; t <= until; t += 8) { sum += (at(ours, t) - at(theirs, t)) ** 2; n += 1; }
  return Math.sqrt(sum / n);
};

{
  const { context, page } = await open();
  const theirsOpen = referenceSeries(await reference('open'), true);
  const theirsClose = referenceSeries(await reference('close2'), false);
  let opened, restX = 0;
  await check('Opening a block\'s settings slides the panel in and pushes the map over, following the recorded spring', async () => {
    const before = await block(page, 'Coordinator').boundingBox();
    opened = await record(page, () => block(page, 'Writer').locator('.agt__name').click());
    await page.screenshot({ path: `${out}/panel-open.png` });
    // the panel is mounted a frame after the click, already on its way: its true start is one panel width plus margins from where it rests
    const ours = progress(opened, 'panelX', 372);
    const error = rmse(ours.series, theirsOpen.series);
    restX = opened.at(-1).panelX;
    console.log('   panel travel', Math.round(ours.from - ours.to), 'px, rmse vs recording', error.toFixed(4));
    assert.ok(Math.abs(ours.from - ours.to - 372) < 2, `the panel travels its own width plus margins (${ours.from - ours.to})`);
    assert.ok(error < 0.03, `panel motion differs from the recorded spring by ${error.toFixed(3)}`);
    const workspace = await page.locator('.proc-workspace').boundingBox();
    assert.ok(Math.abs(restX - (workspace.x + workspace.width - 12 - 348)) < 2, `the panel rests 12px from the right edge (${restX})`);
    const after = await block(page, 'Coordinator').boundingBox();
    assert.ok(Math.abs((before.x - after.x) - 186) < 2, `the map was pushed by half the panel (${before.x - after.x})`);
  });
  await check('The map moves in step with the panel (frame by frame the same progress), never faster than the spring itself', async () => {
    const both = opened.filter(frame => frame.panelX !== null && frame.blockX !== null);
    const blockFrom = opened[0].blockX, blockTo = opened.at(-1).blockX;
    let worst = 0;
    for (const frame of both) {
      const panelProgress = (restX + 372 - frame.panelX) / 372, mapProgress = (blockFrom - frame.blockX) / (blockFrom - blockTo);
      worst = Math.max(worst, Math.abs(panelProgress - mapProgress));
    }
    assert.ok(worst < 0.05, `the map and the panel differ by ${worst.toFixed(3)} of their travel in the same frame`);
    // Speed, not distance per frame: a slow frame covers more ground, but the motion must never jump faster than the spring itself (peak about 186px * 5.7/s)
    let fastest = 0, slowFrames = 0;
    for (let i = 1; i < opened.length; i += 1) if (opened[i].blockX !== null && opened[i - 1].blockX !== null && opened[i].t > opened[i - 1].t) {
      const dt = opened[i].t - opened[i - 1].t;
      fastest = Math.max(fastest, Math.abs(opened[i].blockX - opened[i - 1].blockX) / dt * 1000);
      if (dt > 34 && Math.abs(opened[i].blockX - opened[i - 1].blockX) > 0.5) slowFrames += 1;
    }
    console.log('   fastest', Math.round(fastest), 'px/s, frames slower than 34ms while moving:', slowFrames);
    assert.ok(fastest < 1060 * 1.6, `the map moved at ${Math.round(fastest)}px/s`);
  });
  await check('Closing it slides the panel back out with the same spring, returns the map, and removes the panel', async () => {
    const before = await block(page, 'Coordinator').boundingBox();
    const closing = await record(page, () => page.getByRole('button', { name: 'Close block settings' }).click());
    const ours = progress(closing, 'panelX');
    const error = rmse(ours.series, theirsClose.series);
    console.log('   closing rmse vs recording', error.toFixed(4));
    assert.ok(error < 0.03, `closing differs from the recorded spring by ${error.toFixed(3)}`);
    assert.equal(await page.locator('.proc-side').count(), 0, 'the panel is gone once it has left');
    const after = await block(page, 'Coordinator').boundingBox();
    assert.ok(Math.abs((after.x - before.x) - 186) < 2, `the map came back (${after.x - before.x})`);
  });
  await check('While it leaves, the panel cannot be reached; reopening mid-way continues from where it is', async () => {
    await block(page, 'Writer').locator('.agt__name').click();
    await page.locator('.proc-side').waitFor();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Close block settings' }).click();
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.proc-side').getAttribute('inert'), '');
    await block(page, 'Tester').locator('.agt__name').click();
    await page.waitForTimeout(1200);
    const side = await page.locator('.proc-side').boundingBox();
    assert.ok(Math.abs(side.x - restX) < 2, `reopened and settled (${side.x}, rests at ${restX})`);
    assert.match(await page.locator('.proc-side').innerText(), /Tester/);
  });
  await check('Fit pressed while the panel is still sliding in ends centred in what is left, not pushed twice', async () => {
    await page.getByRole('button', { name: 'Close block settings' }).click().catch(() => {});
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    await page.waitForTimeout(300);
    await block(page, 'Scraper').locator('.agt__name').click();
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    await page.waitForTimeout(1500);
    const workspace = await page.locator('.proc-workspace').boundingBox();
    const rects = await page.locator('.pmap__block').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return [r.left, r.right]; }));
    const center = (Math.min(...rects.map(r => r[0])) + Math.max(...rects.map(r => r[1]))) / 2;
    const room = workspace.x + (workspace.width - 372) / 2;
    assert.ok(Math.abs(center - room) < 12, `the map is centred at ${Math.round(center)}, the room left by the panel at ${Math.round(room)}`);
    await page.getByRole('button', { name: 'Close block settings' }).click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Fit the whole map' }).click();
    await page.waitForTimeout(400);
  });
  await check('Tree view: the task list gives way to the panel smoothly too', async () => {
    await page.getByRole('button', { name: 'Close block settings' }).click().catch(() => {});
    await page.getByRole('button', { name: /^Tree$/ }).first().click().catch(async () => { await page.getByText('Tree', { exact: true }).first().click(); });
    await page.locator('.proc-treewrap .agt__node').first().waitFor();
    await page.waitForTimeout(900);
    const frames = await record(page, () => page.getByRole('button', { name: 'Block settings panel' }).click());
    const pads = frames.map(frame => frame.tree).filter(value => value !== null);
    assert.ok(pads[0] <= 25 && Math.abs(pads.at(-1) - 372) < 2, `padding ${pads[0]} -> ${pads.at(-1)}`);
    const mid = pads.filter(value => value > 40 && value < 350).length;
    assert.ok(mid >= 4, `the padding passes through ${mid} in-between values`);
  });
  await context.close();
}

{
  const { context, page } = await open({ reducedMotion: 'reduce' });
  await check('Reduced motion: the panel and the push are instant', async () => {
    const before = await block(page, 'Coordinator').boundingBox();
    const frames = await record(page, () => block(page, 'Writer').locator('.agt__name').click(), 600);
    const xs = frames.map(frame => frame.panelX).filter(value => value !== null);
    assert.ok(xs.filter(value => value > 1080 + 14 && value < 1440 + 300).length <= 2, 'no in-between frames');
    const after = await block(page, 'Coordinator').boundingBox();
    assert.ok(Math.abs((before.x - after.x) - 186) < 2);
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await check('Phone: the settings stay a dialog (no docked panel)', async () => {
    await block(page, 'Writer').locator('.agt__name').click();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.proc-side').count(), 0);
  });
  await context.close();
}

await check('No page or console errors during the whole run', async () => assert.deepEqual(errors, []));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
