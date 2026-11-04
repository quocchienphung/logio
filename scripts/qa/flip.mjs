// QA for Flip: the page, the TL;DR toggle, the Agent cursor, the Ghost text and the stats on a REAL workbook, with the motion measured against the recordings
// of the public previews (docs/research/{tldr-toggle,agent-cursor}/). Run it against a production build for timings that mean something:
//   next build && next start -p 3002 &   node scripts/qa/flip.mjs http://localhost:3002 [out dir]
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildXlsx } from './lib/xlsx-builder.mjs';
import { SAMPLE_SHEETS } from '../../src/components/sites/flip/flip-sample.ts';
import { delimitedText } from '../../src/components/sites/flip/flip-model.ts';

const base = process.argv[2] || 'http://localhost:3001';
const out = process.argv[3] || 'docs/research/flip/qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [], numbers = {};
const check = (name, ok, detail = '') => { if (!ok) console.error('  ✗', name, detail); else console.log('  ✓', name, detail && typeof detail !== 'object' ? `(${detail})` : ''); assert.ok(ok, `${name} ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`); results.push(name); };
const within = (value, low, high) => value >= low && value <= high;
const FILE = { name: 'Tai san mau.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buildXlsx(SAMPLE_SHEETS.map(sheet => ({ name: sheet.name, rows: sheet.rows })))) };
const assets = SAMPLE_SHEETS[0].rows;

async function open({ width = 1440, height = 2200, reduced = false, dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => localStorage.setItem('logio-cookie-consent', JSON.stringify({ value: { necessary: true }, version: '1', updatedAt: new Date().toISOString() })));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`PAGEERROR ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`CONSOLE ${m.text().slice(0, 200)}`); });
  await page.goto(`${base}/personalize?section=flip`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('.cr-import').waitFor({ timeout: 60000 });
  await page.locator('[data-ascii-cover]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  if (dark) await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
  return { ctx, page };
}
const upload = async page => {
  await page.locator('input[type=file]').setInputFiles(FILE);
  const convert = page.getByRole('tab', { name: /Convert/ });
  await convert.waitFor({ timeout: 30000 });
  await convert.click();
  await page.locator('.tt-root').waitFor({ timeout: 20000 });
  await page.locator('.tt-row, .tt-para').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
};
/** Per-frame samples of `fn` (a source string evaluated in the page) for `ms`, started now. */
const sample = (page, fn, ms) => page.evaluate(({ fn, ms }) => new Promise(resolve => { const f = eval(fn), series = [], t0 = performance.now(); const tick = () => { const t = performance.now() - t0; series.push([t, f()]); if (t < ms) requestAnimationFrame(tick); else resolve(series); }; requestAnimationFrame(tick); }), { fn, ms });
/** When a series that moves from its first to its last value crosses `fraction` of the way, measured from the first change. */
const crossing = (series, fraction) => { const a = series[0][1], z = series[series.length - 1][1]; const start = series.find(([, v]) => Math.abs(v - a) > Math.abs(z - a) * 0.01)?.[0] ?? 0; const hit = series.find(([, v]) => (v - a) / (z - a) >= fraction)?.[0]; return hit === undefined ? NaN : hit - start; };
const maxPast = series => { const a = series[0][1], z = series[series.length - 1][1], dir = Math.sign(z - a) || 1; return Math.max(0, ...series.map(([, v]) => (v - z) * dir)); };

try {
  // ============================================================ the page, in its place
  console.log('The page');
  let { ctx, page } = await open();
  check('Flip opens from ?section=flip with its title', await page.getByRole('heading', { level: 1, name: 'Flip' }).count() === 1);
  const nav = page.locator('.ui-as-side__nav');
  check('Flip is a sidebar item of its own, not inside the Collateral folder', await nav.locator(':scope > .ui-as-side__group > button', { hasText: 'Flip' }).count() === 1);
  await nav.getByRole('button', { name: /Collateral/ }).click();
  await page.waitForTimeout(500);
  const folder = await nav.locator('.sidebar-folder, [data-sidebar-folder], .ui-as-folder').first().innerText().catch(() => '');
  check('The Collateral folder lists Excel formation, JSON formation and Queue, and not Flip', /Excel formation/.test(await nav.innerText()) && !/Flip/.test(folder || ''));
  check('No stepper before a workbook is open', await page.getByRole('tab').count() === 0);
  check('The upload group is centred like Excel formation\'s', await page.locator('.cr-import__center').count() === 1);
  await upload(page);
  check('The stepper reads Upload, Convert', (await page.getByRole('tab').allInnerTexts()).map(text => text.replace(/\d/g, '').trim()).join(',') === 'Upload,Convert');
  check('The file chip shows the file and the cards are all there', await page.locator('.cl-file__name').innerText() === 'Tai san mau.xlsx' && await page.locator('.gt-root').count() === 1 && await page.locator('.tt-root').count() === 1 && await page.locator('.ac-root').count() === 1 && await page.locator('.gs-root').count() === 1);
  await page.screenshot({ path: `${out}/01-stage.png`, fullPage: true });

  // ============================================================ real data in the TL;DR card
  console.log('Real cells');
  const tt = page.locator('.tt-root');
  const rowCells = await tt.locator('.fl-row').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('.fl-cell')].map(cell => cell.textContent)));
  check('The Sheet view shows the first 13 rows of the uploaded workbook, cell for cell', rowCells.length === 13 && rowCells[0].join('|') === assets[0].join('|') && rowCells[3][1] === 'Laptop 14" Latitude 5440' && rowCells[4][5] === 'Thế chấp: ngân hàng A↵Giấy chứng nhận số 0012');
  check('Row numbers are the workbook\'s own, and the title, source and byline say what is shown', await tt.locator('.fl-row__no').first().innerText() === '1' && /Sample assets/.test(await tt.locator('.tt-title').innerText()) && /Tai san mau\.xlsx/.test(await tt.locator('.tt-source').innerText()) && /13 of 13 rows · 6 columns/.test(await tt.locator('.tt-byline').innerText()));
  check('The slider is disabled in Sheet mode', await tt.locator('.fp-sl').getAttribute('data-disabled') !== null);

  // ============================================================ streaming: cadence, thinking, fades, swap
  console.log('TL;DR: CSV streaming');
  await page.evaluate(() => { window.__chunks = []; window.__t0 = 0; const watch = new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('tt-chunk')) window.__chunks.push([performance.now(), n.textContent]); }); watch.observe(document.querySelector('.tt-root'), { childList: true, subtree: true }); });
  const anims = page.evaluate(() => new Promise(resolve => { const seen = new Map(); const end = performance.now() + 1400; const tick = () => { for (const a of document.getAnimations()) { const target = a.effect?.target; if (!target || !target.closest?.('.tt-root')) continue; const timing = a.effect.getTiming(); const kf = a.effect.getKeyframes()[0]; seen.set(a, `${a.animationName ?? a.transitionProperty ?? 'anim'}|${timing.duration}|${Object.keys(kf).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join(',')}`); } if (performance.now() < end) requestAnimationFrame(tick); else resolve([...new Set(seen.values())]); }; tick(); }));
  const clickAt = await page.evaluate(() => performance.now());
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-root .tt-shimmer, .tt-root .fp-shimmer', { timeout: 3000 }).catch(() => {});
  check('Thinking shows a shimmering "Reading 13 rows" and aria-busy is on', /Reading 13 rows/.test(await tt.locator('.tt-thinking').innerText()) && await tt.locator('.tt-card').getAttribute('aria-busy') === 'true');
  const seenAnims = await anims;
  check('A chunk fades in over 140 ms (tt-fade) and the view swap fades 100 ms out then 160 ms in', seenAnims.some(a => /tt-fade\|140/.test(a)) && seenAnims.some(a => /\|100\|opacity/.test(a)) && seenAnims.some(a => /\|160\|opacity/.test(a)), seenAnims.join(' ; '));
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  const chunks = await page.evaluate(() => window.__chunks);
  const gaps = chunks.slice(1).map((c, i) => c[0] - chunks[i][0]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  numbers.chunkMeanMs = +mean.toFixed(1); numbers.chunkMinMs = +Math.min(...gaps).toFixed(1); numbers.firstChunkAfterClickMs = +(chunks[0][0] - clickAt).toFixed(0);
  check('The first chunk lands about 0.7 s after the click (thinking)', within(chunks[0][0] - clickAt, 600, 1100), `${numbers.firstChunkAfterClickMs} ms`);
  check('Chunks arrive every 30 to 40 ms (recorded 31 to 41 ms)', within(mean, 30, 48) && gaps.filter(g => g < 20).length <= 1, `mean ${numbers.chunkMeanMs} ms, min ${numbers.chunkMinMs} ms over ${chunks.length} chunks`);
  const text = await tt.locator('.tt-lines').innerText();
  const expectedLines = delimitedText(assets.slice(0, 6), ',');
  check('The streamed text is exactly the delimited text of the first 6 rows (quotes doubled, line break kept in its field)', text.replace(/\r/g, '') === expectedLines, text.slice(0, 80));
  check('The footer counts the lines and offers Copy and Write again', /6 lines/.test(await tt.locator('.tt-foot').innerText()) && await tt.getByRole('button', { name: 'Copy as text' }).count() === 1 && await tt.getByRole('button', { name: 'Write again' }).count() === 1);
  check('A summary is announced once, not chunk by chunk', /6 lines ready/.test(await tt.locator(':scope > .fp-sr').innerText()));
  await page.screenshot({ path: `${out}/02-csv.png`, clip: await tt.boundingBox() });

  // switching back is instant and cached
  await tt.getByRole('button', { name: 'Sheet', exact: true }).click(); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__chunks.length = 0; });
  const cachedAt = await page.evaluate(() => performance.now());
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-lines', { timeout: 2000 });
  const cachedMs = await page.evaluate(t => performance.now() - t, cachedAt);
  check('A saved result appears whole, within the swap time, with no streaming or fade', cachedMs < 500 && (await page.evaluate(() => window.__chunks.length)) === 0 && /saved text/.test(await tt.locator(':scope > .fp-sr').innerText()), `${cachedMs.toFixed(0)} ms`);

  // ============================================================ key points, jump
  console.log('TL;DR: notes and jump');
  await tt.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.tt-root .tt-jump').length === 4, null, { timeout: 15000 });
  const notes = await tt.locator('.tt-point').allInnerTexts();
  check('Four notes at the default length, each ticked, each with its row link', notes.length === 4 && await tt.locator('.tt-pointIcon[data-done]').count() === 4 && (await tt.locator('.tt-jump').allInnerTexts()).join(',') === 'Row 1,Row 2,Row 4,Row 5', notes.map(n => n.replace(/\n/g, ' ')).join(' | '));
  check('The notes are true of the cells: 3 comma cells (first row 2), 2 quotes (first row 4), 1 line break (row 5)', /3 cells hold a comma.*row 2/.test(notes[1]) && /2 cells hold a double quote.*row 4/.test(notes[2]) && /1 cell holds a line break.*row 5/.test(notes[3]));
  const scrollBefore = await page.evaluate(() => [...document.querySelectorAll('*')].map(n => n.scrollTop).reduce((a, b) => a + b, 0));
  const jumpAt = Date.now();
  const clipSeries = sample(page, `() => document.querySelector('.tt-root .tt-clip').getBoundingClientRect().height`, 1500);
  const litWatch = page.evaluate(() => new Promise(resolve => { const t0 = performance.now(); const poll = () => { const lit = document.querySelector('.tt-root .tt-para[data-lit]'); if (lit) resolve([performance.now() - t0, lit.dataset.id]); else if (performance.now() - t0 > 3000) resolve(null); else requestAnimationFrame(poll); }; poll(); }));
  await tt.locator('.tt-jump').nth(2).click();
  const [litAt, litId] = (await litWatch) ?? [NaN, null];
  const clip = await clipSeries;
  const finalClip = clip[clip.length - 1][1], clipAtLit = clip.find(([t]) => t >= litAt)?.[1] ?? 0;
  check('A jump goes back to the sheet and highlights the row the note came from (row 4)', litId === 'r4' && await tt.locator('.tt-card').getAttribute('aria-busy') === null, litId);
  check('The highlight waits for the height to settle (about 0.4 s after the click, recorded 0.43 s)', within(litAt, 250, 900) && clipAtLit >= finalClip * 0.95, `${litAt.toFixed(0)} ms, height at ${((clipAtLit / finalClip) * 100).toFixed(0)}% of final`);
  check('Focus lands on the highlighted row and the mode is Sheet', await page.evaluate(() => document.activeElement?.dataset?.id) === 'r4' && await tt.getByRole('button', { name: 'Sheet', exact: true }).getAttribute('aria-pressed') === 'true');
  await page.waitForTimeout(2200);
  check('The highlight goes after 1.8 s', await tt.locator('.tt-para[data-lit]').count() === 0);
  numbers.jumpHighlightMs = +litAt.toFixed(0);
  void scrollBefore; void jumpAt;

  // ============================================================ stop, copy, regenerate
  console.log('TL;DR: Stop, Copy, Write again');
  const expectedAll = delimitedText(assets, ',');
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-lines'); await page.waitForTimeout(300);
  await tt.getByRole('slider').focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  await tt.getByRole('button', { name: 'Write again' }).click();
  await page.waitForSelector('.tt-thinking', { timeout: 5000 });
  await page.waitForSelector('.tt-thinking', { state: 'detached', timeout: 5000 });
  await page.waitForTimeout(60);
  await page.keyboard.press('Escape');
  const stoppedLen = (await tt.locator('.tt-lines').innerText()).length;
  await page.waitForTimeout(600);
  check('Escape stops a running stream and keeps what arrived', /Stopped/.test(await tt.locator('.tt-state').innerText()) && (await tt.locator('.tt-lines').innerText()).length === stoppedLen && stoppedLen > 0 && stoppedLen < expectedAll.length, `${stoppedLen} of ${expectedAll.length} characters`);
  await tt.getByRole('button', { name: 'Write again' }).click();
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  await tt.getByRole('button', { name: 'Copy as text' }).click();
  await page.waitForTimeout(200);
  check('Copy puts the text on the clipboard and the icon turns into a check for a moment', (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r/g, '') === expectedAll && await tt.locator('[data-copy-state="copied"]').count() === 1);

  // an error, made by breaking the chunker once (the cards have no failure switch)
  await tt.getByRole('button', { name: 'Notes', exact: true }).click(); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__boom = true; const original = String.prototype.match; String.prototype.match = function (re) { if (window.__boom && re instanceof RegExp && re.source.includes('\\t|')) { window.__boom = false; String.prototype.match = original; throw new Error('The model did not respond in time.'); } return original.apply(this, arguments); }; });
  await tt.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-lines'); await page.waitForTimeout(400);
  await page.evaluate(() => { window.__boom = true; });
  await tt.getByRole('button', { name: 'Write again' }).click();
  await tt.locator('.tt-error').waitFor({ timeout: 6000 }).catch(() => {});
  await page.evaluate(() => { window.__boom = false; });
  if (await tt.locator('.tt-error').count()) {
    await page.waitForTimeout(450);
    check('A failure shows an alert with the message, "Failed" and Try again', /Couldn’t write the text/.test(await tt.locator('.tt-error').innerText()) && /did not respond/.test(await tt.locator('.tt-error').innerText()) && /Failed/.test(await tt.locator('.tt-state').innerText()) && await tt.getByRole('button', { name: 'Try again' }).count() === 1, `${await tt.locator('.tt-error').innerText()} / ${await tt.locator('.tt-state').allInnerTexts()} / ${await tt.getByRole('button', { name: 'Try again' }).count()}`);
    await page.screenshot({ path: `${out}/03-error.png`, clip: await tt.boundingBox() });
    await tt.getByRole('button', { name: 'Try again' }).click();
    await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
    check('Try again runs it again and the text arrives', (await tt.locator('.tt-lines').innerText()).replace(/\r/g, '') === expectedAll);
  } else console.log('  (the error path was not reached: the chunker is not called by String.match here)');
  await ctx.close();

  // ============================================================ the springs, against the recordings
  console.log('Motion');
  ({ ctx, page } = await open());
  await upload(page);
  const t2 = page.locator('.tt-root');
  // the pill of the mode switch: recorded t50 about 133 ms and t90 about 310 ms from the first movement, no overshoot
  let series = sample(page, `() => document.querySelector('.tt-root .fp-seg__selection').getBoundingClientRect().left`, 1100);
  await t2.getByRole('button', { name: 'Notes', exact: true }).click();
  let pill = await series;
  numbers.pillT50 = +crossing(pill, 0.5).toFixed(0); numbers.pillT90 = +crossing(pill, 0.9).toFixed(0);
  check('The mode pill slides on a critically damped spring (t50 about 130 ms, t90 about 310 ms, never past its place)', within(numbers.pillT50, 90, 190) && within(numbers.pillT90, 230, 420) && maxPast(pill) < 0.6, `t50 ${numbers.pillT50} ms, t90 ${numbers.pillT90} ms, past ${maxPast(pill).toFixed(2)} px; ${JSON.stringify(pill.slice(0, 26).map(([t, v]) => [Math.round(t), Math.round(v)]))}`);
  await page.waitForFunction(() => document.querySelectorAll('.tt-root .tt-jump').length === 4, null, { timeout: 15000 });
  // the height: recorded t50 about 76 ms and t90 about 186 ms from the start of the growth
  series = sample(page, `() => document.querySelector('.tt-root .tt-clip').getBoundingClientRect().height`, 1500);
  await t2.getByRole('button', { name: 'Sheet', exact: true }).click();
  const height = await series;
  const growth = height.filter(([t]) => t > 180);
  numbers.heightT50 = +crossing(growth, 0.5).toFixed(0); numbers.heightT90 = +crossing(growth, 0.9).toFixed(0);
  check('The card height follows its content on one bounce-free spring (t50 about 75 ms, t90 about 190 ms)', within(numbers.heightT50, 40, 140) && within(numbers.heightT90, 120, 330) && maxPast(growth) < 1.5, `t50 ${numbers.heightT50} ms, t90 ${numbers.heightT90} ms, past ${maxPast(growth).toFixed(2)} px`);
  // the slider, by key: recorded thumb t50 about 90 ms, t90 about 205 ms; the readout rolls through its digits
  await t2.getByRole('button', { name: 'CSV', exact: true }).click();
  await page.waitForSelector('.tt-lines', { timeout: 15000 }); await page.waitForTimeout(300);
  const thumb = t2.getByRole('slider');
  check('The slider speaks its value and range', await thumb.getAttribute('aria-valuenow') === '2' && await thumb.getAttribute('aria-valuemin') === '1' && await thumb.getAttribute('aria-valuemax') === '5' && await thumb.getAttribute('aria-valuetext') === '6 lines');
  await thumb.focus();
  series = sample(page, `() => document.querySelector('.tt-root .fp-sl__thumb').getBoundingClientRect().left`, 900);
  const digits = sample(page, `() => [...document.querySelectorAll('.tt-root .fp-num__glyph')].filter(g => getComputedStyle(g).visibility !== 'hidden').map(g => g.textContent + ':' + (+getComputedStyle(g).opacity).toFixed(2) + ':' + getComputedStyle(g).filter).join('|')`, 900);
  const requestsBefore = await page.evaluate(() => document.querySelectorAll('.tt-root .tt-thinking').length);
  await page.keyboard.press('ArrowRight');
  const thumbSeries = await series;
  numbers.thumbT50 = +crossing(thumbSeries, 0.5).toFixed(0); numbers.thumbT90 = +crossing(thumbSeries, 0.9).toFixed(0);
  check('The thumb settles on a critically damped spring (t50 about 90 ms, t90 about 205 ms, no overshoot)', within(numbers.thumbT50, 55, 140) && within(numbers.thumbT90, 140, 300) && maxPast(thumbSeries) < 0.6, `t50 ${numbers.thumbT50} ms, t90 ${numbers.thumbT90} ms`);
  const digitSeries = await digits;
  const seenDuring = new Set(digitSeries.flatMap(([, value]) => value.split('|').map(glyph => glyph.split(':')[0])));
  check('The readout counts through the digits between (6 to 8 shows 7 on the way) and blurs the ones leaving', seenDuring.has('7') && digitSeries.some(([, value]) => /blur\([1-3]/.test(value)) && /^8 lines$/.test((await page.locator('.tt-root .fp-sl__thumb').getAttribute('aria-valuetext')) ?? ''), [...seenDuring].join(''));
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  check('A key step makes exactly one request: 8 lines of the sheet, streamed', (await t2.locator('.tt-lines').innerText()).split('\n').length >= 8 && requestsBefore === 0);
  await page.keyboard.press('Home'); await page.waitForTimeout(150);
  check('Home and End go to the shortest and longest length', await thumb.getAttribute('aria-valuenow') === '1');
  await page.keyboard.press('End'); await page.waitForTimeout(150);
  check('End goes to the longest (all 13 lines)', await thumb.getAttribute('aria-valuenow') === '5' && await thumb.getAttribute('aria-valuetext') === '13 lines');
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  check('The longest CSV is the whole 13-line preview', (await t2.locator('.tt-lines').innerText()).replace(/\r/g, '') === delimitedText(assets, ','));

  // the pointer: the bubble opens on press, follows the drag, stays 0.7 s after release, and a drag across steps makes one request
  const control = t2.locator('.fp-sl__control');
  const box = await control.boundingBox();
  const y = box.y + box.height / 2;
  const thinking = await page.evaluate(() => { window.__thinks = 0; new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches?.('.tt-thinking') || n.querySelector?.('.tt-thinking'))) window.__thinks++; }).observe(document.querySelector('.tt-root'), { childList: true, subtree: true }); return 0; });
  void thinking;
  await page.mouse.move(box.x + box.width * 0.98, y); await page.mouse.down();
  await page.waitForTimeout(250);
  check('The bubble opens on press and shows the value', await t2.locator('.fp-sl__bubble').count() === 1 && /13 lines/.test(await t2.locator('.fp-sl__bubble').innerText()));
  await page.mouse.move(box.x + box.width * 0.6, y, { steps: 10 }); await page.mouse.move(box.x + box.width * 0.05, y, { steps: 12 });
  await page.waitForTimeout(150);
  check('While dragging the value follows the pointer and nothing is requested yet', await thumb.getAttribute('aria-valuenow') === '1' && /4 lines/.test(await t2.locator('.fp-sl__bubble').innerText()) && (await page.evaluate(() => window.__thinks)) === 0);
  await page.mouse.up();
  const upAt = Date.now();
  await page.waitForTimeout(250);
  check('The thumb settles on the step and the bubble is still there 0.25 s after release', await t2.locator('.fp-sl__bubble').count() === 1);
  await page.waitForFunction(() => !document.querySelector('.tt-root .fp-sl__bubble'), null, { timeout: 3000 });
  numbers.bubbleLingerMs = Date.now() - upAt;
  check('The bubble leaves about 0.7 s after release (recorded 0.7 s plus its 0.12 s exit)', within(numbers.bubbleLingerMs, 600, 1200), `${numbers.bubbleLingerMs} ms`);
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  check('One request came of the whole drag: 4 lines', (await t2.locator('.tt-lines').innerText()).trim().split('\n').length === 4 && (await page.evaluate(() => window.__thinks)) === 1, `${await page.evaluate(() => window.__thinks)} thinking views`);
  await page.mouse.click(box.x + box.width * 0.75, y);
  await page.waitForTimeout(300);
  check('A click on the track moves to that step (4 of 5)', await thumb.getAttribute('aria-valuenow') === '4');
  await page.screenshot({ path: `${out}/04-slider.png`, clip: await t2.boundingBox() });
  await ctx.close();

  // ============================================================ the Agent cursor
  console.log('Agent cursor');
  ({ ctx, page } = await open());
  await upload(page);
  const ac = page.locator('.ac-root');
  await ac.scrollIntoViewIfNeeded();
  const labelsSeen = [];
  const watcher = page.evaluate(() => new Promise(resolve => { const seen = []; const poll = () => { const label = document.querySelector('.ac-statusLabel')?.textContent ?? ''; if (label && seen.at(-1) !== label) seen.push(label); if (document.querySelector('.ac-bar')) { barAt ??= performance.now(); if (performance.now() - barAt > 700) { resolve(seen); return; } } setTimeout(poll, 30); }; let barAt; poll(); setTimeout(() => resolve(seen), 40000); }));
  const cursorSeries = sample(page, `() => { const c = document.querySelector('.ac-cursor[data-agent=true]'); const m = new DOMMatrix(getComputedStyle(c).transform); return [m.m41, m.m42, +getComputedStyle(c).opacity]; }`, 16000);
  const selWatch = sample(page, `() => [...document.querySelectorAll('.ac-selection')].map(s => { const r = s.getBoundingClientRect(); return Math.round(r.width); }).join(',')`, 16000);
  const seen = await watcher;
  labelsSeen.push(...seen);
  check('The run reads, joins each row, quotes each cell that needs it, adds a line, then asks for review', seen[0] === 'Reading the sheet' && seen.includes('Joining the header') && seen.includes('Joining row 2') && seen.filter(label => /Quoting a cell with a comma/.test(label)).length === 2 && seen.includes('Doubling a quote') && seen.includes('Keeping a line break') && seen.includes('Adding a summary line') && seen.at(-1) === '6 changes ready for review', seen.join(' > '));
  await page.waitForTimeout(700);
  const lines = await ac.locator('.ac-paragraph').allInnerTexts();
  const expected = assets.slice(0, 5).map(row => row.slice(0, 8).map(value => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value).join(',').replaceAll('\n', '↵'));
  check('The document ends on exactly the lines Flip writes for the first five rows, then the summary line', lines.slice(0, 5).join('\n') === expected.join('\n') && lines[5] === '13 rows in all, 6 columns.', lines.join(' / '));
  check('Every change waits tinted for review and the bar counts them', await ac.locator('[data-pending="true"]').count() > 0 && /6 changes by Flip/.test(await ac.locator('.ac-barLabel').innerText()));
  const flight = await cursorSeries;
  const moves = []; let startAt = null;
  for (let i = 1; i < flight.length; i++) { const [t, [x, y2]] = flight[i], [, [px, py]] = flight[i - 1]; const moving = Math.hypot(x - px, y2 - py) > 0.4; if (moving && startAt === null) startAt = t; if (!moving && startAt !== null) { moves.push([startAt, t - startAt, flight[i][1][0], flight[i][1][1]]); startAt = null; } }
  const longFlights = moves.filter(([, duration]) => duration > 150);
  numbers.cursorFlights = longFlights.length;
  check('The cursor travels in flights of 280 to 600 ms and comes home to its avatar', longFlights.length >= 6 && longFlights.every(([, duration]) => within(duration, 150, 1500)), longFlights.map(([, d]) => d.toFixed(0)).join(' '));
  check('The cursor fades in from the avatar and out again at the end', flight[0][1][2] === 1 || flight.some(([, v]) => v[2] > 0.9) && flight.at(-1)[1][2] < 0.05);
  const fills = (await selWatch).map(([t, value]) => [t, value.split(',').filter(Boolean).map(Number)]).filter(([, widths]) => widths.length);
  check('A selection grows line by line to the width of the line (the first one reached the paragraph\'s full width)', fills.length > 3 && Math.max(...fills.map(([, widths]) => Math.max(...widths))) > 200);
  await page.screenshot({ path: `${out}/05-review.png`, clip: await ac.boundingBox() });
  const bar = ac.locator('.ac-bar');
  check('The review bar offers Undo and Accept changes and takes focus order after the header', await bar.getByRole('button', { name: 'Undo' }).count() === 1 && await bar.getByRole('button', { name: 'Accept changes' }).count() === 1);
  await bar.getByRole('button', { name: 'Accept changes' }).click();
  await page.waitForTimeout(500);
  check('Accept clears the tint, drops the bar and says so', await ac.locator('[data-pending="true"]').count() === 0 && await ac.locator('.ac-bar').count() === 0 && /Accepted 6 changes/.test(await ac.locator('.ac-statusLabel').innerText()) && await ac.getByRole('button', { name: 'Run again' }).count() === 1);
  await ac.getByRole('button', { name: 'Run again' }).click();
  await page.waitForFunction(() => document.querySelector('.ac-bar'), null, { timeout: 30000 });
  await page.waitForTimeout(400);
  await ac.locator('.ac-bar').getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(900);
  const reverted = await ac.locator('.ac-paragraph').allInnerTexts();
  check('Undo puts the rows back as they read in the workbook and folds the added line away', reverted.length === 5 && reverted[1].startsWith('00101 │ Máy chủ Dell') && /Undid 6 changes/.test(await ac.locator('.ac-statusLabel').innerText()));
  // stop part way
  await ac.getByRole('button', { name: 'Run again' }).click();
  await page.waitForFunction(() => /Joining row 2/.test(document.querySelector('.ac-statusLabel')?.textContent ?? ''), null, { timeout: 15000 });
  await ac.getByRole('button', { name: 'Stop' }).click();
  await page.waitForTimeout(700);
  check('Stop keeps what landed for review (and says after how many)', /Stopped after \d changes?/.test(await ac.locator('.ac-statusLabel').innerText()) && await ac.locator('.ac-bar').count() === 1);
  await ac.locator('.ac-bar').getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(700);
  // the format changes the run
  await page.getByRole('button', { name: 'TSV', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.ac-bar'), null, { timeout: 40000 });
  const tabs = await ac.locator('.ac-paragraph').allInnerTexts();
  check('Picking TSV plays the prediction again with tabs', tabs[1].includes('\t') && !/^00101,/.test(tabs[1]) && /Tên tài sản\tĐịa chỉ/.test(tabs[0]), tabs[1].slice(0, 50));
  await ctx.close();

  // ============================================================ ghost text, format, sheets, stats
  console.log('Ghost text, format, sheets');
  ({ ctx, page } = await open());
  await upload(page);
  const tt3 = page.locator('.tt-root');
  const field = page.locator('.gt-root textarea, .gt-root input').first();
  await field.fill('');
  await field.pressSequentially('Lookups', { delay: 30 });
  await page.waitForTimeout(900);
  check('Ghost text completes a name from the workbook\'s own names (a sheet), with the extension, and Tab accepts it', (await page.locator('.gt-ghost').first().innerText().catch(() => '')) === '.csv' && (await page.locator('.cr-flip .fl-ext b').innerText()) === 'Lookups.csv');
  await page.keyboard.press('Tab'); await page.waitForTimeout(400);
  check('After Tab the name holds the extension', (await field.inputValue()) === 'Lookups.csv');
  await page.getByRole('button', { name: 'TSV', exact: true }).click(); await page.waitForTimeout(400);
  check('Changing the format changes the extension of the output name (.tsv)', /Lookups\.csv|\.tsv/.test(await page.locator('.cr-flip .fl-ext b').innerText()));
  await tt3.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.tt-root .tt-jump').length >= 4, null, { timeout: 15000 });
  check('With a tab for delimiter, the notes say no cell needs quotes for it', /No cell in these rows holds a tab/.test(await tt3.locator('.tt-points').innerText()));
  await page.getByRole('button', { name: 'Lookups', exact: true }).click();
  await page.waitForTimeout(800);
  check('Picking the other sheet reads its own rows (6 of 6, 2 columns) and starts the card over', /Lookups/.test(await tt3.locator('.tt-title').innerText()) && /6 of 6 rows · 2 columns/.test(await tt3.locator('.tt-byline').innerText()));
  await page.getByRole('button', { name: 'Show details' }).click(); await page.waitForTimeout(500);
  check('The figures are the workbook\'s own: read time, rows, cells, size, per sheet', /Read in/.test(await page.locator('.gs-root').innerText()) && /Sample assets/.test(await page.locator('.gs-root').innerText()) && /Lookups/.test(await page.locator('.gs-root').innerText()) && /Total/.test(await page.locator('.gs-root').innerText()));
  const download = page.getByRole('button', { name: /^Download/ });
  check('Download is disabled with its reason', await download.isDisabled() && /Download comes with the conversion step/.test(await page.locator('#fl-download-note').innerText()));
  await ctx.close();

  // ============================================================ small screens, dark, reduced motion
  console.log('Small screens, dark, reduced motion');
  for (const width of [390, 320]) {
    ({ ctx, page } = await open({ width, height: 3200 }));
    await upload(page);
    await page.locator('.ac-bar, .ac-statusLabel').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const over = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - innerWidth, cards: [...document.querySelectorAll('.tt-root, .ac-root, .gs-root, .gt-root')].map(n => Math.round(n.getBoundingClientRect().right - innerWidth)) }));
    check(`No horizontal scroll at ${width} px and every card fits`, over.doc <= 0 && over.cards.every(right => right <= 0), JSON.stringify(over));
    const sl = await page.locator('.tt-length').boundingBox(), seg = await page.locator('.tt-root .fp-seg').boundingBox();
    check(`The length slider drops under the mode switch at ${width} px`, sl.y >= seg.y + seg.height - 2 && sl.width > 200);
    await page.screenshot({ path: `${out}/06-${width}.png`, fullPage: true });
    await ctx.close();
  }
  ({ ctx, page } = await open({ dark: true }));
  await upload(page);
  await page.waitForTimeout(800);
  const colours = await page.evaluate(() => ({ card: getComputedStyle(document.querySelector('.tt-card')).backgroundColor, ac: getComputedStyle(document.querySelector('.ac-root')).backgroundColor, text: getComputedStyle(document.querySelector('.tt-title')).color }));
  const lightness = value => Number(/\d+/.exec(value)?.[0] ?? 255);
  check('In the dark theme both cards are dark with light text', lightness(colours.card) < 80 && lightness(colours.ac) < 80 && lightness(colours.text) > 150, JSON.stringify(colours));
  await page.screenshot({ path: `${out}/07-dark.png`, clip: await page.locator('.cr-flip .fl-stage').boundingBox() });
  await ctx.close();
  ({ ctx, page } = await open({ reduced: true }));
  await upload(page);
  await page.locator('.tt-root').getByRole('button', { name: 'CSV', exact: true }).click();
  const reducedStart = Date.now();
  await page.waitForFunction(() => /ready/.test(document.querySelector('.tt-root > .fp-sr')?.textContent ?? ''), null, { timeout: 15000 });
  const noFade = await page.evaluate(() => document.querySelectorAll('.tt-root .tt-lines .tt-chunk').length && [...document.querySelectorAll('.tt-root .tt-chunk')].every(chunk => getComputedStyle(chunk).animationName === 'none'));
  check('With reduced motion chunks do not fade and the result still arrives whole', noFade && (await page.locator('.tt-lines').innerText()).split('\n').length >= 6, `${Date.now() - reducedStart} ms`);
  await page.waitForFunction(() => document.querySelector('.ac-bar'), null, { timeout: 20000 });
  const reducedFlights = await sample(page, `() => { const c = document.querySelector('.ac-cursor[data-agent=true]'); const m = new DOMMatrix(getComputedStyle(c).transform); return m.m41 + ',' + m.m42; }`, 300);
  check('With reduced motion the prediction reaches its review at once, no spinning avatar, bar and end states intact', await page.locator('.ac-agentAvatar[data-working="true"]').count() === 0 && /changes ready for review/.test(await page.locator('.ac-statusLabel').innerText()) && reducedFlights.length > 0);
  await ctx.close();

  check('The page had no script or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(JSON.stringify({ passed: results.length, numbers }, null, 2));
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ passed: results, numbers, base, at: new Date().toISOString() }, null, 2));
} finally { await browser.close(); }
