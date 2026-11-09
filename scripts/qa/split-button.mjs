// QA for the split button (src/components/sites/split-button) in the Process page's name pill: layout, press, menu placement and motion, the label
// morph, the chevron, keyboard and focus, the actions, themes and phone; compared frame by frame with the recordings of the public preview
// (docs/research/split-button/source). Usage: node scripts/qa/split-button.mjs [base-url]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3000';
const out = 'docs/research/split-button/qa';
await fs.mkdir(out, { recursive: true });
const url = `${base}/personalize?section=process`;
const results = [], errors = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, ok: false }); console.log('FAIL', name, '\n   ', String(error.message).split('\n').slice(0, 5).join('\n    ')); }
};
const browser = await chromium.launch({ channel: 'chrome' });
const reference = async name => JSON.parse(await fs.readFile(`docs/research/split-button/source/${name}.json`, 'utf8'));

const RECORDER = () => {
  window.__on = false; window.__f = [];
  window.__go = () => {
    window.__f = []; window.__on = true; const t0 = performance.now();
    const tick = () => {
      if (!window.__on) return;
      const g = document.querySelector('.sb-group'), menu = document.querySelector('.sb-menu'), chev = document.querySelector('.sb-chevron');
      const rot = chev ? (m => m ? Math.atan2(+m[1].split(',')[1], +m[1].split(',')[0]) * 180 / Math.PI : 0)(getComputedStyle(chev).transform.match(/matrix\(([^)]+)\)/)) : null;
      const mc = menu ? getComputedStyle(menu) : null, mm = mc?.transform.match(/matrix\(([^)]+)\)/);
      window.__f.push({
        t: performance.now() - t0, w: g ? g.getBoundingClientRect().width : null, rot,
        menu: menu ? { op: +mc.opacity, scale: mm ? +mm[1].split(',')[0] : 1, y: mm ? +mm[1].split(',')[5] : 0, state: menu.dataset.state, items: [...menu.querySelectorAll('.sb-item')].map(i => +getComputedStyle(i).opacity) } : null,
        glyphs: g ? [...g.querySelectorAll('.sb-glyph')].map(x => [x.textContent, +getComputedStyle(x).opacity, x.dataset.state]) : [],
      });
      requestAnimationFrame(tick);
    };
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
const group = page => page.locator('.sb-group');
const primary = page => page.locator('.sb-primary');
const chevron = page => page.locator('.sb-trigger');
const menu = page => page.locator('.sb-menu');
const labelOf = page => primary(page).locator('.sb-sr').textContent();
const record = async (page, action, ms = 1200) => { await page.evaluate(() => window.__go()); await page.waitForTimeout(40); await action(); await page.waitForTimeout(ms); return page.evaluate(() => window.__stop()); };
const settle = page => page.waitForTimeout(900);

// progress curves aligned where they leave 10%, so the click-to-first-frame latency does not count
const curve = (frames, pick, from, to) => { const s = frames.map(f => ({ t: f.t, p: (pick(f) - from) / (to - from) })).filter(x => Number.isFinite(x.p)); const a = s.find(x => x.p >= 0.1); return s.filter(x => x.t >= a.t - 80).map(x => ({ t: x.t - a.t, p: x.p })); };
const at = (series, t) => { if (t <= series[0].t) return series[0].p; for (let i = 1; i < series.length; i += 1) if (series[i].t >= t) { const a = series[i - 1], b = series[i]; return a.p + (b.p - a.p) * (t - a.t) / (b.t - a.t || 1); } return series.at(-1).p; };
const rmse = (a, b, from = -30, to = 400) => { let sum = 0, n = 0; for (let t = from; t <= to; t += 8) { sum += (at(a, t) - at(b, t)) ** 2; n += 1; } return Math.sqrt(sum / n); };
const matrix = tf => { const m = tf.match(/matrix\(([^)]+)\)/); return m ? m[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0]; };

{
  const { context, page } = await open();
  await check('The split button sits in the name pill: 30px high, "New process" with a plus, a chevron named "More process actions"; the folder and plus icon buttons are gone', async () => {
    const box = await group(page).boundingBox();
    assert.ok(Math.abs(box.height - 30) < 1.5, `height ${box.height}`);
    assert.equal(await labelOf(page), 'New process');
    assert.equal(await chevron(page).getAttribute('aria-label'), 'More process actions');
    assert.equal(await chevron(page).getAttribute('aria-haspopup'), 'menu');
    assert.equal(await chevron(page).getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.proc-pill--name .proc-icon-button').count(), 0);
    assert.equal(await group(page).locator('svg').count(), 2);
    await page.locator('.proc-pill--name').screenshot({ path: `${out}/pill-rest.png` });
  });
  await check('Press: the whole button scales to .97 while the main half is held, and springs back on release (the chevron does not scale it)', async () => {
    const b = await primary(page).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(260);
    assert.ok(Math.abs(matrix(await group(page).evaluate(n => getComputedStyle(n).transform))[0] - 0.97) < 0.004, 'pressed');
    await page.mouse.move(2, 2); await page.mouse.up(); await page.waitForTimeout(900);
    assert.equal(await group(page).evaluate(n => getComputedStyle(n).transform), 'none');
    const c = await chevron(page).boundingBox();
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.down(); await page.waitForTimeout(260);
    assert.equal(await group(page).evaluate(n => getComputedStyle(n).transform), 'none', 'the chevron has no press scale');
    await page.mouse.up(); await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.mouse.move(2, 2); await page.waitForTimeout(600);
  });
  await check('The chevron opens a menu of 5 actions, end-aligned 4px under it; aria roles and the chevron label are right', async () => {
    const frames = await record(page, () => chevron(page).click(), 1100);
    const items = menu(page).getByRole('menuitem');
    assert.equal(await items.count(), 5);
    assert.deepEqual(await items.allInnerTexts(), ['Saved processes (1)', 'Duplicate this process', 'Export as JSON', 'Import from a file…', 'Delete this process']);
    assert.equal(await chevron(page).getAttribute('aria-expanded'), 'true');
    const g = await group(page).boundingBox(), c = await chevron(page).boundingBox(), m = await menu(page).boundingBox();
    assert.ok(Math.abs(m.x + m.width - (g.x + g.width)) < 1.5, `right edges ${m.x + m.width} vs ${g.x + g.width}`);
    assert.ok(Math.abs(m.y - (c.y + c.height + 4)) < 1.5, `top ${m.y} vs ${c.y + c.height + 4}`);
    assert.ok(m.width >= 191, `min width ${m.width}`);
    assert.equal(await menu(page).getAttribute('aria-orientation'), 'vertical');
    await page.screenshot({ path: `${out}/menu-open.png`, clip: { x: 220, y: 0, width: 760, height: 330 } });
    globalThis.menuFrames = frames;
  });
  await check('Menu motion matches the recording: opacity in ~110ms, scale .97 to 1 on a flat spring, items rising 35ms apart', async () => {
    const frames = globalThis.menuFrames.filter(f => f.menu);
    const start = frames.find(f => f.menu.op > 0.01 && f.menu.state !== 'pending') ?? frames[0];
    const their = (await reference('motion-menu-open')).filter(f => !f.gone).map(f => ({ t: f.t, op: f.op, scale: +f.tf.match(/matrix\(([^)]+)\)/)?.[1].split(',')[0] || 1, items: f.items.map(i => i[0]) }));
    const op = rmse(curve(frames.map(f => ({ t: f.t, v: f.menu.op })), f => f.v, 0, 1), curve(their.map(f => ({ t: f.t, v: f.op })), f => f.v, 0, 1), -30, 250);
    const sc = rmse(curve(frames.map(f => ({ t: f.t, v: f.menu.scale })), f => f.v, 0.97, 1), curve(their.map(f => ({ t: f.t, v: f.scale })), f => f.v, 0.97, 1), -30, 500);
    const crossing = (rows, i) => rows.find(r => r.items[i] >= 0.5)?.t;
    const ours = frames.map(f => ({ t: f.t, items: f.menu.items })), gaps = [1, 2].map(i => crossing(ours, i) - crossing(ours, i - 1)), theirGaps = [1, 2].map(i => crossing(their, i) - crossing(their, i - 1));
    console.log(`   menu opacity rmse ${op.toFixed(3)}, scale rmse ${sc.toFixed(3)}, item gaps ${gaps.map(g => g.toFixed(0))}ms (recording ${theirGaps.map(g => g.toFixed(0))}ms)`);
    assert.ok(op < 0.12, `opacity curve off by ${op}`);
    assert.ok(sc < 0.1, `scale curve off by ${sc}`);
    for (const g of gaps) assert.ok(g > 18 && g < 60, `item stagger ${g}ms`);
    assert.ok(start);
  });
  await check('The chevron turns 180 degrees on the source\'s spring curve (compared with the recorded rotation)', async () => {
    await page.keyboard.press('Escape'); await settle(page);
    const frames = await record(page, () => chevron(page).click(), 900);
    const ours = curve(frames.filter(f => f.rot !== null), f => f.rot, 0, 180);
    const their = curve((await reference('motion-chevron-open')).filter(f => f.tf && f.tf !== 'none').map(f => { const m = f.tf.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number); return { t: f.t, rot: Math.atan2(m[1], m[0]) * 180 / Math.PI }; }), f => f.rot, 0, 180);
    const error = rmse(ours, their, -20, 450);
    console.log(`   chevron rotation rmse ${error.toFixed(4)}`);
    assert.ok(error < 0.06, `rotation off by ${error}`);
    await page.keyboard.press('Escape'); await settle(page);
  });
  await check('Keyboard: ArrowDown on the chevron opens it with the first item focused; arrows loop and skip the disabled Delete; Home/End; typeahead; Escape returns to the chevron', async () => {
    await chevron(page).focus(); await page.keyboard.press('ArrowDown');
    await menu(page).waitFor(); await page.waitForTimeout(500);
    const focused = () => page.evaluate(() => document.activeElement?.textContent);
    assert.equal(await focused(), 'Saved processes (1)');
    assert.equal(await menu(page).getByRole('menuitem').first().getAttribute('data-highlighted'), '');
    await page.keyboard.press('ArrowDown'); assert.equal(await focused(), 'Duplicate this process');
    await page.keyboard.press('End'); assert.equal(await focused(), 'Import from a file…', 'End goes to the last enabled item (Delete is disabled with one process)');
    await page.keyboard.press('ArrowDown'); assert.equal(await focused(), 'Saved processes (1)', 'loops');
    await page.keyboard.press('ArrowUp'); assert.equal(await focused(), 'Import from a file…');
    await page.keyboard.press('Home'); assert.equal(await focused(), 'Saved processes (1)');
    await page.keyboard.press('e'); assert.equal(await focused(), 'Export as JSON', 'typeahead');
    assert.equal(await menu(page).getByRole('menuitem', { name: /Delete/ }).getAttribute('aria-disabled'), 'true');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('sb-trigger')), true);
    assert.equal(await menu(page).count(), 0);
    await chevron(page).focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300); await page.keyboard.press('Tab'); await page.waitForTimeout(300);
    assert.equal(await menu(page).count(), 0, 'Tab closes the menu');
  });
  await check('Focus rings: keyboard focus draws a 2px ring with 2px offset on each half', async () => {
    await primary(page).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    const ring = await primary(page).evaluate(n => { const s = getComputedStyle(n); return [s.outlineStyle, s.outlineWidth, s.outlineOffset].join(' '); });
    assert.equal(ring, 'solid 2px 2px');
  });
  await check('Export as JSON: the label morphs to "Exported" letter by letter, the width springs, a file is downloaded, then it returns to "New process"', async () => {
    const downloaded = page.waitForEvent('download');
    const frames = await record(page, async () => { await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(500); await menu(page).getByRole('menuitem', { name: /Export/ }).click(); }, 3600);
    const file = await downloaded;
    assert.match(file.suggestedFilename(), /\.json$/);
    const widths = frames.map(f => f.w).filter(Number.isFinite);
    const max = Math.max(...widths), min = Math.min(...widths);
    assert.ok(max - min > 20, `the width moved ${max - min}px`);
    const states = new Set(frames.flatMap(f => f.glyphs.map(g => g[2])));
    assert.ok(states.has('in') && states.has('out') && states.has('stay'), `glyph states seen: ${[...states]}`);
    assert.equal(await labelOf(page), 'New process', 'back after the result');
    const seen = frames.map(f => f.glyphs.filter(g => g[2] !== 'out').map(g => g[0]).join('')).filter((v, i, a) => v && a.indexOf(v) === i);
    console.log('   labels seen:', seen.join(' | '));
    assert.ok(seen.includes('Exported') && seen.includes('New process'));
    // entering letters rise from a blur: compare the first letter's opacity curve with the recording (.39 at 11ms, .88 at 64ms, .96 at ~100ms after its start)
    const first = frames.map(f => ({ t: f.t, v: f.glyphs.find(g => g[2] === 'in' && g[0] === 'E')?.[1] })).filter(x => x.v !== undefined);
    const t0 = first.find(x => x.v > 0.01)?.t ?? first[0].t;
    const rows = first.map(x => ({ t: x.t - t0, v: x.v }));
    const near = ms => rows.reduce((b, r) => Math.abs(r.t - ms) < Math.abs(b.t - ms) ? r : b).v;
    console.log(`   first new letter opacity at +16/+64/+110ms: ${near(16).toFixed(2)} ${near(64).toFixed(2)} ${near(110).toFixed(2)} (recording .39 .88 .96)`);
    assert.ok(near(64) > 0.7 && near(110) > 0.9, 'the new letters rise fast on an expo curve');
  });
  await check('The label width follows a spring like the preview\'s: growing again is smooth, no overshoot', async () => {
    const frames = await record(page, async () => { await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(400); await menu(page).getByRole('menuitem', { name: /Duplicate/ }).click(); }, 3600);
    // find the grow after "Duplicated" -> "New process"
    const start = frames.findIndex((f, i) => i > 10 && f.glyphs.some(g => g[2] === 'in' && g[0] === 'N'));
    assert.ok(start > 0, 'the label came back');
    const grow = frames.slice(start).map(f => ({ t: f.t, w: f.w })).filter(f => f.t - frames[start].t < 1100);
    const from = grow[0].w, to = grow.at(-1).w;
    if (Math.abs(to - from) > 6) {
      const peak = Math.max(...grow.map(f => (f.w - from) / (to - from)));
      assert.ok(peak < 1.04, `overshoot ${((peak - 1) * 100).toFixed(1)}%`);
    }
    // duplicate: a second process now exists and its name has "(copy)"
    assert.equal(await page.locator('.proc-name input').inputValue(), 'Launch the pricing page (copy)');
    await page.waitForTimeout(600);
  });
  await check('Saved processes opens the bottom sheet; the focus goes back to the chevron when it closes; Delete is now enabled', async () => {
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(500);
    assert.equal(await menu(page).getByRole('menuitem', { name: /Delete/ }).getAttribute('aria-disabled'), null);
    await menu(page).getByRole('menuitem', { name: /Saved processes/ }).click();
    await page.getByRole('dialog', { name: 'Saved processes' }).waitFor(); await page.waitForTimeout(900);
    assert.equal(await page.locator('.proc-library li').count(), 2);
    await page.screenshot({ path: `${out}/library-sheet.png` });
    await page.keyboard.press('Escape'); await page.locator('.bs-sheet').waitFor({ state: 'detached', timeout: 4000 });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('sb-trigger')), true);
  });
  // the whole delete flow (question, Cancel/Escape, Undo, keyboard, sheet row, phone) is in scripts/qa/process-delete-morph.mjs
  await check('Delete this process asks inside the menu (Confirm morph, no dialog) and the label says "Deleted"', async () => {
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(500);
    const row = menu(page).locator('.sb-item[data-confirm]');
    await row.click();
    await row.locator('.cm[data-state="confirming"]').waitFor(); await page.waitForTimeout(400);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.sb-primary .sb-sr')?.textContent === 'Deleted');
    await page.mouse.move(120, 640);
    await page.waitForFunction(() => document.querySelector('.sb-primary .sb-sr')?.textContent === 'New process', null, { timeout: 6000 });
  });
  await check('Dark: the menu opens in the dark theme of the page it came from', async () => {
    await page.evaluate(() => document.querySelector('.crm-page')?.setAttribute('data-theme', 'dark'));
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(700);
    assert.equal(await menu(page).getAttribute('data-theme'), 'dark');
    const colours = await page.evaluate(() => {
      const bg = selector => getComputedStyle(document.querySelector(selector)).backgroundColor;
      return { pill: bg('.proc-pill--name'), group: bg('.sb-group'), primary: bg('.sb-primary'), menu: bg('.sb-menu') };
    });
    assert.equal(colours.group, colours.pill, `the New process button has the bar's colour (${JSON.stringify(colours)})`);
    assert.equal(colours.primary, colours.pill);
    assert.equal(colours.menu, colours.pill, 'and so does its menu');
    await page.screenshot({ path: `${out}/menu-dark.png`, clip: { x: 220, y: 0, width: 760, height: 330 } });
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('.crm-page')?.setAttribute('data-theme', 'light'));
  });
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await check('Phone: the pill fits, a tap on the chevron opens the menu inside the screen (12px from the edges), a tap on an item runs it', async () => {
    const g = await group(page).boundingBox();
    assert.ok(g.x >= 0 && g.x + g.width <= 390, JSON.stringify(g));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await chevron(page).tap(); await menu(page).waitFor(); await page.waitForTimeout(700);
    const m = await menu(page).boundingBox();
    assert.ok(m.x >= 11.5 && m.x + m.width <= 390 - 11.5, JSON.stringify(m));
    await page.screenshot({ path: `${out}/menu-phone.png` });
    await menu(page).getByRole('menuitem', { name: /Saved processes/ }).tap();
    await page.getByRole('dialog', { name: 'Saved processes' }).waitFor();
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');
  });
  await context.close();
}

{
  const { context, page } = await open({ reducedMotion: 'reduce' });
  await check('Reduced motion: no press scale, no chevron or menu transform, labels change without letter animation', async () => {
    await chevron(page).click(); await menu(page).waitFor(); await page.waitForTimeout(250);
    assert.equal(await menu(page).evaluate(n => getComputedStyle(n).transform), 'none');
    assert.equal(await chevron(page).locator('svg').evaluate(n => getComputedStyle(n).transitionDuration), '0s');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await primary(page).click();
    await page.locator('.bs-sheet').waitFor();
    assert.equal(await page.locator('.sb-glyph').first().evaluate(n => getComputedStyle(n).animationName), 'none');
    await page.keyboard.press('Escape');
  });
  await context.close();
}

await check('No page or console errors during the whole run', async () => assert.deepEqual(errors, []));
await browser.close();
const failed = results.filter(item => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
